"""Resolve per-zone franchise pricing and commission rates."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from .models import FranchiseCommissionConfig, FranchisePricingOverride, User, Zone, ZoneFranchiseRate
from .zones import ensure_zones

TWOPLACES = Decimal('0.01')


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def user_can_manage_all_zone_rates(user) -> bool:
    """Super Admin (and Django superusers) can edit rates for every zone."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    return bool(user.is_superuser or user.role == User.ROLE_SUPER_ADMIN)


def user_can_manage_zone_rate(user, zone) -> bool:
    if not user or not zone:
        return False
    if user_can_manage_all_zone_rates(user):
        return True
    return (
        user.role == User.ROLE_ADMIN
        and getattr(user, 'zone_id', None) == zone.id
    )


def user_can_set_pricing_override(user, target_role: str) -> bool:
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if user.role == User.ROLE_SUPER_FRANCHISEE and target_role == User.ROLE_FRANCHISEE:
        return True
    if user.role == User.ROLE_FRANCHISEE and target_role == User.ROLE_SUB_FRANCHISE:
        return True
    if user_can_manage_all_zone_rates(user):
        return True
    return False


def downstream_franchise_role_for_manager(user) -> str | None:
    """Franchise role a manager may set per-test bulk rates for."""
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    if user.role == User.ROLE_SUPER_FRANCHISEE:
        return User.ROLE_FRANCHISEE
    if user.role == User.ROLE_FRANCHISEE:
        return User.ROLE_SUB_FRANCHISE
    return None


def user_can_manage_franchise_test_rates(user, franchise_user) -> bool:
    """Admin/Super Admin: any franchise in zone. Supreme→Prime, Prime→Sub direct children."""
    if not user or not franchise_user:
        return False
    if franchise_user.role not in User.FRANCHISE_ROLES or not franchise_user.is_active:
        return False

    if user_can_manage_all_zone_rates(user):
        return True

    if user.role == User.ROLE_ADMIN:
        return bool(user.zone_id and franchise_user.zone_id == user.zone_id)

    expected = downstream_franchise_role_for_manager(user)
    if not expected or franchise_user.role != expected:
        return False

    if franchise_user.parent_franchisee_id != user.id:
        return False

    return bool(user.zone_id and franchise_user.zone_id == user.zone_id)


def user_can_transfer_franchise_test_rates(user, source, target) -> bool:
    if not user_can_manage_franchise_test_rates(user, source):
        return False
    if not user_can_manage_franchise_test_rates(user, target):
        return False
    if source.role != target.role:
        return False
    if user.role in {User.ROLE_SUPER_FRANCHISEE, User.ROLE_FRANCHISEE}:
        return (
            source.parent_franchisee_id == user.id
            and target.parent_franchisee_id == user.id
        )
    return True


def find_ancestor(user, role: str):
    if not user:
        return None
    node = user.parent_franchisee
    while node is not None:
        if node.role == role and node.is_active:
            return node
        node = node.parent_franchisee
    return None


def ensure_zone_franchise_rates(*, stdout=None):
    """Create a ZoneFranchiseRate row for every active zone if missing."""
    zones_by_code, _ = ensure_zones(stdout=stdout)
    created = 0
    for zone in zones_by_code.values():
        before = ZoneFranchiseRate.objects.filter(zone=zone).exists()
        ZoneFranchiseRate.ensure_for_zone(zone)
        if not before:
            created += 1
            if stdout:
                stdout.write(f'Created franchise rates for zone: {zone.name}')
    return created


def get_zone_franchise_rate(zone=None, *, zone_id=None) -> ZoneFranchiseRate | None:
    if zone is None and zone_id:
        zone = Zone.objects.filter(pk=zone_id).first()
    if zone is None:
        return None
    return ZoneFranchiseRate.ensure_for_zone(zone)


def resolve_zone_for_rates(*, registration=None, actor=None) -> Zone | None:
    if registration is not None:
        zone = getattr(registration, 'zone', None)
        if zone:
            return zone
        if getattr(registration, 'zone_id', None):
            return Zone.objects.filter(pk=registration.zone_id).first()
    if actor is not None:
        zone = getattr(actor, 'zone', None)
        if zone:
            return zone
        if getattr(actor, 'zone_id', None):
            return Zone.objects.filter(pk=actor.zone_id).first()
    return None


def get_pricing_override(*, zone, setter, target_role) -> FranchisePricingOverride | None:
    if not zone or not setter:
        return None
    return FranchisePricingOverride.objects.filter(
        zone=zone,
        set_by=setter,
        target_role=target_role,
        is_active=True,
    ).first()


def markup_on_franchisee_price(*, catalog_price, rate_pct) -> Decimal:
    """Final assigned price = Franchisee Price × (1 + Rate%/100)."""
    catalog = _money(catalog_price)
    rate = _money(rate_pct)
    if catalog <= 0:
        return Decimal('0.00')
    return _money(catalog * (Decimal('1') + rate / Decimal('100')))


def catalog_base_for_test(test) -> Decimal:
    """Admin/Supreme upstream base before any franchise markup."""
    catalog = _money(getattr(test, 'price', 0))
    mrp = _money(getattr(test, 'mrp', 0))
    return catalog if catalog > 0 else mrp


def franchise_ancestor_chain(franchise_user) -> list:
    """Leaf → root franchise users (actor first, then parents)."""
    if not franchise_user or franchise_user.role not in User.FRANCHISE_ROLES:
        return []
    chain = []
    seen: set[int] = set()
    node = franchise_user
    while node is not None and node.role in User.FRANCHISE_ROLES:
        if node.id in seen:
            break
        seen.add(node.id)
        chain.append(node)
        node = node.parent_franchisee
    return chain


def build_franchise_rates_index(user_ids) -> dict[int, dict[int, Decimal]]:
    """Map franchise_user_id → {test_id: rate_pct} for bulk pricing lookups."""
    if not user_ids:
        return {}
    from .models import FranchiseTestRate

    index: dict[int, dict[int, Decimal]] = {}
    for uid, tid, pct in FranchiseTestRate.objects.filter(
        franchise_user_id__in=user_ids,
    ).values_list('franchise_user_id', 'test_id', 'rate_pct'):
        index.setdefault(uid, {})[tid] = _money(pct)
    return index


def rate_pct_for_franchise_user(
    *,
    franchise_user,
    test_id: int,
    rates_index: dict[int, dict[int, Decimal]] | None,
    default: Decimal | None = None,
) -> Decimal | None:
    """Saved bulk markup % for a franchise user/test, or default when unset."""
    if rates_index and franchise_user.id in rates_index:
        user_rates = rates_index[franchise_user.id]
        if test_id in user_rates:
            return user_rates[test_id]
    if default is not None:
        return _money(default)
    return None


def assigned_price_for_franchise_user(
    *,
    franchise_user,
    test,
    zone=None,
    rate_row=None,
    rates_index: dict[int, dict[int, Decimal]] | None = None,
    cache: dict | None = None,
    _visit: set | None = None,
) -> Decimal:
    """
    Final price assigned to a franchise tier for a test.

    Cascade: upstream base (parent's assigned price, or catalog for Supreme)
    × (1 + this tier's saved bulk Rate%/100). Default rate is 0%.
    Falls back to zone % of MRP when no bulk rates exist anywhere on the chain.
    """
    if not franchise_user or franchise_user.role not in User.FRANCHISE_ROLES:
        return catalog_base_for_test(test)

    test_id = getattr(test, 'id', test)
    cache_key = (franchise_user.id, test_id)
    if cache is not None and cache_key in cache:
        return cache[cache_key]

    if _visit is None:
        _visit = set()
    if franchise_user.id in _visit:
        result = catalog_base_for_test(test)
        if cache is not None:
            cache[cache_key] = result
        return result
    _visit.add(franchise_user.id)

    parent = franchise_user.parent_franchisee
    if parent and parent.role in User.FRANCHISE_ROLES:
        upstream = assigned_price_for_franchise_user(
            franchise_user=parent,
            test=test,
            zone=zone,
            rate_row=rate_row,
            rates_index=rates_index,
            cache=cache,
            _visit=_visit,
        )
    else:
        upstream = catalog_base_for_test(test)

    saved_rate = rate_pct_for_franchise_user(
        franchise_user=franchise_user,
        test_id=test_id,
        rates_index=rates_index,
        default=None,
    )
    if saved_rate is not None:
        result = markup_on_franchisee_price(catalog_price=upstream, rate_pct=saved_rate)
        if cache is not None:
            cache[cache_key] = result
        return result

    # No saved bulk rate on this tier — use 0% markup (assigned = upstream).
    if upstream > 0:
        result = _money(upstream)
        if cache is not None:
            cache[cache_key] = result
        return result

    # Legacy fallback: zone % of MRP when catalog/upstream is zero.
    if zone is None:
        zone = resolve_zone_for_rates(actor=franchise_user)
    row = rate_row
    if row is None and zone is not None:
        row = get_zone_franchise_rate(zone)
    pct = price_pct_for_actor(row, franchise_user)
    mrp_val = _money(getattr(test, 'mrp', 0))
    catalog = _money(getattr(test, 'price', 0))
    base = mrp_val if mrp_val > 0 else catalog
    result = _money(base * pct / Decimal('100')) if base > 0 else Decimal('0.00')
    if cache is not None:
        cache[cache_key] = result
    return result


def upstream_franchisee_price_for_test(
    *,
    franchise_user,
    test,
    zone=None,
    rate_row=None,
    rates_index: dict[int, dict[int, Decimal]] | None = None,
    cache: dict | None = None,
) -> Decimal:
    """
    Base shown in the Franchisee Price column when a manager sets downstream bulk rates.
    Supreme→Prime uses Supreme's assigned price; Prime→Sub uses Prime's assigned price.
    Admin→Supreme uses catalog/MRP.
    """
    parent = getattr(franchise_user, 'parent_franchisee', None)
    if parent and parent.role in User.FRANCHISE_ROLES:
        return assigned_price_for_franchise_user(
            franchise_user=parent,
            test=test,
            zone=zone,
            rate_row=rate_row,
            rates_index=rates_index,
            cache=cache,
        )
    return catalog_base_for_test(test)


def bulk_pricing_row_for_test(
    *,
    franchise_user,
    test,
    saved_rate_pct: Decimal,
    zone=None,
    rate_row=None,
    rates_index: dict[int, dict[int, Decimal]] | None = None,
    cache: dict | None = None,
) -> dict:
    """Build one rate-list row for bulk pricing UI/API."""
    franchisee_price = upstream_franchisee_price_for_test(
        franchise_user=franchise_user,
        test=test,
        zone=zone,
        rate_row=rate_row,
        rates_index=rates_index,
        cache=cache,
    )
    assigned = markup_on_franchisee_price(
        catalog_price=franchisee_price,
        rate_pct=saved_rate_pct,
    )
    mrp = _money(getattr(test, 'mrp', 0))
    catalog = _money(getattr(test, 'price', 0))
    return {
        'mrp': str(mrp),
        'catalog_price': str(catalog),
        'franchisee_price': str(franchisee_price),
        'rate_pct': str(saved_rate_pct),
        'assigned_price': str(assigned),
        'final_price': str(assigned),
    }


def price_pct_for_actor(rate_row: ZoneFranchiseRate | None, actor, *, test=None) -> Decimal:
    """Admin base + Supreme/Prime cascade overrides (zone % of MRP)."""
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        return Decimal('100.00')

    zone = resolve_zone_for_rates(actor=actor)
    role = actor.role

    if role == User.ROLE_FRANCHISEE:
        supreme = find_ancestor(actor, User.ROLE_SUPER_FRANCHISEE)
        override = get_pricing_override(
            zone=zone, setter=supreme, target_role=User.ROLE_FRANCHISEE,
        ) if supreme and zone else None
        if override:
            return _money(override.price_pct_of_mrp)

    if role == User.ROLE_SUB_FRANCHISE:
        prime = find_ancestor(actor, User.ROLE_FRANCHISEE)
        override = get_pricing_override(
            zone=zone, setter=prime, target_role=User.ROLE_SUB_FRANCHISE,
        ) if prime and zone else None
        if override:
            return _money(override.price_pct_of_mrp)

    return price_pct_for_role(rate_row, role)


def commission_pct_for_role(
    rate_row: ZoneFranchiseRate | None,
    role: str,
    *,
    solo=None,
    beneficiary=None,
    zone=None,
) -> Decimal:
    if beneficiary and zone:
        if role == User.ROLE_FRANCHISEE:
            supreme = find_ancestor(beneficiary, User.ROLE_SUPER_FRANCHISEE)
            override = get_pricing_override(
                zone=zone, setter=supreme, target_role=User.ROLE_FRANCHISEE,
            ) if supreme else None
            if override and override.commission_pct is not None:
                return _money(override.commission_pct)
        if role == User.ROLE_SUB_FRANCHISE:
            prime = find_ancestor(beneficiary, User.ROLE_FRANCHISEE)
            override = get_pricing_override(
                zone=zone, setter=prime, target_role=User.ROLE_SUB_FRANCHISE,
            ) if prime else None
            if override and override.commission_pct is not None:
                return _money(override.commission_pct)

    if rate_row and rate_row.is_active:
        if role == User.ROLE_SUB_FRANCHISE:
            return _money(rate_row.sub_franchise_commission_pct)
        if role == User.ROLE_FRANCHISEE:
            return _money(rate_row.franchisee_commission_pct)
        if role == User.ROLE_SUPER_FRANCHISEE:
            return _money(rate_row.super_franchisee_commission_pct)
        return Decimal('0.00')

    solo = solo or FranchiseCommissionConfig.get_solo()
    if not solo.is_active:
        return Decimal('0.00')
    if role == User.ROLE_SUB_FRANCHISE:
        return _money(solo.sub_franchise_pct)
    if role == User.ROLE_FRANCHISEE:
        return _money(solo.franchisee_pct)
    if role == User.ROLE_SUPER_FRANCHISEE:
        return _money(solo.super_franchisee_pct)
    return Decimal('0.00')


def price_pct_for_role(rate_row: ZoneFranchiseRate | None, role: str) -> Decimal:
    if not rate_row or not rate_row.is_active:
        return Decimal('100.00')
    if role == User.ROLE_SUB_FRANCHISE:
        return _money(rate_row.sub_franchise_price_pct)
    if role == User.ROLE_FRANCHISEE:
        return _money(rate_row.franchisee_price_pct)
    if role == User.ROLE_SUPER_FRANCHISEE:
        return _money(rate_row.super_franchisee_price_pct)
    return Decimal('100.00')


def effective_test_price(*, mrp, catalog_price, role=None, zone=None, rate_row=None, actor=None) -> Decimal:
    """
    Franchise roles pay (MRP × effective price %).
    Non-franchise roles keep the catalog B2B/patient price.
    """
    mrp_val = _money(mrp)
    catalog = _money(catalog_price)
    resolved_role = role or (actor.role if actor else None)
    if resolved_role not in User.FRANCHISE_ROLES:
        return catalog if catalog > 0 else mrp_val

    row = rate_row
    if row is None and zone is not None:
        row = get_zone_franchise_rate(zone)
    if actor:
        pct = price_pct_for_actor(row, actor, test=None)
    else:
        pct = price_pct_for_role(row, resolved_role)
    base = mrp_val if mrp_val > 0 else catalog
    if base <= 0:
        return Decimal('0.00')
    return _money(base * pct / Decimal('100'))


def effective_test_price_for_test(
    *,
    test,
    actor=None,
    zone=None,
    rate_row=None,
    franchise_test_rates=None,
    custom_rate_pct=None,
    franchise_rates_index=None,
) -> Decimal:
    """Resolve booking price for a franchise actor (cascading assigned prices)."""
    mrp_val = _money(getattr(test, 'mrp', 0))
    catalog = _money(getattr(test, 'price', 0))
    resolved_role = actor.role if actor else None
    if resolved_role not in User.FRANCHISE_ROLES:
        return catalog if catalog > 0 else mrp_val

    if zone is None and actor is not None:
        zone = resolve_zone_for_rates(actor=actor)
    if rate_row is None and zone is not None:
        rate_row = get_zone_franchise_rate(zone)

    rates_index = franchise_rates_index
    if rates_index is None and actor is not None:
        chain_ids = [u.id for u in franchise_ancestor_chain(actor)]
        rates_index = build_franchise_rates_index(chain_ids)
    elif rates_index is None and franchise_test_rates is not None:
        rates_index = {actor.id: franchise_test_rates}

    if custom_rate_pct is not None and actor is not None:
        upstream = upstream_franchisee_price_for_test(
            franchise_user=actor,
            test=test,
            zone=zone,
            rate_row=rate_row,
            rates_index=rates_index,
        )
        return markup_on_franchisee_price(catalog_price=upstream, rate_pct=custom_rate_pct)

    return assigned_price_for_franchise_user(
        franchise_user=actor,
        test=test,
        zone=zone,
        rate_row=rate_row,
        rates_index=rates_index,
    )


def rates_are_active(*, registration=None, actor=None) -> bool:
    zone = resolve_zone_for_rates(registration=registration, actor=actor)
    row = get_zone_franchise_rate(zone) if zone else None
    if row is not None:
        return bool(row.is_active)
    return bool(FranchiseCommissionConfig.get_solo().is_active)


def compute_tier_margin_credits(
    *,
    actor,
    line_items,
    zone=None,
    rates_index: dict[int, dict[int, Decimal]] | None = None,
) -> dict[int, dict]:
    """
    Multi-tier margin = selling price − buying price along the franchise chain.

    For each booked line (test, selling_price):
      - Direct parent margin uses the charged selling price vs parent's assigned (buying) price
      - Higher ancestors use each child's assigned price as selling into the next tier

    Returns {beneficiary_user_id: {'user', 'amount', 'lines'}} where lines hold
    per-test selling/buying/margin snapshots.
    """
    if not actor or actor.role not in User.FRANCHISE_ROLES or not line_items:
        return {}

    chain = franchise_ancestor_chain(actor)
    if len(chain) < 2:
        return {}

    if zone is None:
        zone = resolve_zone_for_rates(actor=actor)
    if rates_index is None:
        rates_index = build_franchise_rates_index([user.id for user in chain])

    price_cache: dict = {}
    credits: dict[int, dict] = {}

    for item in line_items:
        if isinstance(item, (list, tuple)):
            test, selling_raw, line_id = (item[0], item[1], item[2] if len(item) > 2 else None)
        else:
            test = item.get('test')
            selling_raw = item.get('selling_price')
            line_id = item.get('line_id')
        if test is None:
            continue

        selling = _money(selling_raw)
        if selling <= 0:
            # Fall back to actor assigned price when line price is missing.
            selling = assigned_price_for_franchise_user(
                franchise_user=actor,
                test=test,
                zone=zone,
                rates_index=rates_index,
                cache=price_cache,
            )
        if selling <= 0:
            continue

        for index in range(len(chain) - 1):
            child = chain[index]
            parent = chain[index + 1]
            if index == 0:
                child_selling = selling
            else:
                child_selling = assigned_price_for_franchise_user(
                    franchise_user=child,
                    test=test,
                    zone=zone,
                    rates_index=rates_index,
                    cache=price_cache,
                )
            buying = assigned_price_for_franchise_user(
                franchise_user=parent,
                test=test,
                zone=zone,
                rates_index=rates_index,
                cache=price_cache,
            )
            margin = _money(child_selling - buying)
            if margin <= 0:
                continue

            bucket = credits.setdefault(
                parent.id,
                {'user': parent, 'amount': Decimal('0.00'), 'lines': []},
            )
            bucket['amount'] = _money(bucket['amount'] + margin)
            bucket['lines'].append({
                'line_id': line_id,
                'test_id': getattr(test, 'id', None),
                'test_code': getattr(test, 'test_code', '') or '',
                'selling_price': str(child_selling),
                'buying_price': str(buying),
                'margin': str(margin),
                'child_role': child.role,
                'parent_role': parent.role,
            })

    return credits

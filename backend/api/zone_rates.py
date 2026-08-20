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
) -> Decimal:
    """Resolve price for a specific Test row (supports per-test franchise markup rates).

    Pass franchise_test_rates={test_id: rate_pct} to avoid N+1 queries in list views.
    """
    mrp_val = _money(getattr(test, 'mrp', 0))
    catalog = _money(getattr(test, 'price', 0))
    resolved_role = actor.role if actor else None
    if resolved_role not in User.FRANCHISE_ROLES:
        return catalog if catalog > 0 else mrp_val

    rate_value = None
    if custom_rate_pct is not None:
        rate_value = custom_rate_pct
    elif franchise_test_rates is not None and test is not None:
        test_id = getattr(test, 'id', test)
        if test_id in franchise_test_rates:
            rate_value = franchise_test_rates[test_id]
    elif actor is not None and test is not None:
        from .models import FranchiseTestRate
        test_id = getattr(test, 'id', test)
        custom = FranchiseTestRate.objects.filter(
            franchise_user_id=actor.id,
            test_id=test_id,
        ).only('rate_pct').first()
        if custom is not None:
            rate_value = custom.rate_pct

    if rate_value is not None:
        # Bulk pricing rate = % increase on Franchisee Price (catalog).
        if catalog > 0:
            return markup_on_franchisee_price(catalog_price=catalog, rate_pct=rate_value)
        if mrp_val > 0:
            return markup_on_franchisee_price(catalog_price=mrp_val, rate_pct=rate_value)
        return Decimal('0.00')

    row = rate_row
    if row is None and zone is not None:
        row = get_zone_franchise_rate(zone)
    elif row is None and actor is not None:
        zone = resolve_zone_for_rates(actor=actor)
        if zone is not None:
            row = get_zone_franchise_rate(zone)

    pct = price_pct_for_actor(row, actor) if actor else price_pct_for_role(row, resolved_role)
    base = mrp_val if mrp_val > 0 else catalog
    if base <= 0:
        return Decimal('0.00')
    return _money(base * pct / Decimal('100'))


def rates_are_active(*, registration=None, actor=None) -> bool:
    zone = resolve_zone_for_rates(registration=registration, actor=actor)
    row = get_zone_franchise_rate(zone) if zone else None
    if row is not None:
        return bool(row.is_active)
    return bool(FranchiseCommissionConfig.get_solo().is_active)

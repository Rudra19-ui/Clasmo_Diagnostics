"""
Franchise wallet balances and hierarchical margin commission distribution.

When an order is booked, margin = selling price − buying (upstream assigned) price.
Credits flow to parent wallets only:
- Sub-Franchise booking → Prime + Supreme credited (actor is debited, not commissioned)
- Prime booking → Supreme credited only
- Supreme booking → no commission credits (actor pays debit only)

Balances update inside atomic transactions with row locks.
"""

from __future__ import annotations

import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F

from .models import (
    FranchiseWallet,
    Registration,
    RegistrationTest,
    User,
    WalletTransaction,
)
from .zone_rates import (
    build_franchise_rates_index,
    commission_pct_for_role,
    compute_tier_margin_credits,
    franchise_ancestor_chain,
    get_zone_franchise_rate,
    rates_are_active,
    resolve_zone_for_rates,
)


class WalletError(Exception):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


TWOPLACES = Decimal('0.01')


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def get_or_create_wallet(user) -> FranchiseWallet:
    wallet, _ = FranchiseWallet.objects.get_or_create(user=user)
    return wallet


def hierarchy_beneficiaries(actor) -> list[User]:
    """
    Walk actor → parent → grandparent and return unique franchise users
    who should receive commission for this actor's booking.
    Order: leaf (actor) first, then ancestors.
    """
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        return []

    chain: list[User] = []
    seen: set[int] = set()
    node = actor
    while node is not None and node.role in User.FRANCHISE_ROLES:
        if node.id in seen:
            break
        seen.add(node.id)
        chain.append(node)
        parent_id = node.parent_franchisee_id
        if not parent_id:
            break
        node = (
            User.objects.filter(pk=parent_id, is_active=True)
            .select_related('parent_franchisee')
            .first()
        )
    return chain


def commission_beneficiaries(actor) -> list[User]:
    """
    Ancestors who receive commission when actor books an entry.
    The booking actor is debited but never receives commission on their own entry.
    """
    if not actor:
        return []
    return [user for user in hierarchy_beneficiaries(actor) if user.id != actor.id]


def _registration_line_items(registration: Registration, *, line_ids=None) -> list[tuple]:
    qs = (
        RegistrationTest.objects.filter(registration=registration)
        .select_related('test')
        .order_by('id')
    )
    if line_ids is not None:
        qs = qs.filter(id__in=list(line_ids))
    return [
        (row.test, row.price, row.id)
        for row in qs
        if row.test_id
    ]


def _credit_margin_buckets(
    *,
    credits: dict,
    registration: Registration | None,
    actor,
    created_by,
    batch_key: str,
    zone,
    txn_type: str = WalletTransaction.TYPE_COMMISSION,
    description_prefix: str = 'Margin commission',
) -> list[WalletTransaction]:
    created: list[WalletTransaction] = []
    lab_code = registration.lab_code if registration else ''
    for bucket in credits.values():
        amount = _money(bucket['amount'])
        if amount <= 0:
            continue
        beneficiary = bucket['user']
        lines = bucket.get('lines') or []
        selling_total = _money(sum(Decimal(line['selling_price']) for line in lines)) if lines else amount
        buying_total = _money(sum(Decimal(line['buying_price']) for line in lines)) if lines else Decimal('0.00')
        txn = apply_ledger_entry(
            user=beneficiary,
            amount=amount,
            direction=WalletTransaction.DIR_CREDIT,
            txn_type=txn_type,
            description=(
                f'{description_prefix} on {lab_code or "booking"} '
                f'(margin ₹{amount}; selling ₹{selling_total} − buying ₹{buying_total}'
                f'{f", zone {zone.name}" if zone else ""})'
            ),
            registration=registration,
            source_user=actor,
            created_by=created_by or actor,
            commission_rate_pct=None,
            base_amount=selling_total,
            beneficiary_role=beneficiary.role,
            batch_key=batch_key,
            metadata={
                'mode': 'cascade_margin',
                'lab_code': lab_code,
                'source_role': actor.role,
                'zone_id': zone.id if zone else None,
                'zone_code': zone.code if zone else '',
                'selling_total': str(selling_total),
                'buying_total': str(buying_total),
                'margin_total': str(amount),
                'lines': lines,
                'line_ids': [line.get('line_id') for line in lines if line.get('line_id') is not None],
            },
        )
        created.append(txn)
    return created


def _legacy_pct_credits(
    *,
    actor,
    base: Decimal,
    zone,
    rate_row,
    registration: Registration | None,
    created_by,
    batch_key: str,
    txn_type: str = WalletTransaction.TYPE_COMMISSION,
) -> list[WalletTransaction]:
    """Fallback when a booking has no line items: % of base amount (legacy)."""
    beneficiaries = commission_beneficiaries(actor)
    created: list[WalletTransaction] = []
    for beneficiary in beneficiaries:
        rate = commission_pct_for_role(
            rate_row,
            beneficiary.role,
            beneficiary=beneficiary,
            zone=zone,
        )
        if rate <= 0:
            continue
        credit = _money(base * rate / Decimal('100'))
        if credit <= 0:
            continue
        lab = registration.lab_code if registration else 'demo'
        txn = apply_ledger_entry(
            user=beneficiary,
            amount=credit,
            direction=WalletTransaction.DIR_CREDIT,
            txn_type=txn_type,
            description=(
                f'Commission {rate}% on {lab} '
                f'(base {base}{f", zone {zone.name}" if zone else ""})'
            ),
            registration=registration,
            source_user=actor,
            created_by=created_by or actor,
            commission_rate_pct=rate,
            base_amount=base,
            beneficiary_role=beneficiary.role,
            batch_key=batch_key,
            metadata={
                'mode': 'legacy_pct',
                'lab_code': registration.lab_code if registration else '',
                'source_role': actor.role,
                'zone_id': zone.id if zone else None,
                'zone_code': zone.code if zone else '',
            },
        )
        created.append(txn)
    return created


@transaction.atomic
def apply_ledger_entry(
    *,
    user,
    amount,
    direction,
    txn_type,
    description='',
    registration=None,
    source_user=None,
    created_by=None,
    commission_rate_pct=None,
    base_amount=None,
    beneficiary_role='',
    batch_key='',
    metadata=None,
    allow_negative=False,
) -> WalletTransaction:
    amount = _money(amount)
    if amount <= 0:
        raise WalletError('Amount must be greater than zero.', field='amount')

    wallet = get_or_create_wallet(user)
    wallet = FranchiseWallet.objects.select_for_update().get(pk=wallet.pk)

    if direction == WalletTransaction.DIR_CREDIT:
        FranchiseWallet.objects.filter(pk=wallet.pk).update(balance=F('balance') + amount)
    elif direction == WalletTransaction.DIR_DEBIT:
        wallet.refresh_from_db(fields=['balance'])
        if not allow_negative and wallet.balance < amount:
            raise WalletError('Insufficient wallet balance.', field='amount')
        FranchiseWallet.objects.filter(pk=wallet.pk).update(balance=F('balance') - amount)
    else:
        raise WalletError('Invalid direction.', field='direction')

    wallet.refresh_from_db(fields=['balance'])
    return WalletTransaction.objects.create(
        wallet=wallet,
        txn_type=txn_type,
        direction=direction,
        amount=amount,
        balance_after=wallet.balance,
        commission_rate_pct=commission_rate_pct,
        base_amount=_money(base_amount) if base_amount is not None else None,
        beneficiary_role=beneficiary_role or (user.role or ''),
        batch_key=batch_key or '',
        description=description or '',
        registration=registration,
        source_user=source_user,
        created_by=created_by,
        metadata=metadata or {},
    )


@transaction.atomic
def distribute_registration_commissions(
    registration: Registration,
    *,
    created_by=None,
    line_ids=None,
) -> list[WalletTransaction]:
    """
    Credit parent wallets with cascade margins for registration line items.
    Idempotent for full-registration settlement; for partial line_ids, skips lines
    already present in prior commission metadata.
    """
    if not registration:
        return []

    actor = registration.created_by
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        return []

    if not rates_are_active(registration=registration, actor=actor):
        return []

    existing = list(
        WalletTransaction.objects.filter(
            registration=registration,
            txn_type=WalletTransaction.TYPE_COMMISSION,
        ).select_related('wallet__user')
    )

    # Full booking: already settled once.
    if line_ids is None and existing:
        return existing

    already_credited_lines: set[int] = set()
    for txn in existing:
        for lid in (txn.metadata or {}).get('line_ids') or []:
            try:
                already_credited_lines.add(int(lid))
            except (TypeError, ValueError):
                continue

    line_items = _registration_line_items(registration, line_ids=line_ids)
    if line_ids is not None:
        line_items = [
            item for item in line_items
            if item[2] not in already_credited_lines
        ]
        if not line_items:
            return []
    elif not line_items:
        # No tests synced — fall back to legacy % of net_amount.
        zone = resolve_zone_for_rates(registration=registration, actor=actor)
        rate_row = get_zone_franchise_rate(zone) if zone else None
        base = _money(registration.net_amount)
        if base <= 0:
            return []
        batch_key = f'reg-{registration.id}-{uuid.uuid4().hex[:8]}'
        return _legacy_pct_credits(
            actor=actor,
            base=base,
            zone=zone,
            rate_row=rate_row,
            registration=registration,
            created_by=created_by,
            batch_key=batch_key,
        )

    # Prefetch parents for assigned-price walks.
    actor = (
        User.objects.filter(pk=actor.pk)
        .select_related('parent_franchisee__parent_franchisee')
        .first()
        or actor
    )
    zone = resolve_zone_for_rates(registration=registration, actor=actor)
    chain = franchise_ancestor_chain(actor)
    rates_index = build_franchise_rates_index([user.id for user in chain])
    credits = compute_tier_margin_credits(
        actor=actor,
        line_items=line_items,
        zone=zone,
        rates_index=rates_index,
    )
    if not credits:
        return []

    batch_suffix = (
        f"lines-{'-'.join(str(item[2]) for item in line_items)}"
        if line_ids is not None
        else uuid.uuid4().hex[:8]
    )
    batch_key = f'reg-{registration.id}-{batch_suffix}'
    return _credit_margin_buckets(
        credits=credits,
        registration=registration,
        actor=actor,
        created_by=created_by,
        batch_key=batch_key,
        zone=zone,
    )


@transaction.atomic
def settle_registration_booking(registration: Registration, *, created_by=None) -> dict:
    """
    Atomically debit the booking actor and credit parent margin commissions.
    Call after registration + tests are persisted.
    """
    debit = debit_registration_charge(registration, created_by=created_by)
    credits = distribute_registration_commissions(registration, created_by=created_by)
    return {'debit': debit, 'commissions': credits}


@transaction.atomic
def settle_registration_test_addition(
    registration: Registration,
    *,
    added_line_ids,
    debit_amount,
    created_by=None,
) -> dict:
    """
    Incremental wallet settlement when tests are added to an existing registration.
    Debits the actor for the added charge and credits parents for those lines only.
    """
    actor = registration.created_by
    amount = _money(debit_amount)
    debit_txn = None
    if actor and actor.role in User.FRANCHISE_ROLES and amount > 0:
        zone = resolve_zone_for_rates(registration=registration, actor=actor)
        ids_key = '-'.join(str(i) for i in sorted(added_line_ids))
        batch_key = f'reg-debit-{registration.id}-add-{ids_key}'
        if not WalletTransaction.objects.filter(
            registration=registration,
            txn_type=WalletTransaction.TYPE_DEBIT,
            batch_key=batch_key,
        ).exists():
            debit_txn = apply_ledger_entry(
                user=actor,
                amount=amount,
                direction=WalletTransaction.DIR_DEBIT,
                txn_type=WalletTransaction.TYPE_DEBIT,
                description=f'Test addition charge for registration {registration.lab_code}',
                registration=registration,
                source_user=actor,
                created_by=created_by or actor,
                base_amount=amount,
                batch_key=batch_key,
                metadata={
                    'lab_code': registration.lab_code,
                    'zone_id': zone.id if zone else None,
                    'added_line_ids': list(added_line_ids),
                },
                allow_negative=True,
            )

    credits = distribute_registration_commissions(
        registration,
        created_by=created_by,
        line_ids=added_line_ids,
    )
    return {'debit': debit_txn, 'commissions': credits}


@transaction.atomic
def create_demo_transactions(
    *,
    actor,
    base_amount,
    created_by=None,
    note='',
) -> dict:
    """
    Mock/demo hierarchical credit distribution without a real registration.
    Uses legacy % of base_amount so balances can be verified without test catalog setup.
    """
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        raise WalletError('Demo actor must be a franchise role user.', field='actor_id')

    if not rates_are_active(actor=actor):
        raise WalletError('Franchise rates are inactive for this zone.', field='actor_id')

    zone = resolve_zone_for_rates(actor=actor)
    rate_row = get_zone_franchise_rate(zone) if zone else None
    base = _money(base_amount)
    if base <= 0:
        raise WalletError('base_amount must be greater than zero.', field='base_amount')

    beneficiaries = commission_beneficiaries(actor)
    batch_key = f'demo-{uuid.uuid4().hex}'
    transactions = _legacy_pct_credits(
        actor=actor,
        base=base,
        zone=zone,
        rate_row=rate_row,
        registration=None,
        created_by=created_by,
        batch_key=batch_key,
        txn_type=WalletTransaction.TYPE_DEMO,
    )
    # Prefer note on demo rows when provided.
    if note:
        for txn in transactions:
            WalletTransaction.objects.filter(pk=txn.pk).update(description=note)
            txn.description = note

    wallets = []
    for beneficiary in beneficiaries:
        wallet = get_or_create_wallet(beneficiary)
        wallet.refresh_from_db()
        wallets.append(wallet)

    return {
        'batch_key': batch_key,
        'base_amount': base,
        'transactions': transactions,
        'wallets': wallets,
    }


@transaction.atomic
def debit_registration_charge(registration: Registration, *, created_by=None) -> WalletTransaction | None:
    """Debit the booking actor's wallet for the registration net amount (may go negative)."""
    if not registration:
        return None

    initial_key = f'reg-debit-{registration.id}'
    existing = WalletTransaction.objects.filter(
        registration=registration,
        txn_type=WalletTransaction.TYPE_DEBIT,
        batch_key=initial_key,
    ).first()
    if existing:
        return existing
    # Legacy rows / older code paths without the initial batch key.
    legacy = (
        WalletTransaction.objects.filter(
            registration=registration,
            txn_type=WalletTransaction.TYPE_DEBIT,
        )
        .exclude(batch_key__contains='-add-')
        .order_by('id')
        .first()
    )
    if legacy:
        return legacy

    actor = registration.created_by
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        return None

    amount = _money(registration.net_amount)
    if amount <= 0:
        return None

    zone = resolve_zone_for_rates(registration=registration, actor=actor)
    return apply_ledger_entry(
        user=actor,
        amount=amount,
        direction=WalletTransaction.DIR_DEBIT,
        txn_type=WalletTransaction.TYPE_DEBIT,
        description=f'Booking charge for registration {registration.lab_code}',
        registration=registration,
        source_user=actor,
        created_by=created_by or actor,
        base_amount=amount,
        batch_key=initial_key,
        metadata={
            'lab_code': registration.lab_code,
            'zone_id': zone.id if zone else None,
        },
        allow_negative=True,
    )


@transaction.atomic
def admin_adjust_wallet(
    *,
    user,
    amount,
    direction,
    created_by,
    note='',
    allow_negative=True,
) -> WalletTransaction:
    """Admin manual credit or debit adjustment (offline settlement corrections)."""
    if user.role not in User.FRANCHISE_ROLES:
        raise WalletError('Adjustments apply to franchise wallets only.', field='user_id')
    amount = _money(amount)
    if amount <= 0:
        raise WalletError('Amount must be greater than zero.', field='amount')
    if direction not in {WalletTransaction.DIR_CREDIT, WalletTransaction.DIR_DEBIT}:
        raise WalletError('Invalid adjustment direction.', field='direction')
    return apply_ledger_entry(
        user=user,
        amount=amount,
        direction=direction,
        txn_type=WalletTransaction.TYPE_ADJUSTMENT,
        description=note or f'Balance adjustment by {created_by.username}',
        created_by=created_by,
        metadata={'adjustment': True, 'admin_id': created_by.id},
        allow_negative=allow_negative,
    )


@transaction.atomic
def admin_set_wallet_balance(*, user, target_balance, created_by, note='') -> WalletTransaction | None:
    """Set a franchise wallet to an exact balance (reset / offline settlement)."""
    if user.role not in User.FRANCHISE_ROLES:
        raise WalletError('Adjustments apply to franchise wallets only.', field='user_id')
    wallet = get_or_create_wallet(user)
    wallet.refresh_from_db(fields=['balance'])
    current = _money(wallet.balance)
    target = _money(target_balance)
    diff = target - current
    if diff == 0:
        return None
    if diff > 0:
        return admin_adjust_wallet(
            user=user,
            amount=diff,
            direction=WalletTransaction.DIR_CREDIT,
            created_by=created_by,
            note=note or f'Balance set to ₹{target} by {created_by.username}',
        )
    return admin_adjust_wallet(
        user=user,
        amount=abs(diff),
        direction=WalletTransaction.DIR_DEBIT,
        created_by=created_by,
        note=note or f'Balance set to ₹{target} by {created_by.username}',
        allow_negative=True,
    )


@transaction.atomic
def franchise_online_top_up(*, user, amount, created_by, payment_reference='') -> WalletTransaction:
    """Credit the caller's franchise wallet after an online payment (simulated gateway)."""
    if user.role not in User.FRANCHISE_ROLES:
        raise WalletError('Online top-up is available for franchise accounts only.', field='user_id')
    amount = _money(amount)
    if amount <= 0:
        raise WalletError('Amount must be greater than zero.', field='amount')
    ref = str(payment_reference or '').strip()
    return apply_ledger_entry(
        user=user,
        amount=amount,
        direction=WalletTransaction.DIR_CREDIT,
        txn_type=WalletTransaction.TYPE_TOP_UP,
        description=f'Online wallet top-up{f" ({ref})" if ref else ""}',
        created_by=created_by,
        metadata={'online': True, 'payment_reference': ref},
    )


@transaction.atomic
def admin_top_up_wallet(*, user, amount, created_by, note='') -> WalletTransaction:
    if user.role not in User.FRANCHISE_ROLES:
        raise WalletError('Credits can only be added to franchise wallets.', field='user_id')
    amount = _money(amount)
    if amount <= 0:
        raise WalletError('Amount must be greater than zero.', field='amount')
    return apply_ledger_entry(
        user=user,
        amount=amount,
        direction=WalletTransaction.DIR_CREDIT,
        txn_type=WalletTransaction.TYPE_TOP_UP,
        description=note or f'Manual credit top-up by {created_by.username}',
        created_by=created_by,
        metadata={'top_up': True, 'admin_id': created_by.id},
    )


def wallet_balance_for_user(user) -> Decimal:
    if not user or user.role not in User.FRANCHISE_ROLES:
        return Decimal('0.00')
    wallet = get_or_create_wallet(user)
    wallet.refresh_from_db(fields=['balance'])
    return _money(wallet.balance)


def can_release_report(registration: Registration) -> tuple[bool, str]:
    """
    Report release (verify/print) is blocked when the booking actor's wallet is negative.
    Returns (allowed, reason).
    """
    actor = registration.created_by if registration else None
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        return True, ''

    balance = wallet_balance_for_user(actor)
    if balance < 0:
        return False, (
            f'Report cannot be released. {actor.display_name or actor.username} '
            f'has a negative wallet balance (₹{balance}). Please add credits first.'
        )
    return True, ''


def assert_can_release_report(registration: Registration):
    allowed, reason = can_release_report(registration)
    if not allowed:
        raise WalletError(reason, field='wallet_balance')

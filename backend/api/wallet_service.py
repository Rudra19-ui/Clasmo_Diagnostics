"""
Franchise wallet balances and hierarchical commission distribution.

Commission flow (of registration net_amount):
- Sub-Franchise booking → Sub + Prime + Supreme credited (each at their configured %)
- Prime booking → Prime + Supreme credited
- Supreme booking → Supreme credited only

Prime/Sub never receive Supreme's wallet visibility (enforced via franchise_scope).
"""

from __future__ import annotations

import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F

from .models import (
    FranchiseCommissionConfig,
    FranchiseWallet,
    Registration,
    User,
    WalletTransaction,
)
from .zone_rates import (
    commission_pct_for_role,
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


def rate_for_role(config: FranchiseCommissionConfig, role: str) -> Decimal:
    """Legacy helper against the solo config (kept for older tests/callers)."""
    return commission_pct_for_role(None, role, solo=config)


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


def distribute_registration_commissions(registration: Registration, *, created_by=None) -> list[WalletTransaction]:
    """
    Credit wallets up the franchise hierarchy from registration.created_by.
    Idempotent per registration: skips if commission transactions already exist.
    """
    if not registration:
        return []

    if WalletTransaction.objects.filter(
        registration=registration,
        txn_type=WalletTransaction.TYPE_COMMISSION,
    ).exists():
        return list(
            WalletTransaction.objects.filter(
                registration=registration,
                txn_type=WalletTransaction.TYPE_COMMISSION,
            ).select_related('wallet__user')
        )

    actor = registration.created_by
    if not actor or actor.role not in User.FRANCHISE_ROLES:
        return []

    if not rates_are_active(registration=registration, actor=actor):
        return []

    zone = resolve_zone_for_rates(registration=registration, actor=actor)
    rate_row = get_zone_franchise_rate(zone) if zone else None

    base = _money(registration.net_amount)
    if base <= 0:
        return []

    beneficiaries = hierarchy_beneficiaries(actor)
    if not beneficiaries:
        return []

    batch_key = f'reg-{registration.id}-{uuid.uuid4().hex[:8]}'
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
        txn = apply_ledger_entry(
            user=beneficiary,
            amount=credit,
            direction=WalletTransaction.DIR_CREDIT,
            txn_type=WalletTransaction.TYPE_COMMISSION,
            description=(
                f'Commission {rate}% on registration {registration.lab_code} '
                f'(base {base}'
                f'{f", zone {zone.name}" if zone else ""})'
            ),
            registration=registration,
            source_user=actor,
            created_by=created_by or actor,
            commission_rate_pct=rate,
            base_amount=base,
            beneficiary_role=beneficiary.role,
            batch_key=batch_key,
            metadata={
                'lab_code': registration.lab_code,
                'source_role': actor.role,
                'zone_id': zone.id if zone else None,
                'zone_code': zone.code if zone else '',
            },
        )
        created.append(txn)
    return created


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
    Uses the same rates/chain as live commission distribution.
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

    beneficiaries = hierarchy_beneficiaries(actor)
    batch_key = f'demo-{uuid.uuid4().hex}'
    transactions: list[WalletTransaction] = []
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
        txn = apply_ledger_entry(
            user=beneficiary,
            amount=credit,
            direction=WalletTransaction.DIR_CREDIT,
            txn_type=WalletTransaction.TYPE_DEMO,
            description=note or f'Demo commission {rate}% on base {base}',
            source_user=actor,
            created_by=created_by or actor,
            commission_rate_pct=rate,
            base_amount=base,
            beneficiary_role=beneficiary.role,
            batch_key=batch_key,
            metadata={
                'demo': True,
                'source_role': actor.role,
                'zone_id': zone.id if zone else None,
                'zone_code': zone.code if zone else '',
            },
        )
        transactions.append(txn)

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

    if WalletTransaction.objects.filter(
        registration=registration,
        txn_type=WalletTransaction.TYPE_DEBIT,
    ).exists():
        return WalletTransaction.objects.filter(
            registration=registration,
            txn_type=WalletTransaction.TYPE_DEBIT,
        ).first()

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
        batch_key=f'reg-debit-{registration.id}',
        metadata={
            'lab_code': registration.lab_code,
            'zone_id': zone.id if zone else None,
        },
        allow_negative=True,
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

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
    if role == User.ROLE_SUB_FRANCHISE:
        return _money(config.sub_franchise_pct)
    if role == User.ROLE_FRANCHISEE:
        return _money(config.franchisee_pct)
    if role == User.ROLE_SUPER_FRANCHISEE:
        return _money(config.super_franchisee_pct)
    return Decimal('0.00')


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
        if wallet.balance < amount:
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

    config = FranchiseCommissionConfig.get_solo()
    if not config.is_active:
        return []

    base = _money(registration.net_amount)
    if base <= 0:
        return []

    beneficiaries = hierarchy_beneficiaries(actor)
    if not beneficiaries:
        return []

    batch_key = f'reg-{registration.id}-{uuid.uuid4().hex[:8]}'
    created: list[WalletTransaction] = []
    for beneficiary in beneficiaries:
        rate = rate_for_role(config, beneficiary.role)
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
                f'(base {base})'
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

    config = FranchiseCommissionConfig.get_solo()
    base = _money(base_amount)
    if base <= 0:
        raise WalletError('base_amount must be greater than zero.', field='base_amount')

    beneficiaries = hierarchy_beneficiaries(actor)
    batch_key = f'demo-{uuid.uuid4().hex}'
    transactions: list[WalletTransaction] = []
    for beneficiary in beneficiaries:
        rate = rate_for_role(config, beneficiary.role)
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
            metadata={'demo': True, 'source_role': actor.role},
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

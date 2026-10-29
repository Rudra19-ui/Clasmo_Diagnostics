"""Franchise bill (MRP), ledger investments, and sample usage helpers."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Count, Prefetch, Q, Sum

from .franchise_scope import (
    scope_barcodes_for_user,
    scope_registrations_for_user,
    scope_wallet_transactions_for_user,
    visible_creator_ids,
)
from .models import (
    FranchiseLedgerEvent,
    FranchiseWallet,
    PatientSampleBarcode,
    Registration,
    RegistrationTest,
    User,
    WalletTransaction,
)


TWOPLACES = Decimal('0.01')


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _patient_name(registration) -> str:
    if not registration or not registration.patient_id:
        return ''
    patient = registration.patient
    return (getattr(patient, 'display_name', None) or patient.patient_name or '').strip()


def _test_names(registration) -> str:
    if not registration:
        return ''
    names = []
    for row in registration.tests.all():
        name = ''
        if row.test_id and getattr(row.test, 'name', None):
            name = row.test.name
        if name:
            names.append(name)
    return ', '.join(names)


def _opening_closing_for_txn(txn: WalletTransaction) -> tuple[float, float]:
    amount = _money(txn.amount)
    closing = _money(txn.balance_after)
    if txn.direction == WalletTransaction.DIR_CREDIT:
        opening = closing - amount
    else:
        opening = closing + amount
    return float(opening), float(closing)


def _opening_closing_for_txns(txns: list[WalletTransaction]) -> tuple[float | None, float | None]:
    if not txns:
        return None, None
    ordered = sorted(txns, key=lambda item: (item.created_at, item.id))
    opening, _ = _opening_closing_for_txn(ordered[0])
    _, closing = _opening_closing_for_txn(ordered[-1])
    return opening, closing


def parse_ddmmyyyy(value):
    text = (value or '').strip()
    if not text:
        return None
    for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def registration_mrp_total(registration) -> Decimal:
    total = Decimal('0.00')
    for row in registration.tests.select_related('test').all():
        mrp = getattr(row.test, 'mrp', None)
        if mrp and _money(mrp) > 0:
            total += _money(mrp)
        else:
            total += _money(row.price)
    return total


def record_ledger_event(
    *,
    event_type,
    amount,
    user=None,
    registration=None,
    quantity=1,
    description='',
    metadata=None,
):
    return FranchiseLedgerEvent.objects.create(
        event_type=event_type,
        amount=_money(amount),
        quantity=max(1, int(quantity or 1)),
        description=(description or '')[:255],
        registration=registration,
        created_by=user,
        metadata=metadata or {},
    )


def apply_mrp_bill(registration, *, user=None, paid=None):
    """Rewrite line prices from Test.MRP and refresh bill totals. Returns registration."""
    rows = list(registration.tests.select_related('test').all())
    if not rows:
        raise ValueError('No tests on this booking to bill.')

    total = Decimal('0.00')
    for row in rows:
        mrp = _money(row.test.mrp) if row.test_id else Decimal('0.00')
        if mrp <= 0:
            mrp = _money(row.price)
        row.price = mrp
        row.save(update_fields=['price'])
        total += mrp

    discount_total = _money(registration.discount_test) + _money(registration.discount_regn)
    registration.total = total
    registration.net_amount = total + _money(registration.visiting_charges) - discount_total
    if paid is not None:
        registration.paid = _money(paid)
    registration.balance = registration.net_amount - _money(registration.paid)
    if not registration.bill_receipt_no:
        registration.bill_receipt_no = f'MRP-{registration.lab_code}'
    registration.save(
        update_fields=['total', 'net_amount', 'paid', 'balance', 'bill_receipt_no']
    )
    return registration


def scoped_registrations_in_range(user, from_date=None, to_date=None):
    qs = scope_registrations_for_user(
        user,
        Registration.objects.select_related('patient', 'created_by').prefetch_related('tests__test'),
    )
    if from_date:
        qs = qs.filter(registration_date__date__gte=from_date)
    if to_date:
        qs = qs.filter(registration_date__date__lte=to_date)
    return qs


def ledger_summary(user, from_date=None, to_date=None):
    """
    Ledger visibility for franchise roles:
    - Supreme: own entries + commission from Prime/Sub bookings (own wallet)
    - Prime: own entries + commission from Sub bookings (own wallet)
    - Sub: own entries only (no commission rows)
    Child entry/refund/addition rows are never listed on a parent account.
    """
    tests_prefetch = Prefetch(
        'registration__tests',
        queryset=RegistrationTest.objects.select_related('test'),
    )
    events = FranchiseLedgerEvent.objects.select_related(
        'registration',
        'registration__patient',
        'created_by',
    ).prefetch_related(tests_prefetch)

    is_franchise = bool(user and getattr(user, 'role', None) in User.FRANCHISE_ROLES)
    # Franchise ledger rows = own bookings only (not network descendants).
    if is_franchise:
        events = events.filter(
            Q(created_by_id=user.id) | Q(registration__created_by_id=user.id)
        )
    else:
        creator_ids = visible_creator_ids(user)
        if creator_ids is not None:
            events = events.filter(
                Q(created_by_id__in=creator_ids) | Q(registration__created_by_id__in=creator_ids)
            )

    if from_date:
        events = events.filter(created_at__date__gte=from_date)
    if to_date:
        events = events.filter(created_at__date__lte=to_date)

    def bucket(event_type):
        subset = events.filter(event_type=event_type)
        agg = subset.aggregate(total=Sum('amount'), count=Count('id'))
        return {
            'count': agg['count'] or 0,
            'amount': float(_money(agg['total'])),
        }

    # Investments follow the same own-booking scope for franchise viewers.
    if is_franchise:
        regs = Registration.objects.select_related('patient', 'created_by').prefetch_related(
            'tests__test'
        ).filter(created_by_id=user.id)
        if from_date:
            regs = regs.filter(registration_date__date__gte=from_date)
        if to_date:
            regs = regs.filter(registration_date__date__lte=to_date)
    else:
        regs = scoped_registrations_in_range(user, from_date, to_date)

    refund_agg = regs.filter(refund_amount__gt=0).aggregate(
        total=Sum('refund_amount'), count=Count('id')
    )
    refund_from_regs = {
        'count': refund_agg['count'] or 0,
        'amount': float(_money(refund_agg['total'])),
    }
    refund_from_events = bucket(FranchiseLedgerEvent.TYPE_REFUND)
    refund = {
        'count': refund_from_regs['count'] + refund_from_events['count'],
        'amount': float(_money(refund_from_regs['amount'] + refund_from_events['amount'])),
    }

    entries = bucket(FranchiseLedgerEvent.TYPE_ENTRY)
    # Fallback: if no ledger events yet, treat registrations as entries.
    if entries['count'] == 0:
        entry_amount = Decimal('0.00')
        for reg in regs:
            entry_amount += registration_mrp_total(reg)
        entries = {'count': regs.count(), 'amount': float(entry_amount)}

    additions = bucket(FranchiseLedgerEvent.TYPE_TEST_ADDITION)
    total_amount = _money(entries['amount']) + _money(additions['amount']) - _money(refund['amount'])

    # Own-wallet activity — opening/closing; commissions for Supreme/Prime only.
    own_wallet_qs = scope_wallet_transactions_for_user(
        user,
        WalletTransaction.objects.select_related(
            'wallet__user',
            'registration',
            'registration__patient',
        ).prefetch_related(
            Prefetch(
                'registration__tests',
                queryset=RegistrationTest.objects.select_related('test'),
            )
        ),
    ).filter(wallet__user_id=user.id)
    period_wallet_qs = own_wallet_qs
    if from_date:
        period_wallet_qs = period_wallet_qs.filter(created_at__date__gte=from_date)
    if to_date:
        period_wallet_qs = period_wallet_qs.filter(created_at__date__lte=to_date)

    own_wallet_txns = list(period_wallet_qs.order_by('created_at', 'id')[:500])
    own_by_reg: dict[int, list[WalletTransaction]] = {}
    for txn in own_wallet_txns:
        if txn.registration_id:
            own_by_reg.setdefault(txn.registration_id, []).append(txn)

    period_opening = None
    period_closing = None
    if own_wallet_txns:
        period_opening, _ = _opening_closing_for_txn(own_wallet_txns[0])
        _, period_closing = _opening_closing_for_txn(own_wallet_txns[-1])
    else:
        wallet = FranchiseWallet.objects.filter(user_id=user.id).first()
        if wallet is not None:
            bal = float(_money(wallet.balance))
            period_opening = bal
            period_closing = bal

    rows = []
    for event in events.order_by('-created_at')[:200]:
        registration = event.registration
        related = own_by_reg.get(event.registration_id, []) if event.registration_id else []
        # Entry/refund/addition rows use non-commission wallet moves (usually debit).
        impact = [
            txn for txn in related
            if txn.txn_type != WalletTransaction.TYPE_COMMISSION
        ] or related
        opening, closing = _opening_closing_for_txns(impact)
        rows.append({
            'id': f'event-{event.id}',
            'source': 'ledger',
            'event_type': event.event_type,
            'amount': float(_money(event.amount)),
            'quantity': event.quantity,
            'description': event.description or '',
            'created_at': event.created_at.isoformat() if event.created_at else '',
            'lab_code': registration.lab_code if registration else '',
            'created_by': (
                event.created_by.username if event.created_by_id else ''
            ),
            'patient_name': _patient_name(registration),
            'test_names': _test_names(registration),
            'opening_balance': opening,
            'closing_balance': closing,
            'commission_rate_pct': None,
            'base_amount': None,
        })

    # Commission on same list for Supreme/Prime (own wallet credits from child bookings).
    # Sub-Franchise never shows commission rows.
    show_commission = (
        not is_franchise
        or getattr(user, 'role', None) in {
            User.ROLE_SUPER_FRANCHISEE,
            User.ROLE_FRANCHISEE,
        }
    )
    if show_commission:
        for txn in reversed(own_wallet_txns):
            if txn.txn_type != WalletTransaction.TYPE_COMMISSION:
                continue
            registration = txn.registration
            opening, closing = _opening_closing_for_txn(txn)
            rows.append({
                'id': f'commission-{txn.id}',
                'source': 'wallet',
                'event_type': 'commission',
                'amount': float(_money(txn.amount)),
                'quantity': 1,
                'description': txn.description or 'Commission credit',
                'created_at': txn.created_at.isoformat() if txn.created_at else '',
                'lab_code': (
                    registration.lab_code
                    if registration
                    else (txn.metadata or {}).get('lab_code', '') or ''
                ),
                'created_by': '',
                'patient_name': _patient_name(registration),
                'test_names': _test_names(registration),
                'opening_balance': opening,
                'closing_balance': closing,
                'commission_rate_pct': (
                    float(_money(txn.commission_rate_pct))
                    if txn.commission_rate_pct is not None
                    else None
                ),
                'base_amount': (
                    float(_money(txn.base_amount)) if txn.base_amount is not None else None
                ),
            })

    rows.sort(key=lambda row: row.get('created_at') or '', reverse=True)
    rows = rows[:300]

    return {
        'from_date': from_date.isoformat() if from_date else '',
        'to_date': to_date.isoformat() if to_date else '',
        'investments': {
            'entries': entries,
            'test_additions': additions,
            'refund': refund,
            'total': float(total_amount),
        },
        'wallet': {
            'opening_balance': period_opening,
            'closing_balance': period_closing,
        },
        'rows': rows,
    }


def sample_usage_summary(user, from_date=None, to_date=None):
    regs = scoped_registrations_in_range(user, from_date, to_date)
    reg_ids = list(regs.values_list('id', flat=True))

    barcodes = scope_barcodes_for_user(
        user,
        PatientSampleBarcode.objects.filter(is_active=True),
    )
    if from_date or to_date:
        barcode_q = Q()
        if from_date:
            barcode_q &= Q(linked_at__date__gte=from_date) | Q(registration__registration_date__date__gte=from_date)
        if to_date:
            barcode_q &= Q(linked_at__date__lte=to_date) | Q(registration__registration_date__date__lte=to_date)
        barcodes = barcodes.filter(barcode_q)
    if reg_ids:
        barcodes = barcodes.filter(Q(registration_id__in=reg_ids) | Q(registration__isnull=True))

    sample_type_counts = list(
        barcodes.exclude(sample_type='')
        .values('sample_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Also include test-level sample types from ordered tests in range.
    test_samples = (
        RegistrationTest.objects.filter(registration_id__in=reg_ids)
        .exclude(test__sample_type='')
        .values('test__sample_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    merged = {}
    for row in sample_type_counts:
        merged[row['sample_type']] = merged.get(row['sample_type'], 0) + row['count']
    for row in test_samples:
        key = row['test__sample_type']
        merged[key] = merged.get(key, 0) + row['count']

    types = [
        {'sample_type': name, 'count': count}
        for name, count in sorted(merged.items(), key=lambda item: (-item[1], item[0]))
    ]
    samples_sent = barcodes.count() or sum(item['count'] for item in types)
    # Approx pages: ~1 page per 8 parameters/tests, minimum 1 page per billed registration.
    test_count = RegistrationTest.objects.filter(registration_id__in=reg_ids).count()
    pages_approx = max(regs.count(), (test_count + 7) // 8) if (regs.exists() or test_count) else 0

    return {
        'from_date': from_date.isoformat() if from_date else '',
        'to_date': to_date.isoformat() if to_date else '',
        'samples_sent_to_lab': samples_sent,
        'sample_types': types,
        'pages_usage_approx': pages_approx,
        'registration_count': regs.count(),
        'test_count': test_count,
    }

"""Franchise bill (MRP), ledger investments, and sample usage helpers."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Count, Q, Sum

from .franchise_scope import scope_barcodes_for_user, scope_registrations_for_user
from .models import FranchiseLedgerEvent, PatientSampleBarcode, Registration, RegistrationTest


TWOPLACES = Decimal('0.01')


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


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
    events = FranchiseLedgerEvent.objects.select_related('registration', 'created_by')
    creator_ids = None
    from .franchise_scope import visible_creator_ids
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

    # Refunds also pulled from registration.refund_amount in range (covers bill refunds).
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

    rows = list(
        events.order_by('-created_at')[:200].values(
            'id', 'event_type', 'amount', 'quantity', 'description', 'created_at',
            'registration__lab_code', 'created_by__username',
        )
    )
    for row in rows:
        row['amount'] = float(_money(row['amount']))
        row['lab_code'] = row.pop('registration__lab_code') or ''
        row['created_by'] = row.pop('created_by__username') or ''
        row['created_at'] = row['created_at'].isoformat() if row['created_at'] else ''

    return {
        'from_date': from_date.isoformat() if from_date else '',
        'to_date': to_date.isoformat() if to_date else '',
        'investments': {
            'entries': entries,
            'test_additions': additions,
            'refund': refund,
            'total': float(total_amount),
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

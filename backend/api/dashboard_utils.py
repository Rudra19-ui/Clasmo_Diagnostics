"""Dashboard aggregation helpers."""
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Sum, F, Q, Avg, DurationField, ExpressionWrapper
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .models import (
    Registration,
    RegistrationTest,
    Report,
    Test,
    TestCategory,
    CollectionCenter,
    Affiliation,
    SalesReference,
)


def parse_dashboard_date(value):
    text = (value or '').strip()
    if not text:
        return None
    for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _decimal(value):
    if value is None:
        return Decimal('0')
    return Decimal(str(value))


def registration_queryset(from_date=None, to_date=None, user=None):
    from .franchise_scope import scope_registrations_for_user

    qs = Registration.objects.select_related('patient').all()
    if user is not None:
        qs = scope_registrations_for_user(user, qs)
    if from_date:
        qs = qs.filter(registration_date__date__gte=from_date)
    if to_date:
        qs = qs.filter(registration_date__date__lte=to_date)
    return qs


def card_stats(qs):
    agg = qs.aggregate(
        registrations=Count('id'),
        total_amount=Sum('total'),
        paid_amount=Sum('paid'),
        balance_amount=Sum('balance'),
        amount_after_discount=Sum('net_amount'),
    )
    return {
        'registrations': agg['registrations'] or 0,
        'total_amount': float(_decimal(agg['total_amount'])),
        'paid_amount': float(_decimal(agg['paid_amount'])),
        'balance_amount': float(_decimal(agg['balance_amount'])),
        'amount_after_discount': float(_decimal(agg['amount_after_discount'])),
    }


def summary_cards(from_date, to_date, user=None):
    qs = registration_queryset(from_date, to_date, user=user)
    return {
        'all': card_stats(qs),
        'ipd': card_stats(qs.filter(patient__patient_type='I.P.D.')),
        'opd': card_stats(qs.filter(patient__patient_type='O.P.D.')),
    }


def test_status_summary(from_date, to_date, user=None):
    reg_qs = registration_queryset(from_date, to_date, user=user)
    registration_count = reg_qs.count()
    report_qs = Report.objects.filter(registration__in=reg_qs)
    entered = report_qs.filter(status=Report.STATUS_ENTERED).count()
    approved = report_qs.filter(status=Report.STATUS_VERIFIED).count()
    pending = report_qs.filter(status=Report.STATUS_PENDING).count()
    return [
        {'label': 'Result Approve', 'value': approved, 'color': '#c0392b'},
        {'label': 'Registration', 'value': registration_count, 'color': '#e67e22'},
        {'label': 'Result Entered', 'value': entered, 'color': '#5dade2'},
        {'label': 'Pending', 'value': pending, 'color': '#95a5a6'},
    ]


def tat_summary(from_date, to_date, test_id=None, user=None):
    reg_qs = registration_queryset(from_date, to_date, user=user)
    rt_qs = RegistrationTest.objects.filter(
        registration__in=reg_qs,
        registration__clinical_report__status=Report.STATUS_VERIFIED,
    ).select_related('test', 'registration', 'registration__clinical_report')

    if test_id:
        rt_qs = rt_qs.filter(test_id=test_id)

    rows = []
    tests = (
        rt_qs.values('test_id', 'test__name', 'test__short_name')
        .annotate(avg_hours=Avg(
            ExpressionWrapper(
                F('registration__clinical_report__updated_at') - F('registration__registration_date'),
                output_field=DurationField(),
            )
        ))
        .order_by('test__name')[:20]
    )
    for item in tests:
        avg = item['avg_hours']
        hours = round(avg.total_seconds() / 3600, 2) if avg else 0
        label = item['test__short_name'] or item['test__name'] or 'Unknown'
        rows.append({'test_id': item['test_id'], 'label': label, 'tat_hours': hours})

    if not rows:
        for test in Test.objects.all().order_by('name')[:10]:
            rows.append({'test_id': test.id, 'label': test.short_name or test.name, 'tat_hours': 0})
    return rows


def department_wise_summary(from_date, to_date, department_ids=None, category_ids=None, user=None):
    reg_qs = registration_queryset(from_date, to_date, user=user)
    rt_qs = RegistrationTest.objects.filter(registration__in=reg_qs).select_related('test__category')

    if department_ids:
        rt_qs = rt_qs.filter(test__category_id__in=department_ids)
    if category_ids:
        rt_qs = rt_qs.filter(test__category_id__in=category_ids)

    categories = list(
        rt_qs.values('test__category__name')
        .annotate(net_amount=Sum(F('price') - F('discount')), count=Count('id'))
        .order_by('-net_amount')
    )

    palette = [
        '#5dade2', '#e67e22', '#ec407a', '#1a5276', '#82e0aa',
        '#117a65', '#922b21', '#566573', '#8e44ad', '#abebc6', '#f5cba7',
    ]
    segments = []
    for idx, row in enumerate(categories):
        name = row['test__category__name'] or 'Uncategorized'
        amount = float(_decimal(row['net_amount']))
        if amount > 0 or row['count']:
            segments.append({
                'department': name,
                'net_amount': amount,
                'count': row['count'],
                'color': palette[idx % len(palette)],
            })

    month_label = timezone.now().strftime('%B-%Y')
    if from_date:
        month_label = from_date.strftime('%B-%Y')

    return {
        'month_label': month_label,
        'segments': segments,
        'total_net_amount': sum(item['net_amount'] for item in segments),
    }


def collection_center_summary(from_date, to_date, user=None):
    reg_qs = registration_queryset(from_date, to_date, user=user)
    rows = list(
        reg_qs.values('patient__collection_center')
        .annotate(
            net_amount=Sum('net_amount'),
            registration_count=Count('id'),
        )
        .order_by('-net_amount')
    )
    return [
        {
            'center': row['patient__collection_center'] or 'Unknown',
            'net_amount': float(_decimal(row['net_amount'])),
            'registration_count': row['registration_count'],
        }
        for row in rows
    ]


def affiliation_wise_summary(from_date, to_date, mode='registration', affiliation='', user=None):
    reg_qs = registration_queryset(from_date, to_date, user=user)
    if affiliation:
        reg_qs = reg_qs.filter(patient__affiliation__icontains=affiliation)

    type_map = {
        'O.P.D.': 'OPD',
        'I.P.D.': 'IPD',
        'Corporate': 'Corporate',
    }
    rows = []
    for patient_type, label in type_map.items():
        subset = reg_qs.filter(patient__patient_type=patient_type)
        count = subset.count()
        net_amount = float(_decimal(subset.aggregate(total=Sum('net_amount'))['total']))
        rows.append({
            'affiliation': label,
            'registration_count': count,
            'registration_wise_count': count,
            'net_amount': net_amount,
        })

    if mode == 'amount':
        for row in rows:
            row['registration_wise_count'] = row['net_amount']

    return rows


def affiliation_history(from_date, to_date, period='1m', user=None):
    end = to_date or timezone.localdate()
    if period == '1w':
        start = end - timedelta(days=7)
        trunc = None
    elif period == '6m':
        start = end - timedelta(days=183)
        trunc = TruncMonth('registration_date')
    elif period == '1y':
        start = end - timedelta(days=365)
        trunc = TruncMonth('registration_date')
    else:
        start = end - timedelta(days=30)
        trunc = TruncMonth('registration_date')

    qs = Registration.objects.filter(registration_date__date__gte=start, registration_date__date__lte=end)
    from .franchise_scope import scope_registrations_for_user
    qs = scope_registrations_for_user(user, qs)

    if trunc:
        grouped = (
            qs.annotate(period=trunc)
            .values('period')
            .annotate(
                registration_count=Count('id'),
                net_amount=Sum('net_amount'),
            )
            .order_by('period')
        )
        return [
            {
                'label': item['period'].strftime('%b-%Y') if item['period'] else '',
                'registration_count': item['registration_count'],
                'net_amount': float(_decimal(item['net_amount'])),
            }
            for item in grouped
        ]

    grouped = (
        qs.values('registration_date__date')
        .annotate(registration_count=Count('id'), net_amount=Sum('net_amount'))
        .order_by('registration_date__date')
    )
    return [
        {
            'label': item['registration_date__date'].strftime('%d-%b') if item['registration_date__date'] else '',
            'registration_count': item['registration_count'],
            'net_amount': float(_decimal(item['net_amount'])),
        }
        for item in grouped
    ]


def filter_options():
    return {
        'departments': list(TestCategory.objects.order_by('name').values('id', 'name')),
        'categories': list(TestCategory.objects.order_by('name').values('id', 'name')),
        'tests': list(Test.objects.order_by('name').values('id', 'name', 'short_name')),
        'collection_centers': list(CollectionCenter.objects.order_by('name').values('id', 'name')),
        'affiliations': list(Affiliation.objects.order_by('name').values('id', 'name')),
        'sales_reps': list(SalesReference.objects.order_by('name').values('id', 'name')),
    }

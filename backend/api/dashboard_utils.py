"""Dashboard aggregation helpers."""
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Sum, F, Q, Avg, DurationField, ExpressionWrapper
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from .models import (
    Patient,
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


def _month_bounds(year, month):
    start = datetime(year, month, 1).date()
    if month == 12:
        end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
    else:
        end = datetime(year, month + 1, 1).date() - timedelta(days=1)
    return start, end


def _year_bounds(year):
    return datetime(year, 1, 1).date(), datetime(year, 12, 31).date()


_FRANCHISE_ROLE_ORDER = (
    'super_franchisee',
    'franchisee',
    'sub_franchise',
)

_FRANCHISE_ROLE_LABELS = {
    'super_franchisee': 'Supreme',
    'franchisee': 'Prime',
    'sub_franchise': 'Sub-Franchise',
}


def _empty_money_stats():
    return {
        'registrations': 0,
        'total_amount': 0.0,
        'net_amount': 0.0,
        'paid_amount': 0.0,
        'balance_amount': 0.0,
    }


def _stats_from_agg(row=None):
    row = row or {}
    return {
        'registrations': int(row.get('registrations') or 0),
        'total_amount': float(_decimal(row.get('total_amount'))),
        'net_amount': float(_decimal(row.get('net_amount'))),
        'paid_amount': float(_decimal(row.get('paid_amount'))),
        'balance_amount': float(_decimal(row.get('balance_amount'))),
    }


def _add_stats(target, source):
    target['registrations'] += source['registrations']
    target['total_amount'] += source['total_amount']
    target['net_amount'] += source['net_amount']
    target['paid_amount'] += source['paid_amount']
    target['balance_amount'] += source['balance_amount']


def _round_stats(stats):
    for key in ('total_amount', 'net_amount', 'paid_amount', 'balance_amount'):
        stats[key] = round(stats[key], 2)
    return stats


def _franchise_breakdown_for_zone(zone_obj, zone_regs_qs):
    """
    Supreme / Prime / Sub income for one zone, plus Lab/Staff for non-franchise bookings.
    Income is attributed by registration.created_by (no hierarchy double-counting).
    """
    from .models import User

    franchise_users = list(
        User.objects.filter(
            zone_id=zone_obj.id if zone_obj else None,
            role__in=_FRANCHISE_ROLE_ORDER,
            is_active=True,
        ).order_by('role', 'username')
    )
    # Keep role order Supreme → Prime → Sub even if multiple accounts share a role.
    franchise_users.sort(
        key=lambda u: (_FRANCHISE_ROLE_ORDER.index(u.role) if u.role in _FRANCHISE_ROLE_ORDER else 99, u.username)
    )

    by_creator = {
        row['created_by_id']: _stats_from_agg(row)
        for row in zone_regs_qs.values('created_by_id').annotate(
            registrations=Count('id'),
            total_amount=Sum('total'),
            net_amount=Sum('net_amount'),
            paid_amount=Sum('paid'),
            balance_amount=Sum('balance'),
        )
    }

    franchise_ids = {u.id for u in franchise_users}
    franchises = []
    for fu in franchise_users:
        stats = by_creator.get(fu.id) or _empty_money_stats()
        franchises.append({
            'user_id': fu.id,
            'username': fu.username,
            'display_name': fu.display_name or fu.username,
            'role': fu.role,
            'role_label': _FRANCHISE_ROLE_LABELS.get(fu.role, fu.get_role_display()),
            **_round_stats(dict(stats)),
        })

    # Always show all three franchise roles for the zone, even if account missing.
    present_roles = {f['role'] for f in franchises}
    for role in _FRANCHISE_ROLE_ORDER:
        if role in present_roles:
            continue
        franchises.append({
            'user_id': None,
            'username': '',
            'display_name': f'{_FRANCHISE_ROLE_LABELS[role]} (not created)',
            'role': role,
            'role_label': _FRANCHISE_ROLE_LABELS[role],
            **_empty_money_stats(),
        })
    franchises.sort(
        key=lambda row: (_FRANCHISE_ROLE_ORDER.index(row['role']) if row['role'] in _FRANCHISE_ROLE_ORDER else 99)
    )

    other = _empty_money_stats()
    for creator_id, stats in by_creator.items():
        if creator_id in franchise_ids:
            continue
        _add_stats(other, stats)

    return franchises, _round_stats(other)


def zone_period_income(
    *,
    period='day',
    report_date=None,
    year=None,
    month=None,
    zone_id=None,
    user=None,
):
    """
    Income by zone for a day / month / year, with Supreme/Prime/Sub franchise split.
    Optional zone_id filters to one zone; otherwise includes all active zones.
    """
    from .models import Zone

    today = timezone.localdate()
    period = (period or 'day').strip().lower()
    if period not in {'day', 'month', 'year'}:
        period = 'day'

    if period == 'day':
        day = report_date or today
        from_date, to_date = day, day
        label = day.isoformat()
    elif period == 'month':
        y = int(year or today.year)
        m = int(month or today.month)
        if m < 1 or m > 12:
            m = today.month
        from_date, to_date = _month_bounds(y, m)
        label = f'{y:04d}-{m:02d}'
    else:
        y = int(year or today.year)
        from_date, to_date = _year_bounds(y)
        label = f'{y:04d}'

    qs = registration_queryset(from_date, to_date, user=user)
    selected_zone_id = None
    if zone_id not in (None, '', 'all'):
        try:
            selected_zone_id = int(zone_id)
        except (TypeError, ValueError):
            selected_zone_id = None
    if selected_zone_id is not None:
        qs = qs.filter(zone_id=selected_zone_id)

    grouped = {
        row['zone_id']: row
        for row in qs.values('zone_id').annotate(
            registrations=Count('id'),
            total_amount=Sum('total'),
            net_amount=Sum('net_amount'),
            paid_amount=Sum('paid'),
            balance_amount=Sum('balance'),
        )
    }

    zone_qs = Zone.objects.filter(is_active=True).order_by('sort_order', 'id')
    if selected_zone_id is not None:
        zone_qs = zone_qs.filter(pk=selected_zone_id)

    zones = []
    totals = _empty_money_stats()
    franchise_totals = {
        role: {**_empty_money_stats(), 'role': role, 'role_label': _FRANCHISE_ROLE_LABELS[role]}
        for role in _FRANCHISE_ROLE_ORDER
    }
    lab_staff_totals = _empty_money_stats()

    def _append_zone(zone_obj, row):
        stats = _stats_from_agg(row)
        zone_regs = qs.filter(zone_id=zone_obj.id) if zone_obj else qs.filter(zone__isnull=True)
        franchises, other = _franchise_breakdown_for_zone(zone_obj, zone_regs)
        item = {
            'zone_id': zone_obj.id if zone_obj else None,
            'zone_code': zone_obj.code if zone_obj else 'unassigned',
            'zone_name': zone_obj.name if zone_obj else 'Unassigned',
            **_round_stats(dict(stats)),
            'franchises': franchises,
            'lab_staff': other,
        }
        zones.append(item)
        _add_stats(totals, stats)
        for franchise in franchises:
            role = franchise.get('role')
            if role in franchise_totals:
                _add_stats(franchise_totals[role], franchise)
        _add_stats(lab_staff_totals, other)

    for zone in zone_qs:
        _append_zone(zone, grouped.get(zone.id))

    # Only include unassigned when viewing all zones.
    if selected_zone_id is None:
        unzoned = grouped.get(None)
        if unzoned:
            _append_zone(None, unzoned)

    _round_stats(totals)
    for role_stats in franchise_totals.values():
        _round_stats(role_stats)
    _round_stats(lab_staff_totals)

    # eLAB-style All / IPD / OPD summary cards for the filtered period + zone.
    def _patient_type_card(subset):
        stats = card_stats(subset)
        return {
            'registrations': stats['registrations'],
            'total_amount': stats['total_amount'],
            'paid_amount': stats['paid_amount'],
            'balance_amount': stats['balance_amount'],
            'amount_after_discount': stats['amount_after_discount'],
            'net_amount': stats['amount_after_discount'],
        }

    summary_cards = {
        'all': _patient_type_card(qs),
        'ipd': _patient_type_card(qs.filter(patient__patient_type='I.P.D.')),
        'opd': _patient_type_card(qs.filter(patient__patient_type='O.P.D.')),
    }

    return {
        'period': period,
        'label': label,
        'from_date': from_date.isoformat(),
        'to_date': to_date.isoformat(),
        'date': from_date.isoformat() if period == 'day' else label,
        'zone_id': selected_zone_id,
        'zones': zones,
        'totals': totals,
        'franchise_totals': [franchise_totals[role] for role in _FRANCHISE_ROLE_ORDER],
        'lab_staff_totals': lab_staff_totals,
        'summary_cards': summary_cards,
    }


def zone_daily_income(report_date, user=None, zone_id=None):
    """Backward-compatible wrapper for single-day zone income. """
    return zone_period_income(
        period='day',
        report_date=report_date,
        zone_id=zone_id,
        user=user,
    )


def my_business_analytics(*, zone_id=None, days=14, user=None):
    """
    Super Admin My Business charts for one zone (or all zones if zone_id is empty).
    Includes daily revenue, test completed vs pending, franchise performance,
    and new patient acquisition.
    """
    from .models import Zone, User

    today = timezone.localdate()
    try:
        days = max(7, min(60, int(days or 14)))
    except (TypeError, ValueError):
        days = 14
    from_date = today - timedelta(days=days - 1)

    selected_zone_id = None
    zone_name = 'All Zones'
    if zone_id not in (None, '', 'all'):
        try:
            selected_zone_id = int(zone_id)
        except (TypeError, ValueError):
            selected_zone_id = None
    if selected_zone_id is not None:
        zone = Zone.objects.filter(pk=selected_zone_id, is_active=True).first()
        if zone:
            zone_name = zone.name
        else:
            selected_zone_id = None
            zone_name = 'All Zones'

    reg_qs = registration_queryset(from_date, today, user=user)
    if selected_zone_id is not None:
        reg_qs = reg_qs.filter(zone_id=selected_zone_id)

    daily_rows = {
        row['day']: row
        for row in reg_qs.annotate(day=TruncDate('registration_date'))
        .values('day')
        .annotate(
            registrations=Count('id'),
            net_amount=Sum('net_amount'),
            paid_amount=Sum('paid'),
        )
    }
    daily_revenue = []
    cursor = from_date
    while cursor <= today:
        row = daily_rows.get(cursor) or {}
        daily_revenue.append({
            'date': cursor.isoformat(),
            'label': cursor.strftime('%d %b'),
            'registrations': int(row.get('registrations') or 0),
            'net_amount': float(_decimal(row.get('net_amount'))),
            'paid_amount': float(_decimal(row.get('paid_amount'))),
        })
        cursor += timedelta(days=1)

    status_counts = {
        item['status']: item['count']
        for item in reg_qs.values('status').annotate(count=Count('id'))
    }
    completed_statuses = {
        Registration.STATUS_RESULT_READY,
        Registration.STATUS_PRINTED,
    }
    pending_statuses = {
        Registration.STATUS_REGISTERED,
        Registration.STATUS_COLLECTION,
    }
    completed = sum(status_counts.get(s, 0) for s in completed_statuses)
    pending = sum(status_counts.get(s, 0) for s in pending_statuses)
    other_status = sum(
        count for status, count in status_counts.items()
        if status not in completed_statuses and status not in pending_statuses
    )
    test_status = [
        {'label': 'Completed', 'value': completed, 'color': '#1abc9c'},
        {'label': 'Pending', 'value': pending, 'color': '#e67e22'},
    ]
    if other_status:
        test_status.append({'label': 'Other', 'value': other_status, 'color': '#95a5a6'})

    status_detail = [
        {'label': status or 'Unknown', 'value': count, 'color': '#5dade2'}
        for status, count in sorted(status_counts.items(), key=lambda item: -item[1])
    ]

    franchise_users = User.objects.filter(
        role__in=_FRANCHISE_ROLE_ORDER,
        is_active=True,
    )
    if selected_zone_id is not None:
        franchise_users = franchise_users.filter(zone_id=selected_zone_id)
    franchise_users = list(franchise_users.select_related('zone').order_by('role', 'username'))

    by_creator = {
        row['created_by_id']: row
        for row in reg_qs.filter(created_by_id__isnull=False)
        .values('created_by_id')
        .annotate(
            registrations=Count('id'),
            net_amount=Sum('net_amount'),
            paid_amount=Sum('paid'),
        )
    }
    franchise_colors = {
        'super_franchisee': '#c0392b',
        'franchisee': '#e67e22',
        'sub_franchise': '#5dade2',
    }
    franchise_performance = []
    for fu in franchise_users:
        stats = by_creator.get(fu.id) or {}
        franchise_performance.append({
            'user_id': fu.id,
            'label': fu.display_name or fu.username,
            'username': fu.username,
            'role': fu.role,
            'role_label': _FRANCHISE_ROLE_LABELS.get(fu.role, fu.get_role_display()),
            'zone_name': fu.zone.name if fu.zone_id else '',
            'registrations': int(stats.get('registrations') or 0),
            'net_amount': float(_decimal(stats.get('net_amount'))),
            'paid_amount': float(_decimal(stats.get('paid_amount'))),
            'color': franchise_colors.get(fu.role, '#95a5a6'),
            'active': bool(stats.get('registrations')),
        })
    franchise_performance.sort(key=lambda row: (-row['net_amount'], row['label']))
    active_franchise_count = sum(1 for row in franchise_performance if row['active'])

    role_perf = {
        role: {
            'label': _FRANCHISE_ROLE_LABELS[role],
            'role': role,
            'registrations': 0,
            'net_amount': 0.0,
            'color': franchise_colors[role],
        }
        for role in _FRANCHISE_ROLE_ORDER
    }
    for row in franchise_performance:
        bucket = role_perf.get(row['role'])
        if not bucket:
            continue
        bucket['registrations'] += row['registrations']
        bucket['net_amount'] += row['net_amount']
    franchise_role_performance = [
        {**role_perf[role], 'net_amount': round(role_perf[role]['net_amount'], 2)}
        for role in _FRANCHISE_ROLE_ORDER
    ]

    patient_qs = Patient.objects.filter(
        is_active=True,
        created_at__date__gte=from_date,
        created_at__date__lte=today,
    )
    if selected_zone_id is not None:
        patient_qs = patient_qs.filter(zone_id=selected_zone_id)
    patient_days = {
        row['day']: row['count']
        for row in patient_qs.annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
    }
    new_patients = []
    cursor = from_date
    while cursor <= today:
        count = int(patient_days.get(cursor) or 0)
        new_patients.append({
            'date': cursor.isoformat(),
            'label': cursor.strftime('%d %b'),
            'registration_count': count,
            'count': count,
        })
        cursor += timedelta(days=1)
    new_patient_total = sum(item['count'] for item in new_patients)

    period_cards = card_stats(reg_qs)
    return {
        'zone_id': selected_zone_id,
        'zone_name': zone_name,
        'from_date': from_date.isoformat(),
        'to_date': today.isoformat(),
        'days': days,
        'summary': {
            **period_cards,
            'completed_tests': completed,
            'pending_tests': pending,
            'new_patients': new_patient_total,
            'active_franchises': active_franchise_count,
            'franchise_accounts': len(franchise_performance),
        },
        'daily_revenue': daily_revenue,
        'test_status': test_status,
        'status_detail': status_detail,
        'franchise_performance': franchise_performance[:20],
        'franchise_role_performance': franchise_role_performance,
        'new_patients': new_patients,
    }

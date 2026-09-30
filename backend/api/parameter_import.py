"""Bulk CSV import / export for TestParameter rows and sample-report bootstrap."""

from __future__ import annotations

import csv
import io
import re
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count, Q

from .models import Test, TestParameter

TEMPLATE_HEADERS = [
    'test_code',
    'test_name',
    'parameter_name',
    'unit',
    'method',
    'reference_range_male',
    'reference_range_female',
    'reference_range_child',
    'critical_low',
    'critical_high',
    'sample_value',
    'analyzer_code',
    'sort_order',
    'is_active',
]

HEADER_ALIASES = {
    'testcode': 'test_code',
    'code': 'test_code',
    'test_id': 'test_id',
    'testid': 'test_id',
    'test': 'test_name',
    'testname': 'test_name',
    'parameter': 'parameter_name',
    'parametername': 'parameter_name',
    'param': 'parameter_name',
    'ref_male': 'reference_range_male',
    'ref_female': 'reference_range_female',
    'ref_child': 'reference_range_child',
    'reference_male': 'reference_range_male',
    'reference_female': 'reference_range_female',
    'reference_child': 'reference_range_child',
    'sample': 'sample_value',
    'example_value': 'sample_value',
    'order': 'sort_order',
    'active': 'is_active',
}


def _norm_header(value: str) -> str:
    key = re.sub(r'[^a-z0-9]+', '_', (value or '').strip().lower()).strip('_')
    return HEADER_ALIASES.get(key.replace('_', ''), HEADER_ALIASES.get(key, key))


def _cell(row: dict, *keys: str) -> str:
    for key in keys:
        if key in row and row[key] is not None:
            return str(row[key]).strip()
    return ''


def _parse_bool(value: str, default: bool = True) -> bool:
    text = (value or '').strip().lower()
    if not text:
        return default
    if text in {'1', 'true', 'yes', 'y', 'active'}:
        return True
    if text in {'0', 'false', 'no', 'n', 'inactive'}:
        return False
    return default


def _parse_decimal(value: str):
    text = (value or '').strip()
    if not text:
        return None
    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        raise ValueError(f'Invalid number: {text}')


def _parse_int(value: str, default: int = 0) -> int:
    text = (value or '').strip()
    if not text:
        return default
    try:
        return int(float(text))
    except (TypeError, ValueError):
        raise ValueError(f'Invalid integer: {text}')


def resolve_test(row: dict, tests_by_id: dict, tests_by_code: dict, tests_by_name: dict):
    test_id = _cell(row, 'test_id')
    if test_id:
        try:
            return tests_by_id[int(float(test_id))]
        except (KeyError, ValueError, TypeError):
            raise ValueError(f'Unknown test_id: {test_id}')

    code = _cell(row, 'test_code')
    if code:
        test = tests_by_code.get(code.lower())
        if test:
            return test
        raise ValueError(f'Unknown test_code: {code}')

    name = _cell(row, 'test_name')
    if name:
        test = tests_by_name.get(name.lower())
        if test:
            return test
        raise ValueError(f'Unknown test_name: {name}')

    raise ValueError('Provide test_code, test_name, or test_id')


def parse_parameter_csv(text: str) -> list[dict]:
    if text.startswith('\ufeff'):
        text = text[1:]
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError('CSV has no header row.')

    mapped_fields = [_norm_header(name) for name in reader.fieldnames]
    rows = []
    for index, raw in enumerate(reader, start=2):
        row = {}
        for key, value in zip(mapped_fields, raw.values()):
            row[key] = value
        if not any(str(v or '').strip() for v in row.values()):
            continue
        row['_line'] = index
        rows.append(row)
    return rows


def build_template_csv(*, include_tests: bool = False) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=TEMPLATE_HEADERS, lineterminator='\n')
    writer.writeheader()
    if include_tests:
        for test in Test.objects.all().order_by('name'):
            writer.writerow({
                'test_code': test.test_code or '',
                'test_name': test.name,
                'parameter_name': test.short_name or test.name,
                'unit': '',
                'method': '',
                'reference_range_male': '',
                'reference_range_female': '',
                'reference_range_child': '',
                'critical_low': '',
                'critical_high': '',
                'sample_value': '',
                'analyzer_code': '',
                'sort_order': '0',
                'is_active': 'true',
            })
    else:
        writer.writerow({
            'test_code': 'CBC',
            'test_name': 'Complete Blood Count',
            'parameter_name': 'Hemoglobin',
            'unit': 'g/dL',
            'method': 'Colorimetric',
            'reference_range_male': '13.0 - 17.0',
            'reference_range_female': '12.0 - 15.0',
            'reference_range_child': '11.0 - 14.0',
            'critical_low': '7',
            'critical_high': '20',
            'sample_value': '14.2',
            'analyzer_code': 'HGB',
            'sort_order': '1',
            'is_active': 'true',
        })
    return buffer.getvalue()


def import_parameters_from_rows(rows: list[dict], *, dry_run: bool = False) -> dict:
    tests = list(Test.objects.all())
    tests_by_id = {t.id: t for t in tests}
    tests_by_code = {t.test_code.lower(): t for t in tests if t.test_code}
    tests_by_name = {t.name.lower(): t for t in tests}

    created = 0
    updated = 0
    skipped = 0
    errors = []
    preview = []

    prepared = []
    for row in rows:
        line = row.get('_line', '?')
        try:
            test = resolve_test(row, tests_by_id, tests_by_code, tests_by_name)
            parameter_name = _cell(row, 'parameter_name')
            if not parameter_name:
                raise ValueError('parameter_name is required')
            payload = {
                'test': test,
                'parameter_name': parameter_name,
                'unit': _cell(row, 'unit'),
                'method': _cell(row, 'method'),
                'reference_range_male': _cell(row, 'reference_range_male'),
                'reference_range_female': _cell(row, 'reference_range_female'),
                'reference_range_child': _cell(row, 'reference_range_child'),
                'critical_low': _parse_decimal(_cell(row, 'critical_low')),
                'critical_high': _parse_decimal(_cell(row, 'critical_high')),
                'sample_value': _cell(row, 'sample_value'),
                'analyzer_code': _cell(row, 'analyzer_code'),
                'sort_order': _parse_int(_cell(row, 'sort_order'), 0),
                'is_active': _parse_bool(_cell(row, 'is_active'), True),
            }
            prepared.append((line, payload))
        except ValueError as exc:
            errors.append({'line': line, 'error': str(exc)})

    if dry_run:
        for line, payload in prepared[:50]:
            exists = TestParameter.objects.filter(
                test=payload['test'],
                parameter_name__iexact=payload['parameter_name'],
            ).exists()
            preview.append({
                'line': line,
                'test': payload['test'].name,
                'parameter_name': payload['parameter_name'],
                'action': 'update' if exists else 'create',
            })
        return {
            'dry_run': True,
            'rows_ok': len(prepared),
            'rows_error': len(errors),
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': errors[:100],
            'preview': preview,
        }

    with transaction.atomic():
        for line, payload in prepared:
            test = payload.pop('test')
            parameter_name = payload.pop('parameter_name')
            obj, was_created = TestParameter.objects.update_or_create(
                test=test,
                parameter_name=parameter_name,
                defaults=payload,
            )
            # Case-insensitive match may miss if casing differs; also try iexact lookup.
            if was_created:
                # If a case-variant already existed, merge into it.
                sibling = (
                    TestParameter.objects
                    .filter(test=test, parameter_name__iexact=parameter_name)
                    .exclude(pk=obj.pk)
                    .first()
                )
                if sibling:
                    for key, value in payload.items():
                        setattr(sibling, key, value)
                    sibling.parameter_name = parameter_name
                    sibling.save()
                    obj.delete()
                    updated += 1
                    continue
                created += 1
            else:
                updated += 1

    return {
        'dry_run': False,
        'rows_ok': len(prepared),
        'rows_error': len(errors),
        'created': created,
        'updated': updated,
        'skipped': skipped,
        'errors': errors[:100],
        'preview': [],
    }


def import_parameters_from_csv_text(text: str, *, dry_run: bool = False) -> dict:
    rows = parse_parameter_csv(text)
    if not rows:
        raise ValueError('CSV has no data rows.')
    return import_parameters_from_rows(rows, dry_run=dry_run)


def sample_report_coverage() -> dict:
    total_tests = Test.objects.count()
    with_params = (
        Test.objects
        .annotate(active_params=Count('parameters', filter=Q(parameters__is_active=True)))
        .filter(active_params__gt=0)
        .count()
    )
    missing_qs = (
        Test.objects
        .annotate(active_params=Count('parameters', filter=Q(parameters__is_active=True)))
        .filter(active_params=0)
        .order_by('name')
    )
    missing = list(missing_qs.values('id', 'name', 'test_code', 'sample_type')[:200])
    return {
        'total_tests': total_tests,
        'tests_with_parameters': with_params,
        'tests_missing_parameters': total_tests - with_params,
        'coverage_pct': round((with_params / total_tests) * 100, 1) if total_tests else 0,
        'missing_sample': missing,
        'missing_truncated': (total_tests - with_params) > len(missing),
    }


def generate_default_parameters(*, only_missing: bool = True, limit: int | None = None) -> dict:
    """Create one placeholder parameter per test so sample reports auto-render."""
    qs = Test.objects.all().order_by('name')
    if only_missing:
        qs = qs.annotate(
            active_params=Count('parameters', filter=Q(parameters__is_active=True))
        ).filter(active_params=0)
    if limit:
        qs = qs[:limit]

    created = 0
    skipped = 0
    samples = []
    with transaction.atomic():
        for test in qs:
            param_name = (test.short_name or test.name or 'Result').strip()[:200]
            obj, was_created = TestParameter.objects.get_or_create(
                test=test,
                parameter_name=param_name,
                defaults={
                    'unit': '',
                    'method': '',
                    'reference_range_male': '',
                    'sample_value': '',
                    'sort_order': 0,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
                if len(samples) < 20:
                    samples.append({'test_id': test.id, 'test_name': test.name, 'parameter_name': obj.parameter_name})
            else:
                skipped += 1
    return {
        'created': created,
        'skipped': skipped,
        'samples': samples,
    }


def build_sample_report_payload(test: Test) -> dict:
    params = list(
        TestParameter.objects.filter(test=test, is_active=True)
        .order_by('sort_order', 'parameter_name')
    )
    return {
        'test_id': test.id,
        'test_name': test.name,
        'test_code': test.test_code or '',
        'short_name': test.short_name or '',
        'sample_type': test.sample_type or 'General',
        'parameter_count': len(params),
        'has_parameters': bool(params),
        'parameters': [
            {
                'id': p.id,
                'parameter_name': p.parameter_name,
                'unit': p.unit or '',
                'method': p.method or '',
                'reference_range_male': p.reference_range_male or '',
                'reference_range_female': p.reference_range_female or '',
                'reference_range_child': p.reference_range_child or '',
                'sample_value': p.sample_value or '',
                'sort_order': p.sort_order,
            }
            for p in params
        ],
        'demographics_placeholders': {
            'patient_name': '____________________',
            'age_gender': '____ Y / ________',
            'lab_code': '____________________',
            'registration_date': '____/____/________',
            'doctor_name': '____________________',
            'barcode': '____________________',
            'sample_collected_at': '____/____/________',
            'reported_on': '____/____/________',
        },
    }

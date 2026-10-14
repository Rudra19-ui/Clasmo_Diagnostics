"""Import test report details (parameters + notes) matched by test name."""

from __future__ import annotations

import json
import re
from pathlib import Path

from django.db import transaction
from django.db.models import Q

from .models import Test, TestParameter

DEFAULT_JSON = (
    Path(__file__).resolve().parent / 'data' / 'report_formats' / 'sample_reports_batch_import.json'
)


def _norm(name: str) -> str:
    text = (name or '').lower()
    text = text.replace('&', ' and ')
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def find_test_by_names(names: list[str]) -> Test | None:
    cleaned = [n.strip() for n in names if (n or '').strip()]
    if not cleaned:
        return None

    for name in cleaned:
        hit = Test.objects.filter(name__iexact=name).first()
        if hit:
            return hit

    for name in cleaned:
        hit = Test.objects.filter(name__icontains=name).first()
        if hit:
            return hit

    norms = {_norm(n) for n in cleaned}
    for test in Test.objects.all().only('id', 'name', 'short_name', 'test_code'):
        candidates = {_norm(test.name), _norm(test.short_name), _norm(test.test_code)}
        if candidates & norms:
            return test
        for n in norms:
            if n and (n in _norm(test.name) or _norm(test.name) in n):
                return test
    return None


def load_report_detail_rows(path: Path | None = None) -> list[dict]:
    source = path or DEFAULT_JSON
    data = json.loads(source.read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise ValueError('Report detail JSON must be a list of tests.')
    return data


@transaction.atomic
def import_report_details(
    rows: list[dict],
    *,
    create_missing: bool = True,
    dry_run: bool = False,
) -> dict:
    created_tests = 0
    updated_tests = 0
    created_params = 0
    updated_params = 0
    unmatched = []
    imported = []

    for row in rows:
        test_name = (row.get('test_name') or '').strip()
        match_names = list(row.get('match_names') or [])
        if test_name and test_name not in match_names:
            match_names.insert(0, test_name)

        test = find_test_by_names(match_names)
        created_this = False
        if not test:
            if not create_missing or not test_name:
                unmatched.append(test_name or '(missing test_name)')
                continue
            if dry_run:
                created_tests += 1
                imported.append({'test_name': test_name, 'action': 'create_test', 'parameters': len(row.get('parameters') or [])})
                continue
            test = Test.objects.create(
                name=test_name,
                price=0,
                mrp=0,
                sample_type=(row.get('sample_type') or '').strip(),
            )
            created_this = True
            created_tests += 1

        sample_type = (row.get('sample_type') or '').strip()
        report_note = (row.get('report_note') or '').strip()
        report_comments = (row.get('report_comments') or '').strip()
        clinical_significance = (row.get('clinical_significance') or '').strip()
        extra = row.get('report_extra_sections') or {}
        if not isinstance(extra, dict):
            extra = {}

        if dry_run:
            if not created_this:
                updated_tests += 1
            imported.append({
                'test_name': test.name,
                'action': 'update_test',
                'parameters': len(row.get('parameters') or []),
            })
        else:
            dirty = []
            if sample_type and sample_type != (test.sample_type or ''):
                test.sample_type = sample_type
                dirty.append('sample_type')
            if report_note != (test.report_note or ''):
                test.report_note = report_note
                dirty.append('report_note')
            if report_comments != (test.report_comments or ''):
                test.report_comments = report_comments
                dirty.append('report_comments')
            if clinical_significance != (test.clinical_significance or ''):
                test.clinical_significance = clinical_significance
                dirty.append('clinical_significance')
            if extra != (test.report_extra_sections or {}):
                test.report_extra_sections = extra
                dirty.append('report_extra_sections')
            if dirty and not created_this:
                test.save(update_fields=[*dirty])
                updated_tests += 1
            elif dirty and created_this:
                test.save(update_fields=[*dirty])

            param_count = 0
            keep_names = set()
            for index, param in enumerate(row.get('parameters') or [], start=1):
                pname = (param.get('parameter_name') or '').strip()[:200]
                if not pname:
                    continue
                keep_names.add(pname)
                defaults = {
                    'unit': (param.get('unit') or '').strip()[:50],
                    'method': (param.get('method') or '').strip()[:100],
                    'reference_range_male': (param.get('reference_range_male') or '').strip()[:100],
                    'reference_range_female': (param.get('reference_range_female') or '').strip()[:100],
                    'reference_range_child': (param.get('reference_range_child') or '').strip()[:100],
                    'sample_value': (param.get('sample_value') or '').strip()[:50],
                    'sort_order': int(param.get('sort_order') or index),
                    'is_active': True,
                }
                obj, was_created = TestParameter.objects.update_or_create(
                    test=test,
                    parameter_name=pname,
                    defaults=defaults,
                )
                param_count += 1
                if was_created:
                    created_params += 1
                else:
                    updated_params += 1

            # Drop stub / obsolete rows (e.g. panel name used as sole parameter).
            if keep_names:
                TestParameter.objects.filter(test=test).exclude(
                    parameter_name__in=keep_names
                ).update(is_active=False)

            imported.append({
                'test_id': test.id,
                'test_name': test.name,
                'action': 'created' if created_this else 'updated',
                'parameters': param_count,
            })

    propagated = {'copied_tests': 0, 'copied_parameters': 0, 'deactivated_stubs': 0}
    if not dry_run:
        propagated = propagate_duplicate_report_details()

    return {
        'dry_run': dry_run,
        'created_tests': created_tests,
        'updated_tests': updated_tests,
        'created_parameters': created_params,
        'updated_parameters': updated_params,
        'unmatched': unmatched,
        'imported': imported,
        'total_rows': len(rows),
        'propagated': propagated,
    }


def _param_is_real(param: TestParameter) -> bool:
    return bool(
        (param.unit or '').strip()
        or (param.method or '').strip()
        or (param.reference_range_male or '').strip()
        or (param.reference_range_female or '').strip()
        or (param.reference_range_child or '').strip()
    )


def propagate_duplicate_report_details() -> dict:
    """Copy letterhead details onto same-name catalog duplicates and drop empty stub rows."""
    tests = list(Test.objects.all())
    params_by_test: dict[int, list[TestParameter]] = {}
    for param in TestParameter.objects.filter(is_active=True):
        params_by_test.setdefault(param.test_id, []).append(param)

    grouped: dict[str, list[Test]] = {}
    for test in tests:
        grouped.setdefault(_norm(test.name), []).append(test)

    copied_tests = 0
    copied_params = 0
    deactivated = 0
    stub_ids: list[int] = []

    for group in grouped.values():
        decorated = []
        for test in group:
            active = params_by_test.get(test.id, [])
            real = [param for param in active if _param_is_real(param)]
            decorated.append((len(real), test, real, active))
        donor_real_count, donor, donor_real, _donor_active = max(decorated, key=lambda item: item[0])
        if not donor_real_count:
            continue

        for real_count, test, _real, active in decorated:
            if test.id == donor.id or real_count:
                continue
            dirty = []
            for field in (
                'sample_type',
                'report_note',
                'report_comments',
                'clinical_significance',
            ):
                incoming = (getattr(donor, field) or '').strip()
                if incoming and not (getattr(test, field) or '').strip():
                    setattr(test, field, getattr(donor, field))
                    dirty.append(field)
            extra = donor.report_extra_sections or {}
            if extra and not (test.report_extra_sections or {}):
                test.report_extra_sections = extra
                dirty.append('report_extra_sections')
            if dirty:
                test.save(update_fields=dirty)
                copied_tests += 1
            for param in donor_real:
                saved, _created = TestParameter.objects.update_or_create(
                    test=test,
                    parameter_name=param.parameter_name,
                    defaults={
                        'unit': param.unit,
                        'method': param.method,
                        'reference_range_male': param.reference_range_male,
                        'reference_range_female': param.reference_range_female,
                        'reference_range_child': param.reference_range_child,
                        'sample_value': param.sample_value,
                        'sort_order': param.sort_order,
                        'is_active': True,
                    },
                )
                params_by_test.setdefault(test.id, []).append(saved)
                copied_params += 1

        for test in group:
            active = params_by_test.get(test.id, [])
            if not any(_param_is_real(param) for param in active):
                continue
            stub_ids.extend(param.id for param in active if not _param_is_real(param))

    if stub_ids:
        deactivated = TestParameter.objects.filter(id__in=stub_ids, is_active=True).update(is_active=False)

    return {
        'copied_tests': copied_tests,
        'copied_parameters': copied_params,
        'deactivated_stubs': deactivated,
    }


def import_from_json_file(path: Path | None = None, *, create_missing: bool = True, dry_run: bool = False) -> dict:
    rows = load_report_detail_rows(path)
    return import_report_details(rows, create_missing=create_missing, dry_run=dry_run)

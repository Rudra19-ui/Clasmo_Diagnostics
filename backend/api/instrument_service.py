"""Capture analyzer/machine results, match patient via sample barcode, write ReportValues."""

from django.db import transaction
from django.db.models import Q

from .barcode_service import lookup_patient_by_barcode, normalize_barcode
from .clinical_utils import calculate_flag, select_reference_range
from .models import (
    InstrumentResultBatch,
    Registration,
    Report,
    ReportValue,
    Test,
    TestParameter,
)


class InstrumentIngestError(Exception):
    def __init__(self, message, status='failed'):
        super().__init__(message)
        self.message = message
        self.status = status


# Common hematology analyzer analyte aliases → canonical analyzer_code on TestParameter
ANALYZER_CODE_ALIASES = {
    'HB': 'HGB',
    'HGB': 'HGB',
    'HEMOGLOBIN': 'HGB',
    'RBC': 'RBC',
    'TRBC': 'RBC',
    'HCT': 'HCT',
    'PCV': 'HCT',
    'Hematocrit': 'HCT',
    'WBC': 'WBC',
    'TLC': 'WBC',
    'TWBC': 'WBC',
    'NEUT%': 'NEUT%',
    'NEU%': 'NEUT%',
    'NEUTROPHILS%': 'NEUT%',
    'LYMPH%': 'LYMPH%',
    'LYM%': 'LYMPH%',
    'LYMPHOCYTE%': 'LYMPH%',
    'EO%': 'EO%',
    'EOS%': 'EO%',
    'EOSINOPHILS%': 'EO%',
    'MONO%': 'MONO%',
    'MON%': 'MONO%',
    'MONOCYTES%': 'MONO%',
    'BASO%': 'BASO%',
    'BAS%': 'BASO%',
    'BASOPHILS%': 'BASO%',
    'NEUT#': 'NEUT#',
    'NEU#': 'NEUT#',
    'NEUTABS': 'NEUT#',
    'LYMPH#': 'LYMPH#',
    'LYM#': 'LYMPH#',
    'EO#': 'EO#',
    'EOS#': 'EO#',
    'MONO#': 'MONO#',
    'MON#': 'MONO#',
    'BASO#': 'BASO#',
    'BAS#': 'BASO#',
    'MCV': 'MCV',
    'MCH': 'MCH',
    'MCHC': 'MCHC',
    'RDW': 'RDW-CV',
    'RDW-CV': 'RDW-CV',
    'RDWCV': 'RDW-CV',
    'PLT': 'PLT',
    'PLATELET': 'PLT',
    'PLATELETS': 'PLT',
    'MPV': 'MPV',
    'PCT': 'PCT',
    'PDW': 'PDW',
    'PLCC': 'PLCC',
    'P-LCC': 'PLCC',
    'PLCR': 'PLCR',
    'P-LCR': 'PLCR',
}


CBC_NAME_QUERY = Q(name__icontains='COMPLETE BLOOD COUNT') | Q(name__icontains='CBC')


def normalize_analyzer_code(code):
    raw = (code or '').strip().upper().replace(' ', '')
    if not raw:
        return ''
    # Keep % and # for differentials / absolute counts
    cleaned = raw.replace('_', '').replace(' ', '')
    return ANALYZER_CODE_ALIASES.get(cleaned) or ANALYZER_CODE_ALIASES.get(raw) or cleaned


def _cbc_tests_for_registration(registration, link=None):
    """CBC (or linked) tests ordered on this registration."""
    qs = registration.tests.select_related('test')
    if link and link.linked_test_ids:
        qs = qs.filter(test_id__in=link.linked_test_ids)
    test_ids = list(qs.values_list('test_id', flat=True))
    if not test_ids:
        return Test.objects.none()

    cbc_tests = Test.objects.filter(id__in=test_ids).filter(CBC_NAME_QUERY)
    if cbc_tests.exists():
        return cbc_tests
    # Fall back to any ordered tests with parameters (non-CBC ingest)
    return Test.objects.filter(id__in=test_ids)


def _parameters_for_tests(tests):
    return (
        TestParameter.objects.filter(test__in=tests, is_active=True)
        .select_related('test')
        .order_by('sort_order', 'parameter_name')
    )


def _map_results_to_parameters(results, parameters):
    """
    results: list of {code|analyzer_code|parameter_name, value}
    Returns (matched: [(parameter, value)], unmatched_codes: [str])
    """
    by_code = {}
    by_name = {}
    for param in parameters:
        if param.analyzer_code:
            by_code[normalize_analyzer_code(param.analyzer_code)] = param
        by_name[param.parameter_name.strip().lower()] = param

    matched = []
    unmatched = []
    seen_param_ids = set()

    for item in results or []:
        if not isinstance(item, dict):
            continue
        value = item.get('value')
        if value is None or str(value).strip() == '':
            continue
        value = str(value).strip()

        code = normalize_analyzer_code(
            item.get('code') or item.get('analyzer_code') or item.get('analyte') or ''
        )
        name = (item.get('parameter_name') or item.get('name') or '').strip().lower()

        parameter = None
        if code and code in by_code:
            parameter = by_code[code]
        elif name and name in by_name:
            parameter = by_name[name]

        if not parameter:
            unmatched.append(code or name or str(item.get('code') or item.get('name') or '?'))
            continue
        if parameter.id in seen_param_ids:
            # Last value wins — replace earlier match
            matched = [(p, v) for p, v in matched if p.id != parameter.id]
        matched.append((parameter, value))
        seen_param_ids.add(parameter.id)

    return matched, unmatched


@transaction.atomic
def apply_instrument_results(*, barcode, results, instrument_id='', user=None, raw_payload=None):
    """
    Match sample barcode → registration → CBC parameters, write ReportValues.

    results: [{"code": "HGB", "value": "12.1"}, ...]
    """
    normalized = normalize_barcode(barcode)
    if not normalized:
        raise InstrumentIngestError('Barcode is required.')

    payload = raw_payload if raw_payload is not None else {
        'barcode': normalized,
        'instrument_id': instrument_id,
        'results': results,
    }

    link = lookup_patient_by_barcode(normalized)
    if not link:
        batch = InstrumentResultBatch.objects.create(
            barcode=normalized,
            instrument_id=instrument_id or '',
            raw_payload=payload,
            status=InstrumentResultBatch.STATUS_FAILED,
            message='No patient linked to this barcode.',
            created_by=user,
        )
        raise InstrumentIngestError(batch.message)

    registration = link.registration
    if not registration:
        # Try latest registration for patient
        registration = (
            Registration.objects.filter(patient=link.patient)
            .order_by('-created_at')
            .first()
        )
    if not registration:
        batch = InstrumentResultBatch.objects.create(
            barcode=normalized,
            instrument_id=instrument_id or '',
            raw_payload=payload,
            status=InstrumentResultBatch.STATUS_FAILED,
            message='Barcode is linked to a patient but not to a registration.',
            created_by=user,
        )
        raise InstrumentIngestError(batch.message)

    if hasattr(registration, 'clinical_report') and registration.clinical_report.status == Report.STATUS_VERIFIED:
        batch = InstrumentResultBatch.objects.create(
            barcode=normalized,
            instrument_id=instrument_id or '',
            registration=registration,
            raw_payload=payload,
            status=InstrumentResultBatch.STATUS_FAILED,
            message='Verified reports cannot be modified by machine ingest.',
            created_by=user,
        )
        raise InstrumentIngestError(batch.message)

    tests = _cbc_tests_for_registration(registration, link)
    parameters = list(_parameters_for_tests(tests))
    if not parameters:
        batch = InstrumentResultBatch.objects.create(
            barcode=normalized,
            instrument_id=instrument_id or '',
            registration=registration,
            raw_payload=payload,
            status=InstrumentResultBatch.STATUS_FAILED,
            message='No CBC (or linked) test parameters found for this registration.',
            created_by=user,
        )
        raise InstrumentIngestError(batch.message)

    matched, unmatched = _map_results_to_parameters(results, parameters)
    if not matched:
        batch = InstrumentResultBatch.objects.create(
            barcode=normalized,
            instrument_id=instrument_id or '',
            registration=registration,
            raw_payload=payload,
            unmatched_codes=unmatched,
            status=InstrumentResultBatch.STATUS_FAILED,
            message='No analyzer codes matched CBC parameters.',
            created_by=user,
        )
        raise InstrumentIngestError(batch.message)

    report, _ = Report.objects.get_or_create(
        registration=registration,
        defaults={'status': Report.STATUS_PENDING},
    )
    patient = registration.patient
    applied = []
    for parameter, value in matched:
        flag = calculate_flag(value, parameter, patient)
        ReportValue.objects.update_or_create(
            report=report,
            parameter=parameter,
            defaults={
                'value': value,
                'flag': flag,
                'source': 'machine',
            },
        )
        applied.append({
            'parameter_id': parameter.id,
            'parameter_name': parameter.parameter_name,
            'analyzer_code': parameter.analyzer_code,
            'value': value,
            'flag': flag,
            'unit': parameter.unit,
        })

    report.entered_by = user
    report.status = Report.STATUS_ENTERED
    report.save(update_fields=['entered_by', 'status', 'updated_at'])

    status = (
        InstrumentResultBatch.STATUS_PARTIAL if unmatched
        else InstrumentResultBatch.STATUS_APPLIED
    )
    message = (
        f'Applied {len(applied)} result(s) to lab code {registration.lab_code}.'
        + (f' Unmatched: {", ".join(unmatched)}.' if unmatched else '')
    )
    batch = InstrumentResultBatch.objects.create(
        barcode=normalized,
        instrument_id=instrument_id or '',
        registration=registration,
        raw_payload=payload,
        matched_count=len(applied),
        unmatched_codes=unmatched,
        status=status,
        message=message,
        created_by=user,
    )

    return {
        'ok': True,
        'batch_id': batch.id,
        'barcode': normalized,
        'registration_id': registration.id,
        'lab_code': registration.lab_code,
        'patient_id': patient.patient_id,
        'patient_name': f'{patient.title} {patient.patient_name}'.strip(),
        'report_status': report.status,
        'matched_count': len(applied),
        'applied': applied,
        'unmatched_codes': unmatched,
        'message': message,
    }


def build_patient_report_by_barcode(barcode, *, test_filter='cbc'):
    """
    Demographics + CBC investigation rows for Sample Report / patient report preview.
    """
    normalized = normalize_barcode(barcode)
    if not normalized:
        return {'found': False, 'barcode': '', 'message': 'Barcode is required.'}

    link = lookup_patient_by_barcode(normalized)
    if not link:
        return {
            'found': False,
            'barcode': normalized,
            'message': 'No patient linked to this barcode.',
        }

    patient = link.patient
    registration = link.registration or (
        Registration.objects.filter(patient=patient).order_by('-created_at').first()
    )

    gender_label = (
        'Male' if patient.gender == 'male'
        else 'Female' if patient.gender == 'female'
        else (patient.gender or '—')
    )
    age_years = patient.age_years or 0
    reg_dt = None
    if registration:
        reg_dt = registration.created_at or registration.registration_date

    demographics = {
        'patient_name': f'{patient.title} {patient.patient_name}'.strip(),
        'patient_id': patient.patient_id or '',
        'age_years': age_years,
        'age_display': f'{age_years} Y',
        'gender': patient.gender or '',
        'gender_label': gender_label,
        'age_gender': f'{age_years} Y / {gender_label}',
        'lab_code': registration.lab_code if registration else '',
        'registration_id': registration.id if registration else None,
        'registration_date': reg_dt.strftime('%d-%m-%Y %H:%M') if reg_dt else '',
        'doctor_name': patient.doctor_name or '—',
        'barcode': link.barcode,
        'sample_type': link.sample_type or '',
        'mobile': patient.mobile or '',
    }

    if not registration:
        return {
            'found': True,
            'demographics': demographics,
            'report_status': '',
            'test_name': 'CBC (COMPLETE BLOOD COUNT)',
            'sample_types': [link.sample_type or 'EDTA Blood'],
            'rows': [],
            'message': 'Barcode linked to patient but not to a registration.',
        }

    if test_filter == 'cbc':
        tests = _cbc_tests_for_registration(registration, link)
    else:
        tests = Test.objects.filter(
            id__in=registration.tests.values_list('test_id', flat=True)
        )

    parameters = list(_parameters_for_tests(tests))
    report = Report.objects.filter(registration=registration).prefetch_related('values').first()
    values_by_param = {}
    if report:
        for rv in report.values.select_related('parameter').all():
            values_by_param[rv.parameter_id] = rv

    rows = []
    for param in parameters:
        rv = values_by_param.get(param.id)
        rows.append({
            'parameter_id': param.id,
            'parameter_name': param.parameter_name,
            'method': param.method or '',
            'unit': param.unit or '',
            'result': rv.value if rv else '',
            'flag': rv.flag if rv else '',
            'source': rv.source if rv else '',
            'reference_range': select_reference_range(param, patient),
            'reference_range_male': param.reference_range_male,
            'reference_range_female': param.reference_range_female,
            'sort_order': param.sort_order,
        })

    test_name = tests.first().name if tests.exists() else 'CBC (COMPLETE BLOOD COUNT)'
    sample_types = sorted({
        (t.sample_type or link.sample_type or 'EDTA Blood').strip()
        for t in tests
    } - {''}) or [link.sample_type or 'EDTA Blood']

    return {
        'found': True,
        'demographics': demographics,
        'report_status': report.status if report else 'pending',
        'test_name': test_name,
        'sample_types': sample_types,
        'rows': rows,
        'message': '',
    }

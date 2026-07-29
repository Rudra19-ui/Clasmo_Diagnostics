from django.db import transaction
import re

from .models import Patient, PatientSampleBarcode, Registration


class BarcodeLinkError(Exception):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


def normalize_barcode(value):
    """Normalize scanner/QR input — keep HIBC/GS1 printable chars, drop control codes."""
    cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', (value or ''))
    return cleaned.strip()


def _normalize_barcode(value):
    return normalize_barcode(value)


def validate_barcode_pair(barcode, confirm_barcode, *, sample_type=''):
    barcode = _normalize_barcode(barcode)
    confirm = _normalize_barcode(confirm_barcode)
    label = sample_type or 'Barcode'

    if not barcode:
        raise BarcodeLinkError(f'{label}: barcode is required.')
    if barcode != confirm:
        raise BarcodeLinkError(f'{label}: barcode and confirmation do not match.', field='confirm_barcode')
    return barcode


@transaction.atomic
def link_sample_barcodes(*, patient, registration=None, barcodes_data, user=None):
    """
    Link preprinted barcodes to a patient record.

    barcodes_data: list of dicts with sample_type, barcode, confirm_barcode
    """
    linked = []

    for item in barcodes_data or []:
        sample_type = _normalize_barcode(item.get('sample_type', ''))
        raw_test_ids = item.get('test_ids') or []
        linked_test_ids = []
        for value in raw_test_ids:
            try:
                linked_test_ids.append(int(value))
            except (TypeError, ValueError):
                continue
        barcode = validate_barcode_pair(
            item.get('barcode'),
            item.get('confirm_barcode'),
            sample_type=sample_type or 'Barcode',
        )

        existing = PatientSampleBarcode.objects.select_for_update().filter(barcode=barcode).first()
        if existing and existing.is_active:
            if existing.patient_id != patient.id:
                raise BarcodeLinkError(
                    f'Barcode {barcode} is already linked to patient '
                    f'{existing.patient.patient_id or existing.patient_id}.',
                    field='barcode',
                )
            if registration and existing.registration_id and existing.registration_id != registration.id:
                raise BarcodeLinkError(
                    f'Barcode {barcode} is already linked to lab code {existing.registration.lab_code}.',
                    field='barcode',
                )

        if registration and sample_type:
            PatientSampleBarcode.objects.filter(
                registration=registration,
                sample_type=sample_type,
                is_active=True,
            ).exclude(barcode=barcode).update(is_active=False)

        defaults = {
            'patient': patient,
            'registration': registration,
            'sample_type': sample_type,
            'linked_test_ids': linked_test_ids,
            'is_active': True,
            'linked_by': user,
        }
        if existing:
            for key, value in defaults.items():
                setattr(existing, key, value)
            existing.save()
            record = existing
        else:
            record = PatientSampleBarcode.objects.create(barcode=barcode, **defaults)

        linked.append(record)

    if linked:
        patient.bar_code = linked[0].barcode
        patient.save(update_fields=['bar_code'])

    return linked


def resolve_patient_for_link(*, patient_id='', lab_code='', registration_id=None):
    patient = None
    registration = None

    if registration_id:
        try:
            registration = Registration.objects.select_related('patient').get(pk=int(registration_id))
            patient = registration.patient
        except (ValueError, Registration.DoesNotExist):
            raise BarcodeLinkError('Registration not found.', field='registration_id')

    if lab_code and not registration:
        try:
            registration = Registration.objects.select_related('patient').get(lab_code=lab_code.strip())
            patient = registration.patient
        except Registration.DoesNotExist:
            raise BarcodeLinkError('Lab code not found.', field='lab_code')

    patient_id = _normalize_barcode(patient_id)
    if patient_id:
        patient_match = Patient.objects.filter(patient_id=patient_id).first()
        if not patient_match:
            raise BarcodeLinkError('Patient ID not found.', field='patient_id')
        if patient and patient_match.id != patient.id:
            raise BarcodeLinkError('Patient ID does not match the selected registration.', field='patient_id')
        patient = patient_match

    if not patient:
        raise BarcodeLinkError('Provide patient_id, lab_code, or registration_id.', field='patient_id')

    return patient, registration


def lookup_patient_by_barcode(barcode):
    normalized = normalize_barcode(barcode)
    if not normalized:
        return None

    for candidate in barcode_lookup_candidates(normalized):
        link = (
            PatientSampleBarcode.objects.filter(barcode__iexact=candidate, is_active=True)
            .select_related('patient', 'registration')
            .first()
        )
        if link:
            return link
    return None


def barcode_lookup_candidates(barcode):
    normalized = normalize_barcode(barcode)
    if not normalized:
        return []
    candidates = [normalized]
    if normalized.startswith('+'):
        candidates.append(normalized[1:])
    else:
        candidates.append(f'+{normalized}')
    return candidates


def filter_registrations_by_barcode(qs, barcode_value):
    """Narrow registration queryset by HIBC/GS1 or internal barcode."""
    from django.db.models import Q

    normalized = normalize_barcode(barcode_value)
    if not normalized:
        return qs

    link = lookup_patient_by_barcode(normalized)
    if link and link.registration_id:
        return qs.filter(id=link.registration_id)

    candidates = barcode_lookup_candidates(normalized)
    return qs.filter(
        Q(lab_code__icontains=normalized)
        | Q(patient__patient_id__icontains=normalized)
        | Q(linked_barcodes__barcode__in=candidates)
    ).distinct()


def sample_group_for_test(test):
    name = (test.name or '').upper()
    category = (test.category.name if test.category else '').upper()

    hematology_keys = ('CBC', 'BLOOD COUNT', 'HEMOGLOBIN', 'ESR', 'PCV', 'WBC', 'RBC', 'PLATELET')
    urine_keys = ('URINE', 'STOOL')
    fluid_keys = ('FLUID', 'CSF', 'ASCITIC')

    if any(key in name for key in hematology_keys) or category == 'HEMATOLOGY':
        return 'EDTA Blood'
    if any(key in name for key in urine_keys):
        return 'URINE'
    if any(key in name for key in fluid_keys):
        return 'FLUID'
    return 'SERUM'


def format_age_sex(patient):
    age = patient.age_years or 0
    gender = (patient.gender or '').lower()
    if gender == 'female':
        sex = 'F'
    elif gender == 'male':
        sex = 'M'
    else:
        sex = '—'
    return f'{age}(Y) / {sex}'


def format_gender_label(patient):
    gender = (patient.gender or '').lower()
    if gender == 'female':
        return 'Female'
    if gender == 'male':
        return 'Male'
    if gender == 'none':
        return 'None'
    return (patient.gender or '—').title() if patient.gender else '—'


def format_patient_age(patient):
    years = patient.age_years or 0
    months = getattr(patient, 'age_months', 0) or 0
    days = getattr(patient, 'age_days', 0) or 0
    parts = []
    if years:
        parts.append(f'{years} Y')
    if months:
        parts.append(f'{months} M')
    if days:
        parts.append(f'{days} D')
    return ' '.join(parts) if parts else f'{years} Y'


def _parse_sample_types(sample_type_str):
    raw = (sample_type_str or '').strip()
    if not raw:
        return []
    return [part.strip() for part in re.split(r'[,/|]', raw) if part.strip()]


def _normalize_sample_token(value):
    return ' '.join((value or '').upper().split())


def test_matches_sample_type(test, target_sample_type):
    target = _normalize_sample_token(target_sample_type)
    if not target:
        return False

    catalog_types = [_normalize_sample_token(part) for part in _parse_sample_types(test.sample_type)]
    if catalog_types:
        return any(token == target for token in catalog_types)

    group_name = _normalize_sample_token(sample_group_for_test(test))
    return group_name == target


def _tests_for_link(registration, link):
    all_tests = list(registration.tests.select_related('test__category').all())
    sample_type = (link.sample_type or '').strip()

    linked_test_ids = [int(value) for value in (link.linked_test_ids or []) if str(value).isdigit()]
    if linked_test_ids:
        id_set = set(linked_test_ids)
        matched = [reg_test for reg_test in all_tests if reg_test.test_id in id_set]
        return matched, sample_type or 'Sample'

    if not sample_type or sample_type.lower() == 'primary':
        return all_tests, 'All Samples'

    matched = [reg_test for reg_test in all_tests if test_matches_sample_type(reg_test.test, sample_type)]
    return matched, sample_type


def build_sample_scan_payload(link):
    patient = link.patient
    registration = link.registration
    gender_label = format_gender_label(patient)
    age_display = format_patient_age(patient)

    base = {
        'found': True,
        'barcode': link.barcode,
        'linked_sample_type': link.sample_type or '',
        'patient_id': patient.patient_id,
        'patient_name': f'{patient.title} {patient.patient_name}'.strip(),
        'age': age_display,
        'age_years': patient.age_years or 0,
        'age_sex': format_age_sex(patient),
        'gender': patient.gender,
        'gender_label': gender_label,
        'mobile': patient.mobile or '',
        'doctor_name': patient.doctor_name or '',
        'patient_type': patient.patient_type or '',
        'collection_center': patient.collection_center or '',
    }

    if not registration:
        return {
            **base,
            'registration_id': None,
            'lab_code': '',
            'registration_status': '',
            'registration_date': '',
            'sample_type': link.sample_type or '',
            'test_type': link.sample_type or '',
            'tests': [],
            'linked_barcodes': [],
            'message': 'Barcode is linked to the patient but not to a registration.',
        }

    sample_tests, display_sample_type = _tests_for_link(registration, link)
    linked_barcodes = [
        {
            'barcode': item.barcode,
            'sample_type': item.sample_type,
        }
        for item in registration.linked_barcodes.filter(is_active=True).order_by('sample_type', 'barcode')
    ]

    regn_dt = registration.created_at or registration.registration_date
    return {
        **base,
        'registration_id': registration.id,
        'lab_code': registration.lab_code,
        'registration_status': registration.status,
        'registration_date': regn_dt.strftime('%d-%m-%Y %H:%M') if regn_dt else '',
        'sample_type': display_sample_type,
        'test_type': display_sample_type,
        'tests': [
            {
                'id': reg_test.id,
                'test_id': reg_test.test_id,
                'name': reg_test.test.name,
                'sample_type': reg_test.test.sample_type or sample_group_for_test(reg_test.test),
                'test_type': display_sample_type or reg_test.test.sample_type or sample_group_for_test(reg_test.test),
                'category': reg_test.test.category.name if reg_test.test.category_id else '',
                'price': str(reg_test.price),
            }
            for reg_test in sample_tests
        ],
        'linked_barcodes': linked_barcodes,
    }


def scan_sample_by_barcode(barcode):
    normalized = normalize_barcode(barcode)
    if not normalized:
        return {'found': False, 'barcode': '', 'message': 'Barcode is required.'}

    link = lookup_patient_by_barcode(normalized)
    if not link:
        return {
            'found': False,
            'barcode': normalized,
            'message': 'No patient linked to this barcode. Register the patient and enter this barcode at registration.',
        }

    return build_sample_scan_payload(link)

from datetime import datetime

from django.db import transaction
from django.db.models import IntegerField, Max, Q
from django.db.models.functions import Cast
from django.utils import timezone

from .models import LabConfiguration, Patient, Registration


def get_lab_config():
    return LabConfiguration.get_solo()


def _lock_lab_config():
    return LabConfiguration.objects.select_for_update().get(pk=1)


def _ensure_patient_sequence(config):
    if config.next_patient_sequence:
        return
    agg = Patient.objects.exclude(patient_id='').aggregate(
        max_num=Max(Cast('patient_id', IntegerField())),
    )
    config.next_patient_sequence = int(agg['max_num'] or 0)
    config.save(update_fields=['next_patient_sequence'])


def peek_patient_id(config=None):
    if config is None:
        config = get_lab_config()
    _ensure_patient_sequence(config)
    return str(config.next_patient_sequence + 1).zfill(6)


def allocate_patient_id(config):
    _ensure_patient_sequence(config)
    config.next_patient_sequence += 1
    config.save(update_fields=['next_patient_sequence'])
    return str(config.next_patient_sequence).zfill(6)


def _lab_code_period_filter(frequency):
    now = timezone.now()
    if frequency == LabConfiguration.FREQ_MONTHLY:
        return Q(created_at__year=now.year, created_at__month=now.month)
    if frequency == LabConfiguration.FREQ_YEARLY:
        return Q(created_at__year=now.year)
    return Q(created_at__date=now.date())


def _parse_lab_code_number(lab_code, prefix):
    code = (lab_code or '').strip()
    if not code.startswith(prefix):
        return None
    suffix = code[len(prefix):]
    if suffix.isdigit():
        return int(suffix)
    return None


def peek_lab_code(config=None):
    if config is None:
        config = get_lab_config()
    if config.lab_code_auto_increment:
        prefix = (config.lab_code_prefix or '1').strip()
        start_raw = (config.lab_code_start or '69').strip()
        try:
            start_num = int(start_raw)
        except ValueError:
            start_num = 69
        width = max(len(start_raw), 2)
        period_filter = _lab_code_period_filter(config.lab_code_frequency)

        latest = (
            Registration.objects.filter(lab_code__startswith=prefix)
            .filter(period_filter)
            .order_by('-lab_code')
            .values_list('lab_code', flat=True)
            .first()
        )
        max_num = _parse_lab_code_number(latest, prefix) if latest else start_num - 1
        next_num = max(max_num + 1, start_num)
        candidate = f'{prefix}{str(next_num).zfill(width)}'
        while Registration.objects.filter(lab_code=candidate).exists():
            next_num += 1
            candidate = f'{prefix}{str(next_num).zfill(width)}'
        return candidate

    today = datetime.now()
    prefix = today.strftime('%d%m%y')
    latest = (
        Registration.objects.filter(lab_code__startswith=prefix)
        .order_by('-lab_code')
        .values_list('lab_code', flat=True)
        .first()
    )
    max_suffix = 40
    if latest and latest.startswith(prefix):
        suffix = latest[len(prefix):]
        if suffix.isdigit():
            max_suffix = max(max_suffix, int(suffix))

    next_suffix = max_suffix + 1
    candidate = f'{prefix}{str(next_suffix).zfill(3)}'
    while Registration.objects.filter(lab_code=candidate).exists():
        next_suffix += 1
        candidate = f'{prefix}{str(next_suffix).zfill(3)}'
    return candidate


@transaction.atomic
def generate_lab_code():
    config = _lock_lab_config()
    return peek_lab_code(config)


@transaction.atomic
def generate_patient_id():
    config = _lock_lab_config()
    return allocate_patient_id(config)

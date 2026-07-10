from datetime import datetime

from django.db.models import Q
from django.utils import timezone

from .models import LabConfiguration, Registration


def get_lab_config():
    return LabConfiguration.get_solo()


def _lab_code_period_filter(frequency):
    now = timezone.now()
    if frequency == LabConfiguration.FREQ_MONTHLY:
        return Q(created_at__year=now.year, created_at__month=now.month)
    if frequency == LabConfiguration.FREQ_YEARLY:
        return Q(created_at__year=now.year)
    return Q(created_at__date=now.date())


def generate_lab_code():
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
        existing = Registration.objects.filter(lab_code__startswith=prefix).filter(period_filter).count()
        return f'{prefix}{str(start_num + existing).zfill(width)}'

    today = datetime.now()
    prefix = today.strftime('%d%m%y')
    existing = Registration.objects.filter(lab_code__startswith=prefix).count()
    return f'{prefix}{str(existing + 41).zfill(3)}'

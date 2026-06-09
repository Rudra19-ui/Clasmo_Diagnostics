from datetime import datetime

from .models import Registration


def generate_lab_code():
    today = datetime.now()
    prefix = today.strftime('%d%m%y')
    existing = Registration.objects.filter(lab_code__startswith=prefix).count()
    return f'{prefix}{str(existing + 41).zfill(3)}'

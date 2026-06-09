import re
from decimal import Decimal, InvalidOperation

from .models import ReportValue


def parse_numeric(value):
    if value is None or value == '':
        return None
    cleaned = str(value).strip().replace(',', '')
    match = re.search(r'-?\d+\.?\d*', cleaned)
    if not match:
        return None
    try:
        return Decimal(match.group())
    except InvalidOperation:
        return None


def parse_range(range_str):
    """Parse reference range strings like '4.5-11.0', '< 5.0', '> 100', '70 - 100'."""
    if not range_str or not str(range_str).strip():
        return None, None

    text = str(range_str).strip().replace('–', '-')

    if text.startswith('<'):
        upper = parse_numeric(text[1:])
        return None, upper

    if text.startswith('>'):
        lower = parse_numeric(text[1:])
        return lower, None

    if '-' in text:
        parts = text.split('-', 1)
        low = parse_numeric(parts[0])
        high = parse_numeric(parts[1])
        return low, high

    single = parse_numeric(text)
    if single is not None:
        return single, single

    return None, None


def is_child_patient(patient):
    years = patient.age_years or 0
    if years == 0:
        return False
    return years < 18


def select_reference_range(parameter, patient):
    if is_child_patient(patient) and parameter.reference_range_child:
        return parameter.reference_range_child
    if patient.gender == 'female' and parameter.reference_range_female:
        return parameter.reference_range_female
    return parameter.reference_range_male or parameter.reference_range_female or parameter.reference_range_child


def calculate_flag(value, parameter, patient):
    numeric = parse_numeric(value)
    if numeric is None:
        return ReportValue.FLAG_NORMAL

    if parameter.critical_low is not None and numeric <= parameter.critical_low:
        return ReportValue.FLAG_CRITICAL
    if parameter.critical_high is not None and numeric >= parameter.critical_high:
        return ReportValue.FLAG_CRITICAL

    ref_str = select_reference_range(parameter, patient)
    low, high = parse_range(ref_str)

    if low is not None and numeric < low:
        return ReportValue.FLAG_LOW
    if high is not None and numeric > high:
        return ReportValue.FLAG_HIGH

    return ReportValue.FLAG_NORMAL

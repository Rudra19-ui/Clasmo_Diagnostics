"""Rules for editing registrations after create (franchise Edit Entry)."""

from datetime import timedelta

from django.utils import timezone

EDIT_WINDOW = timedelta(hours=12)


def registration_edit_deadline(registration):
    base = registration.registration_date or registration.created_at
    return base + EDIT_WINDOW


def can_edit_registration(registration, now=None):
    now = now or timezone.now()
    return now <= registration_edit_deadline(registration)


def registration_edit_hours_left(registration, now=None):
    now = now or timezone.now()
    remaining = registration_edit_deadline(registration) - now
    if remaining.total_seconds() <= 0:
        return 0.0
    return round(remaining.total_seconds() / 3600, 2)


def editable_registrations_since(now=None):
    now = now or timezone.now()
    return now - EDIT_WINDOW

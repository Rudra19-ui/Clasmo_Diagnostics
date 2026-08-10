"""Geographic zone definitions and seed helpers."""

from api.models import User, Zone

# Existing 9 role accounts live in Zone 1 (Nashik). Other zones get an admin only.
DEFAULT_ZONES = [
    {'code': 'nashik', 'name': 'Nashik', 'sort_order': 1},
    {'code': 'pune', 'name': 'Pune', 'sort_order': 2},
    {'code': 'ratnagiri', 'name': 'Ratnagiri', 'sort_order': 3},
    {'code': 'mumbai', 'name': 'Mumbai', 'sort_order': 4},
    {'code': 'dhule', 'name': 'Dhule', 'sort_order': 5},
]

# username, password, display_name, zone_code
ZONE_ADMIN_ACCOUNTS = [
    ('admin', 'admin123', 'Admin', 'nashik'),
    ('pune_admin', 'pune123', 'Pune Admin', 'pune'),
    ('ratnagiri_admin', 'ratnagiri123', 'Ratnagiri Admin', 'ratnagiri'),
    ('mumbai_admin', 'mumbai123', 'Mumbai Admin', 'mumbai'),
    ('dhule_admin', 'dhule123', 'Dhule Admin', 'dhule'),
]

NASHIK_ZONE_CODE = 'nashik'


def ensure_zones(*, stdout=None):
    """Create/update the five operating zones."""
    created = 0
    zones_by_code = {}
    for item in DEFAULT_ZONES:
        zone, was_created = Zone.objects.update_or_create(
            code=item['code'],
            defaults={
                'name': item['name'],
                'sort_order': item['sort_order'],
                'is_active': True,
            },
        )
        zones_by_code[zone.code] = zone
        if was_created:
            created += 1
            if stdout:
                stdout.write(f'Created zone: {zone.name}')
    return zones_by_code, created


def ensure_zone_admins(*, reset_passwords=True, stdout=None):
    """Ensure each zone has an admin who can manage that zone's users and data."""
    zones_by_code, _ = ensure_zones(stdout=stdout)
    created_count = 0
    updated_count = 0

    for username, password, display_name, zone_code in ZONE_ADMIN_ACCOUNTS:
        zone = zones_by_code[zone_code]
        user = User.objects.filter(username=username).first()
        if user is None:
            User.objects.create_user(
                username=username,
                password=password,
                role=User.ROLE_ADMIN,
                display_name=display_name,
                email=f'{username}@clasmo.test',
                is_staff=True,
                is_active=True,
                zone=zone,
            )
            created_count += 1
            if stdout:
                stdout.write(f'Created zone admin: {username} ({zone.name})')
            continue

        changed_fields = []
        if reset_passwords:
            user.set_password(password)
            changed_fields.append('password')
        if user.role != User.ROLE_ADMIN:
            user.role = User.ROLE_ADMIN
            changed_fields.append('role')
        if user.display_name != display_name:
            user.display_name = display_name
            changed_fields.append('display_name')
        if user.zone_id != zone.id:
            user.zone = zone
            changed_fields.append('zone')
        if not user.is_staff:
            user.is_staff = True
            changed_fields.append('is_staff')
        if not user.is_active:
            user.is_active = True
            changed_fields.append('is_active')
        if not user.email:
            user.email = f'{username}@clasmo.test'
            changed_fields.append('email')

        if changed_fields:
            user.save()
            updated_count += 1
            if stdout:
                stdout.write(f'Updated zone admin: {username} ({zone.name})')

    return created_count, updated_count


def assign_existing_users_to_nashik(*, stdout=None):
    """Put all users without a zone into Zone 1 (Nashik)."""
    zones_by_code, _ = ensure_zones()
    nashik = zones_by_code[NASHIK_ZONE_CODE]
    updated = User.objects.filter(zone__isnull=True).update(zone=nashik)
    if updated and stdout:
        stdout.write(f'Assigned {updated} user(s) to {nashik.name} zone.')
    return updated


def backfill_operational_data_to_nashik(*, stdout=None):
    """Assign existing patients/registrations/doctors/centers without a zone to Nashik."""
    from api.models import CollectionCenter, Doctor, Patient, Registration

    zones_by_code, _ = ensure_zones()
    nashik = zones_by_code[NASHIK_ZONE_CODE]
    counts = {}
    for model, label in (
        (Patient, 'patients'),
        (Registration, 'registrations'),
        (Doctor, 'doctors'),
        (CollectionCenter, 'collection_centers'),
    ):
        counts[label] = model.objects.filter(zone__isnull=True).update(zone=nashik)
    if stdout:
        for label, count in counts.items():
            if count:
                stdout.write(f'Assigned {count} {label} to {nashik.name} zone.')
    return counts

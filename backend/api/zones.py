"""Geographic zone definitions and seed helpers."""

from api.models import User, Zone

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

# Non-admin roles seeded in every zone.
# Nashik keeps short usernames; other zones use "{code}_" prefix.
# (role_key, role, nashik_password, display_label, is_staff)
ZONE_ROLE_DEFS = [
    ('user', User.ROLE_USER, 'user123', 'User', False),
    ('technician', User.ROLE_TECHNICIAN, 'tech123', 'Technician', False),
    ('pathologist', User.ROLE_PATHOLOGIST, 'patho123', 'Pathologist', False),
    ('hr', User.ROLE_HR, 'hr123', 'HR', False),
    ('receptionist', User.ROLE_RECEPTIONIST, 'reception123', 'Receptionist', False),
    ('supreme', User.ROLE_SUPER_FRANCHISEE, 'supreme123', 'Supreme', False),
    ('prime', User.ROLE_FRANCHISEE, 'prime123', 'Prime', False),
    ('sub', User.ROLE_SUB_FRANCHISE, 'sub123', 'Sub-Franchise', False),
]

NASHIK_ZONE_CODE = 'nashik'


def _zone_role_username(zone_code: str, role_key: str) -> str:
    if zone_code == NASHIK_ZONE_CODE:
        return role_key
    return f'{zone_code}_{role_key}'


def _zone_role_password(zone_code: str, role_key: str, nashik_password: str) -> str:
    if zone_code == NASHIK_ZONE_CODE:
        return nashik_password
    short = {
        'user': 'user123',
        'technician': 'tech123',
        'pathologist': 'patho123',
        'hr': 'hr123',
        'receptionist': 'reception123',
        'supreme': 'supreme123',
        'prime': 'prime123',
        'sub': 'sub123',
    }.get(role_key, nashik_password)
    return f'{zone_code}_{short}'


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


def ensure_all_zone_role_accounts(*, reset_passwords=True, stdout=None):
    """
    Create every operational role in every zone:
    user, technician, pathologist, hr, receptionist, supreme, prime, sub.
    Franchise chain per zone: supreme → prime → sub.
    """
    zones_by_code, _ = ensure_zones(stdout=stdout)
    created_count = 0
    updated_count = 0

    for zone_code, zone in zones_by_code.items():
        by_key = {}
        for role_key, role, nashik_password, label, is_staff in ZONE_ROLE_DEFS:
            username = _zone_role_username(zone_code, role_key)
            password = _zone_role_password(zone_code, role_key, nashik_password)
            display_name = label if zone_code == NASHIK_ZONE_CODE else f'{zone.name} {label}'
            user = User.objects.filter(username=username).first()
            if user is None:
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    role=role,
                    display_name=display_name,
                    email=f'{username}@clasmo.test',
                    is_staff=is_staff,
                    is_active=True,
                    zone=zone,
                )
                created_count += 1
                if stdout:
                    stdout.write(f'Created: {username} ({zone.name} / {label})')
            else:
                changed = False
                if reset_passwords:
                    user.set_password(password)
                    changed = True
                if user.role != role:
                    user.role = role
                    changed = True
                if user.display_name != display_name:
                    user.display_name = display_name
                    changed = True
                if user.zone_id != zone.id:
                    user.zone = zone
                    changed = True
                if user.is_staff != is_staff:
                    user.is_staff = is_staff
                    changed = True
                if not user.is_active:
                    user.is_active = True
                    changed = True
                if not user.email:
                    user.email = f'{username}@clasmo.test'
                    changed = True
                if changed:
                    user.save()
                    updated_count += 1
                    if stdout:
                        stdout.write(f'Updated: {username} ({zone.name} / {label})')
            by_key[role_key] = user

        supreme = by_key.get('supreme')
        prime = by_key.get('prime')
        sub = by_key.get('sub')
        if supreme and prime and prime.parent_franchisee_id != supreme.id:
            prime.parent_franchisee = supreme
            prime.save(update_fields=['parent_franchisee'])
            if stdout:
                stdout.write(f'Linked {prime.username} → {supreme.username}')
        if prime and sub and sub.parent_franchisee_id != prime.id:
            sub.parent_franchisee = prime
            sub.save(update_fields=['parent_franchisee'])
            if stdout:
                stdout.write(f'Linked {sub.username} → {prime.username}')

    return created_count, updated_count


def assign_existing_users_to_nashik(*, stdout=None):
    """Put all users without a zone into Zone 1 (Nashik), except Super Admin."""
    zones_by_code, _ = ensure_zones()
    nashik = zones_by_code[NASHIK_ZONE_CODE]
    updated = (
        User.objects.filter(zone__isnull=True)
        .exclude(role=User.ROLE_SUPER_ADMIN)
        .exclude(is_superuser=True)
        .update(zone=nashik)
    )
    if updated and stdout:
        stdout.write(f'Assigned {updated} user(s) to {nashik.name} zone.')
    return updated


def ensure_super_admin(*, reset_password=True, stdout=None):
    """Create/update the cross-zone Super Admin account (no zone assignment)."""
    username = 'superadmin'
    password = 'superadmin123'
    display_name = 'Super Admin'
    user = User.objects.filter(username=username).first()
    if user is None:
        user = User.objects.create_user(
            username=username,
            password=password,
            role=User.ROLE_SUPER_ADMIN,
            display_name=display_name,
            email='superadmin@clasmo.test',
            is_staff=True,
            is_superuser=True,
            is_active=True,
            zone=None,
        )
        if stdout:
            stdout.write(f'Created super admin: {username}')
        return user, True

    changed = False
    if reset_password:
        user.set_password(password)
        changed = True
    if user.role != User.ROLE_SUPER_ADMIN:
        user.role = User.ROLE_SUPER_ADMIN
        changed = True
    if user.display_name != display_name:
        user.display_name = display_name
        changed = True
    if user.zone_id is not None:
        user.zone = None
        changed = True
    if not user.is_staff:
        user.is_staff = True
        changed = True
    if not user.is_superuser:
        user.is_superuser = True
        changed = True
    if not user.is_active:
        user.is_active = True
        changed = True
    if changed:
        user.save()
        if stdout:
            stdout.write(f'Updated super admin: {username}')
    return user, False


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

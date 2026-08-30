"""Shared login accounts for demos and local QA."""

from api.models import User

# username, password, role, display_name, is_staff
TEST_ACCOUNTS = [
    ('admin', 'admin123', User.ROLE_ADMIN, 'Admin', True),
    ('user', 'user123', User.ROLE_USER, 'User', False),
    ('technician', 'tech123', User.ROLE_TECHNICIAN, 'Technician', False),
    ('pathologist', 'patho123', User.ROLE_PATHOLOGIST, 'Pathologist', False),
    ('hr', 'hr123', User.ROLE_HR, 'HR', False),
    ('receptionist', 'reception123', User.ROLE_RECEPTIONIST, 'Receptionist', False),
    ('supreme', 'supreme123', User.ROLE_SUPER_FRANCHISEE, 'Supreme', False),
    ('prime', 'prime123', User.ROLE_FRANCHISEE, 'Prime', False),
    ('sub', 'sub123', User.ROLE_SUB_FRANCHISE, 'Sub-Franchise', False),
]

# Previous trial usernames — deactivated after migration to short Nashik names.
LEGACY_USERNAMES = (
    'user_test',
    'admin_test',
    'technician_test',
    'pathologist_test',
)

# Map old *_test usernames to current Nashik short names when upgrading existing DBs.
LEGACY_USERNAME_ALIASES = {
    'admin_test': 'admin',
    'user_test': 'user',
    'technician_test': 'technician',
    'pathologist_test': 'pathologist',
}

# Kept for callers that still import TRIAL_USERS as dicts.
TRIAL_USERS = [
    {
        'username': username,
        'password': password,
        'role': role,
        'display_name': display_name,
        'is_staff': is_staff,
    }
    for username, password, role, display_name, is_staff in TEST_ACCOUNTS
]


def migrate_legacy_usernames(*, stdout=None):
    """
    Rename legacy *_test accounts to short Nashik usernames when the new name is free.
    Deactivates any remaining legacy logins so README credentials stay unambiguous.
    """
    renamed = 0
    deactivated = 0
    for legacy, target in LEGACY_USERNAME_ALIASES.items():
        legacy_user = User.objects.filter(username=legacy).first()
        if not legacy_user:
            continue
        if not User.objects.filter(username=target).exists():
            legacy_user.username = target
            legacy_user.is_active = True
            legacy_user.save(update_fields=['username', 'is_active'])
            renamed += 1
            if stdout:
                stdout.write(f'Renamed legacy login: {legacy} → {target}')
        else:
            legacy_user.is_active = False
            legacy_user.save(update_fields=['is_active'])
            deactivated += 1
            if stdout:
                stdout.write(f'Deactivated legacy login: {legacy} (target {target} already exists)')

    return renamed, deactivated


def ensure_trial_users(*, reset_passwords=True, stdout=None):
    from api.zones import (
        assign_existing_users_to_nashik,
        ensure_all_zone_role_accounts,
        ensure_super_admin,
        ensure_zone_admins,
        ensure_zones,
    )

    ensure_zones(stdout=stdout)
    renamed, deactivated = migrate_legacy_usernames(stdout=stdout)
    ensure_super_admin(reset_password=reset_passwords, stdout=stdout)
    admin_created, admin_updated = ensure_zone_admins(
        reset_passwords=reset_passwords,
        stdout=stdout,
    )
    role_created, role_updated = ensure_all_zone_role_accounts(
        reset_passwords=reset_passwords,
        stdout=stdout,
    )
    assign_existing_users_to_nashik(stdout=stdout)
    return (
        admin_created + role_created + renamed,
        admin_updated + role_updated + deactivated,
    )

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

# Previous trial usernames — deactivated so only the list above remains usable.
LEGACY_USERNAMES = (
    'user_test',
    'admin_test',
    'technician_test',
    'pathologist_test',
)

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


def ensure_trial_users(*, reset_passwords=True, stdout=None):
    from api.zones import (
        assign_existing_users_to_nashik,
        ensure_all_zone_role_accounts,
        ensure_super_admin,
        ensure_zone_admins,
        ensure_zones,
    )

    ensure_zones(stdout=stdout)
    ensure_super_admin(reset_password=reset_passwords, stdout=stdout)
    ensure_zone_admins(reset_passwords=reset_passwords, stdout=stdout)
    ensure_all_zone_role_accounts(reset_passwords=reset_passwords, stdout=stdout)
    assign_existing_users_to_nashik(stdout=stdout)
    return 0, 0

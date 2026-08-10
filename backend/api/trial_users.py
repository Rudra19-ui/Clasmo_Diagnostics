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
    created_count = 0
    updated_count = 0

    for username, password, role, display_name, is_staff in TEST_ACCOUNTS:
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
            )
            created_count += 1
            if stdout:
                stdout.write(f'Created login user: {user.username}')
            continue

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
                stdout.write(f'Updated login user: {user.username}')

    # Franchise hierarchy: supreme → prime → sub
    try:
        supreme = User.objects.get(username='supreme')
        prime = User.objects.get(username='prime')
        sub = User.objects.get(username='sub')
        if prime.parent_franchisee_id != supreme.id:
            prime.parent_franchisee = supreme
            prime.save(update_fields=['parent_franchisee'])
        if sub.parent_franchisee_id != prime.id:
            sub.parent_franchisee = prime
            sub.save(update_fields=['parent_franchisee'])
    except User.DoesNotExist:
        pass

    deactivated = User.objects.filter(username__in=LEGACY_USERNAMES, is_active=True).update(is_active=False)
    if deactivated and stdout:
        stdout.write(f'Deactivated {deactivated} legacy trial account(s): {", ".join(LEGACY_USERNAMES)}')

    return created_count, updated_count

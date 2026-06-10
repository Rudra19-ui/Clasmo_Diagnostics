"""Shared trial login accounts for demos and production smoke tests."""

TRIAL_USERS = [
    {
        'username': 'user_test',
        'password': 'password123',
        'role': 'user',
        'display_name': 'CLASMO_Diag',
        'is_staff': False,
    },
    {
        'username': 'admin_test',
        'password': 'admin123',
        'role': 'admin',
        'display_name': 'Admin',
        'is_staff': True,
    },
    {
        'username': 'technician_test',
        'password': 'tech123',
        'role': 'technician',
        'display_name': 'Lab Technician',
        'is_staff': False,
    },
    {
        'username': 'pathologist_test',
        'password': 'patho123',
        'role': 'pathologist',
        'display_name': 'Pathologist',
        'is_staff': False,
    },
]


def ensure_trial_users(*, reset_passwords=True, stdout=None):
    from api.models import User

    created_count = 0
    updated_count = 0

    for entry in TRIAL_USERS:
        user = User.objects.filter(username=entry['username']).first()
        if user is None:
            user = User.objects.create_user(
                username=entry['username'],
                password=entry['password'],
                role=entry['role'],
                display_name=entry['display_name'],
                lab_code='202505017',
                is_staff=entry['is_staff'],
            )
            created_count += 1
            if stdout:
                stdout.write(f'Created trial user: {user.username}')
            continue

        changed = False
        if reset_passwords:
            user.set_password(entry['password'])
            changed = True
        if user.role != entry['role']:
            user.role = entry['role']
            changed = True
        if user.display_name != entry['display_name']:
            user.display_name = entry['display_name']
            changed = True
        if user.lab_code != '202505017':
            user.lab_code = '202505017'
            changed = True
        if user.is_staff != entry['is_staff']:
            user.is_staff = entry['is_staff']
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True

        if changed:
            user.save()
            updated_count += 1
            if stdout:
                stdout.write(f'Updated trial user: {user.username}')

    return created_count, updated_count

"""
Seed one simple test account per role for local QA.

Usage:
  python manage.py seed_test_roles
"""

from django.core.management.base import BaseCommand

from api.models import User


# username, password, role, display_name, is_staff
TEST_ACCOUNTS = [
    ('admin', 'admin123', User.ROLE_ADMIN, 'Admin Test', True),
    ('user', 'user123', User.ROLE_USER, 'User Test', False),
    ('technician', 'tech123', User.ROLE_TECHNICIAN, 'Technician Test', False),
    ('pathologist', 'patho123', User.ROLE_PATHOLOGIST, 'Pathologist Test', False),
    ('hr', 'hr123', User.ROLE_HR, 'HR Test', False),
    ('receptionist', 'reception123', User.ROLE_RECEPTIONIST, 'Receptionist Test', False),
    ('supreme', 'supreme123', User.ROLE_SUPER_FRANCHISEE, 'Supreme Test', False),
    ('prime', 'prime123', User.ROLE_FRANCHISEE, 'Prime Test', False),
    ('sub', 'sub123', User.ROLE_SUB_FRANCHISE, 'Sub-Franchise Test', False),
]


class Command(BaseCommand):
    help = 'Create/reset one username+password account for every role (local testing).'

    def handle(self, *args, **options):
        created_or_updated = []
        for username, password, role, display_name, is_staff in TEST_ACCOUNTS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role': role,
                    'display_name': display_name,
                    'is_staff': is_staff,
                    'is_active': True,
                    'email': f'{username}@clasmo.test',
                },
            )
            user.role = role
            user.display_name = display_name
            user.is_staff = is_staff
            user.is_active = True
            user.email = user.email or f'{username}@clasmo.test'
            user.set_password(password)
            user.save()
            created_or_updated.append((username, password, role, 'created' if created else 'reset'))

        supreme = User.objects.get(username='supreme')
        prime = User.objects.get(username='prime')
        sub = User.objects.get(username='sub')
        prime.parent_franchisee = supreme
        prime.save(update_fields=['parent_franchisee'])
        sub.parent_franchisee = prime
        sub.save(update_fields=['parent_franchisee'])

        self.stdout.write(self.style.SUCCESS('Test accounts ready (franchise chain: supreme → prime → sub):'))
        self.stdout.write('')
        self.stdout.write(f'{"Username":<14} {"Password":<14} {"Role"}')
        self.stdout.write('-' * 48)
        for username, password, role, _status in created_or_updated:
            self.stdout.write(f'{username:<14} {password:<14} {role}')

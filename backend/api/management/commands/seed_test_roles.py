"""
Seed / reset the standard login accounts for local QA.

Usage:
  python manage.py seed_test_roles
"""

from django.core.management.base import BaseCommand

from api.trial_users import TEST_ACCOUNTS, ensure_trial_users


class Command(BaseCommand):
    help = 'Create/reset the standard username+password accounts (local testing).'

    def handle(self, *args, **options):
        ensure_trial_users(reset_passwords=True, stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS('Login accounts ready (franchise chain: supreme → prime → sub):'))
        self.stdout.write('')
        self.stdout.write(f'{"Username":<14} {"Password":<14} {"Role"}')
        self.stdout.write('-' * 48)
        for username, password, role, _display, _staff in TEST_ACCOUNTS:
            self.stdout.write(f'{username:<14} {password:<14} {role}')

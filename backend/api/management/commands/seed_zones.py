from django.core.management.base import BaseCommand

from api.zones import (
    assign_existing_users_to_nashik,
    backfill_operational_data_to_nashik,
    ensure_all_zone_role_accounts,
    ensure_super_admin,
    ensure_zone_admins,
    ensure_zones,
)
from api.zone_rates import ensure_zone_franchise_rates


class Command(BaseCommand):
    help = 'Create zones, all role accounts per zone, and franchise hierarchies.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-reset-passwords',
            action='store_true',
            help='Do not reset seeded account passwords.',
        )

    def handle(self, *args, **options):
        reset = not options['no_reset_passwords']
        ensure_zones(stdout=self.stdout)
        ensure_super_admin(reset_password=reset, stdout=self.stdout)
        assign_existing_users_to_nashik(stdout=self.stdout)
        backfill_operational_data_to_nashik(stdout=self.stdout)
        ensure_zone_admins(reset_passwords=reset, stdout=self.stdout)
        ensure_all_zone_role_accounts(reset_passwords=reset, stdout=self.stdout)
        ensure_zone_franchise_rates(stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS('Zone structure and all role accounts are ready.'))

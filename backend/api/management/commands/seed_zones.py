from django.core.management.base import BaseCommand

from api.zones import (
    assign_existing_users_to_nashik,
    backfill_operational_data_to_nashik,
    ensure_zone_admins,
    ensure_zones,
)


class Command(BaseCommand):
    help = 'Create zones, assign existing data to Nashik, and ensure zone admin accounts.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-reset-passwords',
            action='store_true',
            help='Do not reset zone admin passwords.',
        )

    def handle(self, *args, **options):
        ensure_zones(stdout=self.stdout)
        assign_existing_users_to_nashik(stdout=self.stdout)
        backfill_operational_data_to_nashik(stdout=self.stdout)
        ensure_zone_admins(
            reset_passwords=not options['no_reset_passwords'],
            stdout=self.stdout,
        )
        self.stdout.write(self.style.SUCCESS('Zone structure is ready.'))

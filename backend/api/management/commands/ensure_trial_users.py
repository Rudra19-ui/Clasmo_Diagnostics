from django.core.management.base import BaseCommand

from api.trial_users import ensure_trial_users


class Command(BaseCommand):
    help = 'Create or refresh trial login credentials'

    def handle(self, *args, **options):
        created, updated = ensure_trial_users(reset_passwords=True, stdout=self.stdout)
        self.stdout.write(
            self.style.SUCCESS(
                f'Trial users ready. Created: {created}, updated: {updated}.'
            )
        )

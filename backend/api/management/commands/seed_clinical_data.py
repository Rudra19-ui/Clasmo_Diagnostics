from decimal import Decimal

from django.core.management.base import BaseCommand

from api.models import Test, TestParameter

PARAMETER_SEED = {
    'CBC (COMPLETE BLOOD COUNT)': [
        ('Hemoglobin', 'g/dL', '13.0-17.0', '12.0-15.0', '11.0-14.0', Decimal('7.0'), Decimal('20.0')),
        ('WBC', '10^3/uL', '4.0-11.0', '4.0-11.0', '5.0-15.0', Decimal('2.0'), Decimal('30.0')),
        ('RBC', '10^6/uL', '4.5-5.9', '4.0-5.2', '4.0-5.2', Decimal('2.5'), Decimal('7.0')),
        ('Platelet Count', '10^3/uL', '150-400', '150-400', '150-450', Decimal('50'), Decimal('1000')),
        ('Hematocrit', '%', '40-52', '36-48', '32-44', Decimal('20'), Decimal('60')),
    ],
    'BLOOD SUGAR FASTING': [
        ('Fasting Glucose', 'mg/dL', '70-100', '70-100', '70-100', Decimal('50'), Decimal('400')),
    ],
    'THYROID PROFILE': [
        ('TSH', 'mIU/L', '0.4-4.0', '0.4-4.0', '0.7-6.4', Decimal('0.1'), Decimal('20.0')),
        ('T3', 'ng/dL', '80-200', '80-200', '105-250', Decimal('50'), Decimal('300')),
        ('T4', 'ug/dL', '5.0-12.0', '5.0-12.0', '6.0-14.0', Decimal('2.0'), Decimal('20.0')),
    ],
}


class Command(BaseCommand):
    help = 'Seed clinical test parameters for CBC, Blood Sugar, Thyroid'

    def handle(self, *args, **options):
        created = 0
        for test_name, parameters in PARAMETER_SEED.items():
            test = Test.objects.filter(name=test_name).first()
            if not test:
                self.stdout.write(self.style.WARNING(f'Test not found: {test_name}. Run seed_data first.'))
                continue

            for row in parameters:
                name, unit, male, female, child, crit_low, crit_high = row
                _, was_created = TestParameter.objects.update_or_create(
                    test=test,
                    parameter_name=name,
                    defaults={
                        'unit': unit,
                        'reference_range_male': male,
                        'reference_range_female': female,
                        'reference_range_child': child,
                        'critical_low': crit_low,
                        'critical_high': crit_high,
                        'is_active': True,
                    },
                )
                if was_created:
                    created += 1

        self.stdout.write(self.style.SUCCESS(f'Clinical seed complete. {created} new parameters added.'))

from datetime import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Patient, Registration, RegistrationTest, Test, TestCategory, User


TESTS = [
    ('24 HRS URINE PROTEIN', 350, 'Biochemistry'),
    ('ABSOLUTE EOSINOPHIL COUNT (AEC)', 180, 'Hematology'),
    ('ABSOLUTE LYMPHOCYTE COUNT', 200, 'Hematology'),
    ('ACID PHOSPHATASE', 250, 'Biochemistry'),
    ('ACTH', 1200, 'Biochemistry'),
    ('ADA (FLUID)', 450, 'Serology'),
    ('AFB CULTURE', 600, 'Microbiology'),
    ('ALBUMIN', 120, 'Biochemistry'),
    ('ALDEHYDE TEST', 150, 'Biochemistry'),
    ('ALKALINE PHOSPHATASE', 140, 'Biochemistry'),
    ('ALPHA FETO PROTEIN (AFP)', 800, 'Biochemistry'),
    ('AMYLASE', 280, 'Biochemistry'),
    ('ANA (ANTINUCLEAR ANTIBODY)', 950, 'Serology'),
    ('ANTI CCP', 1100, 'Serology'),
    ('ANTI HCV', 400, 'Serology'),
    ('BLOOD SUGAR FASTING', 80, 'Biochemistry'),
    ('BLOOD SUGAR PP', 80, 'Biochemistry'),
    ('CBC (COMPLETE BLOOD COUNT)', 250, 'Hematology'),
    ('CREATININE', 120, 'Biochemistry'),
    ('HBA1C', 450, 'Biochemistry'),
    ('LIPID PROFILE', 650, 'Biochemistry'),
    ('LIVER FUNCTION TEST', 550, 'Biochemistry'),
    ('THYROID PROFILE', 750, 'Biochemistry'),
    ('URINE ROUTINE', 100, 'Biochemistry'),
    ('VITAMIN D', 1200, 'Biochemistry'),
    ('VITAMIN B12', 900, 'Biochemistry'),
]

MOCK_REGISTRATIONS = [
    ('270526041', 'Rajesh Kumar', 'CBC (COMPLETE BLOOD COUNT)', 'Registered', 250),
    ('270526042', 'Priya Sharma', 'LIPID PROFILE', 'Collection', 650),
    ('270526038', 'Amit Patel', 'THYROID PROFILE', 'Result Ready', 750),
    ('270526035', 'Sneha Desai', 'HBA1C', 'Printed', 450),
]


class Command(BaseCommand):
    help = 'Seed trial users, tests, and sample registrations'

    def handle(self, *args, **options):
        if not User.objects.filter(username='user_test').exists():
            user = User.objects.create_user(
                username='user_test',
                password='password123',
                role=User.ROLE_USER,
                display_name='CLASMO_Diag',
                lab_code='202505017',
            )
            self.stdout.write(self.style.SUCCESS(f'Created user: {user.username}'))

        if not User.objects.filter(username='admin_test').exists():
            admin = User.objects.create_user(
                username='admin_test',
                password='admin123',
                role=User.ROLE_ADMIN,
                display_name='Admin',
                lab_code='202505017',
                is_staff=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Created admin: {admin.username}'))

        categories = {}
        for _, _, cat_name in TESTS:
            categories[cat_name], _ = TestCategory.objects.get_or_create(name=cat_name)

        for name, price, cat_name in TESTS:
            Test.objects.get_or_create(
                name=name,
                defaults={
                    'price': Decimal(str(price)),
                    'category': categories[cat_name],
                    'short_name': name[:20],
                },
            )

        for lab_code, patient_name, test_name, status, amount in MOCK_REGISTRATIONS:
            if Registration.objects.filter(lab_code=lab_code).exists():
                continue
            patient = Patient.objects.create(
                patient_name=patient_name,
                mobile='9999999999',
                collection_center='CLASMO Diagnostics pvt',
            )
            reg_date = timezone.make_aware(datetime(2026, 5, 27, 10, 0, 0))
            registration = Registration.objects.create(
                lab_code=lab_code,
                patient=patient,
                registration_date=reg_date,
                collection_date=reg_date,
                status=status,
                total=Decimal(str(amount)),
                net_amount=Decimal(str(amount)),
                paid=Decimal(str(amount)),
                balance=Decimal('0'),
            )
            test = Test.objects.get(name=test_name)
            RegistrationTest.objects.create(
                registration=registration,
                test=test,
                price=Decimal(str(amount)),
            )

        self.stdout.write(self.style.SUCCESS('Seed data loaded successfully.'))

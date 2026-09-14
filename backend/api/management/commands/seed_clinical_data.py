from decimal import Decimal
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand

from api.models import ReportFormatAsset, Test, TestParameter

# (name, unit, male_ref, female_ref, child_ref, crit_low, crit_high, method, analyzer_code)
# Sample Report leaves Result blank until machine/manual entry.
CBC_PARAMETERS = [
    ('Hemoglobin', 'g/dL', '13 - 18', '12 - 15', '11 - 16', Decimal('7.0'), Decimal('20.0'), 'SLS-Hemoglobin', 'HGB'),
    ('Total Red Blood Cell Count', '10^6/uL', '4.0 - 5.5', '3.8 - 4.8', '4.0 - 5.2', Decimal('2.5'), Decimal('7.0'), 'Electrical Impedance', 'RBC'),
    ('Hematocrit (HCT)', '%', '33 - 57', '36 - 46', '32 - 44', Decimal('20'), Decimal('60'), 'Calculated', 'HCT'),
    ('Total Leucocytes Count', '10^3/uL', '4 - 10', '4 - 10', '5 - 15', Decimal('2.0'), Decimal('30.0'), 'Electrical Impedance', 'WBC'),
    ('Neutrophils Percentage', '%', '40 - 80', '40 - 80', '30 - 60', None, None, 'Flow Cytometry/LM', 'NEUT%'),
    ('Lymphocyte Percentage', '%', '20 - 40', '20 - 40', '25 - 50', None, None, 'Flow Cytometry/LM', 'LYMPH%'),
    ('Eosinophils Percentage', '%', '1 - 6', '1 - 6', '1 - 6', None, None, 'Flow Cytometry/LM', 'EO%'),
    ('Monocytes Percentage', '%', '2 - 10', '2 - 10', '2 - 10', None, None, 'Flow Cytometry/LM', 'MONO%'),
    ('Basophils Percentage', '%', '0.0 - 1.0', '0.0 - 1.0', '0.0 - 1.0', None, None, 'Flow Cytometry/LM', 'BASO%'),
    ('Neutrophils-Absolute Count', '10^3/uL', '1.8 - 7.8', '1.8 - 7.8', '1.5 - 8.0', None, None, 'Calculated', 'NEUT#'),
    ('Lymphocytes-Absolute Count', '10^3/uL', '0.8 - 4.8', '0.8 - 4.8', '1.0 - 5.0', None, None, 'Calculated', 'LYMPH#'),
    ('Eosinophils-Absolute Count', '10^3/uL', '0.0 - 0.50', '0.0 - 0.50', '0.0 - 0.50', None, None, 'Calculated', 'EO#'),
    ('Monocyte-Absolute Count', '10^3/uL', '0.50 - 1.00', '0.50 - 1.00', '0.20 - 1.00', None, None, 'Calculated', 'MONO#'),
    ('Basophils-Absolute Count', '10^3/uL', '0.0 - 0.20', '0.0 - 0.20', '0.0 - 0.20', None, None, 'Calculated', 'BASO#'),
    ('Mean Corpuscular Volume (MCV)', 'fL', '80 - 96', '80 - 96', '70 - 86', None, None, 'Calculated', 'MCV'),
    ('Mean Corpuscular Hemoglobin (MCH)', 'pg', '27.5 - 32.2', '27.5 - 32.2', '24 - 30', None, None, 'Calculated', 'MCH'),
    ('Mean Corpuscular Hemoglobin Concentration (MCHC)', 'g/dL', '29.4 - 34.5', '29.4 - 34.5', '30 - 36', None, None, 'Calculated', 'MCHC'),
    ('Red Cell Distribution Width (RDW-CV)', '%', '12 - 15', '12 - 15', '12 - 15', None, None, 'Calculated', 'RDW-CV'),
    ('Platelet Count', '10^3/uL', '150 - 410', '150 - 410', '150 - 450', Decimal('50'), Decimal('1000'), 'Electrical Impedance', 'PLT'),
    ('Mean Platelet Volume (MPV)', 'fL', '6 - 11', '6 - 11', '6 - 11', None, None, 'Calculated', 'MPV'),
    ('Platelet haematocrit (PCT)', '%', '0.1 - 0.28', '0.1 - 0.28', '0.1 - 0.28', None, None, 'Calculated', 'PCT'),
    ('Platelet Distribution Width (PDW)', 'fL', '15 - 18', '15 - 18', '15 - 18', None, None, 'Calculated', 'PDW'),
    ('Platelet larger cell Count (PLCC)', '10^3/uL', '13 - 126', '13 - 126', '13 - 126', None, None, 'Westergren', 'PLCC'),
    ('Platelet larger cell ratio (PLCR)', '%', '13 - 43', '13 - 43', '13 - 43', None, None, '', 'PLCR'),
]

CBC_TEST_NAMES = [
    'CBC (COMPLETE BLOOD COUNT)',
    'Complete Blood Count (CBC)',
]

OH_PROGESTERONE_TEST_NAMES = [
    '17 OH Progesterone',
    '17-OH Progesterone',
    '17 OH PROGESTERONE',
]

OH_PROGESTERONE_DESCRIPTION = (
    'Sample report format for 17 OH Progesterone (Serum, CLIA). '
    'Patient fields and result value are placeholders filled after booking and result entry.'
)

OH_PROGESTERONE_REF_FEMALE = (
    'Follicular 0.32-1.47; Luteal 0.25-2.91; Contraception 0.20-1.90; Postmenopausal 0.19-0.71'
)

PARAMETER_SEED = {
    'BLOOD SUGAR FASTING': [
        ('Fasting Glucose', 'mg/dL', '70-100', '70-100', '70-100', Decimal('50'), Decimal('400'), '', 'GLU', 1),
    ],
    'THYROID PROFILE': [
        ('TSH', 'mIU/L', '0.4-4.0', '0.4-4.0', '0.7-6.4', Decimal('0.1'), Decimal('20.0'), '', 'TSH', 1),
        ('T3', 'ng/dL', '80-200', '80-200', '105-250', Decimal('50'), Decimal('300'), '', 'T3', 2),
        ('T4', 'ug/dL', '5.0-12.0', '5.0-12.0', '6.0-14.0', Decimal('2.0'), Decimal('20.0'), '', 'T4', 3),
    ],
}

DATA_DIR = Path(__file__).resolve().parents[2] / 'data' / 'report_formats'
OH_PROGESTERONE_PDF = DATA_DIR / '17_oh_progesterone_sample_report.pdf'


class Command(BaseCommand):
    help = 'Seed clinical test parameters and sample report formats (CBC, 17 OH Progesterone, etc.)'

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for test_name in CBC_TEST_NAMES:
            test = Test.objects.filter(name__iexact=test_name).first()
            if not test:
                test = Test.objects.filter(name__icontains='COMPLETE BLOOD COUNT').filter(name__icontains='CBC').first()
            if not test:
                self.stdout.write(self.style.WARNING(f'Test not found: {test_name}'))
                continue

            if not (test.sample_type or '').strip():
                test.sample_type = 'EDTA Blood'
                test.save(update_fields=['sample_type'])

            keep_names = set()
            for index, row in enumerate(CBC_PARAMETERS, start=1):
                name, unit, male, female, child, crit_low, crit_high, method, analyzer_code = row
                keep_names.add(name)
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
                        'sample_value': '',
                        'method': method,
                        'analyzer_code': analyzer_code,
                        'sort_order': index,
                        'is_active': True,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

            obsolete = TestParameter.objects.filter(test=test).exclude(parameter_name__in=keep_names)
            deactivated = obsolete.update(is_active=False)
            if deactivated:
                self.stdout.write(f'Deactivated {deactivated} obsolete parameter(s) for {test.name}')

            self.stdout.write(self.style.SUCCESS(f'Seeded CBC parameters for: {test.name}'))

        oh_test = None
        for test_name in OH_PROGESTERONE_TEST_NAMES:
            oh_test = Test.objects.filter(name__iexact=test_name).first()
            if oh_test:
                break
        if not oh_test:
            oh_test = Test.objects.filter(name__icontains='17 OH').filter(name__icontains='Progesterone').first()

        if oh_test:
            if not (oh_test.sample_type or '').strip():
                oh_test.sample_type = 'Serum'
                oh_test.save(update_fields=['sample_type'])

            _, was_created = TestParameter.objects.update_or_create(
                test=oh_test,
                parameter_name='17 OH Progesterone',
                defaults={
                    'unit': 'ng/mL',
                    'reference_range_male': '0.63 - 2.15',
                    'reference_range_female': OH_PROGESTERONE_REF_FEMALE,
                    'reference_range_child': '<1 yr <3.00; >1 yr <2.00',
                    'critical_low': None,
                    'critical_high': None,
                    'sample_value': '',
                    'method': 'CLIA',
                    'analyzer_code': '17OHPG',
                    'sort_order': 1,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

            asset, asset_created = ReportFormatAsset.objects.update_or_create(
                title='17 OH Progesterone Sample Report',
                defaults={
                    'description': OH_PROGESTERONE_DESCRIPTION,
                    'file_type': ReportFormatAsset.TYPE_PDF,
                    'test': oh_test,
                    'is_demo': False,
                    'is_active': True,
                    'sort_order': 10,
                },
            )
            if OH_PROGESTERONE_PDF.exists():
                needs_file = (
                    not asset.file
                    or not asset.file.name
                    or '17_oh_progesterone_sample_report' not in asset.file.name
                )
                if needs_file:
                    with OH_PROGESTERONE_PDF.open('rb') as handle:
                        asset.file.save(
                            '17_oh_progesterone_sample_report.pdf',
                            File(handle),
                            save=True,
                        )
                self.stdout.write(self.style.SUCCESS(
                    f'{"Created" if asset_created else "Updated"} sample report PDF for: {oh_test.name}'
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f'PDF not found at {OH_PROGESTERONE_PDF}; asset linked without file.'
                ))

            self.stdout.write(self.style.SUCCESS(f'Seeded parameter for: {oh_test.name}'))
        else:
            self.stdout.write(self.style.WARNING(
                'Test not found: 17 OH Progesterone. Import catalog / seed_data first.'
            ))

        for test_name, parameters in PARAMETER_SEED.items():
            test = Test.objects.filter(name=test_name).first()
            if not test:
                self.stdout.write(self.style.WARNING(f'Test not found: {test_name}. Run seed_data first.'))
                continue

            for row in parameters:
                name, unit, male, female, child, crit_low, crit_high, method, analyzer_code, sort_order = row
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
                        'sample_value': '',
                        'method': method,
                        'analyzer_code': analyzer_code,
                        'sort_order': sort_order,
                        'is_active': True,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Clinical seed complete. {created} created, {updated} updated.')
        )

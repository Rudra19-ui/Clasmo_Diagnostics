from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.barcode_service import (
    link_sample_barcodes,
    mark_registration_sample_scanned,
    scan_sample_by_barcode,
    test_matches_sample_type,
)
from api.models import Patient, PatientSampleBarcode, Registration, RegistrationTest, Test, TestCategory


class SampleBarcodeFilterTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='barcode_tester',
            password='test123',
            role='admin',
        )
        self.category = TestCategory.objects.create(name='POR Catalog')
        self.serum_test = Test.objects.create(
            name='17 OH Progesterone',
            price=Decimal('288'),
            sample_type='Serum',
            category=self.category,
        )
        self.urine_test = Test.objects.create(
            name='24 hour urine catecholamines',
            price=Decimal('920'),
            sample_type='Urine',
            category=self.category,
        )
        self.blood_test = Test.objects.create(
            name='Absolute Basophil Count',
            price=Decimal('35'),
            sample_type='EDTA Blood',
            category=self.category,
        )
        self.patient = Patient.objects.create(
            patient_id='000101',
            patient_name='Sample Patient',
            title='Mr.',
            gender='male',
        )
        self.registration = Registration.objects.create(
            lab_code='LAB001',
            patient=self.patient,
            created_by=self.user,
        )
        for test in (self.serum_test, self.urine_test, self.blood_test):
            RegistrationTest.objects.create(
                registration=self.registration,
                test=test,
                price=test.price,
            )

    def test_test_matches_sample_type_uses_catalog_sample_type(self):
        self.assertTrue(test_matches_sample_type(self.serum_test, 'Serum'))
        self.assertTrue(test_matches_sample_type(self.urine_test, 'Urine'))
        self.assertFalse(test_matches_sample_type(self.serum_test, 'Urine'))

    def test_scan_returns_only_tests_for_sample_barcode(self):
        link_sample_barcodes(
            patient=self.patient,
            registration=self.registration,
            barcodes_data=[
                {
                    'sample_type': 'Serum',
                    'barcode': 'SERUM-001',
                    'confirm_barcode': 'SERUM-001',
                    'test_ids': [self.serum_test.id],
                },
                {
                    'sample_type': 'Urine',
                    'barcode': 'URINE-001',
                    'confirm_barcode': 'URINE-001',
                    'test_ids': [self.urine_test.id],
                },
                {
                    'sample_type': 'EDTA Blood',
                    'barcode': 'EDTA-001',
                    'confirm_barcode': 'EDTA-001',
                    'test_ids': [self.blood_test.id],
                },
            ],
            user=self.user,
        )

        serum_scan = scan_sample_by_barcode('SERUM-001')
        urine_scan = scan_sample_by_barcode('URINE-001')
        blood_scan = scan_sample_by_barcode('EDTA-001')

        self.assertEqual(serum_scan['sample_type'], 'Serum')
        self.assertEqual(serum_scan['test_type'], 'Serum')
        self.assertEqual(serum_scan['gender_label'], 'Male')
        self.assertIn('age', serum_scan)
        self.assertEqual([item['name'] for item in serum_scan['tests']], ['17 OH Progesterone'])

        self.assertEqual(urine_scan['sample_type'], 'Urine')
        self.assertEqual([item['name'] for item in urine_scan['tests']], ['24 hour urine catecholamines'])

        self.assertEqual(blood_scan['sample_type'], 'EDTA Blood')
        self.assertEqual([item['name'] for item in blood_scan['tests']], ['Absolute Basophil Count'])

    def test_linked_test_ids_are_persisted(self):
        link_sample_barcodes(
            patient=self.patient,
            registration=self.registration,
            barcodes_data=[
                {
                    'sample_type': 'Serum',
                    'barcode': 'SERUM-002',
                    'confirm_barcode': 'SERUM-002',
                    'test_ids': [self.serum_test.id, self.blood_test.id],
                },
            ],
            user=self.user,
        )
        link = PatientSampleBarcode.objects.get(barcode='SERUM-002')
        self.assertEqual(link.linked_test_ids, [self.serum_test.id, self.blood_test.id])

    def test_mark_registration_sample_scanned_moves_registered_to_collection(self):
        self.assertEqual(self.registration.status, Registration.STATUS_REGISTERED)
        changed = mark_registration_sample_scanned(self.registration)
        self.assertTrue(changed)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, Registration.STATUS_COLLECTION)

        changed_again = mark_registration_sample_scanned(self.registration)
        self.assertFalse(changed_again)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, Registration.STATUS_COLLECTION)

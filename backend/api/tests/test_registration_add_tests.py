from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.barcode_service import link_sample_barcodes
from api.models import Patient, PatientSampleBarcode, Registration, RegistrationTest, Test, User


class RegistrationAddTestsTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.user = UserModel.objects.create_user(
            username='add_test_prime',
            password='x',
            role=User.ROLE_FRANCHISEE,
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.test_a = Test.objects.create(
            name='CBC',
            price=Decimal('100.00'),
            mrp=Decimal('200.00'),
            sample_type='EDTA Blood',
        )
        self.test_b = Test.objects.create(
            name='LFT',
            price=Decimal('150.00'),
            mrp=Decimal('300.00'),
            sample_type='SERUM',
        )
        self.test_c = Test.objects.create(
            name='KFT',
            price=Decimal('120.00'),
            mrp=Decimal('240.00'),
            sample_type='SERUM',
        )

        self.patient = Patient.objects.create(
            patient_name='Test Addition Patient',
            patient_id='TA0001',
            mobile='9999999999',
        )
        self.registration = Registration.objects.create(
            lab_code='TA-LAB-001',
            patient=self.patient,
            created_by=self.user,
        )
        RegistrationTest.objects.create(
            registration=self.registration,
            test=self.test_a,
            price=Decimal('100.00'),
        )
        RegistrationTest.objects.create(
            registration=self.registration,
            test=self.test_b,
            price=Decimal('150.00'),
        )
        link_sample_barcodes(
            patient=self.patient,
            registration=self.registration,
            barcodes_data=[
                {'sample_type': 'EDTA Blood', 'barcode': 'BC-TA-001', 'confirm_barcode': 'BC-TA-001'},
                {'sample_type': 'SERUM', 'barcode': 'BC-TA-002', 'confirm_barcode': 'BC-TA-002'},
            ],
            user=self.user,
        )

    def test_add_test_by_lab_code(self):
        response = self.client.post(
            f'/api/registrations/{self.registration.lab_code}/add-tests/',
            {'test_ids': [self.test_c.id]},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.tests.count(), 3)
        names = list(self.registration.tests.values_list('test__name', flat=True))
        self.assertIn('KFT', names)

    def test_find_booking_by_barcode_then_add_test(self):
        lookup = self.client.get('/api/patient-barcodes/lookup/?barcode=BC-TA-001')
        self.assertEqual(lookup.status_code, 200)
        self.assertTrue(lookup.json()['found'])
        self.assertEqual(lookup.json()['lab_code'], self.registration.lab_code)

        response = self.client.post(
            f'/api/registrations/{lookup.json()["lab_code"]}/add-tests/',
            {'test_ids': [self.test_c.id]},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.registration.tests.count(), 3)

    def test_search_by_patient_id(self):
        response = self.client.get('/api/registrations/?patient_id=TA0001')
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        self.assertTrue(rows)
        self.assertEqual(rows[0]['lab_code'], self.registration.lab_code)

    def test_rejects_duplicate_test(self):
        response = self.client.post(
            f'/api/registrations/{self.registration.lab_code}/add-tests/',
            {'test_ids': [self.test_a.id]},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_add_test_with_new_barcode_and_payment(self):
        urine_test = Test.objects.create(
            name='Urine Routine',
            price=Decimal('80.00'),
            mrp=Decimal('160.00'),
            sample_type='URINE',
        )
        response = self.client.post(
            f'/api/registrations/{self.registration.lab_code}/add-tests/',
            {
                'test_ids': [urine_test.id],
                'sample_barcodes': [{
                    'sample_type': 'URINE',
                    'barcode': 'BC-TA-URINE',
                    'confirm_barcode': 'BC-TA-URINE',
                    'test_ids': [urine_test.id],
                }],
                'paid': 100,
                'payment_method': 'cash',
                'discount_test': 10,
                'discount_regn': 0,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.tests.count(), 3)
        self.assertEqual(float(self.registration.paid), 100)
        self.assertEqual(float(self.registration.discount_test), 10)
        barcode = PatientSampleBarcode.objects.filter(
            registration=self.registration,
            sample_type='URINE',
            is_active=True,
        ).first()
        self.assertIsNotNone(barcode)
        self.assertEqual(barcode.barcode, 'BC-TA-URINE')

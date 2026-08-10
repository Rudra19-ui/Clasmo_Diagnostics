from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Patient, Registration, RegistrationTest, Test, User
from api.registration_edit import can_edit_registration


class RegistrationEditWindowTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.user = UserModel.objects.create_user(
            username='edit_supreme',
            password='x',
            role=User.ROLE_SUPER_FRANCHISEE,
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.test = Test.objects.create(
            name='Edit Window CBC',
            price=Decimal('100.00'),
            mrp=Decimal('200.00'),
            sample_type='EDTA Blood',
        )
        self.patient = Patient.objects.create(
            patient_name='Edit Patient',
            patient_id='EP0001',
            mobile='9999999999',
        )
        self.registration = Registration.objects.create(
            lab_code='EDIT001',
            patient=self.patient,
            created_by=self.user,
            registration_date=timezone.now(),
        )
        RegistrationTest.objects.create(
            registration=self.registration,
            test=self.test,
            price=Decimal('100.00'),
        )

    def test_can_edit_within_12_hours(self):
        self.assertTrue(can_edit_registration(self.registration))

    def test_cannot_edit_after_12_hours(self):
        self.registration.registration_date = timezone.now() - timedelta(hours=12, minutes=1)
        self.registration.save(update_fields=['registration_date'])
        self.assertFalse(can_edit_registration(self.registration))

        response = self.client.patch(
            f'/api/registrations/{self.registration.lab_code}/edit/',
            {'patient': {'patient_name': 'Changed'}},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_edit_updates_patient_and_tests(self):
        other = Test.objects.create(
            name='Edit Window AEC',
            price=Decimal('50.00'),
            mrp=Decimal('90.00'),
            sample_type='EDTA Blood',
        )
        response = self.client.patch(
            f'/api/registrations/{self.registration.lab_code}/edit/',
            {
                'patient': {'patient_name': 'Updated Patient', 'mobile': '8888888888'},
                'tests': [{'test_id': other.id, 'price': '50.00'}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.patient.refresh_from_db()
        self.registration.refresh_from_db()
        self.assertEqual(self.patient.patient_name, 'Updated Patient')
        self.assertEqual(self.patient.mobile, '8888888888')
        self.assertEqual(self.registration.tests.count(), 1)
        self.assertEqual(self.registration.tests.first().test_id, other.id)

    def test_editable_only_search(self):
        old = Registration.objects.create(
            lab_code='EDITOLD',
            patient=Patient.objects.create(patient_name='Old', patient_id='EP0002'),
            created_by=self.user,
            registration_date=timezone.now() - timedelta(hours=13),
        )
        response = self.client.get('/api/registrations/?editable_only=true')
        self.assertEqual(response.status_code, 200)
        lab_codes = {row['lab_code'] for row in response.json()}
        self.assertIn(self.registration.lab_code, lab_codes)
        self.assertNotIn(old.lab_code, lab_codes)

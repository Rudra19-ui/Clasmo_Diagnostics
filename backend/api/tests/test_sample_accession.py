from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Patient, Registration
from api.zones import ensure_zones


class SampleAccessionTests(TestCase):
    def setUp(self):
        zones, _ = ensure_zones()
        self.nashik = zones['nashik']
        User = get_user_model()
        self.reception = User.objects.create_user(
            username='nashik_reception_acc',
            password='test12345',
            role=User.ROLE_RECEPTIONIST,
            zone=self.nashik,
        )
        self.supreme = User.objects.create_user(
            username='nashik_supreme_acc',
            password='test12345',
            role=User.ROLE_SUPER_FRANCHISEE,
            zone=self.nashik,
        )
        patient = Patient.objects.create(
            patient_name='Accession Patient',
            patient_id='ACC001',
            age_years=20,
            gender='male',
            zone=self.nashik,
        )
        self.registration = Registration.objects.create(
            lab_code='1110',
            patient=patient,
            created_by=self.supreme,
            zone=self.nashik,
        )
        self.client = APIClient()

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_reception_sees_all_zone_entries_regardless_of_creator_role(self):
        self._auth(self.reception)
        resp = self.client.get('/api/sample-accession/')
        self.assertEqual(resp.status_code, 200)
        lab_codes = [row['lab_code'] for row in resp.data]
        self.assertIn('1110', lab_codes)

    def test_franchise_search_still_scoped_to_hierarchy(self):
        self._auth(self.supreme)
        search = self.client.get('/api/registrations/')
        self.assertEqual(search.status_code, 200)
        self.assertTrue(any(row['lab_code'] == '1110' for row in search.data))

        other = get_user_model().objects.create_user(
            username='nashik_admin_acc',
            password='test12345',
            role=get_user_model().ROLE_ADMIN,
            zone=self.nashik,
        )
        admin_patient = Patient.objects.create(
            patient_name='Admin Patient',
            patient_id='ACC002',
            zone=self.nashik,
        )
        Registration.objects.create(
            lab_code='1111',
            patient=admin_patient,
            created_by=other,
            zone=self.nashik,
        )

        self._auth(self.supreme)
        search_after = self.client.get('/api/registrations/')
        supreme_codes = {row['lab_code'] for row in search_after.data}
        self.assertIn('1110', supreme_codes)
        self.assertNotIn('1111', supreme_codes)

        self._auth(self.reception)
        accession = self.client.get('/api/sample-accession/')
        accession_codes = {row['lab_code'] for row in accession.data}
        self.assertIn('1110', accession_codes)
        self.assertIn('1111', accession_codes)

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import ExtraSample, Patient, PatientSampleBarcode
from api.zones import ensure_zones


class ExtraSampleTests(TestCase):
    def setUp(self):
        zones, _ = ensure_zones()
        self.mumbai = zones['mumbai']
        User = get_user_model()
        self.reception = User.objects.create_user(
            username='mumbai_reception_extra',
            password='test12345',
            role=User.ROLE_RECEPTIONIST,
            zone=self.mumbai,
        )
        self.client = APIClient()

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_list_and_remove_extra_sample(self):
        self._auth(self.reception)
        create_resp = self.client.post('/api/extra-samples/', {'barcode': 'EXTRA-001'}, format='json')
        self.assertEqual(create_resp.status_code, 201)
        self.assertEqual(create_resp.data['barcode'], 'EXTRA-001')

        list_resp = self.client.get('/api/extra-samples/')
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.data), 1)

        dup_resp = self.client.post('/api/extra-samples/', {'barcode': 'EXTRA-001'}, format='json')
        self.assertEqual(dup_resp.status_code, 200)

        remove_resp = self.client.post(f"/api/extra-samples/{create_resp.data['id']}/remove/", {}, format='json')
        self.assertEqual(remove_resp.status_code, 200)
        self.assertEqual(ExtraSample.objects.filter(is_active=True).count(), 0)

    def test_rejects_linked_barcode(self):
        patient = Patient.objects.create(patient_name='Linked', patient_id='900001', zone=self.mumbai)
        PatientSampleBarcode.objects.create(patient=patient, barcode='LINKED-001', sample_type='Primary')
        self._auth(self.reception)
        resp = self.client.post('/api/extra-samples/', {'barcode': 'LINKED-001'}, format='json')
        self.assertEqual(resp.status_code, 400)

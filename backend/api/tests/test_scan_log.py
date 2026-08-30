from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.barcode_service import record_barcode_scan_log
from api.models import BarcodeScanLog, Patient, PatientSampleBarcode, Registration
from api.zones import ensure_zones


class ScanLogTests(TestCase):
    def setUp(self):
        zones, _ = ensure_zones()
        self.nashik = zones['nashik']
        self.mumbai = zones['mumbai']
        User = get_user_model()
        self.reception = User.objects.create_user(
            username='nashik_reception_scanlog',
            password='test12345',
            role=User.ROLE_RECEPTIONIST,
            display_name='Nashik Reception',
            zone=self.nashik,
        )
        self.mumbai_reception = User.objects.create_user(
            username='mumbai_reception_scanlog',
            password='test12345',
            role=User.ROLE_RECEPTIONIST,
            zone=self.mumbai,
        )
        patient = Patient.objects.create(
            patient_name='Scan Log Patient',
            patient_id='SL001',
            zone=self.nashik,
        )
        self.registration = Registration.objects.create(
            lab_code='SL-100',
            patient=patient,
            created_by=self.reception,
            zone=self.nashik,
        )
        self.link = PatientSampleBarcode.objects.create(
            barcode='SCANLOG-001',
            patient=patient,
            registration=self.registration,
            sample_type='Primary',
        )
        self.client = APIClient()

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_record_and_list_scan_log_with_username(self):
        record_barcode_scan_log(
            user=self.reception,
            barcode='SCANLOG-001',
            link=self.link,
            registration=self.registration,
        )
        self._auth(self.reception)
        resp = self.client.get('/api/scan-logs/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['zone_name'], self.nashik.name)
        self.assertEqual(len(resp.data[0]['entries']), 1)
        entry = resp.data[0]['entries'][0]
        self.assertEqual(entry['barcode'], 'SCANLOG-001')
        self.assertEqual(entry['scanned_by_username'], self.reception.username)

    def test_scan_api_creates_log_entry(self):
        self._auth(self.reception)
        resp = self.client.get('/api/patient-barcodes/scan/?barcode=SCANLOG-001')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get('found'))
        self.assertEqual(BarcodeScanLog.objects.filter(barcode='SCANLOG-001').count(), 1)

    def test_zone_isolation_for_reception(self):
        record_barcode_scan_log(
            user=self.reception,
            barcode='SCANLOG-001',
            link=self.link,
            registration=self.registration,
        )
        self._auth(self.mumbai_reception)
        resp = self.client.get('/api/scan-logs/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['zone_name'], self.mumbai.name)
        self.assertEqual(resp.data[0]['entries'], [])

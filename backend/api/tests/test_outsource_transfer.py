from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import OutsourceTransfer, Patient, Registration, RegistrationTest, Test, TestCategory
from api.zones import ensure_zones


class OutsourceTransferTests(TestCase):
    def setUp(self):
        zones, _ = ensure_zones()
        self.nashik = zones['nashik']
        self.mumbai = zones['mumbai']
        User = get_user_model()
        self.nashik_reception = User.objects.create_user(
            username='nashik_reception',
            password='test12345',
            role=User.ROLE_RECEPTIONIST,
            zone=self.nashik,
        )
        self.mumbai_reception = User.objects.create_user(
            username='mumbai_reception',
            password='test12345',
            role=User.ROLE_RECEPTIONIST,
            zone=self.mumbai,
        )
        patient = Patient.objects.create(
            patient_name='Outsource Patient',
            patient_id='OS001',
            zone=self.nashik,
        )
        self.registration = Registration.objects.create(
            lab_code='OS-REG-1',
            patient=patient,
            created_by=self.nashik_reception,
            zone=self.nashik,
        )
        category = TestCategory.objects.create(name='General')
        self.test_a = Test.objects.create(name='Test A', category=category, price=100, mrp=100)
        self.test_b = Test.objects.create(name='Test B', category=category, price=200, mrp=200)
        self.reg_test_a = RegistrationTest.objects.create(
            registration=self.registration, test=self.test_a, price=100,
        )
        self.reg_test_b = RegistrationTest.objects.create(
            registration=self.registration, test=self.test_b, price=200,
        )
        self.client = APIClient()

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_send_receive_and_upload_report(self):
        self._auth(self.nashik_reception)
        send_resp = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.mumbai.id,
            'registration_test_ids': [self.reg_test_a.id],
            'notes': 'Urgent',
        }, format='json')
        self.assertEqual(send_resp.status_code, 201)
        self.assertEqual(send_resp.data['status'], OutsourceTransfer.STATUS_OUTSOURCED)
        self.assertEqual(send_resp.data['tests_list'], ['Test A'])
        transfer_id = send_resp.data['id']

        self._auth(self.mumbai_reception)
        receive_resp = self.client.post('/api/outsource-transfers/receive/', {
            'lab_code': self.registration.lab_code,
        }, format='json')
        self.assertEqual(receive_resp.status_code, 200)
        self.assertEqual(receive_resp.data['status'], OutsourceTransfer.STATUS_RECEIVED)

        upload_resp = self.client.post(
            f'/api/outsource-transfers/{transfer_id}/upload-report/',
            {'report_file': self._dummy_pdf()},
            format='multipart',
        )
        self.assertEqual(upload_resp.status_code, 200)
        self.assertEqual(upload_resp.data['status'], OutsourceTransfer.STATUS_REPORT_UPLOADED)
        self.assertTrue(upload_resp.data['report_file_url'])

    def test_receive_by_transfer_id(self):
        self._auth(self.nashik_reception)
        send_resp = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.mumbai.id,
            'registration_test_ids': [self.reg_test_b.id],
        }, format='json')
        self.assertEqual(send_resp.status_code, 201)
        transfer_id = send_resp.data['id']

        self._auth(self.mumbai_reception)
        receive_resp = self.client.post(f'/api/outsource-transfers/{transfer_id}/receive/', {}, format='json')
        self.assertEqual(receive_resp.status_code, 200)
        self.assertEqual(receive_resp.data['status'], OutsourceTransfer.STATUS_RECEIVED)

        self._auth(self.nashik_reception)
        sent_resp = self.client.get('/api/outsource-transfers/?direction=sent')
        self.assertEqual(sent_resp.status_code, 200)
        row = next(item for item in sent_resp.data if item['id'] == transfer_id)
        self.assertEqual(row['status'], OutsourceTransfer.STATUS_RECEIVED)

    def test_can_outsource_remaining_tests_separately(self):
        self._auth(self.nashik_reception)
        first = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.mumbai.id,
            'registration_test_ids': [self.reg_test_a.id],
        }, format='json')
        self.assertEqual(first.status_code, 201)

        second = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.mumbai.id,
            'registration_test_ids': [self.reg_test_b.id],
        }, format='json')
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data['tests_list'], ['Test B'])

    def test_rejects_overlapping_test_selection(self):
        self._auth(self.nashik_reception)
        first = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.mumbai.id,
            'registration_test_ids': [self.reg_test_a.id],
        }, format='json')
        self.assertEqual(first.status_code, 201)

        overlap = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.mumbai.id,
            'registration_test_ids': [self.reg_test_a.id, self.reg_test_b.id],
        }, format='json')
        self.assertEqual(overlap.status_code, 400)

    def test_cannot_send_to_same_zone(self):
        self._auth(self.nashik_reception)
        resp = self.client.post('/api/outsource-transfers/', {
            'lab_code': self.registration.lab_code,
            'to_zone_id': self.nashik.id,
            'registration_test_ids': [self.reg_test_a.id],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_incoming_list_scoped_to_destination_zone(self):
        OutsourceTransfer.objects.create(
            registration=self.registration,
            barcode='BC-001',
            from_zone=self.nashik,
            to_zone=self.mumbai,
            status=OutsourceTransfer.STATUS_OUTSOURCED,
            sent_by=self.nashik_reception,
            registration_test_ids=[self.reg_test_a.id],
            is_active=True,
        )

        self._auth(self.mumbai_reception)
        resp = self.client.get('/api/outsource-transfers/?direction=incoming')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

        self._auth(self.nashik_reception)
        resp = self.client.get('/api/outsource-transfers/?direction=incoming')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def _dummy_pdf(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return SimpleUploadedFile('report.pdf', b'%PDF-1.4 outsource report', content_type='application/pdf')

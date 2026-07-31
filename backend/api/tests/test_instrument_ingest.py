from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.instrument_service import apply_instrument_results, build_patient_report_by_barcode
from api.models import (
    Patient,
    PatientSampleBarcode,
    Registration,
    RegistrationTest,
    ReportValue,
    Test,
    TestParameter,
)


User = get_user_model()


class InstrumentIngestTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tech_ingest',
            password='tech123',
            role=User.ROLE_TECHNICIAN,
        )
        self.patient = Patient.objects.create(
            patient_id='P-INGEST-1',
            title='Mr',
            patient_name='Ingest Demo',
            gender='male',
            age_years=35,
        )
        self.registration = Registration.objects.create(
            lab_code='LAB-INGEST-1',
            patient=self.patient,
            status=Registration.STATUS_REGISTERED,
        )
        self.test = Test.objects.create(
            name='CBC (COMPLETE BLOOD COUNT)',
            sample_type='EDTA Blood',
            price=500,
            mrp=500,
        )
        RegistrationTest.objects.create(
            registration=self.registration,
            test=self.test,
            price=500,
        )
        self.hgb = TestParameter.objects.create(
            test=self.test,
            parameter_name='Hemoglobin',
            unit='g/dL',
            reference_range_male='13 - 18',
            reference_range_female='12 - 15',
            analyzer_code='HGB',
            sort_order=1,
        )
        self.wbc = TestParameter.objects.create(
            test=self.test,
            parameter_name='Total Leucocytes Count',
            unit='10^3/uL',
            reference_range_male='4 - 10',
            reference_range_female='4 - 10',
            analyzer_code='WBC',
            sort_order=2,
        )
        self.link = PatientSampleBarcode.objects.create(
            barcode='BC-INGEST-001',
            patient=self.patient,
            registration=self.registration,
            sample_type='EDTA Blood',
            linked_test_ids=[self.test.id],
            is_active=True,
        )

    def test_apply_instrument_results_matches_barcode(self):
        result = apply_instrument_results(
            barcode='BC-INGEST-001',
            results=[
                {'code': 'HGB', 'value': '12.1'},
                {'code': 'WBC', 'value': '7.61'},
            ],
            instrument_id='TestAnalyzer',
            user=self.user,
        )
        self.assertTrue(result['ok'])
        self.assertEqual(result['matched_count'], 2)
        self.assertEqual(ReportValue.objects.filter(report__registration=self.registration).count(), 2)
        hgb_value = ReportValue.objects.get(parameter=self.hgb)
        self.assertEqual(hgb_value.value, '12.1')
        self.assertEqual(hgb_value.source, 'machine')

    def test_patient_report_includes_demographics(self):
        apply_instrument_results(
            barcode='BC-INGEST-001',
            results=[{'code': 'HB', 'value': '12.1'}],
            user=self.user,
        )
        report = build_patient_report_by_barcode('BC-INGEST-001')
        self.assertTrue(report['found'])
        self.assertIn('Ingest Demo', report['demographics']['patient_name'])
        self.assertEqual(report['demographics']['lab_code'], 'LAB-INGEST-1')
        self.assertTrue(any(row['result'] == '12.1' for row in report['rows']))

    def test_api_ingest_endpoint(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.post(
            '/api/instrument/results/',
            {
                'barcode': 'BC-INGEST-001',
                'instrument_id': 'API',
                'results': [{'code': 'HGB', 'value': '13.0'}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['matched_count'], 1)

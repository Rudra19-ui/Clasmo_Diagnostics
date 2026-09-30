from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Test, TestParameter
from api.parameter_import import (
    generate_default_parameters,
    import_parameters_from_csv_text,
    sample_report_coverage,
)

User = get_user_model()


class ParameterImportTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='param_admin',
            password='admin123',
            role=User.ROLE_ADMIN,
        )
        self.token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.t1 = Test.objects.create(name='Complete Blood Count', test_code='CBC', price=100, sample_type='EDTA')
        self.t2 = Test.objects.create(name='Glucose Fasting', test_code='GLU-F', price=50, sample_type='Fluoride')

    def test_csv_import_creates_and_updates(self):
        csv_text = (
            'test_code,parameter_name,unit,sample_value,sort_order\n'
            'CBC,Hemoglobin,g/dL,14.2,1\n'
            'GLU-F,Glucose,mg/dL,92,1\n'
        )
        result = import_parameters_from_csv_text(csv_text, dry_run=False)
        self.assertEqual(result['created'], 2)
        self.assertEqual(TestParameter.objects.count(), 2)

        csv_update = (
            'test_code,parameter_name,unit,sample_value\n'
            'CBC,Hemoglobin,g/dL,13.8\n'
        )
        result2 = import_parameters_from_csv_text(csv_update, dry_run=False)
        self.assertEqual(result2['updated'], 1)
        self.assertEqual(
            TestParameter.objects.get(test=self.t1, parameter_name='Hemoglobin').sample_value,
            '13.8',
        )

    def test_auto_generate_defaults_and_coverage(self):
        before = sample_report_coverage()
        self.assertEqual(before['tests_missing_parameters'], 2)
        gen = generate_default_parameters(only_missing=True)
        self.assertEqual(gen['created'], 2)
        after = sample_report_coverage()
        self.assertEqual(after['tests_with_parameters'], 2)
        self.assertEqual(after['coverage_pct'], 100.0)

    def test_import_api_and_template(self):
        resp = self.client.get('/api/test-parameters/import/template/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('parameter_name', resp.content.decode())

        csv_text = (
            'test_name,parameter_name,unit\n'
            'Glucose Fasting,Fasting Glucose,mg/dL\n'
        )
        resp2 = self.client.post(
            '/api/test-parameters/import/',
            {'csv_text': csv_text, 'dry_run': 'false'},
            format='json',
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.data['created'], 1)

        resp3 = self.client.post('/api/sample-reports/auto-generate/', {'only_missing': True}, format='json')
        self.assertEqual(resp3.status_code, 200)
        self.assertGreaterEqual(resp3.data['created'], 1)

        resp4 = self.client.get('/api/sample-reports/generate/?test_id=%s' % self.t1.id)
        self.assertEqual(resp4.status_code, 200)
        self.assertEqual(resp4.data['count'], 1)
        self.assertTrue(resp4.data['reports'][0]['has_parameters'])

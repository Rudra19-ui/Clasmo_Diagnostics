from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.franchise_scope import (
    scope_registrations_for_user,
    visible_creator_ids,
)
from api.models import Patient, Registration, User


class FranchiseScopeHelperTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.supreme_a = UserModel.objects.create_user(
            username='supreme_a', password='x', role=User.ROLE_SUPER_FRANCHISEE,
        )
        self.prime_a = UserModel.objects.create_user(
            username='prime_a', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme_a,
        )
        self.sub_a1 = UserModel.objects.create_user(
            username='sub_a1', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime_a,
        )
        self.sub_a2 = UserModel.objects.create_user(
            username='sub_a2', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime_a,
        )
        self.supreme_b = UserModel.objects.create_user(
            username='supreme_b', password='x', role=User.ROLE_SUPER_FRANCHISEE,
        )
        self.prime_b = UserModel.objects.create_user(
            username='prime_b', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme_b,
        )
        self.sub_b1 = UserModel.objects.create_user(
            username='sub_b1', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime_b,
        )
        self.admin = UserModel.objects.create_user(
            username='admin_scope', password='x', role=User.ROLE_ADMIN,
        )

        self.regs = {}
        for user in (
            self.supreme_a, self.prime_a, self.sub_a1, self.sub_a2,
            self.supreme_b, self.prime_b, self.sub_b1,
        ):
            patient = Patient.objects.create(
                patient_id=f'P-{user.username}',
                patient_name=f'Patient {user.username}',
                title='Mr.',
                gender='male',
            )
            self.regs[user.username] = Registration.objects.create(
                lab_code=f'LC-{user.username}',
                patient=patient,
                created_by=user,
            )

    def test_visible_creator_ids_by_role(self):
        self.assertEqual(visible_creator_ids(self.sub_a1), {self.sub_a1.id})
        self.assertEqual(
            visible_creator_ids(self.prime_a),
            {self.prime_a.id, self.sub_a1.id, self.sub_a2.id},
        )
        self.assertEqual(
            visible_creator_ids(self.supreme_a),
            {self.supreme_a.id, self.prime_a.id, self.sub_a1.id, self.sub_a2.id},
        )
        self.assertIsNone(visible_creator_ids(self.admin))

    def test_prime_cannot_see_supreme_or_other_branch(self):
        qs = scope_registrations_for_user(self.prime_a)
        lab_codes = set(qs.values_list('lab_code', flat=True))
        self.assertEqual(lab_codes, {'LC-prime_a', 'LC-sub_a1', 'LC-sub_a2'})
        self.assertNotIn('LC-supreme_a', lab_codes)
        self.assertNotIn('LC-prime_b', lab_codes)
        self.assertNotIn('LC-sub_b1', lab_codes)

    def test_sub_sees_only_own(self):
        qs = scope_registrations_for_user(self.sub_a1)
        self.assertEqual(set(qs.values_list('lab_code', flat=True)), {'LC-sub_a1'})

    def test_supreme_sees_full_tree_only(self):
        qs = scope_registrations_for_user(self.supreme_a)
        lab_codes = set(qs.values_list('lab_code', flat=True))
        self.assertEqual(
            lab_codes,
            {'LC-supreme_a', 'LC-prime_a', 'LC-sub_a1', 'LC-sub_a2'},
        )
        self.assertNotIn('LC-supreme_b', lab_codes)


class FranchiseScopeAPITests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.supreme = UserModel.objects.create_user(
            username='api_supreme', password='x', role=User.ROLE_SUPER_FRANCHISEE,
        )
        self.prime = UserModel.objects.create_user(
            username='api_prime', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme,
        )
        self.sub = UserModel.objects.create_user(
            username='api_sub', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime,
        )
        self.other_prime = UserModel.objects.create_user(
            username='api_other_prime', password='x', role=User.ROLE_FRANCHISEE,
        )

        self.reg_supreme = self._make_reg(self.supreme, 'API-SUP')
        self.reg_prime = self._make_reg(self.prime, 'API-PRIME')
        self.reg_sub = self._make_reg(self.sub, 'API-SUB')
        self.reg_other = self._make_reg(self.other_prime, 'API-OTHER')

        self.client = APIClient()

    def _make_reg(self, user, lab_code):
        patient = Patient.objects.create(
            patient_id=f'PID-{lab_code}',
            patient_name=f'Name {lab_code}',
            title='Mr.',
            gender='male',
        )
        return Registration.objects.create(
            lab_code=lab_code,
            patient=patient,
            created_by=user,
        )

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_registrations_list_isolation(self):
        self._auth(self.sub)
        codes = {row['lab_code'] for row in self.client.get('/api/registrations/').json()}
        self.assertEqual(codes, {'API-SUB'})

        self._auth(self.prime)
        codes = {row['lab_code'] for row in self.client.get('/api/registrations/').json()}
        self.assertEqual(codes, {'API-PRIME', 'API-SUB'})
        self.assertNotIn('API-SUP', codes)

        self._auth(self.supreme)
        codes = {row['lab_code'] for row in self.client.get('/api/registrations/').json()}
        self.assertEqual(codes, {'API-SUP', 'API-PRIME', 'API-SUB'})
        self.assertNotIn('API-OTHER', codes)

    def test_registration_detail_hidden_across_branch(self):
        self._auth(self.prime)
        resp = self.client.get('/api/registrations/API-SUP/')
        self.assertEqual(resp.status_code, 404)
        resp = self.client.get('/api/registrations/API-OTHER/')
        self.assertEqual(resp.status_code, 404)
        resp = self.client.get('/api/registrations/API-SUB/')
        self.assertEqual(resp.status_code, 200)

    def test_report_detail_hidden_from_other_branch(self):
        self._auth(self.sub)
        resp = self.client.get(f'/api/reports/{self.reg_prime.id}/')
        self.assertEqual(resp.status_code, 404)
        resp = self.client.get(f'/api/reports/{self.reg_sub.id}/')
        self.assertEqual(resp.status_code, 200)

    def test_global_search_scoped(self):
        self._auth(self.prime)
        resp = self.client.get('/api/search/global/', {'q': 'API'})
        codes = {row['lab_code'] for row in resp.json()}
        self.assertIn('API-PRIME', codes)
        self.assertIn('API-SUB', codes)
        self.assertNotIn('API-SUP', codes)
        self.assertNotIn('API-OTHER', codes)

    def test_user_filter_cannot_escape_scope(self):
        self._auth(self.prime)
        resp = self.client.get('/api/registrations/', {'user': self.supreme.id})
        self.assertEqual(resp.json(), [])

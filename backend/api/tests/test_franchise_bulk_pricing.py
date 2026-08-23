from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from api.models import User, Zone, ZoneFranchiseRate


class FranchiseBulkPricingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        UserModel = get_user_model()
        cls.zone = Zone.objects.create(code='bulk-zone', name='Bulk Zone', sort_order=201)
        ZoneFranchiseRate.ensure_for_zone(cls.zone)
        cls.supreme = UserModel.objects.create_user(
            username='b_supreme',
            password='x',
            role=User.ROLE_SUPER_FRANCHISEE,
            zone=cls.zone,
        )
        cls.prime = UserModel.objects.create_user(
            username='b_prime',
            password='x',
            role=User.ROLE_FRANCHISEE,
            parent_franchisee=cls.supreme,
            zone=cls.zone,
        )
        cls.sub = UserModel.objects.create_user(
            username='b_sub',
            password='x',
            role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=cls.prime,
            zone=cls.zone,
        )
        cls.prime_token = Token.objects.get_or_create(user=cls.prime)[0].key

    def test_prime_can_load_sub_rate_list(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.prime_token}')
        resp = self.client.get(
            '/api/wallets/franchise-test-rates/',
            {'franchise_user_id': self.sub.id},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['franchise_user']['id'], self.sub.id)
        self.assertGreater(resp.json()['count'], 0)

    def test_prime_cannot_load_own_rate_list_as_downstream(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.prime_token}')
        resp = self.client.get(
            '/api/wallets/franchise-test-rates/',
            {'franchise_user_id': self.prime.id},
        )
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()['detail'], 'Not found.')

    def test_user_list_for_prime_only_includes_direct_subs(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.prime_token}')
        resp = self.client.get('/api/users/', {'role': User.ROLE_SUB_FRANCHISE, 'is_active': 'true'})
        self.assertEqual(resp.status_code, 200)
        ids = {row['id'] for row in resp.json()}
        self.assertEqual(ids, {self.sub.id})

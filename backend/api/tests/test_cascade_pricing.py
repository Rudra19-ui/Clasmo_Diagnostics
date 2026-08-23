from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from api.models import FranchiseTestRate, Test, User, Zone, ZoneFranchiseRate
from api.zone_rates import (
    assigned_price_for_franchise_user,
    build_franchise_rates_index,
    effective_test_price_for_test,
    upstream_franchisee_price_for_test,
)


class CascadePricingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        UserModel = get_user_model()
        cls.zone = Zone.objects.create(code='cascade-zone', name='Cascade Zone', sort_order=200)
        ZoneFranchiseRate.ensure_for_zone(cls.zone)
        cls.supreme = UserModel.objects.create_user(
            username='c_supreme',
            password='x',
            role=User.ROLE_SUPER_FRANCHISEE,
            zone=cls.zone,
        )
        cls.prime = UserModel.objects.create_user(
            username='c_prime',
            password='x',
            role=User.ROLE_FRANCHISEE,
            parent_franchisee=cls.supreme,
            zone=cls.zone,
        )
        cls.sub = UserModel.objects.create_user(
            username='c_sub',
            password='x',
            role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=cls.prime,
            zone=cls.zone,
        )
        cls.test = Test.objects.create(
            name='Cascade Test',
            test_code='CAS-001',
            mrp=Decimal('1000.00'),
            price=Decimal('500.00'),
        )
        FranchiseTestRate.objects.create(
            franchise_user=cls.supreme,
            test=cls.test,
            rate_pct=Decimal('20.00'),
        )
        FranchiseTestRate.objects.create(
            franchise_user=cls.prime,
            test=cls.test,
            rate_pct=Decimal('10.00'),
        )
        FranchiseTestRate.objects.create(
            franchise_user=cls.sub,
            test=cls.test,
            rate_pct=Decimal('5.00'),
        )
        cls.prime_token = Token.objects.get_or_create(user=cls.prime)[0].key

    def test_supreme_assigned_from_catalog(self):
        rates_index = build_franchise_rates_index([self.supreme.id, self.prime.id, self.sub.id])
        price = assigned_price_for_franchise_user(
            franchise_user=self.supreme,
            test=self.test,
            zone=self.zone,
            rates_index=rates_index,
        )
        self.assertEqual(price, Decimal('600.00'))

    def test_prime_upstream_is_supreme_assigned(self):
        rates_index = build_franchise_rates_index([self.supreme.id, self.prime.id, self.sub.id])
        upstream = upstream_franchisee_price_for_test(
            franchise_user=self.prime,
            test=self.test,
            zone=self.zone,
            rates_index=rates_index,
        )
        self.assertEqual(upstream, Decimal('600.00'))

    def test_sub_booking_price_cascades(self):
        rates_index = build_franchise_rates_index([self.supreme.id, self.prime.id, self.sub.id])
        price = effective_test_price_for_test(
            test=self.test,
            actor=self.sub,
            zone=self.zone,
            franchise_rates_index=rates_index,
        )
        # Supreme 500×1.2=600; Prime 600×1.1=660; Sub 660×1.05=693
        self.assertEqual(price, Decimal('693.00'))

    def test_bulk_api_uses_parent_assigned_for_franchisee_price(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.prime_token}')
        resp = self.client.get(
            '/api/wallets/franchise-test-rates/',
            {'franchise_user_id': self.sub.id},
        )
        self.assertEqual(resp.status_code, 200)
        row = next(item for item in resp.json()['rows'] if item['test_id'] == self.test.id)
        self.assertEqual(row['franchisee_price'], '660.00')
        self.assertEqual(row['final_price'], '693.00')

    def test_prime_bulk_api_uses_supreme_assigned_for_franchisee_price(self):
        supreme = User.objects.get(pk=self.supreme.id)
        supreme_token = Token.objects.get_or_create(user=supreme)[0].key
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {supreme_token}')
        resp = self.client.get(
            '/api/wallets/franchise-test-rates/',
            {'franchise_user_id': self.prime.id},
        )
        self.assertEqual(resp.status_code, 200)
        row = next(item for item in resp.json()['rows'] if item['test_id'] == self.test.id)
        self.assertEqual(row['franchisee_price'], '600.00')
        self.assertEqual(row['final_price'], '660.00')

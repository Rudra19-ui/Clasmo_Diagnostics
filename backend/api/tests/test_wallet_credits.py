from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import (
    FranchiseCommissionConfig,
    FranchiseWallet,
    Patient,
    Registration,
    User,
    WalletTransaction,
)
from api.wallet_service import (
    create_demo_transactions,
    distribute_registration_commissions,
    get_or_create_wallet,
)


class WalletCommissionServiceTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.supreme = UserModel.objects.create_user(
            username='w_supreme', password='x', role=User.ROLE_SUPER_FRANCHISEE,
        )
        self.prime = UserModel.objects.create_user(
            username='w_prime', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme,
        )
        self.sub = UserModel.objects.create_user(
            username='w_sub', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime,
        )
        FranchiseCommissionConfig.objects.create(
            pk=1,
            sub_franchise_pct=Decimal('5.00'),
            franchisee_pct=Decimal('3.00'),
            super_franchisee_pct=Decimal('2.00'),
            is_active=True,
        )

    def _reg(self, user, lab_code, net_amount):
        patient = Patient.objects.create(
            patient_id=f'PID-{lab_code}',
            patient_name=f'P {lab_code}',
            title='Mr.',
            gender='male',
        )
        return Registration.objects.create(
            lab_code=lab_code,
            patient=patient,
            created_by=user,
            net_amount=net_amount,
            total=net_amount,
        )

    def test_sub_booking_credits_full_hierarchy(self):
        reg = self._reg(self.sub, 'W-SUB-1', Decimal('1000.00'))
        txns = distribute_registration_commissions(reg)
        self.assertEqual(len(txns), 3)
        balances = {
            get_or_create_wallet(u).balance
            for u in (self.sub, self.prime, self.supreme)
        }
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('50.00'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('30.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('20.00'))
        self.assertEqual(balances, {Decimal('50.00'), Decimal('30.00'), Decimal('20.00')})

    def test_distribution_is_idempotent(self):
        reg = self._reg(self.sub, 'W-SUB-2', Decimal('1000.00'))
        first = distribute_registration_commissions(reg)
        second = distribute_registration_commissions(reg)
        self.assertEqual(len(first), 3)
        self.assertEqual(len(second), 3)
        self.assertEqual(WalletTransaction.objects.filter(registration=reg).count(), 3)

    def test_prime_booking_skips_sub_rate(self):
        reg = self._reg(self.prime, 'W-PRIME-1', Decimal('1000.00'))
        txns = distribute_registration_commissions(reg)
        self.assertEqual(len(txns), 2)
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('0'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('30.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('20.00'))

    def test_demo_transactions(self):
        result = create_demo_transactions(actor=self.sub, base_amount=Decimal('2000'))
        self.assertEqual(len(result['transactions']), 3)
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('100.00'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('60.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('40.00'))


class WalletAPIIsolationTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.supreme = UserModel.objects.create_user(
            username='api_w_supreme', password='x', role=User.ROLE_SUPER_FRANCHISEE,
        )
        self.prime = UserModel.objects.create_user(
            username='api_w_prime', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme,
        )
        self.sub = UserModel.objects.create_user(
            username='api_w_sub', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime,
        )
        FranchiseCommissionConfig.objects.create(
            pk=1,
            sub_franchise_pct=Decimal('5.00'),
            franchisee_pct=Decimal('3.00'),
            super_franchisee_pct=Decimal('2.00'),
        )
        create_demo_transactions(actor=self.sub, base_amount=Decimal('1000'))
        self.client = APIClient()

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_prime_cannot_see_supreme_wallet(self):
        self._auth(self.prime)
        rows = self.client.get('/api/wallets/').json()
        usernames = {row['username'] for row in rows}
        self.assertIn('api_w_prime', usernames)
        self.assertIn('api_w_sub', usernames)
        self.assertNotIn('api_w_supreme', usernames)

        resp = self.client.get(f'/api/wallets/{self.supreme.id}/')
        self.assertEqual(resp.status_code, 404)

    def test_sub_sees_only_own_wallet(self):
        self._auth(self.sub)
        rows = self.client.get('/api/wallets/').json()
        self.assertEqual([row['username'] for row in rows], ['api_w_sub'])

        txns = self.client.get('/api/wallets/transactions/').json()
        self.assertTrue(all(t['wallet_username'] == 'api_w_sub' for t in txns))

    def test_supreme_sees_full_tree(self):
        self._auth(self.supreme)
        rows = self.client.get('/api/wallets/').json()
        usernames = {row['username'] for row in rows}
        self.assertEqual(usernames, {'api_w_supreme', 'api_w_prime', 'api_w_sub'})

    def test_demo_endpoint_hides_supreme_from_prime(self):
        self._auth(self.prime)
        resp = self.client.post(
            '/api/wallets/demo-transaction/',
            {'base_amount': '500', 'actor_id': self.sub.id},
            format='json',
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        wallet_users = {w['username'] for w in body['wallets']}
        self.assertNotIn('api_w_supreme', wallet_users)
        # Credits still applied server-side for Supreme.
        self.assertGreater(
            FranchiseWallet.objects.get(user=self.supreme).balance,
            Decimal('20.00'),
        )

    def test_my_wallet(self):
        self._auth(self.sub)
        resp = self.client.get('/api/wallets/me/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.json()['balance']), Decimal('50.00'))

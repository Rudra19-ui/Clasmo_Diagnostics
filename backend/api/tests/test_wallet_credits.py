from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import (
    FranchiseCommissionConfig,
    FranchiseTestRate,
    FranchiseWallet,
    Patient,
    Registration,
    RegistrationTest,
    Test,
    User,
    WalletTransaction,
    Zone,
    ZoneFranchiseRate,
)
from api.wallet_service import (
    create_demo_transactions,
    distribute_registration_commissions,
    get_or_create_wallet,
    settle_registration_booking,
    settle_registration_test_addition,
)
from api.zone_rates import compute_tier_margin_credits, build_franchise_rates_index


class WalletCommissionServiceTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.zone = Zone.objects.create(code='wallet-test', name='Wallet Test', sort_order=50)
        ZoneFranchiseRate.ensure_for_zone(self.zone)
        self.supreme = UserModel.objects.create_user(
            username='w_supreme', password='x', role=User.ROLE_SUPER_FRANCHISEE, zone=self.zone,
        )
        self.prime = UserModel.objects.create_user(
            username='w_prime', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme, zone=self.zone,
        )
        self.sub = UserModel.objects.create_user(
            username='w_sub', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime, zone=self.zone,
        )
        FranchiseCommissionConfig.get_solo()
        self.test = Test.objects.create(
            name='Wallet Cascade Test',
            test_code='WCT-001',
            mrp=Decimal('1000.00'),
            price=Decimal('500.00'),
        )
        FranchiseTestRate.objects.create(
            franchise_user=self.supreme, test=self.test, rate_pct=Decimal('20.00'),
        )
        FranchiseTestRate.objects.create(
            franchise_user=self.prime, test=self.test, rate_pct=Decimal('10.00'),
        )
        FranchiseTestRate.objects.create(
            franchise_user=self.sub, test=self.test, rate_pct=Decimal('5.00'),
        )
        # Assigned: Supreme 600, Prime 660, Sub 693 → margins 33 + 60

    def _reg_with_line(self, user, lab_code, selling_price):
        patient = Patient.objects.create(
            patient_id=f'PID-{lab_code}',
            patient_name=f'P {lab_code}',
            title='Mr.',
            gender='male',
        )
        reg = Registration.objects.create(
            lab_code=lab_code,
            patient=patient,
            created_by=user,
            zone=self.zone,
            net_amount=selling_price,
            total=selling_price,
        )
        RegistrationTest.objects.create(
            registration=reg,
            test=self.test,
            price=selling_price,
        )
        return reg

    def _reg_header_only(self, user, lab_code, net_amount):
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
            zone=self.zone,
            net_amount=net_amount,
            total=net_amount,
        )

    def test_margin_helper_sub_booking(self):
        rates_index = build_franchise_rates_index([self.supreme.id, self.prime.id, self.sub.id])
        credits = compute_tier_margin_credits(
            actor=self.sub,
            line_items=[(self.test, Decimal('693.00'), 1)],
            zone=self.zone,
            rates_index=rates_index,
        )
        self.assertEqual(credits[self.prime.id]['amount'], Decimal('33.00'))
        self.assertEqual(credits[self.supreme.id]['amount'], Decimal('60.00'))

    def test_sub_booking_credits_cascade_margins(self):
        reg = self._reg_with_line(self.sub, 'W-SUB-1', Decimal('693.00'))
        result = settle_registration_booking(reg)
        self.assertEqual(len(result['commissions']), 2)
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('-693.00'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('33.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('60.00'))
        txn = result['commissions'][0]
        self.assertEqual(txn.metadata.get('mode'), 'cascade_margin')

    def test_distribution_is_idempotent(self):
        reg = self._reg_with_line(self.sub, 'W-SUB-2', Decimal('693.00'))
        first = distribute_registration_commissions(reg)
        second = distribute_registration_commissions(reg)
        self.assertEqual(len(first), 2)
        self.assertEqual(len(second), 2)
        self.assertEqual(
            WalletTransaction.objects.filter(
                registration=reg, txn_type=WalletTransaction.TYPE_COMMISSION,
            ).count(),
            2,
        )

    def test_prime_booking_credits_supreme_margin_only(self):
        reg = self._reg_with_line(self.prime, 'W-PRIME-1', Decimal('660.00'))
        txns = distribute_registration_commissions(reg)
        self.assertEqual(len(txns), 1)
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('0'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('0.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('60.00'))

    def test_supreme_booking_no_commission_credits(self):
        reg = self._reg_with_line(self.supreme, 'W-SUP-1', Decimal('600.00'))
        txns = distribute_registration_commissions(reg)
        self.assertEqual(len(txns), 0)
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('0.00'))

    def test_legacy_pct_when_no_line_items(self):
        reg = self._reg_header_only(self.sub, 'W-LEGACY-1', Decimal('1000.00'))
        txns = distribute_registration_commissions(reg)
        self.assertEqual(len(txns), 2)
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('30.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('20.00'))
        self.assertEqual(txns[0].metadata.get('mode'), 'legacy_pct')

    def test_test_addition_settles_incremental_margins(self):
        reg = self._reg_with_line(self.sub, 'W-ADD-1', Decimal('693.00'))
        settle_registration_booking(reg)
        second = Test.objects.create(
            name='Second Cascade',
            test_code='WCT-002',
            mrp=Decimal('1000.00'),
            price=Decimal('500.00'),
        )
        for user, pct in (
            (self.supreme, Decimal('20.00')),
            (self.prime, Decimal('10.00')),
            (self.sub, Decimal('5.00')),
        ):
            FranchiseTestRate.objects.create(franchise_user=user, test=second, rate_pct=pct)
        line = RegistrationTest.objects.create(
            registration=reg, test=second, price=Decimal('693.00'),
        )
        settle_registration_test_addition(
            reg,
            added_line_ids=[line.id],
            debit_amount=Decimal('693.00'),
        )
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('-1386.00'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('66.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('120.00'))
        self.assertEqual(
            WalletTransaction.objects.filter(
                registration=reg, txn_type=WalletTransaction.TYPE_COMMISSION,
            ).count(),
            4,
        )

    def test_demo_transactions(self):
        result = create_demo_transactions(actor=self.sub, base_amount=Decimal('2000'))
        self.assertEqual(len(result['transactions']), 2)
        self.assertEqual(get_or_create_wallet(self.sub).balance, Decimal('0.00'))
        self.assertEqual(get_or_create_wallet(self.prime).balance, Decimal('60.00'))
        self.assertEqual(get_or_create_wallet(self.supreme).balance, Decimal('40.00'))


class WalletAPIIsolationTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.zone = Zone.objects.create(code='wallet-api', name='Wallet API', sort_order=51)
        ZoneFranchiseRate.ensure_for_zone(self.zone)
        self.supreme = UserModel.objects.create_user(
            username='api_w_supreme', password='x', role=User.ROLE_SUPER_FRANCHISEE, zone=self.zone,
        )
        self.prime = UserModel.objects.create_user(
            username='api_w_prime', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme, zone=self.zone,
        )
        self.sub = UserModel.objects.create_user(
            username='api_w_sub', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime, zone=self.zone,
        )
        config = FranchiseCommissionConfig.get_solo()
        config.sub_franchise_pct = Decimal('5.00')
        config.franchisee_pct = Decimal('3.00')
        config.super_franchisee_pct = Decimal('2.00')
        config.is_active = True
        config.save()
        # Ensure wallets exist for the full tree (demo only creates beneficiary wallets).
        for user in (self.supreme, self.prime, self.sub):
            get_or_create_wallet(user)
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
        self.assertEqual(Decimal(resp.json()['balance']), Decimal('0.00'))

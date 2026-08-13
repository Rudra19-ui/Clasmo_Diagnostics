from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import (
    FranchiseCommissionConfig,
    FranchisePricingOverride,
    Patient,
    Registration,
    User,
    Zone,
    ZoneFranchiseRate,
)
from api.wallet_service import (
    WalletError,
    admin_top_up_wallet,
    assert_can_release_report,
    can_release_report,
    debit_registration_charge,
    get_or_create_wallet,
)
from api.zone_rates import effective_test_price, price_pct_for_actor


class PricingCascadeTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.zone = Zone.objects.create(code='test-zone', name='Test Zone', sort_order=99)
        self.supreme = UserModel.objects.create_user(
            username='p_supreme', password='x', role=User.ROLE_SUPER_FRANCHISEE, zone=self.zone,
        )
        self.prime = UserModel.objects.create_user(
            username='p_prime', password='x', role=User.ROLE_FRANCHISEE,
            parent_franchisee=self.supreme, zone=self.zone,
        )
        self.sub = UserModel.objects.create_user(
            username='p_sub', password='x', role=User.ROLE_SUB_FRANCHISE,
            parent_franchisee=self.prime, zone=self.zone,
        )
        self.rate = ZoneFranchiseRate.objects.create(
            zone=self.zone,
            super_franchisee_price_pct=Decimal('100.00'),
            franchisee_price_pct=Decimal('90.00'),
            sub_franchise_price_pct=Decimal('80.00'),
            super_franchisee_commission_pct=Decimal('2.00'),
            franchisee_commission_pct=Decimal('3.00'),
            sub_franchise_commission_pct=Decimal('5.00'),
        )
        FranchiseCommissionConfig.get_solo()

    def test_admin_base_price_for_sub(self):
        price = effective_test_price(mrp=Decimal('1000'), catalog_price=Decimal('800'), actor=self.sub, zone=self.zone)
        self.assertEqual(price, Decimal('800.00'))

    def test_supreme_override_for_prime(self):
        FranchisePricingOverride.objects.create(
            zone=self.zone,
            set_by=self.supreme,
            target_role=FranchisePricingOverride.TARGET_FRANCHISEE,
            price_pct_of_mrp=Decimal('85.00'),
        )
        pct = price_pct_for_actor(self.rate, self.prime)
        self.assertEqual(pct, Decimal('85.00'))

    def test_prime_override_for_sub(self):
        FranchisePricingOverride.objects.create(
            zone=self.zone,
            set_by=self.prime,
            target_role=FranchisePricingOverride.TARGET_SUB_FRANCHISE,
            price_pct_of_mrp=Decimal('75.00'),
        )
        pct = price_pct_for_actor(self.rate, self.sub)
        self.assertEqual(pct, Decimal('75.00'))


class WalletDebitReleaseTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.zone = Zone.objects.create(code='wallet-zone', name='Wallet Zone', sort_order=100)
        self.sub = UserModel.objects.create_user(
            username='w_debit_sub', password='x', role=User.ROLE_SUB_FRANCHISE, zone=self.zone,
        )
        ZoneFranchiseRate.ensure_for_zone(self.zone)
        FranchiseCommissionConfig.get_solo()
        patient = Patient.objects.create(
            patient_id='PID-DEBIT',
            patient_name='Debit Patient',
            title='Mr.',
            gender='male',
        )
        self.registration = Registration.objects.create(
            lab_code='DEBIT-1',
            patient=patient,
            created_by=self.sub,
            zone=self.zone,
            net_amount=Decimal('500.00'),
            total=Decimal('500.00'),
        )

    def test_debit_allows_negative_balance(self):
        debit_registration_charge(self.registration, created_by=self.sub)
        balance = get_or_create_wallet(self.sub).balance
        self.assertEqual(balance, Decimal('-500.00'))

    def test_release_blocked_on_negative_balance(self):
        debit_registration_charge(self.registration, created_by=self.sub)
        allowed, reason = can_release_report(self.registration)
        self.assertFalse(allowed)
        self.assertIn('negative', reason.lower())

    def test_release_allowed_after_top_up(self):
        debit_registration_charge(self.registration, created_by=self.sub)
        admin = get_user_model().objects.create_user(
            username='wallet_admin', password='x', role=User.ROLE_ADMIN, zone=self.zone,
        )
        admin_top_up_wallet(user=self.sub, amount=Decimal('600'), created_by=admin)
        allowed, _ = can_release_report(self.registration)
        self.assertTrue(allowed)

    def test_assert_can_release_report_raises(self):
        debit_registration_charge(self.registration, created_by=self.sub)
        with self.assertRaises(WalletError):
            assert_can_release_report(self.registration)

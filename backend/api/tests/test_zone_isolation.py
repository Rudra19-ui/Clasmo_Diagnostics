from django.contrib.auth import get_user_model
from django.test import TestCase

from api.franchise_scope import scope_registrations_for_user, scope_users_for_user
from api.models import Patient, Registration, Zone
from api.zones import ensure_zones


class ZoneIsolationTests(TestCase):
    def setUp(self):
        zones, _ = ensure_zones()
        self.nashik = zones['nashik']
        self.pune = zones['pune']
        User = get_user_model()
        self.nashik_admin = User.objects.create_user(
            username='z_nashik_admin',
            password='test12345',
            role=User.ROLE_ADMIN,
            zone=self.nashik,
        )
        self.pune_admin = User.objects.create_user(
            username='z_pune_admin',
            password='test12345',
            role=User.ROLE_ADMIN,
            zone=self.pune,
        )
        patient = Patient.objects.create(
            patient_name='Nashik Patient',
            patient_id='ZN001',
            zone=self.nashik,
        )
        self.nashik_reg = Registration.objects.create(
            lab_code='ZN-REG-1',
            patient=patient,
            created_by=self.nashik_admin,
            zone=self.nashik,
        )

    def test_admins_only_see_own_zone_registrations(self):
        nashik_rows = scope_registrations_for_user(self.nashik_admin)
        pune_rows = scope_registrations_for_user(self.pune_admin)
        self.assertEqual(list(nashik_rows), [self.nashik_reg])
        self.assertEqual(list(pune_rows), [])

    def test_admins_only_see_own_zone_users(self):
        nashik_users = scope_users_for_user(self.nashik_admin)
        pune_users = scope_users_for_user(self.pune_admin)
        self.assertTrue(nashik_users.filter(pk=self.nashik_admin.pk).exists())
        self.assertFalse(nashik_users.filter(pk=self.pune_admin.pk).exists())
        self.assertTrue(pune_users.filter(pk=self.pune_admin.pk).exists())
        self.assertFalse(pune_users.filter(pk=self.nashik_admin.pk).exists())

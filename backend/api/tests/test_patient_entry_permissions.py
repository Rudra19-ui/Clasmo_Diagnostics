from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import User


class PatientEntryPermissionTests(TestCase):
    def setUp(self):
        UserModel = get_user_model()
        self.blocked = UserModel.objects.create_user(
            username='blocked_patho', password='x', role=User.ROLE_PATHOLOGIST,
        )
        self.allowed = UserModel.objects.create_user(
            username='allowed_admin', password='x', role=User.ROLE_ADMIN,
        )
        self.client = APIClient()

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_pathologist_cannot_search_registrations(self):
        self._auth(self.blocked)
        resp = self.client.get('/api/registrations/')
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_search_registrations(self):
        self._auth(self.allowed)
        resp = self.client.get('/api/registrations/')
        self.assertEqual(resp.status_code, 200)

    def test_pathologist_cannot_list_wallets(self):
        self._auth(self.blocked)
        resp = self.client.get('/api/wallets/')
        self.assertEqual(resp.status_code, 403)

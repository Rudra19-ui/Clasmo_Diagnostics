from rest_framework import permissions

from .models import User

# Roles allowed to view/create patient bookings and registration master data.
PATIENT_ENTRY_ROLES = frozenset({
    User.ROLE_SUPER_ADMIN,
    User.ROLE_ADMIN,
    User.ROLE_SUPER_FRANCHISEE,
    User.ROLE_FRANCHISEE,
    User.ROLE_SUB_FRANCHISE,
})

# Admin + franchise hierarchy — pricing, wallets, commissions.
PRICING_WALLET_ROLES = PATIENT_ENTRY_ROLES


class CanAccessPatientEntry(permissions.BasePermission):
    message = 'You do not have permission to access patient entry data.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in PATIENT_ENTRY_ROLES
        )


class CanAccessPricingWallet(permissions.BasePermission):
    message = 'You do not have permission to access pricing and wallet data.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in PRICING_WALLET_ROLES
        )


class IsAdmin(permissions.BasePermission):
    """Zone Admin or Super Admin."""

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role in User.ADMIN_ROLES)
        )


class IsClinicalStaff(permissions.BasePermission):
    """Admin, Technician, or Pathologist."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in User.CLINICAL_ROLES
        )


class IsTechnicianOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            User.ROLE_SUPER_ADMIN,
            User.ROLE_ADMIN,
            User.ROLE_TECHNICIAN,
        }


class IsPathologistOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            User.ROLE_SUPER_ADMIN,
            User.ROLE_ADMIN,
            User.ROLE_PATHOLOGIST,
        }


class TestParameterPermission(permissions.BasePermission):
    """Read: clinical staff. Write: admin / super admin only."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in User.CLINICAL_ROLES | {User.ROLE_USER}
        return request.user.role in User.ADMIN_ROLES

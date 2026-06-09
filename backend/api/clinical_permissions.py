from rest_framework import permissions

from .models import User


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_ADMIN


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
            User.ROLE_ADMIN,
            User.ROLE_TECHNICIAN,
        }


class IsPathologistOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            User.ROLE_ADMIN,
            User.ROLE_PATHOLOGIST,
        }


class TestParameterPermission(permissions.BasePermission):
    """Read: clinical staff. Write: admin only."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in User.CLINICAL_ROLES | {User.ROLE_ADMIN, User.ROLE_USER}
        return request.user.role == User.ROLE_ADMIN

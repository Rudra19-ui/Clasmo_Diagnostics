"""
Franchise hierarchy + zone data isolation.

Visibility rules:
- Every user belongs to exactly one Zone (Nashik, Pune, Ratnagiri, Mumbai, Dhule).
- Users never see data from another zone.
- Within a zone:
  - Sub-Franchise: own data only
  - Prime: own data + Sub-Franchisees
  - Supreme: own data + all franchise descendants
  - Non-franchise roles (admin/clinical/HR/etc.): all data in their zone
"""

from django.db.models import Q, QuerySet

from .models import (
    FranchiseWallet,
    Patient,
    PatientSampleBarcode,
    Registration,
    Report,
    User,
    WalletTransaction,
)


def is_franchise_user(user) -> bool:
    return bool(user and getattr(user, 'is_authenticated', False) and user.role in User.FRANCHISE_ROLES)


# Alias used by views
is_franchise_actor = is_franchise_user


def user_zone_id(user) -> int | None:
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    return getattr(user, 'zone_id', None)


def user_has_global_data_access(user) -> bool:
    """Super Admin (and Django superusers) see data across all zones."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    return bool(getattr(user, 'has_global_data_access', lambda: False)())


def franchise_descendant_ids(user) -> set[int]:
    """All active users under this user in the franchise_children tree (same zone)."""
    ids: set[int] = set()
    zone_id = user_zone_id(user)
    frontier = list(
        user.franchise_children.filter(is_active=True).values_list('id', flat=True)
    )
    while frontier:
        child_id = frontier.pop()
        if child_id in ids:
            continue
        ids.add(child_id)
        child_qs = User.objects.filter(parent_franchisee_id=child_id, is_active=True)
        if zone_id:
            child_qs = child_qs.filter(zone_id=zone_id)
        frontier.extend(child_qs.values_list('id', flat=True))
    return ids


def visible_creator_ids(user) -> set[int] | None:
    """
    User IDs whose created records this actor may see (within their zone).
    Returns None when zone-wide / global access applies (admin roles).
    Returns empty set when the user has no zone or is unauthenticated.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return set()

    if user_has_global_data_access(user):
        return None

    if not user_zone_id(user):
        return set()

    if user.role not in User.FRANCHISE_ROLES:
        return None

    if user.role == User.ROLE_SUB_FRANCHISE:
        return {user.id}

    if user.role == User.ROLE_FRANCHISEE:
        child_ids = set(
            user.franchise_children.filter(
                is_active=True,
                role=User.ROLE_SUB_FRANCHISE,
                zone_id=user.zone_id,
            ).values_list('id', flat=True)
        )
        return {user.id} | child_ids

    if user.role == User.ROLE_SUPER_FRANCHISEE:
        return {user.id} | franchise_descendant_ids(user)

    return {user.id}


def _apply_zone_filter(qs: QuerySet, user, *, zone_field='zone_id'):
    if user_has_global_data_access(user):
        return qs
    zone_id = user_zone_id(user)
    if zone_id is None:
        return qs.none()
    return qs.filter(**{zone_field: zone_id})


def scope_registrations_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else Registration.objects.all()
    qs = _apply_zone_filter(qs, user, zone_field='zone_id')
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(created_by_id__in=creator_ids)


def scope_patients_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else Patient.objects.all()
    qs = _apply_zone_filter(qs, user, zone_field='zone_id')
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(registrations__created_by_id__in=creator_ids).distinct()


def scope_reports_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else Report.objects.all()
    qs = _apply_zone_filter(qs, user, zone_field='registration__zone_id')
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(registration__created_by_id__in=creator_ids)


def scope_barcodes_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else PatientSampleBarcode.objects.all()
    if user_has_global_data_access(user):
        return qs
    zone_id = user_zone_id(user)
    if zone_id is None:
        return qs.none()
    qs = qs.filter(
        Q(registration__zone_id=zone_id) | Q(patient__zone_id=zone_id)
    ).distinct()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(
        Q(registration__created_by_id__in=creator_ids)
        | Q(registration__isnull=True, patient__registrations__created_by_id__in=creator_ids)
    ).distinct()


def scope_created_by_for_user(user, qs: QuerySet) -> QuerySet:
    """Generic filter for models with created_by FK (also zone via creator)."""
    if user_has_global_data_access(user):
        return qs
    zone_id = user_zone_id(user)
    if zone_id is None:
        return qs.none()
    qs = qs.filter(created_by__zone_id=zone_id)
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(created_by_id__in=creator_ids)


def scope_zone_queryset(user, qs: QuerySet, *, zone_field='zone_id') -> QuerySet:
    """Filter any queryset that has a direct zone FK."""
    return _apply_zone_filter(qs, user, zone_field=zone_field)


def scope_users_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    """User directory: same zone only; franchise actors further limited by hierarchy."""
    qs = qs if qs is not None else User.objects.all()
    if user_has_global_data_access(user):
        return qs
    zone_id = user_zone_id(user)
    if zone_id is None:
        return qs.none()
    qs = qs.filter(zone_id=zone_id)
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(id__in=creator_ids)


def user_can_access_registration(user, registration) -> bool:
    if not registration:
        return False
    if user_has_global_data_access(user):
        return True
    zone_id = user_zone_id(user)
    if zone_id is None:
        return False
    reg_zone = getattr(registration, 'zone_id', None)
    if reg_zone and reg_zone != zone_id:
        return False
    # Legacy rows without zone: allow only if creator is in same zone
    if not reg_zone:
        creator_zone = getattr(getattr(registration, 'created_by', None), 'zone_id', None)
        if creator_zone != zone_id:
            return False
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return True
    return registration.created_by_id in creator_ids


def get_registration_for_user(user, *, pk=None, lab_code=None):
    """Fetch one registration if visible to user; else None."""
    qs = Registration.objects.select_related('patient', 'created_by', 'zone')
    if pk is not None:
        qs = qs.filter(pk=pk)
    elif lab_code:
        qs = qs.filter(lab_code__iexact=str(lab_code).strip())
    else:
        return None
    qs = scope_registrations_for_user(user, qs)
    return qs.first()


def scope_wallets_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else FranchiseWallet.objects.all()
    if user_has_global_data_access(user):
        creator_ids = visible_creator_ids(user)
        if creator_ids is None:
            return qs
        return qs.filter(user_id__in=creator_ids)
    zone_id = user_zone_id(user)
    if zone_id is None:
        return qs.none()
    qs = qs.filter(user__zone_id=zone_id)
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(user_id__in=creator_ids)


def scope_wallet_transactions_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else WalletTransaction.objects.all()
    if user_has_global_data_access(user):
        creator_ids = visible_creator_ids(user)
        if creator_ids is None:
            return qs
        return qs.filter(wallet__user_id__in=creator_ids)
    zone_id = user_zone_id(user)
    if zone_id is None:
        return qs.none()
    qs = qs.filter(wallet__user__zone_id=zone_id)
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(wallet__user_id__in=creator_ids)


def user_can_access_wallet(user, wallet) -> bool:
    if not wallet:
        return False
    if user_has_global_data_access(user):
        creator_ids = visible_creator_ids(user)
        if creator_ids is None:
            return True
        return wallet.user_id in creator_ids
    zone_id = user_zone_id(user)
    if zone_id is None:
        return False
    owner_zone = getattr(getattr(wallet, 'user', None), 'zone_id', None)
    if owner_zone != zone_id:
        return False
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return True
    return wallet.user_id in creator_ids

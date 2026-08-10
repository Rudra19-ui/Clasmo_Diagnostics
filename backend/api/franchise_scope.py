"""
Franchise hierarchy data isolation.

Visibility rules:
- Sub-Franchise: own data only
- Prime (Franchisee): own data + data from their Sub-Franchisees
- Supreme (Super Franchisee): own data + all descendants in the hierarchy
- Prime/Sub never see Supreme-created data (or any other branch)
- Non-franchise roles (admin/clinical/etc.): unscoped (lab-wide)
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


def franchise_descendant_ids(user) -> set[int]:
    """All active users under this user in the franchise_children tree."""
    ids: set[int] = set()
    frontier = list(
        user.franchise_children.filter(is_active=True).values_list('id', flat=True)
    )
    while frontier:
        child_id = frontier.pop()
        if child_id in ids:
            continue
        ids.add(child_id)
        frontier.extend(
            User.objects.filter(parent_franchisee_id=child_id, is_active=True)
            .values_list('id', flat=True)
        )
    return ids


def visible_creator_ids(user) -> set[int] | None:
    """
    User IDs whose created records this actor may see.
    Returns None when no franchise scoping applies (lab-wide access).
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return set()

    if user.role not in User.FRANCHISE_ROLES:
        return None

    if user.role == User.ROLE_SUB_FRANCHISE:
        return {user.id}

    if user.role == User.ROLE_FRANCHISEE:
        # Own + Sub-Franchisees only (never Supreme / peer Primes).
        child_ids = set(
            user.franchise_children.filter(
                is_active=True,
                role=User.ROLE_SUB_FRANCHISE,
            ).values_list('id', flat=True)
        )
        return {user.id} | child_ids

    if user.role == User.ROLE_SUPER_FRANCHISEE:
        # Own + entire hierarchy under this Supreme.
        return {user.id} | franchise_descendant_ids(user)

    return {user.id}


def scope_registrations_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else Registration.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(created_by_id__in=creator_ids)


def scope_patients_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else Patient.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(registrations__created_by_id__in=creator_ids).distinct()


def scope_reports_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else Report.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(registration__created_by_id__in=creator_ids)


def scope_barcodes_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else PatientSampleBarcode.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(
        Q(registration__created_by_id__in=creator_ids)
        | Q(registration__isnull=True, patient__registrations__created_by_id__in=creator_ids)
    ).distinct()


def scope_created_by_for_user(user, qs: QuerySet) -> QuerySet:
    """Generic filter for models with created_by FK."""
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(created_by_id__in=creator_ids)


def scope_users_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    """User directory: franchise actors only see themselves + allowed hierarchy."""
    qs = qs if qs is not None else User.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(id__in=creator_ids)


def user_can_access_registration(user, registration) -> bool:
    if not registration:
        return False
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return True
    return registration.created_by_id in creator_ids


def get_registration_for_user(user, *, pk=None, lab_code=None):
    """Fetch one registration if visible to user; else None."""
    qs = Registration.objects.select_related('patient', 'created_by')
    if pk is not None:
        qs = qs.filter(pk=pk)
    elif lab_code:
        qs = qs.filter(lab_code__iexact=str(lab_code).strip())
    else:
        return None
    qs = scope_registrations_for_user(user, qs)
    return qs.first()


def scope_wallets_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    """
    Wallet visibility mirrors franchise hierarchy.
    Supreme wallets are never visible to Prime/Sub (not in their creator set).
    """
    qs = qs if qs is not None else FranchiseWallet.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(user_id__in=creator_ids)


def scope_wallet_transactions_for_user(user, qs: QuerySet | None = None) -> QuerySet:
    qs = qs if qs is not None else WalletTransaction.objects.all()
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return qs
    return qs.filter(wallet__user_id__in=creator_ids)


def user_can_access_wallet(user, wallet) -> bool:
    if not wallet:
        return False
    creator_ids = visible_creator_ids(user)
    if creator_ids is None:
        return True
    return wallet.user_id in creator_ids

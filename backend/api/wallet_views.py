from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .clinical_permissions import IsAdmin
from .franchise_scope import (
    scope_wallet_transactions_for_user,
    scope_wallets_for_user,
    user_can_access_wallet,
    visible_creator_ids,
)
from .models import FranchiseCommissionConfig, FranchiseWallet, User, WalletTransaction
from .wallet_serializers import (
    DemoWalletTransactionSerializer,
    FranchiseCommissionConfigSerializer,
    FranchiseWalletSerializer,
    WalletTransactionSerializer,
)
from .wallet_service import (
    WalletError,
    create_demo_transactions,
    get_or_create_wallet,
)


class MyWalletView(APIView):
    """GET /api/wallets/me/ — caller's wallet balance (auto-created)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in User.FRANCHISE_ROLES and request.user.role != User.ROLE_ADMIN:
            return Response(
                {'detail': 'Wallet is available for franchise roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        wallet = get_or_create_wallet(request.user)
        return Response(FranchiseWalletSerializer(wallet).data)


class WalletListView(APIView):
    """GET /api/wallets/ — wallets visible in the caller's franchise scope."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = FranchiseWallet.objects.select_related('user').filter(is_active=True)
        qs = scope_wallets_for_user(request.user, qs)

        role = (request.query_params.get('role') or '').strip()
        if role:
            qs = qs.filter(user__role=role)

        return Response(FranchiseWalletSerializer(qs.order_by('user__username'), many=True).data)


class WalletDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        wallet = get_object_or_404(
            FranchiseWallet.objects.select_related('user'),
            user_id=user_id,
        )
        if not user_can_access_wallet(request.user, wallet):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FranchiseWalletSerializer(wallet).data)


class WalletTransactionListView(APIView):
    """GET /api/wallets/transactions/ — ledger rows in franchise scope."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = WalletTransaction.objects.select_related(
            'wallet__user', 'source_user', 'registration', 'created_by'
        )
        qs = scope_wallet_transactions_for_user(request.user, qs)

        user_id = (request.query_params.get('user_id') or '').strip()
        if user_id:
            try:
                uid = int(user_id)
            except ValueError:
                return Response({'detail': 'Invalid user_id.'}, status=status.HTTP_400_BAD_REQUEST)
            visible = visible_creator_ids(request.user)
            if visible is not None and uid not in visible:
                return Response([])
            qs = qs.filter(wallet__user_id=uid)

        txn_type = (request.query_params.get('txn_type') or '').strip()
        if txn_type:
            qs = qs.filter(txn_type=txn_type)

        batch_key = (request.query_params.get('batch_key') or '').strip()
        if batch_key:
            qs = qs.filter(batch_key=batch_key)

        try:
            limit = min(200, max(1, int(request.query_params.get('limit', 50))))
        except (TypeError, ValueError):
            limit = 50

        rows = qs.order_by('-created_at', '-id')[:limit]
        return Response(WalletTransactionSerializer(rows, many=True).data)


class CommissionConfigView(APIView):
    """GET/PATCH /api/wallets/commission-config/"""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        config = FranchiseCommissionConfig.get_solo()
        return Response(FranchiseCommissionConfigSerializer(config).data)

    def patch(self, request):
        config = FranchiseCommissionConfig.get_solo()
        serializer = FranchiseCommissionConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DemoWalletTransactionView(APIView):
    """
    POST /api/wallets/demo-transaction/

    Creates mock hierarchical commission credits so balances can be verified
    without a real patient registration.

    Body: { "base_amount": 1000, "actor_id": <optional>, "note": "" }
    Defaults actor_id to the authenticated franchise user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DemoWalletTransactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        actor_id = data.get('actor_id')
        if actor_id:
            actor = get_object_or_404(User, pk=actor_id, is_active=True)
            visible = visible_creator_ids(request.user)
            # Admin / unscoped: any franchise actor. Franchise actors: only self or descendants.
            if visible is not None and actor.id not in visible:
                return Response({'detail': 'Actor not found in your branch.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            actor = request.user
            if actor.role not in User.FRANCHISE_ROLES:
                return Response(
                    {'detail': 'Provide actor_id when calling as a non-franchise user.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            result = create_demo_transactions(
                actor=actor,
                base_amount=data['base_amount'],
                created_by=request.user,
                note=data.get('note', ''),
            )
        except WalletError as exc:
            return Response(
                {exc.field or 'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Never leak Supreme (or out-of-branch) wallet rows to Prime/Sub callers.
        visible_txns = [
            txn for txn in result['transactions']
            if user_can_access_wallet(request.user, txn.wallet)
        ]
        visible_wallets = [
            wallet for wallet in result['wallets']
            if user_can_access_wallet(request.user, wallet)
        ]

        return Response(
            {
                'batch_key': result['batch_key'],
                'base_amount': str(result['base_amount']),
                'transactions': WalletTransactionSerializer(visible_txns, many=True).data,
                'wallets': FranchiseWalletSerializer(visible_wallets, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )

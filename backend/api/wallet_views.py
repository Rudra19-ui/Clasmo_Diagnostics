from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .clinical_permissions import CanAccessPricingWallet, CanManageFranchiseTestRates, IsAdmin
from .franchise_scope import (
    scope_wallet_transactions_for_user,
    scope_wallets_for_user,
    user_can_access_wallet,
    visible_creator_ids,
)
from .models import (
    FranchiseCommissionConfig,
    FranchisePricingOverride,
    FranchiseTestRate,
    FranchiseWallet,
    User,
    WalletTransaction,
    Zone,
    ZoneFranchiseRate,
)
from .wallet_serializers import (
    DemoWalletTransactionSerializer,
    FranchiseCommissionConfigSerializer,
    FranchisePricingOverrideSerializer,
    FranchiseTestRateBulkSerializer,
    FranchiseWalletSerializer,
    WalletTopUpSerializer,
    WalletTransactionSerializer,
    ZoneFranchiseRateBulkSerializer,
    ZoneFranchiseRateSerializer,
    FranchiseTestRateTransferSerializer,
)
from .wallet_service import (
    WalletError,
    admin_top_up_wallet,
    create_demo_transactions,
    get_or_create_wallet,
)
from .zone_rates import (
    ensure_zone_franchise_rates,
    get_zone_franchise_rate,
    markup_on_franchisee_price,
    user_can_manage_all_zone_rates,
    user_can_manage_franchise_test_rates,
    user_can_manage_zone_rate,
    user_can_set_pricing_override,
    user_can_transfer_franchise_test_rates,
)


class MyWalletView(APIView):
    """GET /api/wallets/me/ — caller's wallet balance (auto-created)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in User.FRANCHISE_ROLES and request.user.role not in User.ADMIN_ROLES:
            return Response(
                {'detail': 'Wallet is available for franchise roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        wallet = get_or_create_wallet(request.user)
        return Response(FranchiseWalletSerializer(wallet).data)


class WalletListView(APIView):
    """GET /api/wallets/ — wallets visible in the caller's franchise scope."""

    permission_classes = [permissions.IsAuthenticated, CanAccessPricingWallet]

    def get(self, request):
        qs = FranchiseWallet.objects.select_related('user', 'user__zone').filter(is_active=True)
        qs = scope_wallets_for_user(request.user, qs)

        role = (request.query_params.get('role') or '').strip()
        if role:
            qs = qs.filter(user__role=role)

        return Response(FranchiseWalletSerializer(qs.order_by('user__username'), many=True).data)


class WalletDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessPricingWallet]

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

    permission_classes = [permissions.IsAuthenticated, CanAccessPricingWallet]

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
    """GET/PATCH /api/wallets/commission-config/ — global fallback defaults."""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated(), CanAccessPricingWallet()]
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


class ZoneFranchiseRateListView(APIView):
    """
    GET  /api/wallets/zone-franchise-rates/ — list rates (HQ sees all zones; others their zone)
    PUT  /api/wallets/zone-franchise-rates/ — bulk save rates for editable zones
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        ensure_zone_franchise_rates()
        qs = ZoneFranchiseRate.objects.select_related('zone', 'updated_by').filter(zone__is_active=True)
        if not user_can_manage_all_zone_rates(request.user):
            if not request.user.zone_id:
                return Response([])
            qs = qs.filter(zone_id=request.user.zone_id)
        qs = qs.order_by('zone__sort_order', 'zone_id')
        return Response(ZoneFranchiseRateSerializer(qs, many=True).data)

    def put(self, request):
        ensure_zone_franchise_rates()
        serializer = ZoneFranchiseRateBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        saved = []
        errors = []
        for item in serializer.validated_data['rates']:
            zone = Zone.objects.filter(pk=item['zone_id'], is_active=True).first()
            if not zone:
                errors.append({'zone_id': item['zone_id'], 'detail': 'Zone not found.'})
                continue
            if not user_can_manage_zone_rate(request.user, zone):
                errors.append({'zone_id': item['zone_id'], 'detail': 'Not allowed for this zone.'})
                continue
            row = ZoneFranchiseRate.ensure_for_zone(zone)
            for field in (
                'super_franchisee_price_pct',
                'franchisee_price_pct',
                'sub_franchise_price_pct',
                'super_franchisee_commission_pct',
                'franchisee_commission_pct',
                'sub_franchise_commission_pct',
                'is_active',
            ):
                if field in item:
                    setattr(row, field, item[field])
            row.updated_by = request.user
            row.save()
            saved.append(row)

        if errors and not saved:
            return Response({'detail': 'No rates were saved.', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        payload = ZoneFranchiseRateSerializer(saved, many=True).data
        response = {'rates': payload}
        if errors:
            response['errors'] = errors
        return Response(response)


class MyZoneFranchiseRateView(APIView):
    """GET /api/wallets/zone-franchise-rates/me/ — rates for the caller's zone."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.zone_id:
            return Response({'detail': 'Your account is not assigned to a zone.'}, status=status.HTTP_400_BAD_REQUEST)
        row = get_zone_franchise_rate(request.user.zone)
        return Response(ZoneFranchiseRateSerializer(row).data)


class MyPricingOverrideView(APIView):
    """
    GET/PUT /api/wallets/pricing-overrides/me/

    Supreme sets Prime rates; Prime sets Sub-Franchise rates for their zone.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _target_role_for_user(self, user):
        if user.role == User.ROLE_SUPER_FRANCHISEE:
            return FranchisePricingOverride.TARGET_FRANCHISEE
        if user.role == User.ROLE_FRANCHISEE:
            return FranchisePricingOverride.TARGET_SUB_FRANCHISE
        return None

    def get(self, request):
        target_role = self._target_role_for_user(request.user)
        if not target_role and not user_can_manage_all_zone_rates(request.user):
            return Response(
                {'detail': 'Only Supreme or Prime can view downstream pricing overrides.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not request.user.zone_id:
            return Response(
                {'detail': 'Your account is not assigned to a zone.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user_can_manage_all_zone_rates(request.user):
            qs = FranchisePricingOverride.objects.select_related('zone', 'set_by').filter(
                zone_id=request.user.zone_id,
                is_active=True,
            )
            return Response(FranchisePricingOverrideSerializer(qs, many=True).data)

        override = FranchisePricingOverride.objects.filter(
            zone_id=request.user.zone_id,
            set_by=request.user,
            target_role=target_role,
        ).first()
        if not override:
            row = get_zone_franchise_rate(request.user.zone)
            default_pct = (
                row.franchisee_price_pct
                if target_role == FranchisePricingOverride.TARGET_FRANCHISEE
                else row.sub_franchise_price_pct
            )
            default_comm = (
                row.franchisee_commission_pct
                if target_role == FranchisePricingOverride.TARGET_FRANCHISEE
                else row.sub_franchise_commission_pct
            )
            return Response({
                'zone_id': request.user.zone_id,
                'target_role': target_role,
                'price_pct_of_mrp': str(default_pct),
                'commission_pct': str(default_comm),
                'is_active': True,
                'is_default': True,
            })
        data = FranchisePricingOverrideSerializer(override).data
        data['is_default'] = False
        return Response(data)

    def put(self, request):
        target_role = self._target_role_for_user(request.user)
        if not target_role:
            return Response(
                {'detail': 'Only Supreme or Prime can set downstream pricing overrides.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user_can_set_pricing_override(request.user, target_role):
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        if not request.user.zone_id:
            return Response(
                {'detail': 'Your account is not assigned to a zone.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FranchisePricingOverrideSerializer(data={
            **request.data,
            'zone_id': request.user.zone_id,
            'target_role': target_role,
        })
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        override, _ = FranchisePricingOverride.objects.update_or_create(
            zone_id=request.user.zone_id,
            set_by=request.user,
            target_role=target_role,
            defaults={
                'price_pct_of_mrp': validated['price_pct_of_mrp'],
                'commission_pct': validated.get('commission_pct'),
                'is_active': validated.get('is_active', True),
            },
        )
        data = FranchisePricingOverrideSerializer(override).data
        data['is_default'] = False
        return Response(data)


class WalletTopUpView(APIView):
    """POST /api/wallets/top-up/ — admin manual credit to a franchise wallet."""

    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = WalletTopUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = get_object_or_404(User, pk=data['user_id'], is_active=True)
        try:
            txn = admin_top_up_wallet(
                user=user,
                amount=data['amount'],
                created_by=request.user,
                note=data.get('note', ''),
            )
        except WalletError as exc:
            return Response(
                {exc.field or 'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        wallet = get_or_create_wallet(user)
        return Response(
            {
                'transaction': WalletTransactionSerializer(txn).data,
                'wallet': FranchiseWalletSerializer(wallet).data,
            },
            status=status.HTTP_201_CREATED,
        )


class DemoWalletTransactionView(APIView):
    """
    POST /api/wallets/demo-transaction/

    Creates mock hierarchical commission credits so balances can be verified
    without a real patient registration.

    Body: { "base_amount": 1000, "actor_id": <optional>, "note": "" }
    Defaults actor_id to the authenticated franchise user.
    """

    permission_classes = [permissions.IsAuthenticated, CanAccessPricingWallet]

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


class FranchiseBulkPricingView(APIView):
    """
    GET  /api/wallets/franchise-test-rates/?franchise_user_id=
         Rate list for a franchise account (all tests + saved rates).
    PUT  /api/wallets/franchise-test-rates/
         Bulk save rates: { franchise_user_id, rates: [{test_id, rate_pct}], apply_all_pct? }
    """

    permission_classes = [permissions.IsAuthenticated, CanManageFranchiseTestRates]

    def get(self, request):
        from decimal import Decimal
        from .models import Test

        franchise_user_id = (request.query_params.get('franchise_user_id') or '').strip()
        if not franchise_user_id:
            return Response({'detail': 'franchise_user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            franchise_user_id = int(franchise_user_id)
        except ValueError:
            return Response({'detail': 'Invalid franchise_user_id.'}, status=status.HTTP_400_BAD_REQUEST)

        franchise_user = get_object_or_404(User, pk=franchise_user_id, is_active=True)
        if franchise_user.role not in User.FRANCHISE_ROLES:
            return Response({'detail': 'Selected user is not a franchise account.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user_can_manage_franchise_test_rates(request.user, franchise_user):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Default markup % when no custom rate is saved (0 = Final equals Franchisee Price).
        default_pct = Decimal('0.00')

        saved = {
            row.test_id: row.rate_pct
            for row in FranchiseTestRate.objects.filter(franchise_user=franchise_user)
        }

        search = (request.query_params.get('search') or '').strip().lower()
        tests = Test.objects.select_related('category').order_by('name')
        rows = []
        for idx, test in enumerate(tests, start=1):
            if search and search not in (test.name or '').lower() and search not in (test.test_code or '').lower():
                continue
            mrp = Decimal(str(test.mrp or 0))
            catalog = Decimal(str(test.price or 0))
            is_custom = test.id in saved
            rate = Decimal(str(saved.get(test.id, default_pct)))
            assigned = markup_on_franchisee_price(catalog_price=catalog, rate_pct=rate)
            if assigned <= 0 and mrp > 0 and catalog <= 0:
                assigned = markup_on_franchisee_price(catalog_price=mrp, rate_pct=rate)
            rows.append({
                'index': idx,
                'test_id': test.id,
                'test_code': test.test_code or f'TID{test.id:06d}',
                'test_name': test.name,
                'mrp': str(mrp),
                'franchisee_price': str(catalog),
                'rate_pct': str(rate),
                'assigned_price': str(assigned),
                'final_price': str(assigned),
                'is_custom': is_custom,
            })

        return Response({
            'franchise_user': {
                'id': franchise_user.id,
                'username': franchise_user.username,
                'display_name': franchise_user.display_name or franchise_user.username,
                'role': franchise_user.role,
                'zone_name': franchise_user.zone.name if franchise_user.zone_id else '',
            },
            'default_rate_pct': str(default_pct),
            'count': len(rows),
            'rows': rows,
        })

    def put(self, request):
        from decimal import Decimal
        from .models import Test

        serializer = FranchiseTestRateBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        franchise_user = get_object_or_404(User, pk=data['franchise_user_id'], is_active=True)

        if not user_can_manage_franchise_test_rates(request.user, franchise_user):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        apply_all = data.get('apply_all_pct')
        existing = {
            row.test_id: row
            for row in FranchiseTestRate.objects.filter(franchise_user=franchise_user)
        }

        if apply_all is not None:
            rate_value = Decimal(str(apply_all))
            test_ids = list(Test.objects.values_list('id', flat=True))
            to_update = []
            to_create = []
            for tid in test_ids:
                row = existing.get(tid)
                if row:
                    row.rate_pct = rate_value
                    row.updated_by = request.user
                    to_update.append(row)
                else:
                    to_create.append(FranchiseTestRate(
                        franchise_user=franchise_user,
                        test_id=tid,
                        rate_pct=rate_value,
                        updated_by=request.user,
                    ))
            if to_update:
                FranchiseTestRate.objects.bulk_update(
                    to_update, ['rate_pct', 'updated_by'], batch_size=500,
                )
            if to_create:
                FranchiseTestRate.objects.bulk_create(to_create, batch_size=500)
            saved = len(to_update) + len(to_create)
            return Response({'detail': f'Updated {saved} test rate(s).', 'saved': saved})

        rate_items = data.get('rates') or []
        to_update = []
        to_create = []
        valid_test_ids = set(Test.objects.filter(
            pk__in=[item['test_id'] for item in rate_items],
        ).values_list('id', flat=True))

        for item in rate_items:
            tid = item['test_id']
            if tid not in valid_test_ids:
                continue
            rate_value = item['rate_pct']
            row = existing.get(tid)
            if row:
                row.rate_pct = rate_value
                row.updated_by = request.user
                to_update.append(row)
            else:
                to_create.append(FranchiseTestRate(
                    franchise_user=franchise_user,
                    test_id=tid,
                    rate_pct=rate_value,
                    updated_by=request.user,
                ))

        if to_update:
            FranchiseTestRate.objects.bulk_update(
                to_update, ['rate_pct', 'updated_by'], batch_size=500,
            )
        if to_create:
            FranchiseTestRate.objects.bulk_create(to_create, batch_size=500)

        saved = len(to_update) + len(to_create)
        return Response({'detail': f'Updated {saved} test rate(s).', 'saved': saved})


class FranchiseTransferPricingView(APIView):
    """
    POST /api/wallets/franchise-test-rates/transfer/
    Copy all (or selected) test rates from one franchisee to another.
    Body: {
      from_franchise_user_id, to_franchise_user_id,
      copy_all: true,
      test_ids?: [..]
    }
    """

    permission_classes = [permissions.IsAuthenticated, CanManageFranchiseTestRates]

    def post(self, request):
        serializer = FranchiseTestRateTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        source = get_object_or_404(User, pk=data['from_franchise_user_id'], is_active=True)
        target = get_object_or_404(User, pk=data['to_franchise_user_id'], is_active=True)

        if source.id == target.id:
            return Response(
                {'detail': 'Source and target franchisee must be different.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for actor in (source, target):
            if actor.role not in User.FRANCHISE_ROLES:
                return Response(
                    {'detail': 'Both accounts must be franchise users.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not user_can_transfer_franchise_test_rates(request.user, source, target):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        source_rates = FranchiseTestRate.objects.filter(franchise_user=source).select_related('test')
        test_ids = data.get('test_ids') or []
        if not data.get('copy_all') and test_ids:
            source_rates = source_rates.filter(test_id__in=test_ids)

        copied = 0
        to_update = []
        to_create = []
        existing_target = {
            row.test_id: row
            for row in FranchiseTestRate.objects.filter(franchise_user=target)
        }
        for row in source_rates:
            current = existing_target.get(row.test_id)
            if current:
                current.rate_pct = row.rate_pct
                current.updated_by = request.user
                to_update.append(current)
            else:
                to_create.append(FranchiseTestRate(
                    franchise_user=target,
                    test=row.test,
                    rate_pct=row.rate_pct,
                    updated_by=request.user,
                ))
            copied += 1

        if to_update:
            FranchiseTestRate.objects.bulk_update(
                to_update, ['rate_pct', 'updated_by'], batch_size=500,
            )
        if to_create:
            FranchiseTestRate.objects.bulk_create(to_create, batch_size=500)

        return Response({
            'detail': (
                f'Copied {copied} test rate(s) from '
                f'{source.display_name or source.username} to '
                f'{target.display_name or target.username}.'
            ),
            'copied': copied,
            'from_franchise_user_id': source.id,
            'to_franchise_user_id': target.id,
        })

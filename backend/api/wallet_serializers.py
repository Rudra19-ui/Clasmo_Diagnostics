from rest_framework import serializers

from .models import FranchiseCommissionConfig, FranchisePricingOverride, FranchiseWallet, User, WalletTransaction, ZoneFranchiseRate


class FranchiseCommissionConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FranchiseCommissionConfig
        fields = (
            'sub_franchise_pct',
            'franchisee_pct',
            'super_franchisee_pct',
            'is_active',
            'updated_at',
        )
        read_only_fields = ('updated_at',)


class ZoneFranchiseRateSerializer(serializers.ModelSerializer):
    zone_id = serializers.IntegerField(source='zone.id', read_only=True)
    zone_code = serializers.CharField(source='zone.code', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    zone_sort_order = serializers.IntegerField(source='zone.sort_order', read_only=True)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ZoneFranchiseRate
        fields = (
            'id',
            'zone_id',
            'zone_code',
            'zone_name',
            'zone_sort_order',
            'super_franchisee_price_pct',
            'franchisee_price_pct',
            'sub_franchise_price_pct',
            'super_franchisee_commission_pct',
            'franchisee_commission_pct',
            'sub_franchise_commission_pct',
            'is_active',
            'updated_at',
            'updated_by_name',
        )
        read_only_fields = (
            'id',
            'zone_id',
            'zone_code',
            'zone_name',
            'zone_sort_order',
            'updated_at',
            'updated_by_name',
        )

    def get_updated_by_name(self, obj):
        if not obj.updated_by_id:
            return ''
        return obj.updated_by.display_name or obj.updated_by.username

    def validate(self, attrs):
        percent_fields = (
            'super_franchisee_price_pct',
            'franchisee_price_pct',
            'sub_franchise_price_pct',
            'super_franchisee_commission_pct',
            'franchisee_commission_pct',
            'sub_franchise_commission_pct',
        )
        for field in percent_fields:
            if field not in attrs:
                continue
            value = attrs[field]
            if value is None:
                continue
            if value < 0 or value > 100:
                raise serializers.ValidationError({field: 'Rate must be between 0 and 100.'})
        return attrs


class ZoneFranchiseRateBulkItemSerializer(serializers.Serializer):
    zone_id = serializers.IntegerField()
    super_franchisee_price_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    franchisee_price_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    sub_franchise_price_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    super_franchisee_commission_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    franchisee_commission_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    sub_franchise_commission_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        for field, value in list(attrs.items()):
            if field in {'zone_id', 'is_active'}:
                continue
            if value < 0 or value > 100:
                raise serializers.ValidationError({field: 'Rate must be between 0 and 100.'})
        return attrs


class ZoneFranchiseRateBulkSerializer(serializers.Serializer):
    rates = ZoneFranchiseRateBulkItemSerializer(many=True)


class FranchisePricingOverrideSerializer(serializers.ModelSerializer):
    zone_id = serializers.IntegerField(required=False)
    set_by_id = serializers.IntegerField(source='set_by.id', read_only=True)
    set_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FranchisePricingOverride
        fields = (
            'id',
            'zone_id',
            'set_by_id',
            'set_by_name',
            'target_role',
            'price_pct_of_mrp',
            'commission_pct',
            'is_active',
            'updated_at',
        )
        read_only_fields = ('id', 'set_by_id', 'set_by_name', 'updated_at')

    def get_set_by_name(self, obj):
        if not obj.set_by_id:
            return ''
        return obj.set_by.display_name or obj.set_by.username

    def validate(self, attrs):
        price = attrs.get('price_pct_of_mrp')
        if price is not None and (price < 0 or price > 100):
            raise serializers.ValidationError({'price_pct_of_mrp': 'Must be between 0 and 100.'})
        commission = attrs.get('commission_pct')
        if commission is not None and (commission < 0 or commission > 100):
            raise serializers.ValidationError({'commission_pct': 'Must be between 0 and 100.'})
        return attrs


class WalletTopUpSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_user_id(self, value):
        user = User.objects.filter(pk=value, is_active=True).first()
        if not user or user.role not in User.FRANCHISE_ROLES:
            raise serializers.ValidationError('user_id must be an active franchise user.')
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value


class FranchiseTestRateItemSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    rate_pct = serializers.DecimalField(max_digits=6, decimal_places=2)

    def validate_rate_pct(self, value):
        if value < 0 or value > 999:
            raise serializers.ValidationError('Rate must be between 0 and 999.')
        return value


class FranchiseTestRateBulkSerializer(serializers.Serializer):
    franchise_user_id = serializers.IntegerField()
    rates = FranchiseTestRateItemSerializer(many=True)
    apply_all_pct = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True,
    )

    def validate_franchise_user_id(self, value):
        user = User.objects.filter(pk=value, is_active=True).first()
        if not user or user.role not in User.FRANCHISE_ROLES:
            raise serializers.ValidationError('Select an active franchise account.')
        return value


class FranchiseTestRateTransferSerializer(serializers.Serializer):
    from_franchise_user_id = serializers.IntegerField()
    to_franchise_user_id = serializers.IntegerField()
    copy_all = serializers.BooleanField(default=True)
    test_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

    def validate_from_franchise_user_id(self, value):
        user = User.objects.filter(pk=value, is_active=True).first()
        if not user or user.role not in User.FRANCHISE_ROLES:
            raise serializers.ValidationError('Select an active source franchise account.')
        return value

    def validate_to_franchise_user_id(self, value):
        user = User.objects.filter(pk=value, is_active=True).first()
        if not user or user.role not in User.FRANCHISE_ROLES:
            raise serializers.ValidationError('Select an active target franchise account.')
        return value


class FranchiseWalletSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    role = serializers.CharField(source='user.role', read_only=True)
    role_label = serializers.SerializerMethodField()
    zone_name = serializers.SerializerMethodField()

    class Meta:
        model = FranchiseWallet
        fields = (
            'id',
            'user_id',
            'username',
            'display_name',
            'role',
            'role_label',
            'zone_name',
            'balance',
            'currency',
            'is_active',
            'updated_at',
            'created_at',
        )

    def get_zone_name(self, obj):
        zone = getattr(obj.user, 'zone', None)
        return zone.name if zone else ''

    def get_display_name(self, obj):
        return obj.user.display_name or obj.user.username

    def get_role_label(self, obj):
        return obj.user.get_role_display()


class WalletTransactionSerializer(serializers.ModelSerializer):
    wallet_user_id = serializers.IntegerField(source='wallet.user_id', read_only=True)
    wallet_username = serializers.CharField(source='wallet.user.username', read_only=True)
    wallet_role = serializers.CharField(source='wallet.user.role', read_only=True)
    source_username = serializers.SerializerMethodField()
    lab_code = serializers.SerializerMethodField()

    class Meta:
        model = WalletTransaction
        fields = (
            'id',
            'wallet',
            'wallet_user_id',
            'wallet_username',
            'wallet_role',
            'txn_type',
            'direction',
            'amount',
            'balance_after',
            'commission_rate_pct',
            'base_amount',
            'beneficiary_role',
            'batch_key',
            'description',
            'registration',
            'lab_code',
            'source_user',
            'source_username',
            'created_by',
            'metadata',
            'created_at',
        )

    def get_source_username(self, obj):
        if not obj.source_user_id:
            return ''
        return obj.source_user.display_name or obj.source_user.username

    def get_lab_code(self, obj):
        if obj.registration_id:
            return obj.registration.lab_code
        return (obj.metadata or {}).get('lab_code', '')


class DemoWalletTransactionSerializer(serializers.Serializer):
    actor_id = serializers.IntegerField(required=False)
    base_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_actor_id(self, value):
        user = User.objects.filter(pk=value, is_active=True).first()
        if not user or user.role not in User.FRANCHISE_ROLES:
            raise serializers.ValidationError('actor_id must be an active franchise user.')
        return value

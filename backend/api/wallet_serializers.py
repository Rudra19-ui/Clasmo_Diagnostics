from rest_framework import serializers

from .models import FranchiseCommissionConfig, FranchiseWallet, User, WalletTransaction


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


class FranchiseWalletSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    role = serializers.CharField(source='user.role', read_only=True)
    role_label = serializers.SerializerMethodField()

    class Meta:
        model = FranchiseWallet
        fields = (
            'id',
            'user_id',
            'username',
            'display_name',
            'role',
            'role_label',
            'balance',
            'currency',
            'is_active',
            'updated_at',
            'created_at',
        )

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

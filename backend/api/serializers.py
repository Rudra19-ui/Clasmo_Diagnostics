from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers

from .role_permissions import ALL_PERMISSION_KEYS, ROLE_PERMISSION_SCHEMA

from .models import (
    LabMessage,
    LabRole,
    Membership,
    MembershipType,
    Patient,
    PickupRequest,
    Registration,
    RegistrationTest,
    ReportFormatAsset,
    Test,
    TestCategory,
    TestPackage,
    User,
    CollectionCenter,
    CollectionCenterBoy,
    Area,
    RateMaster,
    DiscountReason,
    DiscountAuthority,
    WhatsAppMessageLog,
    ExpenseType,
    Affiliation,
    SalesReference,
    Doctor,
    PatientAddress,
    LabConfiguration,
    ServiceAreaPincode,
    LabActivity,
    JoinRequest,
    SelfPatientQuery,
    PatientSampleBarcode,
)


class UserSerializer(serializers.ModelSerializer):
    parent_franchisee_id = serializers.IntegerField(source='parent_franchisee.id', read_only=True, allow_null=True)
    parent_franchisee_name = serializers.SerializerMethodField()
    parent_franchisee_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'role', 'display_name', 'mobile', 'lab_code',
            'is_active', 'save_credentials', 'save_info', 'last_login',
            'parent_franchisee_id', 'parent_franchisee_name', 'parent_franchisee_role',
        ]
        read_only_fields = ['last_login']

    def get_parent_franchisee_name(self, obj):
        parent = obj.parent_franchisee
        if not parent:
            return ''
        return parent.display_name or parent.username

    def get_parent_franchisee_role(self, obj):
        parent = obj.parent_franchisee
        return parent.role if parent else ''


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=100)
    mobile = serializers.CharField(max_length=20)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default=User.ROLE_USER)
    parent_franchisee_id = serializers.IntegerField(required=False, allow_null=True)

    def _actor(self):
        return self.context.get('actor') or self.context.get('request') and self.context['request'].user

    def validate_role(self, value):
        actor = self._actor()
        allowed = set()
        if actor and actor.is_authenticated:
            if actor.is_superuser or actor.role == User.ROLE_ADMIN:
                allowed = {choice[0] for choice in User.ROLE_CHOICES}
            elif actor.role == User.ROLE_SUPER_FRANCHISEE:
                allowed = {User.ROLE_FRANCHISEE, User.ROLE_SUB_FRANCHISE}
            elif actor.role == User.ROLE_FRANCHISEE:
                allowed = {User.ROLE_SUB_FRANCHISE}
            elif actor.role == User.ROLE_HR:
                allowed = {
                    User.ROLE_USER,
                    User.ROLE_RECEPTIONIST,
                    User.ROLE_TECHNICIAN,
                    User.ROLE_PATHOLOGIST,
                }
        else:
            allowed = set(User.SIGNUP_ROLES)

        if value not in allowed:
            raise serializers.ValidationError(
                'You do not have permission to create this user type.'
            )
        return value

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError('Username is required.')
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError('This username is already taken.')
        return username

    def validate_full_name(self, value):
        cleaned = (value or '').strip()
        if not cleaned:
            raise serializers.ValidationError('Full name is required.')
        return cleaned

    def validate_mobile(self, value):
        cleaned = (value or '').strip()
        if not cleaned:
            raise serializers.ValidationError('Mobile number is required.')
        digits = ''.join(ch for ch in cleaned if ch.isdigit())
        if len(digits) < 10:
            raise serializers.ValidationError('Enter a valid 10-digit mobile number.')
        return cleaned

    def validate(self, attrs):
        role = attrs.get('role', User.ROLE_USER)
        parent_id = attrs.get('parent_franchisee_id')
        actor = self._actor()

        if role in User.PARENT_REQUIRED_ROLES:
            if not parent_id and actor and actor.is_authenticated:
                # Default parent to the creating supervisor when omitted.
                if role == User.ROLE_FRANCHISEE and actor.role == User.ROLE_SUPER_FRANCHISEE:
                    parent_id = actor.id
                elif role == User.ROLE_SUB_FRANCHISE and actor.role in {
                    User.ROLE_FRANCHISEE,
                    User.ROLE_SUPER_FRANCHISEE,
                }:
                    parent_id = actor.id if actor.role == User.ROLE_FRANCHISEE else parent_id

            if not parent_id:
                label = 'Supreme' if role == User.ROLE_FRANCHISEE else 'Prime'
                raise serializers.ValidationError({
                    'parent_franchisee_id': f'Select a parent {label} for this account.',
                })
            try:
                parent = User.objects.get(pk=parent_id, is_active=True)
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_franchisee_id': 'Selected parent account was not found.',
                })

            expected_parent_role = (
                User.ROLE_SUPER_FRANCHISEE
                if role == User.ROLE_FRANCHISEE
                else User.ROLE_FRANCHISEE
            )
            if parent.role != expected_parent_role:
                raise serializers.ValidationError({
                    'parent_franchisee_id': (
                        f'Parent must be a {dict(User.ROLE_CHOICES).get(expected_parent_role)}.'
                    ),
                })
            attrs['parent_franchisee'] = parent
        else:
            attrs['parent_franchisee'] = None
            attrs['parent_franchisee_id'] = None

        return attrs

    def create(self, validated_data):
        parent = validated_data.pop('parent_franchisee', None)
        validated_data.pop('parent_franchisee_id', None)
        role = validated_data.get('role', User.ROLE_USER)
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            display_name=validated_data['full_name'],
            mobile=validated_data['mobile'],
            role=role,
            parent_franchisee=parent,
            is_staff=(role == User.ROLE_ADMIN),
        )
        return user


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    parent_franchisee_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['role', 'parent_franchisee_id']

    def validate_role(self, value):
        valid_roles = {choice[0] for choice in User.ROLE_CHOICES}
        if value not in valid_roles:
            raise serializers.ValidationError('Invalid role selected.')
        return value

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', User.ROLE_USER))
        parent_id = attrs.get('parent_franchisee_id', serializers.empty)
        if parent_id is serializers.empty:
            parent = getattr(self.instance, 'parent_franchisee', None)
            parent_id = parent.id if parent else None

        if role in User.PARENT_REQUIRED_ROLES:
            if not parent_id:
                label = 'Supreme' if role == User.ROLE_FRANCHISEE else 'Prime'
                raise serializers.ValidationError({
                    'parent_franchisee_id': f'Select a parent {label} for this account.',
                })
            try:
                parent = User.objects.get(pk=parent_id, is_active=True)
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_franchisee_id': 'Selected parent account was not found.',
                })
            expected_parent_role = (
                User.ROLE_SUPER_FRANCHISEE
                if role == User.ROLE_FRANCHISEE
                else User.ROLE_FRANCHISEE
            )
            if parent.role != expected_parent_role:
                raise serializers.ValidationError({
                    'parent_franchisee_id': (
                        f'Parent must be a {dict(User.ROLE_CHOICES).get(expected_parent_role)}.'
                    ),
                })
            if self.instance and parent.id == self.instance.id:
                raise serializers.ValidationError({
                    'parent_franchisee_id': 'A user cannot be their own parent.',
                })
            attrs['parent_franchisee'] = parent
        else:
            attrs['parent_franchisee'] = None

        attrs.pop('parent_franchisee_id', None)
        return attrs

    def update(self, instance, validated_data):
        instance.role = validated_data.get('role', instance.role)
        if 'parent_franchisee' in validated_data:
            instance.parent_franchisee = validated_data['parent_franchisee']
        instance.save()
        return instance


class LabRoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    permission_schema = serializers.SerializerMethodField()

    class Meta:
        model = LabRole
        fields = [
            'id', 'code', 'name', 'description', 'permissions',
            'is_system', 'user_count', 'permission_schema', 'updated_at',
        ]
        read_only_fields = ['code', 'is_system', 'user_count', 'permission_schema', 'updated_at']

    def get_user_count(self, obj):
        return User.objects.filter(role=obj.code).count()

    def get_permission_schema(self, obj):
        return ROLE_PERMISSION_SCHEMA

    def validate_permissions(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Permissions must be an object.')
        cleaned = {}
        for key in ALL_PERMISSION_KEYS:
            cleaned[key] = bool(value.get(key, False))
        return cleaned


class LabRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabRole
        fields = ['name', 'description', 'permissions']

    def validate_permissions(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Permissions must be an object.')
        cleaned = {}
        for key in ALL_PERMISSION_KEYS:
            cleaned[key] = bool(value.get(key, False))
        return cleaned


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs['username'].strip()
        user = authenticate(username=username, password=attrs['password'])
        if not user:
            user = authenticate(username=username.lower(), password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account is disabled. Contact your administrator.')
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'New password must be different from old password.'})
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class TestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCategory
        fields = ['id', 'name']


class TestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)

    class Meta:
        model = Test
        fields = [
            'id', 'name', 'short_name', 'test_code', 'mrp', 'price',
            'sample_type', 'tat', 'volume_ml', 'category', 'category_name',
        ]


class TestPackageSerializer(serializers.ModelSerializer):
    test_count = serializers.SerializerMethodField()
    test_names = serializers.SerializerMethodField()

    class Meta:
        model = TestPackage
        fields = [
            'id', 'name', 'description', 'is_active', 'test_count',
            'test_names', 'sort_order', 'created_at',
        ]

    def get_test_count(self, obj):
        return obj.tests.count()

    def get_test_names(self, obj):
        return list(obj.tests.order_by('name').values_list('name', flat=True))


class ReportFormatAssetSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportFormatAsset
        fields = [
            'id', 'title', 'description', 'file', 'file_url', 'external_url',
            'file_type', 'is_demo', 'is_active', 'sort_order', 'created_at',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return obj.external_url or ''


class RegistrationTestSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)
    sample_type = serializers.CharField(source='test.sample_type', read_only=True)
    mrp = serializers.DecimalField(source='test.mrp', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = RegistrationTest
        fields = ['id', 'test', 'test_name', 'sample_type', 'mrp', 'price', 'discount', 'refund']


class PatientAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAddress
        fields = [
            'id', 'address_line1', 'address_line2', 'address_line3', 'country', 'state',
            'city', 'pincode', 'address_type', 'is_default', 'sort_order',
        ]
        read_only_fields = ['id']


class PatientMasterSerializer(serializers.ModelSerializer):
    addresses = PatientAddressSerializer(many=True, required=False)
    display_name = serializers.SerializerMethodField()
    family_doctor_name = serializers.SerializerMethodField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    age = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'medical_record_no', 'bar_code', 'title', 'first_name', 'middle_name', 'last_name',
            'short_name', 'display_name', 'patient_name', 'gender', 'gender_display', 'age', 'age_unit',
            'date_of_birth', 'marital_status', 'blood_group', 'family_doctor', 'family_doctor_name',
            'religion', 'telephone_office', 'telephone_residence', 'mobile', 'primary_tel_type',
            'send_result_sms', 'email', 'email2', 'master_comment', 'addresses',
            'insurance_id', 'insurance_company', 'insurance_start_date', 'insurance_expiry_date',
            'other_data_comment', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'display_name', 'patient_name', 'family_doctor_name', 'gender_display']

    def get_display_name(self, obj):
        return obj.display_name

    def get_family_doctor_name(self, obj):
        if obj.family_doctor_id:
            return obj.family_doctor.full_name
        return obj.doctor_name or ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.age_unit == 'month':
            data['age'] = instance.age_months
        elif instance.age_unit == 'day':
            data['age'] = instance.age_days
        else:
            data['age'] = instance.age_years
        return data

    def validate(self, attrs):
        instance = self.instance
        medical_record_no = attrs.get('medical_record_no', getattr(instance, 'medical_record_no', ''))
        title = attrs.get('title', getattr(instance, 'title', ''))
        first_name = attrs.get('first_name', getattr(instance, 'first_name', ''))
        last_name = attrs.get('last_name', getattr(instance, 'last_name', ''))
        gender = attrs.get('gender', getattr(instance, 'gender', ''))
        mobile = attrs.get('mobile', getattr(instance, 'mobile', ''))
        email = attrs.get('email', getattr(instance, 'email', ''))
        primary_tel_type = attrs.get('primary_tel_type', getattr(instance, 'primary_tel_type', ''))
        family_doctor = attrs.get('family_doctor', getattr(instance, 'family_doctor', None))
        age = self.initial_data.get('age', getattr(instance, 'age_years', None) if instance else None)

        if not (medical_record_no or '').strip():
            raise serializers.ValidationError({'medical_record_no': 'Medical record number is required.'})
        if not (title or '').strip():
            raise serializers.ValidationError({'title': 'Title is required.'})
        if not (first_name or '').strip():
            raise serializers.ValidationError({'first_name': 'First name is required.'})
        if not (last_name or '').strip():
            raise serializers.ValidationError({'last_name': 'Last name is required.'})
        if not (gender or '').strip():
            raise serializers.ValidationError({'gender': 'Sex is required.'})
        if age in (None, ''):
            raise serializers.ValidationError({'age': 'Age is required.'})
        if not family_doctor:
            raise serializers.ValidationError({'family_doctor': 'Family doctor is required.'})
        if not (mobile or '').strip():
            raise serializers.ValidationError({'mobile': 'Telephone mobile is required.'})
        if not (primary_tel_type or '').strip():
            raise serializers.ValidationError({'primary_tel_type': 'Primary tel type is required.'})
        if not (email or '').strip():
            raise serializers.ValidationError({'email': 'Email ID 1 is required.'})
        return attrs

    def _apply_age(self, validated_data):
        age_value = validated_data.pop('age', None)
        if age_value is None:
            age_value = self.initial_data.get('age')
        try:
            age_value = int(age_value)
        except (TypeError, ValueError):
            age_value = 0
        unit = validated_data.get('age_unit', 'yr')
        validated_data['age_years'] = 0
        validated_data['age_months'] = 0
        validated_data['age_days'] = 0
        if unit == 'month':
            validated_data['age_months'] = age_value
        elif unit == 'day':
            validated_data['age_days'] = age_value
        else:
            validated_data['age_years'] = age_value

    def _sync_addresses(self, patient, addresses_data):
        patient.addresses.all().delete()
        for index, address_data in enumerate(addresses_data):
            address_data = dict(address_data)
            address_data.pop('id', None)
            PatientAddress.objects.create(patient=patient, sort_order=index, **address_data)

    def create(self, validated_data):
        addresses_data = validated_data.pop('addresses', [])
        self._apply_age(validated_data)
        patient = Patient.objects.create(**validated_data)
        patient.sync_computed_fields()
        patient.save()
        self._sync_addresses(patient, addresses_data)
        patient.sync_computed_fields()
        patient.save()
        return patient

    def update(self, instance, validated_data):
        addresses_data = validated_data.pop('addresses', None)
        self._apply_age(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.sync_computed_fields()
        instance.save()
        if addresses_data is not None:
            self._sync_addresses(instance, addresses_data)
            instance.sync_computed_fields()
            instance.save()
        return instance


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'patient_type', 'title', 'patient_name', 'gender', 'address', 'city',
            'email', 'mobile', 'patient_id', 'date_of_birth', 'age_years', 'age_months',
            'age_days', 'doctor_name', 'affiliation', 'collection_center', 'sample_collected_at',
            'collection_round_boy', 'send_result_sms', 'is_register', 'home_collection',
        ]


class RegistrationSerializer(serializers.ModelSerializer):
    patient = PatientSerializer()
    tests = RegistrationTestSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.patient_name', read_only=True)
    test_names = serializers.SerializerMethodField()
    reg_date = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    edit_expires_at = serializers.SerializerMethodField()
    hours_left = serializers.SerializerMethodField()

    class Meta:
        model = Registration
        fields = [
            'id', 'lab_code', 'patient', 'patient_name', 'registration_date', 'collection_date',
            'status', 'comment', 'urgency', 'discount_test', 'discount_regn', 'discount_type',
            'discount_reason', 'discount_authorization', 'payment_method', 'total',
            'visiting_charges', 'net_amount', 'paid', 'balance', 'refund_amount',
            'recovery_amount', 'bill_receipt_no', 'tests', 'test_names', 'reg_date',
            'can_edit', 'edit_expires_at', 'hours_left',
        ]
        read_only_fields = ['lab_code', 'total', 'net_amount', 'balance']

    def get_test_names(self, obj):
        return ', '.join(t.test.name for t in obj.tests.all())

    def get_reg_date(self, obj):
        return obj.registration_date.strftime('%d-%m-%Y')

    def get_can_edit(self, obj):
        from .registration_edit import can_edit_registration
        return can_edit_registration(obj)

    def get_edit_expires_at(self, obj):
        from .registration_edit import registration_edit_deadline
        return registration_edit_deadline(obj).isoformat()

    def get_hours_left(self, obj):
        from .registration_edit import registration_edit_hours_left
        return registration_edit_hours_left(obj)

    def create(self, validated_data):
        patient_data = validated_data.pop('patient')
        tests_data = self.context.get('tests_data', [])
        patient = Patient.objects.create(**patient_data)
        registration = Registration.objects.create(patient=patient, **validated_data)
        self._sync_tests(registration, tests_data)
        registration.refresh_from_db()
        return registration

    def update(self, instance, validated_data):
        patient_data = validated_data.pop('patient', None)
        tests_data = self.context.get('tests_data')

        if patient_data:
            for attr, value in patient_data.items():
                setattr(instance.patient, attr, value)
            instance.patient.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tests_data is not None:
            instance.tests.all().delete()
            self._sync_tests(instance, tests_data)

        instance.refresh_from_db()
        return instance

    def _sync_tests(self, registration, tests_data):
        if not tests_data:
            registration.total = 0
            registration.net_amount = float(registration.visiting_charges)
            registration.balance = registration.net_amount - float(registration.paid)
            registration.save()
            return

        test_ids = [item['test_id'] for item in tests_data]
        tests_by_id = {test.id: test for test in Test.objects.filter(id__in=test_ids)}

        total = 0
        registration_tests = []
        for item in tests_data:
            test = tests_by_id[item['test_id']]
            price = item.get('price', test.price)
            registration_tests.append(
                RegistrationTest(
                    registration=registration,
                    test=test,
                    price=price,
                    discount=item.get('discount', 0),
                    refund=item.get('refund', 0),
                )
            )
            total += float(price)

        RegistrationTest.objects.bulk_create(registration_tests)
        discount_total = float(registration.discount_test) + float(registration.discount_regn)
        registration.total = total
        registration.net_amount = total + float(registration.visiting_charges) - discount_total
        registration.balance = registration.net_amount - float(registration.paid)
        registration.save()


class SampleBarcodeInputSerializer(serializers.Serializer):
    sample_type = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    barcode = serializers.CharField(max_length=100)
    confirm_barcode = serializers.CharField(max_length=100)
    test_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
    )


class PatientSampleBarcodeSerializer(serializers.ModelSerializer):
    patient_id = serializers.CharField(source='patient.patient_id', read_only=True)
    patient_name = serializers.SerializerMethodField()
    lab_code = serializers.CharField(source='registration.lab_code', read_only=True, default='')
    linked_by_name = serializers.CharField(source='linked_by.display_name', read_only=True, default='')

    class Meta:
        model = PatientSampleBarcode
        fields = [
            'id', 'barcode', 'patient', 'patient_id', 'patient_name', 'registration', 'lab_code',
            'sample_type', 'is_active', 'linked_by', 'linked_by_name', 'linked_at', 'updated_at',
        ]
        read_only_fields = ['id', 'linked_at', 'updated_at', 'linked_by']

    def get_patient_name(self, obj):
        return f'{obj.patient.title} {obj.patient.patient_name}'.strip()


class PatientBarcodeLinkSerializer(serializers.Serializer):
    patient_id = serializers.CharField(required=False, allow_blank=True, default='')
    lab_code = serializers.CharField(required=False, allow_blank=True, default='')
    registration_id = serializers.IntegerField(required=False, allow_null=True)
    barcodes = SampleBarcodeInputSerializer(many=True)


class RegistrationCreateSerializer(serializers.Serializer):
    patient = PatientSerializer()
    comment = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.BooleanField(required=False, default=False)
    discount_test = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    discount_regn = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    discount_type = serializers.CharField(required=False, default='Amt')
    discount_reason = serializers.CharField(required=False, allow_blank=True, default='')
    discount_authorization = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.CharField(required=False, default='cash')
    visiting_charges = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    paid = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    refund_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    recovery_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    bill_receipt_no = serializers.CharField(required=False, allow_blank=True, default='')
    tests = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    sample_barcodes = SampleBarcodeInputSerializer(many=True, required=False, default=list)
    registration_barcode = serializers.CharField(required=False, allow_blank=True, default='')


class RegistrationSearchSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    tests = RegistrationTestSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.patient_name', read_only=True)
    patient_display = serializers.SerializerMethodField()
    barcodes = serializers.SerializerMethodField()
    ref_by = serializers.SerializerMethodField()
    tests_list = serializers.SerializerMethodField()
    report_progress = serializers.SerializerMethodField()
    test = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source='net_amount', max_digits=10, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(source='net_amount', max_digits=10, decimal_places=2, read_only=True)
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default='')
    can_edit = serializers.SerializerMethodField()
    edit_expires_at = serializers.SerializerMethodField()
    hours_left = serializers.SerializerMethodField()

    class Meta:
        model = Registration
        fields = [
            'id', 'lab_code', 'patient', 'patient_name', 'patient_display', 'tests', 'tests_list',
            'barcodes', 'ref_by', 'report_progress', 'test', 'date',
            'status', 'amount', 'total_amount', 'total', 'net_amount', 'paid', 'balance',
            'discount_test', 'discount_regn', 'refund_amount', 'payment_method', 'bill_receipt_no',
            'registration_date', 'collection_date', 'created_at', 'created_by_name', 'created_by_username',
            'can_edit', 'edit_expires_at', 'hours_left',
        ]

    def get_patient_display(self, obj):
        patient = obj.patient
        title = (patient.title or '').strip()
        name = (patient.patient_name or '').strip()
        years = patient.age_years or 0
        gender = 'F' if patient.gender == 'female' else 'M' if patient.gender == 'male' else ''
        age_part = f'{years}Y/{gender}' if gender else f'{years}Y'
        label = f'{title} {name}'.strip()
        return f'{label} ({age_part})' if label else age_part

    def get_barcodes(self, obj):
        codes = [
            item.barcode
            for item in obj.linked_barcodes.all()
            if item.is_active and item.barcode
        ]
        return ','.join(codes)

    def get_ref_by(self, obj):
        doctor = (obj.patient.doctor_name or '').strip()
        return doctor if doctor else 'Self'

    def get_tests_list(self, obj):
        return [reg_test.test.name for reg_test in obj.tests.all() if reg_test.test_id]

    def get_report_progress(self, obj):
        from .models import Registration, Report

        total = obj.tests.count()
        if total == 0:
            return '0/0'
        if obj.status in (Registration.STATUS_RESULT_READY, Registration.STATUS_PRINTED):
            return f'{total}/{total}'

        report = getattr(obj, 'clinical_report', None)
        if report and report.status == Report.STATUS_VERIFIED:
            return f'{total}/{total}'
        if report and report.status == Report.STATUS_ENTERED:
            test_ids_with_values = set(
                report.values.values_list('parameter__test_id', flat=True).distinct()
            )
            completed = sum(
                1 for reg_test in obj.tests.all() if reg_test.test_id in test_ids_with_values
            )
            return f'{completed}/{total}'
        return f'0/{total}'

    def get_test(self, obj):
        names = [t.test.name for t in obj.tests.all()]
        return names[0] if names else ''

    def get_date(self, obj):
        return obj.registration_date.strftime('%d-%m-%Y')

    def get_can_edit(self, obj):
        from .registration_edit import can_edit_registration
        return can_edit_registration(obj)

    def get_edit_expires_at(self, obj):
        from .registration_edit import registration_edit_deadline
        return registration_edit_deadline(obj).isoformat()

    def get_hours_left(self, obj):
        from .registration_edit import registration_edit_hours_left
        return registration_edit_hours_left(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        names = [t.test.name for t in instance.tests.all()]
        data['test_names'] = ', '.join(names)
        return data


class PickupRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupRequest
        fields = ['id', 'patient_name', 'mobile', 'address', 'pickup_date', 'created_at']
        read_only_fields = ['created_at']


class LabMessageSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')
    created_at_display = serializers.SerializerMethodField()

    class Meta:
        model = LabMessage
        fields = ['id', 'message', 'created_by_name', 'created_at', 'created_at_display']
        read_only_fields = ['created_at', 'created_at_display']

    def get_created_at_display(self, obj):
        if not obj.created_at:
            return '-'
        return obj.created_at.strftime('%d-%b-%y %I:%M %p')


class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ['id', 'name', 'duration_months', 'description']


class MembershipSerializer(serializers.ModelSerializer):
    membership_type_name = serializers.CharField(source='membership_type.name', read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')

    class Meta:
        model = Membership
        fields = [
            'id', 'patient_name', 'membership_type', 'membership_type_name',
            'profile_image', 'profile_image_url', 'membership_validation',
            'membership_number', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['membership_number', 'created_at', 'profile_image_url', 'created_by_name']

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None
        request = self.context.get('request')
        url = obj.profile_image.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate_membership_type(self, value):
        if not value.is_active:
            raise serializers.ValidationError('Selected membership type is not active.')
        return value


class CollectionCenterSerializer(serializers.ModelSerializer):
    center_type_display = serializers.CharField(source='get_center_type_display', read_only=True)
    party_type_display = serializers.CharField(source='get_party_type_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    billing_type_display = serializers.CharField(source='get_billing_type_display', read_only=True)

    class Meta:
        model = CollectionCenter
        fields = [
            'id', 'name', 'center_type', 'center_type_display', 'party_type', 'party_type_display',
            'is_default', 'has_result_sms', 'report_print_exception', 'comment', 'mobile', 'email',
            'address_line1', 'address_line2', 'address_line3', 'country', 'state', 'city', 'area',
            'pincode', 'voucher_type', 'ledger_name', 'labcode_short_name', 'labcode', 'labcode_start',
            'frequency', 'frequency_display', 'auto_increment', 'rate_master',
            'credit_balance', 'credit_limit', 'invoice_payment_period_days',
            'billing_type', 'billing_type_display', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'center_type_display', 'party_type_display',
            'frequency_display', 'billing_type_display',
        ]

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', ''))
        center_type = attrs.get('center_type', getattr(self.instance, 'center_type', ''))
        address_line1 = attrs.get('address_line1', getattr(self.instance, 'address_line1', ''))

        if not (name or '').strip():
            raise serializers.ValidationError({'name': 'Collection center name is required.'})
        if not (center_type or '').strip():
            raise serializers.ValidationError({'center_type': 'Type is required.'})
        if not (address_line1 or '').strip():
            raise serializers.ValidationError({'address_line1': 'Address line 1 is required.'})
        return attrs


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'name']


class RateMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RateMaster
        fields = ['id', 'name']


class CollectionCenterBoySerializer(serializers.ModelSerializer):
    collection_center_name = serializers.CharField(source='collection_center.name', read_only=True)
    sex = serializers.CharField(source='get_gender_display', read_only=True)

    class Meta:
        model = CollectionCenterBoy
        fields = [
            'id', 'first_name', 'middle_name', 'last_name', 'short_name',
            'age', 'gender', 'sex', 'email', 'mobile', 'address',
            'collection_center', 'collection_center_name', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'collection_center_name', 'sex']


class DiscountReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountReason
        fields = ['id', 'reason', 'comment', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class WhatsAppMessageLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='sent_by.username', read_only=True, default='')
    message_date = serializers.DateTimeField(format='%d-%m-%Y %H:%M:%S', read_only=True)

    class Meta:
        model = WhatsAppMessageLog
        fields = [
            'id', 'message_date', 'lab_code', 'patient_name', 'mobile_no',
            'referred_by', 'user', 'status', 'message_text',
        ]


class DoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    default_contact_display = serializers.CharField(source='get_default_contact_display', read_only=True)
    address_type_display = serializers.CharField(source='get_address_type_display', read_only=True)

    class Meta:
        model = Doctor
        fields = [
            'id', 'registration_number', 'first_name', 'middle_name', 'last_name', 'short_name',
            'full_name', 'gender', 'gender_display', 'age', 'date_of_birth', 'specialization',
            'telephone_office', 'telephone_residence', 'mobile', 'default_contact',
            'default_contact_display', 'email', 'alternate_email', 'address_line1', 'address_line2',
            'address_line3', 'country', 'state', 'city', 'pincode', 'address_type',
            'address_type_display', 'is_default_address', 'affiliation', 'sales_reference',
            'commission_applicable', 'is_postpaid', 'invoice_payment_period_days', 'credit_limit',
            'communication_language', 'comment', 'report_print_exception', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'full_name', 'gender_display',
            'default_contact_display', 'address_type_display',
        ]

    def validate(self, attrs):
        registration_number = attrs.get(
            'registration_number', getattr(self.instance, 'registration_number', '')
        )
        first_name = attrs.get('first_name', getattr(self.instance, 'first_name', ''))
        last_name = attrs.get('last_name', getattr(self.instance, 'last_name', ''))
        mobile = attrs.get('mobile', getattr(self.instance, 'mobile', ''))
        email = attrs.get('email', getattr(self.instance, 'email', ''))
        address_line1 = attrs.get('address_line1', getattr(self.instance, 'address_line1', ''))
        age = attrs.get('age', getattr(self.instance, 'age', None))

        if not (registration_number or '').strip():
            raise serializers.ValidationError({'registration_number': 'Registration number is required.'})
        if not (first_name or '').strip():
            raise serializers.ValidationError({'first_name': 'First name is required.'})
        if not (last_name or '').strip():
            raise serializers.ValidationError({'last_name': 'Last name is required.'})
        if age is None:
            raise serializers.ValidationError({'age': 'Age is required.'})
        if not (mobile or '').strip():
            raise serializers.ValidationError({'mobile': 'Mobile is required.'})
        if not (email or '').strip():
            raise serializers.ValidationError({'email': 'Email is required.'})
        if not (address_line1 or '').strip():
            raise serializers.ValidationError({'address_line1': 'Address line 1 is required.'})
        return attrs

    def get_full_name(self, obj):
        return obj.full_name


class AffiliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Affiliation
        fields = ['id', 'name']


class SalesReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesReference
        fields = ['id', 'name']


class LabActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, default='')
    completed_at_display = serializers.SerializerMethodField()

    class Meta:
        model = LabActivity
        fields = [
            'id', 'title', 'description', 'creation_date', 'activity_date', 'activity_type',
            'activity_type_display', 'eta', 'remark', 'notes', 'status', 'status_display',
            'completed_at', 'completed_at_display', 'is_active', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'activity_type_display', 'status_display',
            'created_by_name', 'completed_at_display', 'activity_date',
        ]

    def get_completed_at_display(self, obj):
        if not obj.completed_at:
            return '-'
        return obj.completed_at.strftime('%d-%b-%y %I:%M %p')

    def validate_title(self, value):
        if not (value or '').strip():
            raise serializers.ValidationError('Title is required.')
        return value.strip()

    def validate_creation_date(self, value):
        if not (value or '').strip():
            raise serializers.ValidationError('Creation date is required.')
        return value.strip()

    def update(self, instance, validated_data):
        status = validated_data.get('status', instance.status)
        if status == LabActivity.STATUS_COMPLETED and not instance.completed_at:
            validated_data['completed_at'] = timezone.now()
        if status == LabActivity.STATUS_PENDING:
            validated_data['completed_at'] = None
        return super().update(instance, validated_data)


class ServiceAreaPincodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceAreaPincode
        fields = ['id', 'pincode', 'created_at']
        read_only_fields = ['created_at']

    def validate_pincode(self, value):
        pincode = (value or '').strip()
        if not pincode:
            raise serializers.ValidationError('Pincode is required.')
        if not pincode.isdigit():
            raise serializers.ValidationError('Pincode must contain digits only.')
        return pincode


class LabConfigurationSerializer(serializers.ModelSerializer):
    lab_qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = LabConfiguration
        fields = [
            'id', 'sms_to_patient', 'sms_to_doctor', 'sms_to_lab', 'sms_to_lab_mobile',
            'sms_to_other', 'sms_to_other_mobile', 'sms_to_pathologist_appointment',
            'sms_to_pathologist_mobile', 'sms_to_collection_center', 'sms_to_affiliation',
            'email_to_patient', 'email_to_doctor', 'email_to_lab', 'email_to_lab_address',
            'email_to_collection_center', 'email_to_affiliation',
            'whatsapp_to_patient', 'whatsapp_to_doctor', 'whatsapp_to_affiliation',
            'whatsapp_to_autorelease',
            'lab_code_prefix', 'lab_code_start', 'lab_code_frequency', 'lab_code_auto_increment',
            'report_show_header', 'report_show_footer', 'allow_print_without_approve',
            'reprint_report_roles', 'test_auto_approval', 'auto_registration_transfer',
            'mera_batuva_token_id', 'mera_batuva_instance_id', 'lab_qr_code', 'lab_qr_code_url',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at', 'lab_qr_code_url']

    def get_lab_qr_code_url(self, obj):
        if not obj.lab_qr_code:
            return ''
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.lab_qr_code.url)
        return obj.lab_qr_code.url


class ExpenseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseType
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class DiscountAuthoritySerializer(serializers.ModelSerializer):
    authorization_uid = serializers.CharField(source='authorized_user.username', read_only=True, default='')

    class Meta:
        model = DiscountAuthority
        fields = [
            'id', 'authorization_name', 'authorized_user', 'authorization_uid',
            'mobile', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'authorization_uid']


class DashboardSummarySerializer(serializers.Serializer):
    from_date = serializers.CharField(allow_blank=True)
    to_date = serializers.CharField(allow_blank=True)
    metric = serializers.CharField()
    summary_cards = serializers.DictField()
    test_status_summary = serializers.ListField(child=serializers.DictField())
    tat_summary = serializers.ListField(child=serializers.DictField())
    department_wise = serializers.DictField()
    collection_center_wise = serializers.ListField(child=serializers.DictField())
    affiliation_wise = serializers.ListField(child=serializers.DictField())
    affiliation_history = serializers.ListField(child=serializers.DictField())
    filter_options = serializers.DictField()
    # Legacy fields kept for compatibility
    total_registrations = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    department_summary = serializers.ListField(child=serializers.DictField())


class JoinRequestSerializer(serializers.ModelSerializer):
    created_at_display = serializers.SerializerMethodField()
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    letterhead_photo_url = serializers.SerializerMethodField()
    lab_interior_photo_url = serializers.SerializerMethodField()
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = JoinRequest
        fields = [
            'id', 'request_type', 'request_type_display', 'name', 'email', 'phone',
            'organization', 'city', 'message', 'partnership_type', 'contact_person',
            'full_address', 'pincode', 'proof_of_address', 'letterhead_photo',
            'letterhead_photo_url', 'lab_interior_photo', 'lab_interior_photo_url',
            'branch', 'experience_type', 'current_employer', 'total_experience',
            'last_salary', 'resume', 'resume_url', 'is_handled', 'created_at',
            'created_at_display',
        ]
        read_only_fields = ['created_at', 'created_at_display', 'request_type_display']

    def get_created_at_display(self, obj):
        if not obj.created_at:
            return '-'
        return obj.created_at.strftime('%d-%b-%y %I:%M %p')

    def _file_url(self, obj, field_name):
        file_field = getattr(obj, field_name, None)
        if not file_field:
            return ''
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(file_field.url)
        return file_field.url

    def get_letterhead_photo_url(self, obj):
        return self._file_url(obj, 'letterhead_photo')

    def get_lab_interior_photo_url(self, obj):
        return self._file_url(obj, 'lab_interior_photo')

    def get_resume_url(self, obj):
        return self._file_url(obj, 'resume')

    def validate(self, attrs):
        request_type = (attrs.get('request_type') or self.initial_data.get('request_type') or '').strip()
        if request_type not in {JoinRequest.TYPE_FRANCHISE, JoinRequest.TYPE_JOB}:
            raise serializers.ValidationError({'request_type': 'Select franchise or job vacancy.'})

        name = (attrs.get('name') or '').strip()
        if not name:
            raise serializers.ValidationError({'name': 'Name is required.'})

        if request_type == JoinRequest.TYPE_FRANCHISE:
            if not (attrs.get('partnership_type') or '').strip():
                raise serializers.ValidationError({'partnership_type': 'Select Brand or Self partnership.'})
            if not (attrs.get('contact_person') or '').strip():
                raise serializers.ValidationError({'contact_person': 'Contact person is required.'})
            phone = (attrs.get('phone') or '').strip()
            digits = ''.join(ch for ch in phone if ch.isdigit())
            if len(digits) < 10:
                raise serializers.ValidationError({'phone': 'Enter a valid contact number.'})
            if not (attrs.get('city') or '').strip():
                raise serializers.ValidationError({'city': 'City is required.'})
            if not (attrs.get('full_address') or '').strip():
                raise serializers.ValidationError({'full_address': 'Full address is required.'})
            if not (attrs.get('pincode') or '').strip():
                raise serializers.ValidationError({'pincode': 'Pincode is required.'})

        if request_type == JoinRequest.TYPE_JOB:
            phone = (attrs.get('phone') or '').strip()
            digits = ''.join(ch for ch in phone if ch.isdigit())
            if len(digits) < 10:
                raise serializers.ValidationError({'phone': 'Enter a valid contact number.'})
            if not (attrs.get('branch') or '').strip():
                raise serializers.ValidationError({'branch': 'Select a branch.'})
            if not (attrs.get('experience_type') or '').strip():
                raise serializers.ValidationError({'experience_type': 'Select Fresher or Experienced.'})

        return attrs

    def validate_phone(self, value):
        cleaned = (value or '').strip()
        if not cleaned:
            return cleaned
        digits = ''.join(ch for ch in cleaned if ch.isdigit())
        if len(digits) < 10:
            raise serializers.ValidationError('Enter a valid contact number.')
        return cleaned


class SelfPatientQuerySerializer(serializers.ModelSerializer):
    created_at_display = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = SelfPatientQuery
        fields = [
            'id', 'test_name', 'description', 'photo', 'photo_url',
            'is_handled', 'created_at', 'created_at_display',
        ]
        read_only_fields = ['created_at', 'created_at_display', 'photo_url']

    def get_created_at_display(self, obj):
        if not obj.created_at:
            return '-'
        return obj.created_at.strftime('%d-%b-%y %I:%M %p')

    def get_photo_url(self, obj):
        if not obj.photo:
            return ''
        return obj.photo.url

    def validate_test_name(self, value):
        cleaned = (value or '').strip()
        if not cleaned:
            raise serializers.ValidationError('Test name is required.')
        return cleaned

    def validate(self, attrs):
        if self.instance is None and not attrs.get('photo'):
            raise serializers.ValidationError({'photo': 'Photo is required.'})
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        url = self.get_photo_url(instance)
        data['photo_url'] = url
        data['photo'] = url
        return data

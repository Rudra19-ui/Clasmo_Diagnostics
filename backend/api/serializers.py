from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import (
    LabMessage,
    Patient,
    PickupRequest,
    Registration,
    RegistrationTest,
    Test,
    TestCategory,
    User,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'display_name', 'lab_code']


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
        attrs['user'] = user
        return attrs


class TestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCategory
        fields = ['id', 'name']


class TestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)

    class Meta:
        model = Test
        fields = ['id', 'name', 'short_name', 'test_code', 'price', 'category', 'category_name']


class RegistrationTestSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)

    class Meta:
        model = RegistrationTest
        fields = ['id', 'test', 'test_name', 'price', 'discount', 'refund']


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

    class Meta:
        model = Registration
        fields = [
            'id', 'lab_code', 'patient', 'patient_name', 'registration_date', 'collection_date',
            'status', 'comment', 'urgency', 'discount_test', 'discount_regn', 'discount_type',
            'discount_reason', 'discount_authorization', 'payment_method', 'total',
            'visiting_charges', 'net_amount', 'paid', 'balance', 'refund_amount',
            'recovery_amount', 'bill_receipt_no', 'tests', 'test_names', 'reg_date',
        ]
        read_only_fields = ['lab_code', 'total', 'net_amount', 'balance']

    def get_test_names(self, obj):
        return ', '.join(t.test.name for t in obj.tests.all())

    def get_reg_date(self, obj):
        return obj.registration_date.strftime('%d-%m-%Y')

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
        total = 0
        for item in tests_data:
            test = Test.objects.get(pk=item['test_id'])
            price = item.get('price', test.price)
            RegistrationTest.objects.create(
                registration=registration,
                test=test,
                price=price,
                discount=item.get('discount', 0),
                refund=item.get('refund', 0),
            )
            total += float(price)
        registration.total = total
        registration.net_amount = total + float(registration.visiting_charges)
        registration.balance = registration.net_amount - float(registration.paid)
        registration.save()


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


class RegistrationSearchSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    tests = RegistrationTestSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.patient_name', read_only=True)
    test = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source='net_amount', max_digits=10, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(source='net_amount', max_digits=10, decimal_places=2, read_only=True)
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')

    class Meta:
        model = Registration
        fields = [
            'id', 'lab_code', 'patient', 'patient_name', 'tests', 'test', 'date',
            'status', 'amount', 'total_amount', 'total', 'net_amount', 'paid', 'balance',
            'discount_test', 'discount_regn', 'refund_amount',
            'registration_date', 'collection_date', 'created_at', 'created_by_name',
        ]

    def get_test(self, obj):
        names = [t.test.name for t in obj.tests.all()]
        return names[0] if names else ''

    def get_date(self, obj):
        return obj.registration_date.strftime('%d-%m-%Y')


class PickupRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupRequest
        fields = ['id', 'patient_name', 'mobile', 'address', 'pickup_date', 'created_at']
        read_only_fields = ['created_at']


class LabMessageSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')

    class Meta:
        model = LabMessage
        fields = ['id', 'message', 'created_by_name', 'created_at']
        read_only_fields = ['created_at']


class DashboardSummarySerializer(serializers.Serializer):
    total_registrations = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    department_summary = serializers.ListField(child=serializers.DictField())

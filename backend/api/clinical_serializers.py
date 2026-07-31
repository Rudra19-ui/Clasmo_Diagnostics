from rest_framework import serializers

from .clinical_utils import calculate_flag, select_reference_range
from .models import Patient, Registration, Report, ReportValue, Test, TestParameter


class TestParameterSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)

    class Meta:
        model = TestParameter
        fields = [
            'id', 'test', 'test_name', 'parameter_name', 'unit',
            'reference_range_male', 'reference_range_female', 'reference_range_child',
            'critical_low', 'critical_high', 'sample_value', 'method', 'analyzer_code', 'sort_order',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ReportValueSerializer(serializers.ModelSerializer):
    parameter_name = serializers.CharField(source='parameter.parameter_name', read_only=True)
    unit = serializers.CharField(source='parameter.unit', read_only=True)
    test_id = serializers.IntegerField(source='parameter.test_id', read_only=True)
    test_name = serializers.CharField(source='parameter.test.name', read_only=True)
    reference_range = serializers.SerializerMethodField()

    class Meta:
        model = ReportValue
        fields = [
            'id', 'parameter', 'parameter_name', 'unit', 'test_id', 'test_name',
            'value', 'flag', 'source', 'reference_range',
        ]

    def get_reference_range(self, obj):
        patient = self.context.get('patient')
        if patient:
            return select_reference_range(obj.parameter, patient)
        return obj.parameter.reference_range_male


class ReportSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField()
    lab_code = serializers.CharField(source='registration.lab_code', read_only=True)
    patient_name = serializers.CharField(source='registration.patient.patient_name', read_only=True)
    patient_gender = serializers.CharField(source='registration.patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='registration.patient.age_years', read_only=True)
    entered_by_name = serializers.CharField(source='entered_by.display_name', read_only=True, default='')
    verified_by_name = serializers.CharField(source='verified_by.display_name', read_only=True, default='')
    ordered_tests = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'registration', 'lab_code', 'patient_name', 'patient_gender', 'patient_age',
            'status', 'entered_by', 'entered_by_name', 'verified_by', 'verified_by_name',
            'ordered_tests', 'values', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'entered_by', 'verified_by', 'created_at', 'updated_at',
        ]

    def get_ordered_tests(self, obj):
        return [
            {'id': rt.test_id, 'name': rt.test.name}
            for rt in obj.registration.tests.select_related('test').all()
        ]

    def get_values(self, obj):
        patient = obj.registration.patient
        return ReportValueSerializer(
            obj.values.select_related('parameter__test').all(),
            many=True,
            context={'patient': patient},
        ).data


class ReportValueInputSerializer(serializers.Serializer):
    parameter_id = serializers.IntegerField()
    value = serializers.CharField(allow_blank=True, max_length=100)


class ReportSubmitSerializer(serializers.Serializer):
    values = ReportValueInputSerializer(many=True)
    verify = serializers.BooleanField(required=False, default=False)

    def validate_values(self, value_list):
        if not value_list:
            raise serializers.ValidationError('At least one result value is required.')
        return value_list


class RegistrationLookupSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.patient_name', read_only=True)
    has_report = serializers.SerializerMethodField()
    report_status = serializers.SerializerMethodField()

    class Meta:
        model = Registration
        fields = ['id', 'lab_code', 'patient_name', 'status', 'has_report', 'report_status']

    def get_has_report(self, obj):
        return hasattr(obj, 'clinical_report')

    def get_report_status(self, obj):
        if hasattr(obj, 'clinical_report'):
            return obj.clinical_report.status
        return None

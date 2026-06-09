from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .clinical_permissions import (
    IsPathologistOrAdmin,
    IsTechnicianOrAdmin,
    TestParameterPermission,
)
from .clinical_serializers import (
    ReportSerializer,
    ReportSubmitSerializer,
    TestParameterSerializer,
)
from .clinical_utils import calculate_flag
from .models import Registration, Report, ReportValue, TestParameter, User


class TestParameterListCreateView(generics.ListCreateAPIView):
    serializer_class = TestParameterSerializer
    permission_classes = [TestParameterPermission]

    def get_queryset(self):
        qs = TestParameter.objects.select_related('test').all()
        test_id = self.request.query_params.get('test_id', '').strip()
        search = self.request.query_params.get('search', '').strip()
        active_only = self.request.query_params.get('active_only', 'true').lower()

        if test_id:
            qs = qs.filter(test_id=test_id)
        if search:
            qs = qs.filter(
                Q(parameter_name__icontains=search) | Q(test__name__icontains=search)
            )
        if active_only in ('true', '1', 'yes'):
            qs = qs.filter(is_active=True)
        return qs.order_by('test__name', 'parameter_name')


class TestParameterDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TestParameter.objects.select_related('test')
    serializer_class = TestParameterSerializer
    permission_classes = [TestParameterPermission]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class ReportDetailView(APIView):
    """GET and POST /api/reports/{registration_id}/"""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsTechnicianOrAdmin()]

    def get(self, request, registration_id):
        registration = get_object_or_404(
            Registration.objects.select_related('patient').prefetch_related('tests__test'),
            pk=registration_id,
        )
        report = Report.objects.filter(registration=registration).select_related(
            'entered_by', 'verified_by', 'registration__patient'
        ).prefetch_related(
            'values__parameter__test'
        ).first()

        if not report:
            parameters = self._parameters_for_registration(registration)
            return Response({
                'registration': registration_id,
                'lab_code': registration.lab_code,
                'patient_name': registration.patient.patient_name,
                'patient_gender': registration.patient.gender,
                'patient_age': registration.patient.age_years,
                'status': Report.STATUS_PENDING,
                'ordered_tests': [
                    {'id': rt.test_id, 'name': rt.test.name}
                    for rt in registration.tests.select_related('test').all()
                ],
                'values': [],
                'parameters': TestParameterSerializer(
                    parameters, many=True, context={'request': request}
                ).data,
            })

        serializer = ReportSerializer(report, context={'patient': registration.patient})
        data = serializer.data
        data['parameters'] = TestParameterSerializer(
            self._parameters_for_registration(registration),
            many=True,
        ).data
        return Response(data)

    @transaction.atomic
    def post(self, request, registration_id):
        registration = get_object_or_404(
            Registration.objects.select_related('patient').prefetch_related('tests__test'),
            pk=registration_id,
        )

        if hasattr(registration, 'clinical_report') and registration.clinical_report.status == Report.STATUS_VERIFIED:
            return Response(
                {'detail': 'Verified reports cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submit_serializer = ReportSubmitSerializer(data=request.data)
        submit_serializer.is_valid(raise_exception=True)
        values_data = submit_serializer.validated_data['values']
        should_verify = submit_serializer.validated_data.get('verify', False)

        report, _ = Report.objects.get_or_create(
            registration=registration,
            defaults={'status': Report.STATUS_PENDING},
        )

        if report.status == Report.STATUS_VERIFIED:
            return Response(
                {'detail': 'Verified reports cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = registration.patient
        valid_parameter_ids = set(
            self._parameters_for_registration(registration).values_list('id', flat=True)
        )

        for item in values_data:
            param_id = item['parameter_id']
            if param_id not in valid_parameter_ids:
                return Response(
                    {'detail': f'Parameter {param_id} is not part of this registration.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parameter = TestParameter.objects.get(pk=param_id)
            flag = calculate_flag(item['value'], parameter, patient)
            ReportValue.objects.update_or_create(
                report=report,
                parameter=parameter,
                defaults={'value': item['value'], 'flag': flag},
            )

        report.entered_by = request.user
        report.status = Report.STATUS_ENTERED
        report.save(update_fields=['entered_by', 'status', 'updated_at'])

        if should_verify:
            if request.user.role not in {User.ROLE_ADMIN, User.ROLE_PATHOLOGIST}:
                return Response(
                    {'detail': 'Only pathologists or admins can verify reports.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            report.verified_by = request.user
            report.status = Report.STATUS_VERIFIED
            report.save(update_fields=['verified_by', 'status', 'updated_at'])
            registration.status = Registration.STATUS_RESULT_READY
            registration.save(update_fields=['status'])

        report.refresh_from_db()
        serializer = ReportSerializer(report, context={'patient': patient})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _parameters_for_registration(self, registration):
        test_ids = registration.tests.values_list('test_id', flat=True)
        return TestParameter.objects.filter(
            test_id__in=test_ids, is_active=True
        ).select_related('test').order_by('test__name', 'parameter_name')


class ReportVerifyView(APIView):
    permission_classes = [IsPathologistOrAdmin]

    @transaction.atomic
    def patch(self, request, registration_id):
        registration = get_object_or_404(Registration, pk=registration_id)
        report = get_object_or_404(Report, registration=registration)

        if report.status == Report.STATUS_PENDING:
            return Response(
                {'detail': 'Cannot verify a report with no entered values.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.verified_by = request.user
        report.status = Report.STATUS_VERIFIED
        report.save(update_fields=['verified_by', 'status', 'updated_at'])

        registration.status = Registration.STATUS_RESULT_READY
        registration.save(update_fields=['status'])

        serializer = ReportSerializer(
            report, context={'patient': registration.patient}
        )
        return Response(serializer.data)

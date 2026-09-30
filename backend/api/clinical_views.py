from .utils import get_lab_config
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .clinical_permissions import (
    IsAdmin,
    IsPathologistOrAdmin,
    TestParameterPermission,
)
from .clinical_serializers import (
    ReportSerializer,
    ReportSubmitSerializer,
    TestParameterSerializer,
)
from .clinical_utils import calculate_flag
from .franchise_scope import scope_registrations_for_user
from .models import Registration, Report, ReportValue, Test, TestParameter, User
from .parameter_import import (
    build_sample_report_payload,
    build_template_csv,
    generate_default_parameters,
    import_parameters_from_csv_text,
    sample_report_coverage,
)
from .wallet_service import WalletError, assert_can_release_report


def _scoped_registration(user, registration_id):
    return get_object_or_404(
        scope_registrations_for_user(
            user,
            Registration.objects.select_related('patient').prefetch_related('tests__test'),
        ),
        pk=registration_id,
    )


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
        return qs.order_by('test__name', 'sort_order', 'parameter_name')


class TestParameterDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TestParameter.objects.select_related('test')
    serializer_class = TestParameterSerializer
    permission_classes = [TestParameterPermission]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


def _patient_details_payload(registration):
    patient = registration.patient
    gender = 'M' if patient.gender == 'male' else 'F' if patient.gender == 'female' else '—'
    regn_dt = registration.created_at or registration.registration_date
    barcode = (
        registration.linked_barcodes.filter(is_active=True)
        .order_by('id')
        .values_list('barcode', flat=True)
        .first()
    ) or ''
    return {
        'title': patient.title,
        'patient_name': patient.patient_name,
        'full_name': f'{patient.title} {patient.patient_name}'.strip(),
        'lab_code': registration.lab_code,
        'gender_display': gender,
        'age_years': patient.age_years,
        'age_months': patient.age_months,
        'age_days': patient.age_days,
        'age_display': f'{gender}-{patient.age_years}(Y){patient.age_months}(M){patient.age_days}(D)',
        'collection_center': patient.collection_center or '—',
        'doctor_name': patient.doctor_name or '—',
        'affiliation': patient.affiliation or patient.patient_type or '—',
        'patient_type': patient.patient_type or 'O.P.D.',
        'mobile': patient.mobile or '',
        'barcode': barcode,
        'registration_date': regn_dt.strftime('%d-%m-%Y %H:%M:%S') if regn_dt else '',
    }


ENTER_RESULT_ROLES = {
    User.ROLE_SUPER_ADMIN,
    User.ROLE_ADMIN,
    User.ROLE_TECHNICIAN,
    User.ROLE_PATHOLOGIST,  # may correct values during cross-verification
}


class ReportDetailView(APIView):
    """GET and POST /api/reports/{registration_id}/"""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get(self, request, registration_id):
        registration = _scoped_registration(request.user, registration_id)
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
                'patient_details': _patient_details_payload(registration),
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
        data['patient_details'] = _patient_details_payload(registration)
        data['parameters'] = TestParameterSerializer(
            self._parameters_for_registration(registration),
            many=True,
        ).data
        # Franchise accounts only receive result values after pathologist approval.
        if (
            request.user.role in User.FRANCHISE_ROLES
            and data.get('status') != Report.STATUS_VERIFIED
        ):
            data['values'] = []
            data['parameters'] = []
            data['release_pending'] = True
        return Response(data)

    @transaction.atomic
    def post(self, request, registration_id):
        if request.user.role not in ENTER_RESULT_ROLES:
            return Response(
                {'detail': 'Only lab clinical staff can enter or correct report values.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        registration = _scoped_registration(request.user, registration_id)

        if hasattr(registration, 'clinical_report') and registration.clinical_report.status == Report.STATUS_VERIFIED:
            return Response(
                {'detail': 'Verified reports cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submit_serializer = ReportSubmitSerializer(data=request.data)
        submit_serializer.is_valid(raise_exception=True)
        values_data = submit_serializer.validated_data['values']
        should_verify = submit_serializer.validated_data.get('verify', False)
        if get_lab_config().test_auto_approval:
            should_verify = True

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
            if request.user.role not in {User.ROLE_SUPER_ADMIN, User.ROLE_ADMIN, User.ROLE_PATHOLOGIST}:
                return Response(
                    {'detail': 'Only pathologists or admins can verify reports.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            try:
                assert_can_release_report(registration)
            except WalletError as exc:
                return Response(
                    {exc.field or 'detail': exc.message},
                    status=status.HTTP_400_BAD_REQUEST,
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


class PublicPatientReportView(APIView):
    """Public Test Quorum lookup: lab code + registered mobile returns a verified report."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        lab_code = str(request.data.get('lab_code', '')).strip()
        mobile = str(request.data.get('mobile', '')).strip()
        digits = ''.join(ch for ch in mobile if ch.isdigit())

        if not lab_code or len(digits) < 10:
            return Response(
                {'detail': 'Enter your lab code and 10-digit registered mobile number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        registration = (
            Registration.objects.select_related('patient')
            .filter(lab_code__iexact=lab_code)
            .first()
        )
        patient_digits = ''
        if registration:
            patient_digits = ''.join(
                ch for ch in (registration.patient.mobile or '') if ch.isdigit()
            )
        if not registration or not patient_digits.endswith(digits[-10:]):
            return Response(
                {'detail': 'No record found for the given lab code and mobile number.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        report = (
            Report.objects.filter(
                registration=registration, status=Report.STATUS_VERIFIED
            )
            .select_related('verified_by')
            .prefetch_related('values__parameter__test')
            .first()
        )
        if not report:
            return Response(
                {'detail': 'Your report is not ready yet. Please check again later.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        patient = registration.patient
        values = ReportSerializer(report, context={'patient': patient}).data['values']
        tests = {}
        for row in values:
            tests.setdefault(row['test_name'], []).append(row)

        return Response({
            'lab_code': registration.lab_code,
            'patient_details': _patient_details_payload(registration),
            'verified_by': report.verified_by.display_name if report.verified_by else '',
            'reported_at': report.updated_at.strftime('%d-%b-%Y %I:%M %p'),
            'tests': [
                {'test_name': name, 'rows': rows}
                for name, rows in tests.items()
            ],
        })


class ReportVerifyView(APIView):
    permission_classes = [IsPathologistOrAdmin]

    @transaction.atomic
    def patch(self, request, registration_id):
        registration = _scoped_registration(request.user, registration_id)
        report = get_object_or_404(Report, registration=registration)

        if report.status == Report.STATUS_PENDING:
            return Response(
                {'detail': 'Cannot verify a report with no entered values.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assert_can_release_report(registration)
        except WalletError as exc:
            return Response(
                {exc.field or 'detail': exc.message},
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


class TestParameterImportTemplateView(APIView):
    """Download CSV template for bulk parameter import (optionally one row per catalog test)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        include_tests = str(request.query_params.get('include_tests', '')).lower() in {
            '1', 'true', 'yes',
        }
        content = build_template_csv(include_tests=include_tests)
        filename = (
            'test_parameters_all_tests_template.csv'
            if include_tests
            else 'test_parameters_template.csv'
        )
        response = HttpResponse(content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class TestParameterImportView(APIView):
    """Upload CSV to create/update TestParameter rows for many tests at once."""

    permission_classes = [IsAdmin]

    def post(self, request):
        dry_run = str(request.data.get('dry_run', '')).lower() in {'1', 'true', 'yes'}
        upload = request.FILES.get('file')
        raw_text = request.data.get('csv_text', '')

        if upload:
            try:
                text = upload.read().decode('utf-8-sig')
            except UnicodeDecodeError:
                return Response(
                    {'detail': 'Upload a UTF-8 CSV file.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif raw_text:
            text = str(raw_text)
        else:
            return Response(
                {'detail': 'Upload a CSV file or paste csv_text.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = import_parameters_from_csv_text(text, dry_run=dry_run)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class SampleReportCoverageView(APIView):
    """How many catalog tests already have parameters for auto sample reports."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(sample_report_coverage())


class SampleReportAutoGenerateView(APIView):
    """Create one default parameter per test missing parameters (instant sample reports)."""

    permission_classes = [IsAdmin]

    def post(self, request):
        only_missing = str(request.data.get('only_missing', 'true')).lower() not in {
            '0', 'false', 'no',
        }
        limit_raw = request.data.get('limit')
        limit = None
        if limit_raw not in (None, ''):
            try:
                limit = max(1, int(limit_raw))
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'limit must be an integer.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        result = generate_default_parameters(only_missing=only_missing, limit=limit)
        result['coverage'] = sample_report_coverage()
        return Response(result, status=status.HTTP_200_OK)


class SampleReportGeneratorView(APIView):
    """Auto sample-report JSON built from TestParameter rows (no per-test PDF needed)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        test_id = request.query_params.get('test_id', '').strip()
        test_ids = request.query_params.get('test_ids', '').strip()
        search = request.query_params.get('search', '').strip()
        missing_only = str(request.query_params.get('missing_only', '')).lower() in {
            '1', 'true', 'yes',
        }
        limit_raw = request.query_params.get('limit', '50')
        try:
            limit = min(max(1, int(limit_raw)), 200)
        except (TypeError, ValueError):
            limit = 50

        qs = Test.objects.all().order_by('name')
        if test_id:
            qs = qs.filter(pk=test_id)
        elif test_ids:
            ids = [int(x) for x in test_ids.split(',') if x.strip().isdigit()]
            qs = qs.filter(pk__in=ids)
        elif search:
            qs = qs.filter(Q(name__icontains=search) | Q(test_code__icontains=search))

        if missing_only:
            from django.db.models import Count
            qs = qs.annotate(
                active_params=Count('parameters', filter=Q(parameters__is_active=True))
            ).filter(active_params=0)

        tests = list(qs[:limit])
        reports = [build_sample_report_payload(test) for test in tests]
        return Response({
            'count': len(reports),
            'coverage': sample_report_coverage(),
            'reports': reports,
        })

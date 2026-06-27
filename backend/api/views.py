import logging
import os
from datetime import datetime

from django.db import connection
from django.db.models import Count, Q, Sum
from django.db.utils import OperationalError, ProgrammingError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LabMessage, PickupRequest, Registration, Test, TestCategory, User
from .serializers import (
    DashboardSummarySerializer,
    LabMessageSerializer,
    LoginSerializer,
    PickupRequestSerializer,
    RegistrationCreateSerializer,
    RegistrationSearchSerializer,
    RegistrationSerializer,
    TestCategorySerializer,
    TestSerializer,
    UserSerializer,
)
from .utils import generate_lab_code

logger = logging.getLogger(__name__)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            trial_admin_exists = User.objects.filter(username='admin_test', is_active=True).exists()
            return Response({
                'status': 'ok',
                'database': 'connected',
                'trial_admin_ready': trial_admin_exists,
            })
        except (OperationalError, ProgrammingError) as exc:
            logger.exception('Health check database error')
            db_host = connection.settings_dict.get('HOST')
            return Response(
                {
                    'status': 'error',
                    'database': str(exc),
                    'db_host': db_host,
                    'database_public_url_set': bool(os.environ.get('DATABASE_PUBLIC_URL')),
                    'hint': (
                        'Set DATABASE_PUBLIC_URL on the web service to the Postgres '
                        'Connect public URL (xxxx.proxy.rlwy.net).'
                        if db_host and 'railway.internal' in str(db_host)
                        else None
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_ADMIN


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
            })
        except DRFValidationError:
            raise
        except (OperationalError, ProgrammingError):
            logger.exception('Login database error')
            return Response(
                {'detail': 'Database is not ready. Please retry in a moment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception('Login failed')
            return Response(
                {'detail': 'Login failed due to a server error.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Logged out.'})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TestListView(generics.ListAPIView):
    serializer_class = TestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Test.objects.select_related('category').all()
        search = self.request.query_params.get('search', '').strip()
        category = self.request.query_params.get('category', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(short_name__icontains=search)
                | Q(test_code__icontains=search)
            )
        if category:
            qs = qs.filter(category__name__icontains=category)
        return qs.order_by('name')


class TestCategoryListView(generics.ListAPIView):
    queryset = TestCategory.objects.all()
    serializer_class = TestCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class RegistrationSearchView(generics.ListAPIView):
    serializer_class = RegistrationSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _parse_ddmmyyyy(value):
        if not value:
            return None
        try:
            return datetime.strptime(value.strip(), '%d-%m-%Y').date()
        except ValueError:
            return None

    def get_queryset(self):
        qs = Registration.objects.select_related('patient', 'created_by').prefetch_related('tests__test').all()
        params = self.request.query_params

        patient_name = params.get('patient_name', '').strip()
        from_date = params.get('from_date', '').strip()
        to_date = params.get('to_date', '').strip()
        from_labcode = params.get('from_labcode', '').strip()
        to_labcode = params.get('to_labcode', '').strip()
        status_filter = params.get('status', '').strip()
        collection_center = params.get('collection_center', '').strip()
        barcode = params.get('barcode', '').strip()
        select_state = params.get('select_state', '').strip()

        test_category = params.get('test_category', '').strip()
        test_name = params.get('test_name', '').strip()
        test_name_mode = params.get('test_name_mode', 'short_name').strip()
        test_profile_name = params.get('test_profile_name', '').strip()
        test_profile_mode = params.get('test_profile_mode', 'short_name').strip()
        test_level_status = params.get('test_level_status', '').strip()
        affiliation = params.get('affiliation', '').strip()
        doctor_name = params.get('doctor_name', '').strip()
        external_barcode = params.get('external_barcode', '').strip()
        mobile = params.get('mobile', '').strip()
        patient_type = params.get('patient_type', '').strip()
        sample_from_date = params.get('sample_from_date', '').strip()
        sample_to_date = params.get('sample_to_date', '').strip()
        area_location = params.get('area_location', '').strip()
        collection_boy = params.get('collection_boy', '').strip()
        amount_pending_status = params.get('amount_pending_status', '').strip()
        department = params.get('department', '').strip()
        user_id = params.get('user', '').strip()
        sample_collection_at = params.get('sample_collection_at', '').strip()

        if patient_name:
            qs = qs.filter(patient__patient_name__icontains=patient_name)
        if from_labcode:
            qs = qs.filter(lab_code__gte=from_labcode)
        if to_labcode:
            qs = qs.filter(lab_code__lte=to_labcode)
        if collection_center:
            qs = qs.filter(patient__collection_center__icontains=collection_center)
        if affiliation:
            qs = qs.filter(patient__affiliation__icontains=affiliation)
        if doctor_name:
            qs = qs.filter(patient__doctor_name__icontains=doctor_name)
        if mobile:
            qs = qs.filter(patient__mobile__icontains=mobile)
        if patient_type and patient_type.lower() != 'none':
            qs = qs.filter(patient__patient_type=patient_type)
        if area_location and area_location.lower() not in ('', 'select all', 'all'):
            qs = qs.filter(patient__city__icontains=area_location)
        if select_state:
            qs = qs.filter(patient__city__icontains=select_state)
        if collection_boy:
            qs = qs.filter(patient__collection_round_boy__icontains=collection_boy)
        if sample_collection_at and sample_collection_at.lower() != 'all':
            qs = qs.filter(patient__sample_collected_at__icontains=sample_collection_at)
        if user_id:
            qs = qs.filter(created_by_id=user_id)

        if barcode:
            qs = qs.filter(
                Q(lab_code__icontains=barcode) | Q(patient__patient_id__icontains=barcode)
            )
        if external_barcode:
            qs = qs.filter(
                Q(lab_code__icontains=external_barcode) | Q(patient__patient_id__icontains=external_barcode)
            )

        if status_filter and status_filter != 'All':
            qs = qs.filter(status=status_filter)
        if test_level_status and test_level_status.lower() != 'select':
            qs = qs.filter(status=test_level_status)

        if amount_pending_status == 'pending':
            qs = qs.filter(balance__gt=0)
        elif amount_pending_status == 'paid':
            qs = qs.filter(balance__lte=0)

        start = self._parse_ddmmyyyy(from_date)
        if start:
            qs = qs.filter(registration_date__date__gte=start)
        end = self._parse_ddmmyyyy(to_date)
        if end:
            qs = qs.filter(registration_date__date__lte=end)

        sample_start = self._parse_ddmmyyyy(sample_from_date)
        if sample_start:
            qs = qs.filter(collection_date__date__gte=sample_start)
        sample_end = self._parse_ddmmyyyy(sample_to_date)
        if sample_end:
            qs = qs.filter(collection_date__date__lte=sample_end)

        category_name = test_category or department
        if category_name and category_name.lower() not in ('', 'select category', 'select department'):
            qs = qs.filter(tests__test__category__name__icontains=category_name).distinct()

        if test_name:
            if test_name_mode == 'test_code':
                qs = qs.filter(tests__test__test_code__icontains=test_name).distinct()
            elif test_name_mode == 'full_name':
                qs = qs.filter(tests__test__name__icontains=test_name).distinct()
            else:
                qs = qs.filter(
                    Q(tests__test__short_name__icontains=test_name) | Q(tests__test__name__icontains=test_name)
                ).distinct()

        if test_profile_name:
            if test_profile_mode == 'test_code':
                qs = qs.filter(tests__test__test_code__icontains=test_profile_name).distinct()
            elif test_profile_mode == 'full_name':
                qs = qs.filter(tests__test__name__icontains=test_profile_name).distinct()
            else:
                qs = qs.filter(
                    Q(tests__test__short_name__icontains=test_profile_name) | Q(tests__test__name__icontains=test_profile_name)
                ).distinct()

        return qs.order_by('-registration_date')


def _format_age_display(patient):
    years = patient.age_years or 0
    months = patient.age_months or 0
    if months:
        return f'{years + months / 12:.1f}'
    return str(years)


def _format_gender(patient):
    gender = (patient.gender or '').lower()
    if gender == 'female':
        return 'Female'
    if gender == 'male':
        return 'Male'
    return ''


def _build_worksheet_patient(registration):
    patient = registration.patient
    values_by_test = {}

    report = registration.clinical_report if hasattr(registration, 'clinical_report') else None
    if report:
        for report_value in report.values.select_related('parameter__test').all():
            test_name = report_value.parameter.test.name
            values_by_test.setdefault(test_name, []).append({
                'parameter_name': report_value.parameter.parameter_name,
                'value': report_value.value,
            })

    test_sections = []
    seen_tests = set()
    for reg_test in registration.tests.select_related('test').all():
        test_name = reg_test.test.name
        seen_tests.add(test_name)
        test_sections.append({
            'test_name': test_name,
            'parameters': values_by_test.get(test_name, []),
        })

    for test_name, parameters in values_by_test.items():
        if test_name not in seen_tests:
            test_sections.append({
                'test_name': test_name,
                'parameters': parameters,
            })

    doctor = patient.doctor_name or patient.affiliation or ''
    if not doctor and patient.patient_type and patient.patient_type != 'O.P.D.':
        doctor = patient.patient_type

    return {
        'id': registration.id,
        'visit_date': registration.registration_date.strftime('%d/%m/%Y'),
        'lab_code': registration.lab_code,
        'patient_name': f'{patient.title} {patient.patient_name}'.strip(),
        'age_display': _format_age_display(patient),
        'gender': _format_gender(patient),
        'patient_type': patient.patient_type or 'OPD',
        'doctor_name': doctor or '—',
        'collection_center': patient.collection_center or 'CLASMO Diagnostics pvt',
        'test_sections': test_sections,
    }


class WorksheetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get('ids', '').strip()
        if not ids_param:
            return Response({'detail': 'Provide registration ids.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ids = [int(value) for value in ids_param.split(',') if value.strip()]
        except ValueError:
            return Response({'detail': 'Invalid registration ids.'}, status=status.HTTP_400_BAD_REQUEST)

        if not ids:
            return Response({'detail': 'Provide registration ids.'}, status=status.HTTP_400_BAD_REQUEST)

        registrations = Registration.objects.filter(id__in=ids).select_related('patient').prefetch_related(
            'tests__test',
            'clinical_report__values__parameter__test',
        )
        by_id = {registration.id: registration for registration in registrations}
        patients = [_build_worksheet_patient(by_id[reg_id]) for reg_id in ids if reg_id in by_id]

        return Response({'patients': patients})


class RegistrationDetailView(generics.RetrieveAPIView):
    queryset = Registration.objects.select_related('patient').prefetch_related('tests__test')
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'lab_code'


class RegistrationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import Patient

        serializer = RegistrationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tests_data = data.pop('tests', [])
        patient_data = data.pop('patient')

        patient = Patient.objects.create(**patient_data)
        registration = Registration.objects.create(
            lab_code=generate_lab_code(),
            patient=patient,
            created_by=request.user,
            **data,
        )

        RegistrationSerializer()._sync_tests(registration, [
            {
                'test_id': t['test_id'],
                'price': t.get('price'),
                'discount': t.get('discount', 0),
                'refund': t.get('refund', 0),
            }
            for t in tests_data
        ])
        registration.refresh_from_db()
        return Response(RegistrationSerializer(registration).data, status=status.HTTP_201_CREATED)


class NextLabCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'lab_code': generate_lab_code()})


class PickupRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = PickupRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PickupRequest.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class LabMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = LabMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LabMessage.objects.select_related('created_by').all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Registration.objects.all()
        status_breakdown = {
            item['status']: item['count']
            for item in qs.values('status').annotate(count=Count('id'))
        }
        from .models import RegistrationTest
        department_summary = []
        for cat in TestCategory.objects.all():
            count = RegistrationTest.objects.filter(test__category=cat).count()
            if count:
                department_summary.append({'department': cat.name, 'count': count})

        data = {
            'total_registrations': qs.count(),
            'total_revenue': qs.aggregate(total=Sum('net_amount'))['total'] or 0,
            'status_breakdown': status_breakdown,
            'department_summary': department_summary,
        }
        return Response(DashboardSummarySerializer(data).data)


class ReportSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get('type', 'daily')
        qs = Registration.objects.select_related('patient').all()
        rows = RegistrationSearchSerializer(qs[:50], many=True).data
        return Response({
            'type': report_type,
            'count': qs.count(),
            'total_revenue': qs.aggregate(total=Sum('net_amount'))['total'] or 0,
            'rows': rows,
        })


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


class GlobalSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        qs = Registration.objects.filter(
            Q(lab_code__icontains=q)
            | Q(patient__patient_name__icontains=q)
            | Q(patient__mobile__icontains=q)
        ).select_related('patient')[:20]
        return Response(RegistrationSearchSerializer(qs, many=True).data)

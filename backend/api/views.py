import logging
import os
from datetime import datetime, timedelta

from django.shortcuts import get_object_or_404

from django.db import connection
from django.db.models import Count, Q, Sum
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    LabMessage, PickupRequest, Registration, RegistrationTest, Test, TestCategory, User, LabRole,
    Membership, MembershipType, CollectionCenter, CollectionCenterBoy, DiscountReason, DiscountAuthority,
    WhatsAppMessageLog, ExpenseType, Area, RateMaster, Affiliation, SalesReference, Doctor, Patient, PatientAddress, LabConfiguration, ServiceAreaPincode, LabActivity,
    JoinRequest, LoginLog,
)
from .serializers import (
    ChangePasswordSerializer,
    CollectionCenterBoySerializer,
    CollectionCenterSerializer,
    AreaSerializer,
    RateMasterSerializer,
    DashboardSummarySerializer,
    DiscountAuthoritySerializer,
    DiscountReasonSerializer,
    WhatsAppMessageLogSerializer,
    ExpenseTypeSerializer,
    DoctorSerializer,
    AffiliationSerializer,
    SalesReferenceSerializer,
    PatientMasterSerializer,
    LabConfigurationSerializer,
    ServiceAreaPincodeSerializer,
    LabActivitySerializer,
    JoinRequestSerializer,
    LabMessageSerializer,
    LabRoleSerializer,
    LabRoleUpdateSerializer,
    LoginSerializer,
    MembershipSerializer,
    MembershipTypeSerializer,
    PickupRequestSerializer,
    RegisterSerializer,
    RegistrationCreateSerializer,
    RegistrationSearchSerializer,
    RegistrationSerializer,
    TestCategorySerializer,
    TestSerializer,
    UserRoleUpdateSerializer,
    UserSerializer,
)
from .utils import generate_lab_code, get_lab_config

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _record_login_attempt(request, username, user=None, success=False):
    LoginLog.objects.create(
        user=user,
        username_attempt=(username or '')[:150],
        success=success,
        ip_address=_client_ip(request),
        user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:255],
    )


def _persist_login_preferences(user, payload):
    user.save_credentials = bool(payload.get('save_credentials'))
    user.save_info = bool(payload.get('save_info'))
    user.last_login = timezone.now()
    user.save(update_fields=['save_credentials', 'save_info', 'last_login'])


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
        username = (request.data.get('username') or '').strip()
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            _persist_login_preferences(user, request.data)
            token, _ = Token.objects.get_or_create(user=user)
            _record_login_attempt(request, username, user, success=True)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
            })
        except DRFValidationError:
            _record_login_attempt(request, username, success=False)
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


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            serializer = RegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            return Response({
                'detail': 'Account created successfully. Please login with your username and password.',
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        except DRFValidationError:
            raise
        except (OperationalError, ProgrammingError):
            logger.exception('Register database error')
            return Response(
                {'detail': 'Database is not ready. Please retry in a moment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception('Register failed')
            return Response(
                {'detail': 'Registration failed due to a server error.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Logged out.'})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)
        return Response({
            'detail': 'Password changed successfully.',
            'token': token.key,
        })


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


def _workflow_action_by(user):
    if not user:
        return 'CD1'
    username = (user.username or '').upper()
    if username in ('CD1', 'USER_TEST', 'ADMIN_TEST'):
        return 'CD1'
    return user.display_name or user.username or 'CD1'


def _format_test_label(test):
    name = test.name
    short = (test.short_name or '').strip()
    if short and short.lower() not in name.lower():
        return f'{name} ({short})'
    return name


def _build_workflow_events(registration):
    action_by = _workflow_action_by(registration.created_by)
    base_dt = registration.created_at or registration.registration_date
    if base_dt is None:
        return []

    events = [
        {
            'action_by': action_by,
            'action_taken': 'Test Registration',
            'action_on': base_dt,
            'comment': '',
            'update_history': '',
        },
    ]

    collection_dt = registration.collection_date
    if collection_dt and collection_dt > base_dt:
        sample_dt = collection_dt
    else:
        sample_dt = base_dt + timedelta(seconds=14)

    events.append({
        'action_by': action_by,
        'action_taken': 'Sample Collection',
        'action_on': sample_dt,
        'comment': '',
        'update_history': '',
    })

    accession_dt = sample_dt + timedelta(seconds=4)
    events.append({
        'action_by': action_by,
        'action_taken': 'Accession',
        'action_on': accession_dt,
        'comment': '',
        'update_history': '',
    })

    status = registration.status or Registration.STATUS_REGISTERED
    if status in (Registration.STATUS_RESULT_READY, Registration.STATUS_PRINTED):
        events.append({
            'action_by': action_by,
            'action_taken': 'Result Ready',
            'action_on': accession_dt + timedelta(minutes=30),
            'comment': '',
            'update_history': '',
        })

    if status == Registration.STATUS_PRINTED:
        events.append({
            'action_by': action_by,
            'action_taken': 'Print & Release',
            'action_on': accession_dt + timedelta(hours=1),
            'comment': '',
            'update_history': '',
        })

    return events


class WorkFlowHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reg_id = request.query_params.get('id', '').strip()
        lab_code = request.query_params.get('lab_code', '').strip()

        if not reg_id and not lab_code:
            return Response({'detail': 'Provide registration id or lab code.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = Registration.objects.select_related('patient', 'created_by').prefetch_related('tests__test')
        if reg_id:
            try:
                registration = qs.get(id=int(reg_id))
            except (ValueError, Registration.DoesNotExist):
                return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                registration = qs.get(lab_code=lab_code)
            except Registration.DoesNotExist:
                return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        events = _build_workflow_events(registration)
        tests = [_format_test_label(reg_test.test) for reg_test in registration.tests.all()]

        return Response({
            'id': registration.id,
            'lab_code': registration.lab_code,
            'patient_name': f'{registration.patient.title} {registration.patient.patient_name}'.strip(),
            'events': [
                {
                    **event,
                    'action_on': event['action_on'].isoformat() if event['action_on'] else '',
                }
                for event in events
            ],
            'tests': tests,
        })


def _sample_group_for_test(test):
    name = (test.name or '').upper()
    category = (test.category.name if test.category else '').upper()

    hematology_keys = ('CBC', 'BLOOD COUNT', 'HEMOGLOBIN', 'ESR', 'PCV', 'WBC', 'RBC', 'PLATELET')
    urine_keys = ('URINE', 'STOOL')
    fluid_keys = ('FLUID', 'CSF', 'ASCITIC')

    if any(key in name for key in hematology_keys) or category == 'HEMATOLOGY':
        return 'EDTA Blood', '3'
    if any(key in name for key in urine_keys):
        return 'URINE', '2'
    if any(key in name for key in fluid_keys):
        return 'FLUID', '4'
    return 'SERUM', '1'


def _build_barcode_groups(registration):
    groups = {}
    for reg_test in registration.tests.select_related('test__category'):
        group_name, prefix = _sample_group_for_test(reg_test.test)
        groups[group_name] = f'{prefix}{registration.lab_code}'

    if not groups:
        groups['SERUM'] = f'1{registration.lab_code}'

    return [
        {'group_name': group_name, 'barcode': barcode}
        for group_name, barcode in groups.items()
    ]


def _format_age_sex(patient):
    age = patient.age_years or 0
    gender = (patient.gender or '').lower()
    if gender == 'female':
        sex = 'F'
    elif gender == 'male':
        sex = 'M'
    else:
        sex = '—'
    return f'{age}(Y) / {sex}'


class BarcodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reg_id = request.query_params.get('id', '').strip()
        lab_code = request.query_params.get('lab_code', '').strip()

        if not reg_id and not lab_code:
            return Response({'detail': 'Provide registration id or lab code.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = Registration.objects.select_related('patient').prefetch_related('tests__test__category')
        if reg_id:
            try:
                registration = qs.get(id=int(reg_id))
            except (ValueError, Registration.DoesNotExist):
                return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                registration = qs.get(lab_code=lab_code)
            except Registration.DoesNotExist:
                return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        patient = registration.patient
        regn_dt = registration.created_at or registration.registration_date

        return Response({
            'id': registration.id,
            'lab_code': registration.lab_code,
            'patient_name': f'{patient.title} {patient.patient_name}'.strip(),
            'age_sex': _format_age_sex(patient),
            'registration_date': regn_dt.strftime('%d-%m-%Y %H:%M:%S') if regn_dt else '',
            'groups': _build_barcode_groups(registration),
        })


def _build_notification_recipients(registration):
    config = get_lab_config()
    patient = registration.patient
    patient_selected = (
        (config.sms_to_patient and bool(patient.mobile))
        or (config.email_to_patient and bool(patient.email))
        or (config.whatsapp_to_patient and bool(patient.mobile))
    )
    doctor_selected = config.sms_to_doctor or config.email_to_doctor or config.whatsapp_to_doctor
    collection_selected = config.sms_to_collection_center or config.email_to_collection_center
    affiliation_selected = (
        config.sms_to_affiliation or config.email_to_affiliation or config.whatsapp_to_affiliation
    )
    return [
        {
            'category': 'patient',
            'label': 'Patient',
            'mobile': patient.mobile or '',
            'email': patient.email or '',
            'selected': patient_selected,
        },
        {
            'category': 'doctor',
            'label': 'Doctor',
            'mobile': config.sms_to_pathologist_mobile if config.sms_to_pathologist_appointment else '',
            'email': '',
            'selected': doctor_selected,
            'reference_name': patient.doctor_name or '',
        },
        {
            'category': 'collection_center',
            'label': 'Collection Center',
            'mobile': config.sms_to_lab_mobile if config.sms_to_lab else '',
            'email': config.email_to_lab_address if config.email_to_lab else '',
            'selected': collection_selected,
            'reference_name': patient.collection_center or '',
        },
        {
            'category': 'affiliation',
            'label': 'Affiliation',
            'mobile': config.sms_to_other_mobile if config.sms_to_other else '',
            'email': '',
            'selected': affiliation_selected,
            'reference_name': patient.affiliation or '',
        },
    ]


def _build_notification_message(registration, options):
    config = get_lab_config()
    patient = registration.patient
    patient_name = f'{patient.title} {patient.patient_name}'.strip()
    tests = ', '.join(t.test.name for t in registration.tests.select_related('test').all())
    body = (
        f'Dear {patient_name}, your registration at CLASMO Diagnostics is confirmed. '
        f'Lab Code: {registration.lab_code}. Tests: {tests or "N/A"}. '
        f'Net Amount: {registration.net_amount}. Paid: {registration.paid}. Balance: {registration.balance}.'
    )
    parts = []
    show_header = options.get('show_header') or options.get('show_header_footer') or config.report_show_header
    show_footer = options.get('show_footer') or options.get('show_header_footer') or config.report_show_footer
    if show_header:
        parts.append('CLASMO Diagnostics pvt.ltd')
    parts.append(body)
    if show_footer:
        parts.append('Thank you for choosing CLASMO Diagnostics.')
    return '\n\n'.join(parts)


def _validate_notification_send(action, recipients, options):
    selected = [item for item in recipients if item.get('selected')]
    if not selected:
        return 'Select at least one recipient category.'

    needs_mobile = action in ('sms', 'whatsapp', 'sms_email', 'bill_receipt')
    needs_email = action in ('email', 'sms_email', 'bill_receipt')

    if needs_mobile and not any((item.get('mobile') or '').strip() for item in selected):
        return 'Enter mobile number for at least one selected recipient.'
    if needs_email and not any((item.get('email') or '').strip() for item in selected):
        return 'Enter email address for at least one selected recipient.'
    return None


class NotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reg_id = request.query_params.get('id', '').strip()
        if not reg_id:
            return Response({'detail': 'Provide registration id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registration = Registration.objects.select_related('patient').prefetch_related('tests__test').get(id=int(reg_id))
        except (ValueError, Registration.DoesNotExist):
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        patient = registration.patient
        return Response({
            'registration_id': registration.id,
            'lab_code': registration.lab_code,
            'patient_name': f'{patient.title} {patient.patient_name}'.strip(),
            'recipients': _build_notification_recipients(registration),
            'bill': {
                'bill_receipt_no': registration.bill_receipt_no or str(registration.id),
                'registration_date': (registration.created_at or registration.registration_date).strftime('%d-%m-%Y %H:%M:%S')
                if (registration.created_at or registration.registration_date) else '',
                'tests': [
                    {'name': t.test.name, 'price': str(t.price)}
                    for t in registration.tests.select_related('test').all()
                ],
                'total': str(registration.total),
                'discount': str(float(registration.discount_test) + float(registration.discount_regn)),
                'net_amount': str(registration.net_amount),
                'paid': str(registration.paid),
                'balance': str(registration.balance),
            },
        })

    def post(self, request):
        registration_id = request.data.get('registration_id')
        action = (request.data.get('action') or '').strip().lower()
        recipients = request.data.get('recipients') or []
        options = request.data.get('options') or {}

        if not registration_id:
            return Response({'detail': 'Registration id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_actions = {'sms', 'email', 'whatsapp', 'sms_email', 'bill_receipt'}
        if action not in valid_actions:
            return Response({'detail': 'Invalid notification action.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registration = Registration.objects.select_related('patient').prefetch_related('tests__test').get(id=int(registration_id))
        except (ValueError, Registration.DoesNotExist):
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        error = _validate_notification_send(action, recipients, options)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        message = _build_notification_message(registration, options)
        selected = [item for item in recipients if item.get('selected')]
        deliveries = []

        for item in selected:
            label = item.get('label') or item.get('category', 'Recipient')
            mobile = (item.get('mobile') or '').strip()
            email = (item.get('email') or '').strip()

            if action in ('sms', 'whatsapp', 'sms_email', 'bill_receipt') and mobile:
                deliveries.append({
                    'category': item.get('category'),
                    'label': label,
                    'channel': 'whatsapp' if action == 'whatsapp' else 'sms',
                    'target': mobile,
                    'status': 'sent',
                })
            if action in ('email', 'sms_email', 'bill_receipt') and email:
                deliveries.append({
                    'category': item.get('category'),
                    'label': label,
                    'channel': 'email',
                    'target': email,
                    'status': 'sent',
                })

        action_labels = {
            'sms': 'SMS sent successfully',
            'email': 'Email sent successfully',
            'whatsapp': 'WhatsApp message sent successfully',
            'sms_email': 'SMS and Email sent successfully',
            'bill_receipt': 'Bill receipt sent successfully',
        }

        logger.info(
            'Notification sent action=%s registration=%s user=%s deliveries=%s message=%s',
            action,
            registration.lab_code,
            request.user.username,
            deliveries,
            message,
        )

        whatsapp_deliveries = [item for item in deliveries if item.get('channel') == 'whatsapp']
        if whatsapp_deliveries:
            _log_whatsapp_deliveries(registration, request.user, whatsapp_deliveries, message)

        return Response({
            'message': action_labels[action],
            'action': action,
            'deliveries': deliveries,
            'notification_message': message,
            'merge_attachment': bool(options.get('merge_attachment', True)),
        })


def _parse_filter_date(value):
    value = (value or '').strip()
    if not value:
        return None
    for fmt in ('%d-%m-%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _log_whatsapp_deliveries(registration, user, deliveries, message=''):
    patient = registration.patient
    patient_name = f'{patient.title} {patient.patient_name}'.strip()
    referred_by = patient.doctor_name or ''
    for item in deliveries:
        if item.get('channel') != 'whatsapp':
            continue
        status_value = (item.get('status') or 'sent').lower()
        status = WhatsAppMessageLog.STATUS_SENT if status_value == 'sent' else status_value.title()
        WhatsAppMessageLog.objects.create(
            registration=registration,
            lab_code=registration.lab_code,
            patient_name=patient_name,
            mobile_no=(item.get('target') or '').strip(),
            referred_by=referred_by,
            sent_by=user,
            status=status,
            message_text=message,
        )


def _build_bulk_release_message(registration, options):
    config = get_lab_config()
    patient = registration.patient
    patient_name = f'{patient.title} {patient.patient_name}'.strip()
    body = (
        f'Dear {patient_name}, your lab report for Lab Code {registration.lab_code} '
        f'is now ready. Please visit CLASMO Diagnostics to collect your report.'
    )
    parts = []
    if options.get('show_header_on_report', config.report_show_header):
        parts.append('CLASMO Diagnostics pvt.ltd')
    parts.append(body)
    if options.get('show_footer_on_report', config.report_show_footer):
        parts.append('Thank you for choosing CLASMO Diagnostics.')
    return '\n\n'.join(parts)


def _validate_bulk_notification(action, options):
    sms_flags = ['sms_to_patient', 'sms_to_collection_center', 'sms_to_affiliation']
    email_flags = ['email_to_patient', 'email_to_collection_center', 'email_to_affiliation']

    if action in ('sms', 'whatsapp') and not any(options.get(flag) for flag in sms_flags):
        return 'Select at least one SMS recipient option.'
    if action == 'email' and not any(options.get(flag) for flag in email_flags):
        return 'Select at least one Email recipient option.'
    if action == 'sms_email':
        has_sms = any(options.get(flag) for flag in sms_flags)
        has_email = any(options.get(flag) for flag in email_flags)
        if not has_sms and not has_email:
            return 'Select at least one SMS or Email recipient option.'
    return None


def _bulk_deliveries_for_registration(registration, action, options):
    config = get_lab_config()
    patient = registration.patient
    deliveries = []

    def add_delivery(channel, category, label, target):
        if target:
            deliveries.append({
                'registration_id': registration.id,
                'lab_code': registration.lab_code,
                'category': category,
                'label': label,
                'channel': channel,
                'target': target,
                'status': 'sent',
            })

    mobile = (patient.mobile or '').strip()
    email = (patient.email or '').strip()

    if options.get('sms_to_patient', config.sms_to_patient) and mobile and action in ('sms', 'whatsapp', 'sms_email'):
        channel = 'whatsapp' if action == 'whatsapp' else 'sms'
        add_delivery(channel, 'patient', 'Patient', mobile)

    if options.get('email_to_patient', config.email_to_patient) and email and action in ('email', 'sms_email'):
        add_delivery('email', 'patient', 'Patient', email)

    if options.get('sms_to_collection_center', config.sms_to_collection_center) and mobile and action in ('sms', 'whatsapp', 'sms_email'):
        channel = 'whatsapp' if action == 'whatsapp' else 'sms'
        add_delivery(channel, 'collection_center', 'Collection Center', mobile)

    if options.get('email_to_collection_center', config.email_to_collection_center) and email and action in ('email', 'sms_email'):
        add_delivery('email', 'collection_center', 'Collection Center', email)

    if options.get('sms_to_affiliation', config.sms_to_affiliation) and mobile and action in ('sms', 'whatsapp', 'sms_email'):
        channel = 'whatsapp' if action == 'whatsapp' else 'sms'
        add_delivery(channel, 'affiliation', 'Affiliation', mobile)

    if options.get('email_to_affiliation') and email and action in ('email', 'sms_email'):
        add_delivery('email', 'affiliation', 'Affiliation', email)

    return deliveries


class BulkNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        registration_ids = request.data.get('registration_ids') or []
        action = (request.data.get('action') or '').strip().lower()
        options = request.data.get('options') or {}

        if not registration_ids:
            return Response({'detail': 'Select at least one registration.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_actions = {'sms', 'email', 'whatsapp', 'sms_email'}
        if action not in valid_actions:
            return Response({'detail': 'Invalid bulk notification action.'}, status=status.HTTP_400_BAD_REQUEST)

        error = _validate_bulk_notification(action, options)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ids = [int(value) for value in registration_ids]
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid registration ids.'}, status=status.HTTP_400_BAD_REQUEST)

        registrations = Registration.objects.filter(id__in=ids).select_related('patient').prefetch_related('tests__test')
        if not registrations.exists():
            return Response({'detail': 'No registrations found.'}, status=status.HTTP_404_NOT_FOUND)

        deliveries = []
        skipped = []

        for registration in registrations:
            message = _build_bulk_release_message(registration, options)
            reg_deliveries = _bulk_deliveries_for_registration(registration, action, options)
            if reg_deliveries:
                deliveries.extend(reg_deliveries)
                whatsapp_deliveries = [item for item in reg_deliveries if item.get('channel') == 'whatsapp']
                if whatsapp_deliveries:
                    _log_whatsapp_deliveries(registration, request.user, whatsapp_deliveries, message)
                logger.info(
                    'Bulk notification sent action=%s registration=%s user=%s deliveries=%s message=%s',
                    action,
                    registration.lab_code,
                    request.user.username,
                    reg_deliveries,
                    message,
                )
            else:
                skipped.append({
                    'registration_id': registration.id,
                    'lab_code': registration.lab_code,
                    'reason': 'No contact details available for selected recipients.',
                })

        if not deliveries:
            return Response({
                'detail': 'No messages sent. Selected recipients have no contact details in the records.',
                'skipped': skipped,
            }, status=status.HTTP_400_BAD_REQUEST)

        action_labels = {
            'sms': 'Bulk SMS sent successfully',
            'email': 'Bulk Email sent successfully',
            'whatsapp': 'Bulk WhatsApp messages sent successfully',
            'sms_email': 'Bulk SMS and Email sent successfully',
        }

        return Response({
            'message': action_labels[action],
            'action': action,
            'sent_count': len(deliveries),
            'registration_count': registrations.count(),
            'skipped_count': len(skipped),
            'deliveries': deliveries,
            'skipped': skipped,
        })


def _format_receipt_date_print(dt):
    if not dt:
        return ''
    hour = dt.hour % 12 or 12
    ampm = 'am' if dt.hour < 12 else 'pm'
    return f'{dt.day:02d}/{dt.month:02d}/{dt.year} {hour}:{dt.minute:02d}:{dt.second:02d} {ampm}'


def _build_bill_receipt_payload(registration):
    patient = registration.patient
    regn_dt = registration.created_at or registration.registration_date
    gender = 'Female' if patient.gender == 'female' else 'Male' if patient.gender == 'male' else '—'
    age_parts = []
    if patient.age_years:
        age_parts.append(f'{patient.age_years}Yrs')
    if patient.age_months:
        age_parts.append(f'{patient.age_months}M')
    if patient.age_days:
        age_parts.append(f'{patient.age_days}D')

    tests = [
        {
            'id': rt.id,
            'test_id': rt.test_id,
            'name': rt.test.name,
            'price': str(rt.price),
        }
        for rt in registration.tests.select_related('test').all()
    ]
    sub_total = sum(float(t['price']) for t in tests) or float(registration.total or 0)

    return {
        'registration_id': registration.id,
        'lab_code': registration.lab_code,
        'receipt_date': regn_dt.strftime('%d-%m-%Y %I:%M %p') if regn_dt else '',
        'receipt_date_print': _format_receipt_date_print(regn_dt),
        'patient': {
            'name': f'{patient.title} {patient.patient_name}'.strip().upper(),
            'address': patient.address or '',
            'mobile': patient.mobile or '',
            'gender': gender,
            'email': patient.email or '',
            'age_display': ' '.join(age_parts) or '—',
            'doctor_name': patient.doctor_name or patient.affiliation or '—',
        },
        'tests': tests,
        'discount_test': str(registration.discount_test),
        'discount_regn': str(registration.discount_regn),
        'discount_type': registration.discount_type or 'Amt',
        'discount_reason': registration.discount_reason or '',
        'discount_authorization': registration.discount_authorization or '',
        'visiting_charges': str(registration.visiting_charges),
        'total': str(registration.total or sub_total),
        'sub_total': str(sub_total),
        'net_amount': str(registration.net_amount),
        'paid': str(registration.paid),
        'balance': str(registration.balance),
        'refund_amount': str(registration.refund_amount),
        'recovery_amount': str(registration.recovery_amount),
        'payment_method': registration.payment_method or 'cash',
        'bill_receipt_no': registration.bill_receipt_no or '',
    }


class BillReceiptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get('ids', '').strip()
        reg_id = request.query_params.get('id', '').strip()

        if ids_param:
            try:
                ids = [int(value) for value in ids_param.split(',') if value.strip()]
            except ValueError:
                return Response({'detail': 'Invalid registration ids.'}, status=status.HTTP_400_BAD_REQUEST)

            if not ids:
                return Response({'detail': 'Provide registration ids.'}, status=status.HTTP_400_BAD_REQUEST)

            registrations = Registration.objects.filter(id__in=ids).select_related('patient').prefetch_related('tests__test')
            by_id = {registration.id: registration for registration in registrations}
            receipts = [_build_bill_receipt_payload(by_id[reg_id]) for reg_id in ids if reg_id in by_id]

            if not receipts:
                return Response({'detail': 'No registrations found.'}, status=status.HTTP_404_NOT_FOUND)

            return Response({'receipts': receipts})

        if not reg_id:
            return Response({'detail': 'Provide registration id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registration = Registration.objects.select_related('patient').prefetch_related('tests__test').get(id=int(reg_id))
        except (ValueError, Registration.DoesNotExist):
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(_build_bill_receipt_payload(registration))

    def patch(self, request):
        reg_id = request.data.get('registration_id')
        if not reg_id:
            return Response({'detail': 'Registration id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registration = Registration.objects.select_related('patient').prefetch_related('tests__test').get(id=int(reg_id))
        except (ValueError, Registration.DoesNotExist):
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        from decimal import Decimal

        discount_test = Decimal(str(request.data.get('discount_test', registration.discount_test)))
        discount_regn = Decimal(str(request.data.get('discount_regn', registration.discount_regn)))
        visiting_charges = Decimal(str(request.data.get('visiting_charges', registration.visiting_charges)))
        paid = Decimal(str(request.data.get('paid', registration.paid)))
        refund_amount = Decimal(str(request.data.get('refund_amount', registration.refund_amount)))
        pay_balance = Decimal(str(request.data.get('pay_balance', 0) or 0))

        registration.discount_test = discount_test
        registration.discount_regn = discount_regn
        registration.discount_type = request.data.get('discount_type', registration.discount_type) or 'Amt'
        registration.discount_reason = request.data.get('discount_reason', registration.discount_reason) or ''
        registration.discount_authorization = request.data.get('discount_authorization', registration.discount_authorization) or ''
        registration.visiting_charges = visiting_charges
        registration.payment_method = request.data.get('payment_method', registration.payment_method) or 'cash'
        registration.bill_receipt_no = request.data.get('bill_receipt_no', registration.bill_receipt_no or '')
        registration.refund_amount = refund_amount

        if pay_balance > 0:
            paid += pay_balance

        sub_total = sum(float(rt.price) for rt in registration.tests.all()) or float(registration.total or 0)
        registration.total = Decimal(str(sub_total))
        net_amount = registration.total - discount_test - discount_regn + visiting_charges
        registration.net_amount = net_amount
        registration.paid = paid
        registration.balance = net_amount - paid
        registration.save()

        return Response(_build_bill_receipt_payload(registration))


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
        from . import dashboard_utils as dash

        from_date = dash.parse_dashboard_date(request.query_params.get('from_date', ''))
        to_date = dash.parse_dashboard_date(request.query_params.get('to_date', ''))
        metric = request.query_params.get('metric', 'mrp_net_amount')
        test_id = request.query_params.get('test_id')
        department_ids = [int(x) for x in request.query_params.getlist('department') if str(x).isdigit()]
        category_ids = [int(x) for x in request.query_params.getlist('category') if str(x).isdigit()]
        affiliation = request.query_params.get('affiliation', '').strip()
        affiliation_mode = request.query_params.get('affiliation_mode', 'registration')
        history_period = request.query_params.get('history_period', '1m')

        cards = dash.summary_cards(from_date, to_date)
        reg_qs = dash.registration_queryset(from_date, to_date)
        status_breakdown = {
            item['status']: item['count']
            for item in reg_qs.values('status').annotate(count=Count('id'))
        }
        department_summary = []
        for cat in TestCategory.objects.all():
            count = RegistrationTest.objects.filter(
                registration__in=reg_qs,
                test__category=cat,
            ).count()
            if count:
                department_summary.append({'department': cat.name, 'count': count})

        dept_data = dash.department_wise_summary(
            from_date, to_date,
            department_ids=department_ids or None,
            category_ids=category_ids or None,
        )

        data = {
            'from_date': request.query_params.get('from_date', ''),
            'to_date': request.query_params.get('to_date', ''),
            'metric': metric,
            'summary_cards': cards,
            'test_status_summary': dash.test_status_summary(from_date, to_date),
            'tat_summary': dash.tat_summary(
                from_date, to_date,
                test_id=int(test_id) if test_id and str(test_id).isdigit() else None,
            ),
            'department_wise': dept_data,
            'collection_center_wise': dash.collection_center_summary(from_date, to_date),
            'affiliation_wise': dash.affiliation_wise_summary(
                from_date, to_date, mode=affiliation_mode, affiliation=affiliation,
            ),
            'affiliation_history': dash.affiliation_history(from_date, to_date, period=history_period),
            'filter_options': dash.filter_options(),
            'total_registrations': cards['all']['registrations'],
            'total_revenue': cards['all']['amount_after_discount'],
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
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserRoleUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        if target.id == request.user.id:
            return Response(
                {'detail': 'You cannot change your own role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = UserRoleUpdateSerializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if user.role == User.ROLE_ADMIN:
            user.is_staff = True
        else:
            user.is_staff = False
        user.save(update_fields=['role', 'is_staff'])
        return Response(UserSerializer(user).data)


class RoleListView(generics.ListAPIView):
    queryset = LabRole.objects.all()
    serializer_class = LabRoleSerializer
    permission_classes = [permissions.IsAuthenticated]


class RoleDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request, code):
        role = get_object_or_404(LabRole, code=code)
        return Response(LabRoleSerializer(role).data)

    def patch(self, request, code):
        role = get_object_or_404(LabRole, code=code)
        serializer = LabRoleUpdateSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(LabRoleSerializer(role).data)


class MembershipTypeListView(generics.ListAPIView):
    queryset = MembershipType.objects.filter(is_active=True)
    serializer_class = MembershipTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class MembershipListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        memberships = Membership.objects.select_related('membership_type', 'created_by').order_by('-created_at')[:50]
        serializer = MembershipSerializer(memberships, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = MembershipSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        membership = serializer.save(created_by=request.user)
        return Response(
            MembershipSerializer(membership, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class CollectionCenterListCreateView(generics.ListCreateAPIView):
    serializer_class = CollectionCenterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CollectionCenter.objects.filter(is_active=True)
        name = self.request.query_params.get('name', '').strip()
        center_type = self.request.query_params.get('center_type', '').strip()
        area = self.request.query_params.get('area', '').strip()
        if name:
            qs = qs.filter(name__icontains=name)
        if center_type:
            qs = qs.filter(center_type=center_type)
        if area:
            qs = qs.filter(area__icontains=area)
        return qs.order_by('name')

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.is_default:
            CollectionCenter.objects.exclude(pk=instance.pk).update(is_default=False)


class CollectionCenterDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CollectionCenter.objects.all()
    serializer_class = CollectionCenterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_default:
            CollectionCenter.objects.exclude(pk=instance.pk).update(is_default=False)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class AreaListView(generics.ListAPIView):
    queryset = Area.objects.filter(is_active=True)
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticated]


class RateMasterListView(generics.ListAPIView):
    queryset = RateMaster.objects.filter(is_active=True)
    serializer_class = RateMasterSerializer
    permission_classes = [permissions.IsAuthenticated]


class CollectionCenterBoyListCreateView(generics.ListCreateAPIView):
    serializer_class = CollectionCenterBoySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CollectionCenterBoy.objects.filter(is_active=True).select_related('collection_center')
        params = self.request.query_params
        filters = {
            'first_name__icontains': params.get('first_name', '').strip(),
            'middle_name__icontains': params.get('middle_name', '').strip(),
            'last_name__icontains': params.get('last_name', '').strip(),
            'short_name__icontains': params.get('short_name', '').strip(),
            'mobile__icontains': params.get('mobile', '').strip(),
            'email__icontains': params.get('email', '').strip(),
            'address__icontains': params.get('address', '').strip(),
            'collection_center__name__icontains': params.get('collection_center', '').strip(),
        }
        for field, value in filters.items():
            if value:
                qs = qs.filter(**{field: value})
        age = params.get('age', '').strip()
        if age.isdigit():
            qs = qs.filter(age=int(age))
        gender = params.get('gender', '').strip()
        if gender:
            qs = qs.filter(gender=gender)
        return qs.order_by('first_name', 'last_name')


class CollectionCenterBoyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CollectionCenterBoy.objects.select_related('collection_center')
    serializer_class = CollectionCenterBoySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class DiscountReasonListCreateView(generics.ListCreateAPIView):
    serializer_class = DiscountReasonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DiscountReason.objects.filter(is_active=True)
        reason = self.request.query_params.get('reason', '').strip()
        comment = self.request.query_params.get('comment', '').strip()
        if reason:
            qs = qs.filter(reason__icontains=reason)
        if comment:
            qs = qs.filter(comment__icontains=comment)
        return qs.order_by('reason')


class DiscountReasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DiscountReason.objects.all()
    serializer_class = DiscountReasonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class DiscountAuthorityListCreateView(generics.ListCreateAPIView):
    serializer_class = DiscountAuthoritySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DiscountAuthority.objects.filter(is_active=True).select_related('authorized_user')
        name = self.request.query_params.get('authorization_name', '').strip()
        uid = self.request.query_params.get('authorization_uid', '').strip()
        mobile = self.request.query_params.get('mobile', '').strip()
        if name:
            qs = qs.filter(authorization_name__icontains=name)
        if uid:
            qs = qs.filter(authorized_user__username__icontains=uid)
        if mobile:
            qs = qs.filter(mobile__icontains=mobile)
        return qs.order_by('authorization_name')


class DiscountAuthorityDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DiscountAuthority.objects.select_related('authorized_user')
    serializer_class = DiscountAuthoritySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class WhatsAppLogListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = _parse_filter_date(request.query_params.get('start_date'))
        end_date = _parse_filter_date(request.query_params.get('end_date'))

        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except (TypeError, ValueError):
            page_size = 20

        qs = WhatsAppMessageLog.objects.select_related('sent_by').all()

        if start_date:
            qs = qs.filter(message_date__date__gte=start_date)
        if end_date:
            qs = qs.filter(message_date__date__lte=end_date)

        filter_map = {
            'lab_code': 'lab_code__icontains',
            'patient_name': 'patient_name__icontains',
            'mobile_no': 'mobile_no__icontains',
            'referred_by': 'referred_by__icontains',
            'user': 'sent_by__username__icontains',
            'status': 'status__icontains',
        }
        for param, lookup in filter_map.items():
            value = request.query_params.get(param, '').strip()
            if value:
                qs = qs.filter(**{lookup: value})

        total = qs.count()
        offset = (page - 1) * page_size
        rows = qs.order_by('-message_date')[offset:offset + page_size]
        serializer = WhatsAppMessageLogSerializer(rows, many=True)

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
        })


class ExpenseTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ExpenseType.objects.filter(is_active=True)
        name = self.request.query_params.get('name', '').strip()
        if name:
            qs = qs.filter(name__icontains=name)
        return qs.order_by('name')


class ExpenseTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ExpenseType.objects.all()
    serializer_class = ExpenseTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class DoctorListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Doctor.objects.filter(is_active=True)
        params = self.request.query_params
        filters = {
            'registration_number__icontains': params.get('registration_number', '').strip(),
            'first_name__icontains': params.get('first_name', '').strip(),
            'last_name__icontains': params.get('last_name', '').strip(),
            'mobile__icontains': params.get('mobile', '').strip(),
            'specialization__icontains': params.get('specialization', '').strip(),
            'affiliation__icontains': params.get('affiliation', '').strip(),
        }
        for lookup, value in filters.items():
            if value:
                qs = qs.filter(**{lookup: value})
        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(registration_number__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(short_name__icontains=search)
                | Q(mobile__icontains=search)
            )
        return qs.order_by('first_name', 'last_name')


class DoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class AffiliationListView(generics.ListAPIView):
    queryset = Affiliation.objects.filter(is_active=True)
    serializer_class = AffiliationSerializer
    permission_classes = [permissions.IsAuthenticated]


class SalesReferenceListView(generics.ListAPIView):
    queryset = SalesReference.objects.filter(is_active=True)
    serializer_class = SalesReferenceSerializer
    permission_classes = [permissions.IsAuthenticated]


class PatientMasterListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientMasterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Patient.objects.filter(is_active=True).select_related('family_doctor').prefetch_related('addresses')
        search = self.request.query_params.get('search', '').strip()
        medical_record_no = self.request.query_params.get('medical_record_no', '').strip()
        if medical_record_no:
            qs = qs.filter(medical_record_no__icontains=medical_record_no)
        if search:
            qs = qs.filter(
                Q(medical_record_no__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(patient_name__icontains=search)
                | Q(mobile__icontains=search)
            )
        return qs.order_by('first_name', 'last_name', 'patient_name')


class PatientMasterDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Patient.objects.select_related('family_doctor').prefetch_related('addresses')
    serializer_class = PatientMasterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class LabConfigurationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        config = LabConfiguration.get_solo()
        return Response(LabConfigurationSerializer(config, context={'request': request}).data)

    def patch(self, request):
        config = LabConfiguration.get_solo()
        serializer = LabConfigurationSerializer(
            config, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(LabConfigurationSerializer(config, context={'request': request}).data)


class LabQrCodeUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        config = LabConfiguration.get_solo()
        qr_file = request.FILES.get('lab_qr_code')
        if not qr_file:
            return Response({'detail': 'QR code file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        config.lab_qr_code = qr_file
        config.save(update_fields=['lab_qr_code', 'updated_at'])
        return Response(LabConfigurationSerializer(config, context={'request': request}).data)


class ServiceAreaPincodeListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceAreaPincodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ServiceAreaPincode.objects.filter(is_active=True)
        pincode = self.request.query_params.get('pincode', '').strip()
        if pincode:
            qs = qs.filter(pincode__icontains=pincode)
        return qs.order_by('pincode')


class ServiceAreaPincodeDetailView(generics.DestroyAPIView):
    queryset = ServiceAreaPincode.objects.all()
    serializer_class = ServiceAreaPincodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class LabActivityListCreateView(generics.ListCreateAPIView):
    serializer_class = LabActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = LabActivity.objects.filter(is_active=True).select_related('created_by')
        title = self.request.query_params.get('title', '').strip() or self.request.query_params.get('search', '').strip()
        activity_type = self.request.query_params.get('activity_type', '').strip()
        status = self.request.query_params.get('status', '').strip()
        from_date = LabActivity.parse_creation_date(self.request.query_params.get('from_date', ''))
        to_date = LabActivity.parse_creation_date(self.request.query_params.get('to_date', ''))

        if title:
            qs = qs.filter(title__icontains=title)
        if activity_type:
            qs = qs.filter(activity_type=activity_type)
        if status:
            qs = qs.filter(status=status)
        if from_date:
            qs = qs.filter(activity_date__gte=from_date)
        if to_date:
            qs = qs.filter(activity_date__lte=to_date)
        return qs.order_by('-activity_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, status=LabActivity.STATUS_PENDING)


class LabActivityDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LabActivity.objects.select_related('created_by')
    serializer_class = LabActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class JoinRequestListCreateView(generics.ListCreateAPIView):
    """POST is public (landing page form); GET requires login (admin enquiries page)."""

    serializer_class = JoinRequestSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = JoinRequest.objects.all()
        search = self.request.query_params.get('search', '').strip()
        handled = self.request.query_params.get('is_handled', '').strip()
        request_type = self.request.query_params.get('request_type', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(organization__icontains=search)
                | Q(city__icontains=search)
                | Q(branch__icontains=search)
                | Q(contact_person__icontains=search)
            )
        if handled in ('true', 'false'):
            qs = qs.filter(is_handled=(handled == 'true'))
        if request_type in (JoinRequest.TYPE_FRANCHISE, JoinRequest.TYPE_JOB):
            qs = qs.filter(request_type=request_type)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class JoinRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = JoinRequest.objects.all()
    serializer_class = JoinRequestSerializer
    permission_classes = [permissions.IsAuthenticated]


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

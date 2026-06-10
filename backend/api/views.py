from datetime import datetime

from django.db import connection
from django.db.models import Count, Q, Sum
from django.db.utils import OperationalError, ProgrammingError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
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


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            return Response({'status': 'ok', 'database': 'connected'})
        except (OperationalError, ProgrammingError) as exc:
            return Response(
                {'status': 'error', 'database': str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_ADMIN


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
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
        except (OperationalError, ProgrammingError) as exc:
            return Response(
                {'detail': 'Database is not ready. Please retry in a moment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
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

    def get_queryset(self):
        qs = Registration.objects.select_related('patient').prefetch_related('tests__test').all()
        patient_name = self.request.query_params.get('patient_name', '').strip()
        from_date = self.request.query_params.get('from_date', '').strip()
        to_date = self.request.query_params.get('to_date', '').strip()
        from_labcode = self.request.query_params.get('from_labcode', '').strip()
        to_labcode = self.request.query_params.get('to_labcode', '').strip()
        status_filter = self.request.query_params.get('status', '').strip()
        collection_center = self.request.query_params.get('collection_center', '').strip()

        if patient_name:
            qs = qs.filter(patient__patient_name__icontains=patient_name)
        if from_labcode:
            qs = qs.filter(lab_code__gte=from_labcode)
        if to_labcode:
            qs = qs.filter(lab_code__lte=to_labcode)
        if collection_center:
            qs = qs.filter(patient__collection_center__icontains=collection_center)
        if status_filter and status_filter != 'All':
            qs = qs.filter(status=status_filter)
        if from_date:
            try:
                start = datetime.strptime(from_date, '%d-%m-%Y')
                qs = qs.filter(registration_date__date__gte=start.date())
            except ValueError:
                pass
        if to_date:
            try:
                end = datetime.strptime(to_date, '%d-%m-%Y')
                qs = qs.filter(registration_date__date__lte=end.date())
            except ValueError:
                pass
        return qs.order_by('-registration_date')


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

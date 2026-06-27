from django.urls import path

from . import clinical_views, views

urlpatterns = [
    path('health/', views.HealthView.as_view(), name='health'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('tests/', views.TestListView.as_view(), name='tests'),
    path('test-categories/', views.TestCategoryListView.as_view(), name='test-categories'),
    path('registrations/', views.RegistrationSearchView.as_view(), name='registrations'),
    path('registrations/worksheet/', views.WorksheetView.as_view(), name='registration-worksheet'),
    path('registrations/create/', views.RegistrationCreateView.as_view(), name='registration-create'),
    path('registrations/next-lab-code/', views.NextLabCodeView.as_view(), name='next-lab-code'),
    path('registrations/<str:lab_code>/', views.RegistrationDetailView.as_view(), name='registration-detail'),
    path('pickup-requests/', views.PickupRequestListCreateView.as_view(), name='pickup-requests'),
    path('messages/', views.LabMessageListCreateView.as_view(), name='messages'),
    path('dashboard/summary/', views.DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('reports/summary/', views.ReportSummaryView.as_view(), name='report-summary'),
    path('users/', views.UserListView.as_view(), name='users'),
    path('search/global/', views.GlobalSearchView.as_view(), name='global-search'),
    path('test-parameters/', clinical_views.TestParameterListCreateView.as_view(), name='test-parameters'),
    path('test-parameters/<int:pk>/', clinical_views.TestParameterDetailView.as_view(), name='test-parameter-detail'),
    path('reports/<int:registration_id>/', clinical_views.ReportDetailView.as_view(), name='report-detail'),
    path('reports/<int:registration_id>/verify/', clinical_views.ReportVerifyView.as_view(), name='report-verify'),
]

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    JoinRequest,
    LoginLog,
    LabMessage,
    SelfPatientQuery,
    Patient,
    PatientSampleBarcode,
    PickupRequest,
    Registration,
    RegistrationTest,
    Report,
    ReportValue,
    Test,
    TestCategory,
    TestParameter,
    User,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Clasmo', {'fields': ('role', 'display_name', 'mobile', 'lab_code', 'save_credentials', 'save_info')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Clasmo', {'fields': ('role', 'display_name', 'mobile', 'lab_code')}),
    )
    list_display = ['username', 'display_name', 'role', 'mobile', 'lab_code', 'is_staff', 'last_login']


@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ['username_attempt', 'user', 'success', 'ip_address', 'created_at']
    list_filter = ['success', 'created_at']
    search_fields = ['username_attempt', 'user__username', 'ip_address']
    readonly_fields = ['user', 'username_attempt', 'success', 'ip_address', 'user_agent', 'created_at']


admin.site.register(TestCategory)
admin.site.register(Test)
admin.site.register(Patient)
admin.site.register(Registration)
admin.site.register(RegistrationTest)


@admin.register(PatientSampleBarcode)
class PatientSampleBarcodeAdmin(admin.ModelAdmin):
    list_display = ['barcode', 'patient', 'registration', 'sample_type', 'is_active', 'linked_at']
    list_filter = ['is_active', 'sample_type', 'linked_at']
    search_fields = ['barcode', 'patient__patient_id', 'patient__patient_name', 'registration__lab_code']


admin.site.register(PickupRequest)
admin.site.register(LabMessage)
admin.site.register(TestParameter)
admin.site.register(Report)
admin.site.register(ReportValue)


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ['request_type', 'name', 'phone', 'branch', 'contact_person', 'is_handled', 'created_at']
    list_filter = ['request_type', 'is_handled', 'created_at']
    search_fields = ['name', 'phone', 'email', 'organization', 'branch', 'contact_person']


@admin.register(SelfPatientQuery)
class SelfPatientQueryAdmin(admin.ModelAdmin):
    list_display = ['test_name', 'is_handled', 'created_at']
    list_filter = ['is_handled', 'created_at']
    search_fields = ['test_name', 'description']

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    JoinRequest,
    LoginLog,
    LabMessage,
    Patient,
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
admin.site.register(PickupRequest)
admin.site.register(LabMessage)
admin.site.register(TestParameter)
admin.site.register(Report)
admin.site.register(ReportValue)


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'organization', 'city', 'is_handled', 'created_at']
    list_filter = ['is_handled']
    search_fields = ['name', 'phone', 'email', 'organization']

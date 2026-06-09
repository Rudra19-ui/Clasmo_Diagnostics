from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
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
        ('Clasmo', {'fields': ('role', 'display_name', 'lab_code')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Clasmo', {'fields': ('role', 'display_name', 'lab_code')}),
    )
    list_display = ['username', 'display_name', 'role', 'lab_code', 'is_staff']


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

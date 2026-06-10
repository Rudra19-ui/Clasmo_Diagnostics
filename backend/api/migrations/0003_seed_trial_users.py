from django.contrib.auth.hashers import make_password
from django.db import migrations


TRIAL_USERS = [
    ('user_test', 'password123', 'user', 'CLASMO_Diag', False),
    ('admin_test', 'admin123', 'admin', 'Admin', True),
    ('technician_test', 'tech123', 'technician', 'Lab Technician', False),
    ('pathologist_test', 'patho123', 'pathologist', 'Pathologist', False),
]


def seed_trial_users(apps, schema_editor):
    User = apps.get_model('api', 'User')
    for username, password, role, display_name, is_staff in TRIAL_USERS:
        if User.objects.filter(username=username).exists():
            continue
        User.objects.create(
            username=username,
            password=make_password(password),
            role=role,
            display_name=display_name,
            lab_code='202505017',
            is_staff=is_staff,
            is_active=True,
        )


def remove_trial_users(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(
        username__in=[entry[0] for entry in TRIAL_USERS],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_alter_user_role_report_testparameter_reportvalue_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_trial_users, remove_trial_users),
    ]

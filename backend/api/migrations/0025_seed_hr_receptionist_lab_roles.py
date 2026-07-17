from django.db import migrations

from api.role_permissions import DEFAULT_ROLE_DEFINITIONS


def seed_new_lab_roles(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    new_codes = {'hr', 'receptionist'}
    for role in DEFAULT_ROLE_DEFINITIONS:
        if role['code'] not in new_codes:
            continue
        LabRole.objects.update_or_create(
            code=role['code'],
            defaults={
                'name': role['name'],
                'description': role['description'],
                'permissions': role['permissions'],
            },
        )


def unseed_new_lab_roles(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    LabRole.objects.filter(code__in=['hr', 'receptionist']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_user_hr_receptionist_roles'),
    ]

    operations = [
        migrations.RunPython(seed_new_lab_roles, unseed_new_lab_roles),
    ]

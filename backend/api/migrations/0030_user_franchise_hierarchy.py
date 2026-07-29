from django.db import migrations, models
import django.db.models.deletion

from api.role_permissions import DEFAULT_ROLE_DEFINITIONS


def seed_franchise_lab_roles(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    franchise_codes = {'super_franchisee', 'franchisee', 'sub_franchise'}
    for role in DEFAULT_ROLE_DEFINITIONS:
        if role['code'] not in franchise_codes:
            continue
        LabRole.objects.update_or_create(
            code=role['code'],
            defaults={
                'name': role['name'],
                'description': role['description'],
                'permissions': role['permissions'],
            },
        )


def unseed_franchise_lab_roles(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    LabRole.objects.filter(code__in=['super_franchisee', 'franchisee', 'sub_franchise']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_patientsamplebarcode_linked_test_ids'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('user', 'User'),
                    ('admin', 'Admin'),
                    ('hr', 'HR'),
                    ('pathologist', 'Pathologist'),
                    ('technician', 'Technician'),
                    ('receptionist', 'Receptionist'),
                    ('super_franchisee', 'Super Franchisee'),
                    ('franchisee', 'Franchisee'),
                    ('sub_franchise', 'Sub-Franchise'),
                ],
                default='user',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='parent_franchisee',
            field=models.ForeignKey(
                blank=True,
                help_text='Parent Super Franchisee or Franchisee in the management chain.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='franchise_children',
                to='api.user',
            ),
        ),
        migrations.AlterField(
            model_name='labrole',
            name='code',
            field=models.CharField(max_length=30, unique=True),
        ),
        migrations.RunPython(seed_franchise_lab_roles, unseed_franchise_lab_roles),
    ]

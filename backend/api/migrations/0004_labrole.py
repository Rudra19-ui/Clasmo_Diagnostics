from django.db import migrations, models

from api.role_permissions import DEFAULT_ROLE_DEFINITIONS


def seed_lab_roles(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    for role in DEFAULT_ROLE_DEFINITIONS:
        LabRole.objects.update_or_create(
            code=role['code'],
            defaults={
                'name': role['name'],
                'description': role['description'],
                'permissions': role['permissions'],
                'is_system': True,
            },
        )


def unseed_lab_roles(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    LabRole.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_seed_trial_users'),
    ]

    operations = [
        migrations.CreateModel(
            name='LabRole',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=20, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('permissions', models.JSONField(default=dict)),
                ('is_system', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.RunPython(seed_lab_roles, unseed_lab_roles),
    ]

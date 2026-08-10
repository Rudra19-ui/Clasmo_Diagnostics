import django.db.models.deletion
from django.db import migrations, models


def rename_franchise_role_labels(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    LabRole.objects.filter(code='super_franchisee').update(
        name='Supreme',
        description='Top-level franchise owner who manages Prime accounts.',
    )
    LabRole.objects.filter(code='franchisee').update(
        name='Prime',
        description='Prime managed by a Supreme; can oversee Sub-Franchise accounts.',
    )
    LabRole.objects.filter(code='sub_franchise').update(
        description='Sub-franchise unit managed by a Prime supervisor.',
    )


def revert_franchise_role_labels(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    LabRole.objects.filter(code='super_franchisee').update(
        name='Super Franchisee',
        description='Top-level franchise owner who manages Franchisee accounts.',
    )
    LabRole.objects.filter(code='franchisee').update(
        name='Franchisee',
        description='Franchisee managed by a Super Franchisee; can oversee Sub-Franchise accounts.',
    )
    LabRole.objects.filter(code='sub_franchise').update(
        description='Sub-franchise unit managed by a Franchisee supervisor.',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_instrument_result_ingest'),
    ]

    operations = [
        migrations.RunPython(rename_franchise_role_labels, revert_franchise_role_labels),
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
                    ('super_franchisee', 'Supreme'),
                    ('franchisee', 'Prime'),
                    ('sub_franchise', 'Sub-Franchise'),
                ],
                default='user',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='parent_franchisee',
            field=models.ForeignKey(
                blank=True,
                help_text='Parent Supreme or Prime account in the management chain.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='franchise_children',
                to='api.user',
            ),
        ),
    ]

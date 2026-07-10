from django.db import migrations, models


def seed_lab_configuration(apps, schema_editor):
    LabConfiguration = apps.get_model('api', 'LabConfiguration')
    LabConfiguration.objects.get_or_create(pk=1)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_patient_master'),
    ]

    operations = [
        migrations.CreateModel(
            name='LabConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sms_to_patient', models.BooleanField(default=False)),
                ('sms_to_doctor', models.BooleanField(default=False)),
                ('sms_to_lab', models.BooleanField(default=False)),
                ('sms_to_lab_mobile', models.CharField(blank=True, max_length=30)),
                ('sms_to_other', models.BooleanField(default=False)),
                ('sms_to_other_mobile', models.CharField(blank=True, max_length=30)),
                ('sms_to_pathologist_appointment', models.BooleanField(default=False)),
                ('sms_to_pathologist_mobile', models.CharField(blank=True, max_length=30)),
                ('sms_to_collection_center', models.BooleanField(default=False)),
                ('sms_to_affiliation', models.BooleanField(default=False)),
                ('email_to_patient', models.BooleanField(default=True)),
                ('email_to_doctor', models.BooleanField(default=True)),
                ('email_to_lab', models.BooleanField(default=True)),
                ('email_to_lab_address', models.EmailField(blank=True, max_length=254)),
                ('email_to_collection_center', models.BooleanField(default=True)),
                ('email_to_affiliation', models.BooleanField(default=False)),
                ('whatsapp_to_patient', models.BooleanField(default=True)),
                ('whatsapp_to_doctor', models.BooleanField(default=False)),
                ('whatsapp_to_affiliation', models.BooleanField(default=False)),
                ('whatsapp_to_autorelease', models.BooleanField(default=False)),
                ('lab_code_prefix', models.CharField(default='1', max_length=20)),
                ('lab_code_start', models.CharField(default='69', max_length=20)),
                ('lab_code_frequency', models.CharField(choices=[('daily', 'Daily'), ('monthly', 'Monthly'), ('yearly', 'Yearly')], default='daily', max_length=20)),
                ('lab_code_auto_increment', models.BooleanField(default=True)),
                ('report_show_header', models.BooleanField(default=True)),
                ('report_show_footer', models.BooleanField(default=True)),
                ('allow_print_without_approve', models.BooleanField(default=False)),
                ('reprint_report_roles', models.CharField(default='Admin,Pathologis', max_length=200)),
                ('test_auto_approval', models.BooleanField(default=False)),
                ('auto_registration_transfer', models.BooleanField(default=False)),
                ('mera_batuva_token_id', models.CharField(blank=True, max_length=200)),
                ('mera_batuva_instance_id', models.CharField(blank=True, max_length=200)),
                ('lab_qr_code', models.ImageField(blank=True, null=True, upload_to='lab_qr/')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Lab configuration',
            },
        ),
        migrations.RunPython(seed_lab_configuration, migrations.RunPython.noop),
    ]

# Generated manually for SampleRejection

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0043_registration_clinical_pdf'),
    ]

    operations = [
        migrations.CreateModel(
            name='SampleRejection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('barcode', models.CharField(blank=True, db_index=True, max_length=100)),
                ('reason', models.CharField(blank=True, max_length=500)),
                ('rejected_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('entry_initiated_by', models.ForeignKey(
                    blank=True,
                    help_text='User/franchise who created the registration (visibility scope).',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sample_rejections_on_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('registration', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sample_rejections',
                    to='api.registration',
                )),
                ('rejected_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sample_rejections_made',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('resolved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sample_rejections_resolved',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('zone', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sample_rejections',
                    to='api.zone',
                )),
            ],
            options={
                'ordering': ['-rejected_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='samplerejection',
            index=models.Index(fields=['is_active', 'zone', '-rejected_at'], name='api_sample_is_acti_rej_z_idx'),
        ),
        migrations.AddIndex(
            model_name='samplerejection',
            index=models.Index(fields=['is_active', 'entry_initiated_by', '-rejected_at'], name='api_sample_is_acti_rej_e_idx'),
        ),
    ]

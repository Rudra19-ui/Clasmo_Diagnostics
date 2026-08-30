from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0049_extra_sample'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BarcodeScanLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('barcode', models.CharField(db_index=True, max_length=100)),
                ('lab_code', models.CharField(blank=True, db_index=True, max_length=20)),
                ('patient_name', models.CharField(blank=True, max_length=200)),
                ('sample_type', models.CharField(blank=True, max_length=100)),
                ('scanned_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('registration', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='barcode_scan_logs',
                    to='api.registration',
                )),
                ('scanned_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='barcode_scan_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('zone', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='barcode_scan_logs',
                    to='api.zone',
                )),
            ],
            options={
                'ordering': ['-scanned_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='barcodescanlog',
            index=models.Index(fields=['zone', '-scanned_at'], name='api_barcode_zone_sc_idx'),
        ),
    ]

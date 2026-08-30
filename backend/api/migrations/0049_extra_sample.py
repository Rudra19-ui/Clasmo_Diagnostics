from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0048_labconfiguration_next_patient_sequence'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ExtraSample',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('barcode', models.CharField(db_index=True, max_length=100)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('added_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='extra_samples_added',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('zone', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='extra_samples',
                    to='api.zone',
                )),
            ],
            options={
                'ordering': ['-added_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='extrasample',
            index=models.Index(fields=['is_active', 'zone', '-added_at'], name='api_extrasa_is_acti_idx'),
        ),
        migrations.AddConstraint(
            model_name='extrasample',
            constraint=models.UniqueConstraint(
                condition=models.Q(('is_active', True)),
                fields=('zone', 'barcode'),
                name='uniq_active_extra_sample_barcode_per_zone',
            ),
        ),
    ]

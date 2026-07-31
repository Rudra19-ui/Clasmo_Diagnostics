from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_testparameter_sample_value'),
    ]

    operations = [
        migrations.AddField(
            model_name='testparameter',
            name='analyzer_code',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Instrument / hematology analyzer analyte code (e.g. HGB, WBC, PLT)',
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name='reportvalue',
            name='source',
            field=models.CharField(
                choices=[('manual', 'Manual'), ('machine', 'Machine')],
                default='manual',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='InstrumentResultBatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('barcode', models.CharField(db_index=True, max_length=100)),
                ('instrument_id', models.CharField(blank=True, max_length=100)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('matched_count', models.PositiveIntegerField(default=0)),
                ('unmatched_codes', models.JSONField(blank=True, default=list)),
                ('status', models.CharField(
                    choices=[
                        ('applied', 'Applied'),
                        ('partial', 'Partial'),
                        ('failed', 'Failed'),
                    ],
                    default='failed',
                    max_length=20,
                )),
                ('message', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='instrument_batches',
                    to='api.user',
                )),
                ('registration', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='instrument_batches',
                    to='api.registration',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]

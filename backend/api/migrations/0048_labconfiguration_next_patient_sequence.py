from django.db import migrations, models
from django.db.models import IntegerField, Max
from django.db.models.functions import Cast


def backfill_patient_sequence(apps, schema_editor):
    LabConfiguration = apps.get_model('api', 'LabConfiguration')
    Patient = apps.get_model('api', 'Patient')
    agg = Patient.objects.exclude(patient_id='').aggregate(
        max_num=Max(Cast('patient_id', IntegerField())),
    )
    sequence = int(agg['max_num'] or 0)
    LabConfiguration.objects.update_or_create(pk=1, defaults={'next_patient_sequence': sequence})


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0047_outsource_transfer_test_ids'),
    ]

    operations = [
        migrations.AddField(
            model_name='labconfiguration',
            name='next_patient_sequence',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Last allocated numeric patient ID; 0 means backfill from patients on first use.',
            ),
        ),
        migrations.RunPython(backfill_patient_sequence, migrations.RunPython.noop),
    ]

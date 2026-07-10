from datetime import datetime

from django.db import migrations, models


def backfill_activity_dates(apps, schema_editor):
    LabActivity = apps.get_model('api', 'LabActivity')
    for activity in LabActivity.objects.all():
        text = (activity.creation_date or '').strip()
        parsed = None
        for fmt in ('%d/%m/%Y', '%d-%m-%Y'):
            try:
                parsed = datetime.strptime(text, fmt).date()
                break
            except ValueError:
                continue
        if parsed:
            activity.activity_date = parsed
            activity.save(update_fields=['activity_date'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_labactivity'),
    ]

    operations = [
        migrations.AddField(
            model_name='labactivity',
            name='activity_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='labactivity',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='labactivity',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed')], default='pending', max_length=20),
        ),
        migrations.RunPython(backfill_activity_dates, migrations.RunPython.noop),
        migrations.AlterModelOptions(
            name='labactivity',
            options={'ordering': ['-activity_date', '-created_at'], 'verbose_name_plural': 'Lab activities'},
        ),
    ]

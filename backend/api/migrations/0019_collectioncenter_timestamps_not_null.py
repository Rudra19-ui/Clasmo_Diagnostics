from django.db import migrations, models
from django.utils import timezone


def backfill_timestamps(apps, schema_editor):
    CollectionCenter = apps.get_model('api', 'CollectionCenter')
    now = timezone.now()
    CollectionCenter.objects.filter(created_at__isnull=True).update(created_at=now)
    CollectionCenter.objects.filter(updated_at__isnull=True).update(updated_at=now)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_joinrequest'),
    ]

    operations = [
        migrations.RunPython(backfill_timestamps, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='collectioncenter',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='collectioncenter',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

from decimal import Decimal

from django.db import migrations, models


def forwards(apps, schema_editor):
    Test = apps.get_model('api', 'Test')
    for test in Test.objects.all():
        if not test.mrp:
            test.mrp = test.price
            test.save(update_fields=['mrp'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_selfpatientquery'),
    ]

    operations = [
        migrations.AddField(
            model_name='test',
            name='mrp',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=10),
        ),
        migrations.AddField(
            model_name='test',
            name='sample_type',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]

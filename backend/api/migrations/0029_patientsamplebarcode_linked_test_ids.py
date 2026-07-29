from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0028_patientsamplebarcode'),
    ]

    operations = [
        migrations.AddField(
            model_name='patientsamplebarcode',
            name='linked_test_ids',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

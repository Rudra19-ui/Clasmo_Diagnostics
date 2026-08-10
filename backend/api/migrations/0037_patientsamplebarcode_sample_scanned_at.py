from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_test_section_catalog'),
    ]

    operations = [
        migrations.AddField(
            model_name='patientsamplebarcode',
            name='sample_scanned_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

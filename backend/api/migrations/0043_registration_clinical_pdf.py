# Generated manually for Registration.clinical_pdf

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0042_registration_test_hold'),
    ]

    operations = [
        migrations.AddField(
            model_name='registration',
            name='clinical_pdf',
            field=models.FileField(blank=True, null=True, upload_to='clinical-history/'),
        ),
    ]

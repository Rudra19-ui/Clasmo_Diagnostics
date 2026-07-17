from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_joinrequest_franchise_job_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('user', 'User'),
                    ('admin', 'Admin'),
                    ('hr', 'HR'),
                    ('pathologist', 'Pathologist'),
                    ('technician', 'Technician'),
                    ('receptionist', 'Receptionist'),
                ],
                default='user',
                max_length=20,
            ),
        ),
    ]

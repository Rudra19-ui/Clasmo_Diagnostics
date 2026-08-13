# Generated manually for Super Admin role

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0039_pricing_commission_wallet'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('user', 'User'),
                    ('super_admin', 'Super Admin'),
                    ('admin', 'Admin'),
                    ('hr', 'HR'),
                    ('pathologist', 'Pathologist'),
                    ('technician', 'Technician'),
                    ('receptionist', 'Receptionist'),
                    ('super_franchisee', 'Supreme'),
                    ('franchisee', 'Prime'),
                    ('sub_franchise', 'Sub-Franchise'),
                ],
                default='user',
                max_length=30,
            ),
        ),
    ]

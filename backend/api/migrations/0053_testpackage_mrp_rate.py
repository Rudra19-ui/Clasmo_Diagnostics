from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0052_test_report_detail_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='testpackage',
            name='mrp',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0'),
                help_text='Profile MRP shown to the patient.',
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name='testpackage',
            name='rate',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0'),
                help_text='Profile rate charged for this combination.',
                max_digits=10,
            ),
        ),
    ]

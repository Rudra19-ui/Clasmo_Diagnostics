import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0050_barcode_scan_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='reportformatasset',
            name='test',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional link to the catalog test this sample report belongs to.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='report_formats',
                to='api.test',
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0046_outsource_transfer'),
    ]

    operations = [
        migrations.AddField(
            model_name='outsourcetransfer',
            name='registration_test_ids',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

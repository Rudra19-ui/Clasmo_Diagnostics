from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_fix_model_state_drift'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='mobile',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]

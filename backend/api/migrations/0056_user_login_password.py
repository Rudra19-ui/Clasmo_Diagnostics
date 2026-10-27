from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0055_split_price_and_mrp_visibility'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='login_password',
            field=models.CharField(blank=True, default='', max_length=128),
        ),
    ]

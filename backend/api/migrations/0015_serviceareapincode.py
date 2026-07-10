from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_labconfiguration'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceAreaPincode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pincode', models.CharField(max_length=20, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Service area pincode',
                'ordering': ['pincode'],
            },
        ),
    ]

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0015_serviceareapincode'),
    ]

    operations = [
        migrations.CreateModel(
            name='LabActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('creation_date', models.CharField(max_length=20)),
                ('activity_type', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('one_time', 'One Time')], default='daily', max_length=20)),
                ('eta', models.CharField(blank=True, max_length=100)),
                ('remark', models.CharField(blank=True, max_length=200)),
                ('notes', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Lab activities',
                'ordering': ['-created_at'],
            },
        ),
    ]

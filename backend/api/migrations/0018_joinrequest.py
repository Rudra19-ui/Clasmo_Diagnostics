from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_labactivity_checklist_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='JoinRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('phone', models.CharField(max_length=20)),
                ('organization', models.CharField(blank=True, max_length=200)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('message', models.TextField(blank=True)),
                ('is_handled', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Join request',
                'ordering': ['-created_at'],
            },
        ),
    ]

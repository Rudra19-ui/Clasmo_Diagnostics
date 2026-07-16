from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_user_mobile'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='save_credentials',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='save_info',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='LoginLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username_attempt', models.CharField(max_length=150)),
                ('success', models.BooleanField(default=False)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='login_logs', to='api.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_discountreason'),
    ]

    operations = [
        migrations.CreateModel(
            name='DiscountAuthority',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('authorization_name', models.CharField(max_length=200)),
                ('mobile', models.CharField(blank=True, max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('authorized_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='discount_authorities', to='api.user')),
            ],
            options={
                'verbose_name_plural': 'Discount authorities',
                'ordering': ['authorization_name'],
            },
        ),
    ]

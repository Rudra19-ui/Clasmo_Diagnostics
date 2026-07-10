from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0008_discountauthority'),
    ]

    operations = [
        migrations.CreateModel(
            name='WhatsAppMessageLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message_date', models.DateTimeField(auto_now_add=True)),
                ('lab_code', models.CharField(max_length=50)),
                ('patient_name', models.CharField(max_length=200)),
                ('mobile_no', models.CharField(max_length=20)),
                ('referred_by', models.CharField(blank=True, max_length=200)),
                ('status', models.CharField(choices=[('Sent', 'Sent'), ('Failed', 'Failed'), ('Pending', 'Pending')], default='Sent', max_length=20)),
                ('message_text', models.TextField(blank=True)),
                ('registration', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whatsapp_logs', to='api.registration')),
                ('sent_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whatsapp_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'WhatsApp message log',
                'ordering': ['-message_date'],
            },
        ),
    ]

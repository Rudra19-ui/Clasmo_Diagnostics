# Generated manually for RegistrationTestHold

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0041_franchise_test_rate'),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistrationTestHold',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('held_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('released_at', models.DateTimeField(blank=True, null=True)),
                ('held_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='holds_placed', to=settings.AUTH_USER_MODEL)),
                ('registration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_holds', to='api.registration')),
                ('registration_test', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='holds', to='api.registrationtest')),
                ('released_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='holds_released', to=settings.AUTH_USER_MODEL)),
                ('zone', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='test_holds', to='api.zone')),
            ],
            options={
                'ordering': ['-held_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='registrationtesthold',
            index=models.Index(fields=['is_active', 'zone', '-held_at'], name='api_registr_is_acti_7f2a1c_idx'),
        ),
        migrations.AddConstraint(
            model_name='registrationtesthold',
            constraint=models.UniqueConstraint(condition=models.Q(('is_active', True)), fields=('registration_test',), name='unique_active_hold_per_registration_test'),
        ),
    ]

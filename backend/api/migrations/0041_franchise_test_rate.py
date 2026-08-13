# Generated manually for FranchiseTestRate

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_super_admin_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='FranchiseTestRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rate_pct', models.DecimalField(decimal_places=2, default=100, help_text='% of MRP charged to this franchise for the test.', max_digits=6)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('franchise_user', models.ForeignKey(help_text='Franchise account this rate applies to (usually Supreme).', on_delete=django.db.models.deletion.CASCADE, related_name='test_rates', to=settings.AUTH_USER_MODEL)),
                ('test', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='franchise_rates', to='api.test')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='franchise_test_rates_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['test__name', 'id'],
            },
        ),
        migrations.AddConstraint(
            model_name='franchisetestrate',
            constraint=models.UniqueConstraint(fields=('franchise_user', 'test'), name='unique_franchise_test_rate'),
        ),
    ]

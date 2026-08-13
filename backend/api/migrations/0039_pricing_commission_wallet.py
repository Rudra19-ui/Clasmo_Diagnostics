# Generated manually for ZoneFranchiseRate and FranchisePricingOverride

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0038_zone_structure'),
    ]

    operations = [
        migrations.CreateModel(
            name='ZoneFranchiseRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('super_franchisee_price_pct', models.DecimalField(decimal_places=2, default=100, help_text='% of MRP charged to Supreme when booking.', max_digits=5)),
                ('franchisee_price_pct', models.DecimalField(decimal_places=2, default=100, help_text='% of MRP charged to Prime when booking.', max_digits=5)),
                ('sub_franchise_price_pct', models.DecimalField(decimal_places=2, default=100, help_text='% of MRP charged to Sub-Franchise when booking.', max_digits=5)),
                ('super_franchisee_commission_pct', models.DecimalField(decimal_places=2, default=2, help_text='Commission % credited to Supreme.', max_digits=5)),
                ('franchisee_commission_pct', models.DecimalField(decimal_places=2, default=3, help_text='Commission % credited to Prime.', max_digits=5)),
                ('sub_franchise_commission_pct', models.DecimalField(decimal_places=2, default=5, help_text='Commission % credited to Sub-Franchise.', max_digits=5)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_zone_franchise_rates', to=settings.AUTH_USER_MODEL)),
                ('zone', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='franchise_rate', to='api.zone')),
            ],
            options={
                'verbose_name': 'Zone franchise rate',
                'ordering': ['zone__sort_order', 'zone_id'],
            },
        ),
        migrations.CreateModel(
            name='FranchisePricingOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('target_role', models.CharField(choices=[('franchisee', 'Prime (Franchise)'), ('sub_franchise', 'Sub-Franchise')], max_length=30)),
                ('price_pct_of_mrp', models.DecimalField(decimal_places=2, default=100, help_text='% of catalog MRP charged to the downstream role.', max_digits=5)),
                ('commission_pct', models.DecimalField(blank=True, decimal_places=2, help_text='Optional commission override for the target role.', max_digits=5, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('set_by', models.ForeignKey(help_text='Supreme sets Prime rates; Prime sets Sub-Franchise rates.', on_delete=django.db.models.deletion.CASCADE, related_name='pricing_overrides_set', to=settings.AUTH_USER_MODEL)),
                ('zone', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pricing_overrides', to='api.zone')),
            ],
            options={
                'ordering': ['zone__sort_order', 'set_by_id', 'target_role'],
            },
        ),
        migrations.AddConstraint(
            model_name='franchisepricingoverride',
            constraint=models.UniqueConstraint(fields=('zone', 'set_by', 'target_role'), name='unique_pricing_override_per_setter'),
        ),
    ]

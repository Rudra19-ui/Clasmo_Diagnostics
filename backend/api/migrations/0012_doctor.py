from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_collectioncenter_extended'),
    ]

    operations = [
        migrations.CreateModel(
            name='Affiliation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name_plural': 'Affiliations',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='SalesReference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name_plural': 'Sales references',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Doctor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('registration_number', models.CharField(max_length=50, unique=True)),
                ('first_name', models.CharField(max_length=100)),
                ('middle_name', models.CharField(blank=True, max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('short_name', models.CharField(blank=True, max_length=50)),
                ('gender', models.CharField(blank=True, choices=[('male', 'Male'), ('female', 'Female')], max_length=10)),
                ('age', models.PositiveIntegerField(blank=True, null=True)),
                ('date_of_birth', models.CharField(blank=True, max_length=20)),
                ('specialization', models.CharField(blank=True, max_length=200)),
                ('telephone_office', models.CharField(blank=True, max_length=30)),
                ('telephone_residence', models.CharField(blank=True, max_length=30)),
                ('mobile', models.CharField(max_length=20)),
                ('default_contact', models.CharField(blank=True, choices=[('office', 'Office'), ('mobile', 'Mobile'), ('residence', 'Residence')], default='office', max_length=20)),
                ('email', models.EmailField(max_length=254)),
                ('alternate_email', models.EmailField(blank=True, max_length=254)),
                ('address_line1', models.CharField(max_length=200)),
                ('address_line2', models.CharField(blank=True, max_length=200)),
                ('address_line3', models.CharField(blank=True, max_length=200)),
                ('country', models.CharField(blank=True, max_length=100)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('pincode', models.CharField(blank=True, max_length=20)),
                ('address_type', models.CharField(blank=True, choices=[('office', 'Office'), ('residence', 'Residence')], default='office', max_length=20)),
                ('is_default_address', models.BooleanField(default=False)),
                ('affiliation', models.CharField(blank=True, max_length=200)),
                ('sales_reference', models.CharField(blank=True, max_length=200)),
                ('commission_applicable', models.BooleanField(default=False)),
                ('is_postpaid', models.BooleanField(default=False)),
                ('invoice_payment_period_days', models.PositiveIntegerField(default=0)),
                ('credit_limit', models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=12)),
                ('communication_language', models.CharField(blank=True, max_length=100)),
                ('comment', models.TextField(blank=True)),
                ('report_print_exception', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['first_name', 'last_name'],
            },
        ),
    ]

from decimal import Decimal

from django.db import migrations, models


DEFAULT_AREAS = [
    'PUNE',
    'Amravati',
    'Nagpur',
    'Paratwada',
    'Anjangaon',
    'Daryapur',
    'Murtizapur',
    'Akola',
]

DEFAULT_RATE_MASTERS = ['MRP', 'B2B', 'DEMO']


def seed_lookups(apps, schema_editor):
    Area = apps.get_model('api', 'Area')
    RateMaster = apps.get_model('api', 'RateMaster')
    for name in DEFAULT_AREAS:
        Area.objects.update_or_create(name=name, defaults={'is_active': True})
    for name in DEFAULT_RATE_MASTERS:
        RateMaster.objects.update_or_create(name=name, defaults={'is_active': True})


def unseed_lookups(apps, schema_editor):
    Area = apps.get_model('api', 'Area')
    RateMaster = apps.get_model('api', 'RateMaster')
    Area.objects.filter(name__in=DEFAULT_AREAS).delete()
    RateMaster.objects.filter(name__in=DEFAULT_RATE_MASTERS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_expensetype'),
    ]

    operations = [
        migrations.CreateModel(
            name='Area',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name_plural': 'Areas',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='RateMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name_plural': 'Rate masters',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='address_line1',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='address_line2',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='address_line3',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='area',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='auto_increment',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='billing_type',
            field=models.CharField(blank=True, choices=[('prepaid', 'IsPrepaid'), ('postpaid', 'IsPostpaid'), ('none', 'None')], default='none', max_length=20),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='center_type',
            field=models.CharField(blank=True, choices=[('internal', 'Internal'), ('external', 'External')], max_length=20),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='city',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='comment',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='country',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='credit_balance',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=12),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='credit_limit',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=12),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='frequency',
            field=models.CharField(blank=True, choices=[('daily', 'Daily'), ('monthly', 'Monthly'), ('yearly', 'Yearly')], max_length=20),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='has_result_sms',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='invoice_payment_period_days',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='is_default',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='labcode',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='labcode_short_name',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='labcode_start',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='ledger_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='mobile',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='party_type',
            field=models.CharField(blank=True, choices=[('cash_party', 'Cash Party'), ('credit_party', 'Credit Party')], max_length=20),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='pincode',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='rate_master',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='report_print_exception',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='state',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AddField(
            model_name='collectioncenter',
            name='voucher_type',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.RunPython(seed_lookups, unseed_lookups),
    ]

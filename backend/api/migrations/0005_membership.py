from django.db import migrations, models


DEFAULT_MEMBERSHIP_TYPES = [
    {'name': 'Gold', 'duration_months': 12, 'description': 'Annual gold membership with priority benefits.'},
    {'name': 'Silver', 'duration_months': 6, 'description': 'Six-month silver membership plan.'},
    {'name': 'Platinum', 'duration_months': 24, 'description': 'Premium two-year platinum membership.'},
    {'name': 'Family', 'duration_months': 12, 'description': 'Family membership covering multiple members.'},
]


def seed_membership_types(apps, schema_editor):
    MembershipType = apps.get_model('api', 'MembershipType')
    for item in DEFAULT_MEMBERSHIP_TYPES:
        MembershipType.objects.update_or_create(
            name=item['name'],
            defaults={
                'duration_months': item['duration_months'],
                'description': item['description'],
                'is_active': True,
            },
        )


def unseed_membership_types(apps, schema_editor):
    MembershipType = apps.get_model('api', 'MembershipType')
    MembershipType.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_labrole'),
    ]

    operations = [
        migrations.CreateModel(
            name='MembershipType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('duration_months', models.PositiveIntegerField(default=12)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Membership',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('patient_name', models.CharField(max_length=200)),
                ('profile_image', models.ImageField(blank=True, null=True, upload_to='memberships/')),
                ('membership_validation', models.CharField(max_length=100)),
                ('membership_number', models.CharField(blank=True, max_length=50, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='memberships_created', to='api.user')),
                ('membership_type', models.ForeignKey(on_delete=models.deletion.PROTECT, related_name='memberships', to='api.membershiptype')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.RunPython(seed_membership_types, unseed_membership_types),
    ]

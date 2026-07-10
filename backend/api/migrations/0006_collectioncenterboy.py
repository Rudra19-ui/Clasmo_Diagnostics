from django.db import migrations, models


DEFAULT_CENTERS = [
    'CLASMO Diagnostics pvt',
    'CLASMO Diagnostics Main Lab',
    'CLASMO Diagnostics Branch 1',
    'CLASMO Diagnostics Branch 2',
]


def seed_collection_centers(apps, schema_editor):
    CollectionCenter = apps.get_model('api', 'CollectionCenter')
    for name in DEFAULT_CENTERS:
        CollectionCenter.objects.update_or_create(name=name, defaults={'is_active': True})


def unseed_collection_centers(apps, schema_editor):
    CollectionCenter = apps.get_model('api', 'CollectionCenter')
    CollectionCenter.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_membership'),
    ]

    operations = [
        migrations.CreateModel(
            name='CollectionCenter',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='CollectionCenterBoy',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=100)),
                ('middle_name', models.CharField(blank=True, max_length=100)),
                ('last_name', models.CharField(blank=True, max_length=100)),
                ('short_name', models.CharField(blank=True, max_length=50)),
                ('age', models.PositiveIntegerField(blank=True, null=True)),
                ('gender', models.CharField(blank=True, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], max_length=10)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('mobile', models.CharField(blank=True, max_length=20)),
                ('address', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('collection_center', models.ForeignKey(on_delete=models.deletion.PROTECT, related_name='boys', to='api.collectioncenter')),
            ],
            options={
                'verbose_name_plural': 'Collection center boys',
                'ordering': ['first_name', 'last_name'],
            },
        ),
        migrations.RunPython(seed_collection_centers, unseed_collection_centers),
    ]

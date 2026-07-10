from django.db import migrations, models


SEED_DISCOUNT_REASONS = []


def seed_discount_reasons(apps, schema_editor):
    DiscountReason = apps.get_model('api', 'DiscountReason')
    for item in SEED_DISCOUNT_REASONS:
        DiscountReason.objects.update_or_create(
            reason=item['reason'],
            defaults={'comment': item['comment'], 'is_active': True},
        )


def unseed_discount_reasons(apps, schema_editor):
    DiscountReason = apps.get_model('api', 'DiscountReason')
    DiscountReason.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_collectioncenterboy'),
    ]

    operations = [
        migrations.CreateModel(
            name='DiscountReason',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(max_length=200)),
                ('comment', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['reason'],
            },
        ),
        migrations.RunPython(seed_discount_reasons, unseed_discount_reasons),
    ]

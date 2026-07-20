from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_seed_hr_receptionist_lab_roles'),
    ]

    operations = [
        migrations.CreateModel(
            name='SelfPatientQuery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('test_name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('photo', models.ImageField(upload_to='patient-queries/')),
                ('is_handled', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Self patient query',
                'verbose_name_plural': 'Self patient queries',
                'ordering': ['-created_at'],
            },
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_doctor'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='age_unit',
            field=models.CharField(choices=[('yr', 'Yr'), ('month', 'Month'), ('day', 'Day')], default='yr', max_length=10),
        ),
        migrations.AddField(
            model_name='patient',
            name='bar_code',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='patient',
            name='blood_group',
            field=models.CharField(blank=True, choices=[('A +ve', 'A +ve'), ('A -ve', 'A -ve'), ('B +ve', 'B +ve'), ('B -ve', 'B -ve'), ('AB +ve', 'AB +ve'), ('AB -ve', 'AB -ve'), ('O +ve', 'O +ve'), ('O -ve', 'O -ve')], max_length=10),
        ),
        migrations.AddField(
            model_name='patient',
            name='email2',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='patient',
            name='family_doctor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='patients', to='api.doctor'),
        ),
        migrations.AddField(
            model_name='patient',
            name='first_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='patient',
            name='insurance_company',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='patient',
            name='insurance_expiry_date',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='patient',
            name='insurance_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='patient',
            name='insurance_start_date',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='patient',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='last_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='patient',
            name='marital_status',
            field=models.CharField(blank=True, choices=[('married', 'Married'), ('unmarried', 'Unmarried'), ('divorced', 'Divorced'), ('widow', 'Widow')], max_length=20),
        ),
        migrations.AddField(
            model_name='patient',
            name='master_comment',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='medical_record_no',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='middle_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='patient',
            name='other_data_comment',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='primary_tel_type',
            field=models.CharField(blank=True, choices=[('office', 'TelePhone office'), ('residence', 'Telephone Res'), ('mobile', 'TelePhone Mobile')], max_length=20),
        ),
        migrations.AddField(
            model_name='patient',
            name='religion',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='patient',
            name='short_name',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='patient',
            name='telephone_office',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='patient',
            name='telephone_residence',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='patient',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AlterField(
            model_name='patient',
            name='title',
            field=models.CharField(choices=[('Mr.', 'Mr.'), ('Ms.', 'Ms.'), ('Mrs.', 'Mrs.'), ('MT.', 'MT.'), ('Dr.', 'Dr.'), ('Master', 'Master'), ('B/O', 'B/O'), ('Baby', 'Baby')], default='Mr.', max_length=10),
        ),
        migrations.CreateModel(
            name='PatientAddress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('address_line1', models.CharField(blank=True, max_length=200)),
                ('address_line2', models.CharField(blank=True, max_length=200)),
                ('address_line3', models.CharField(blank=True, max_length=200)),
                ('country', models.CharField(blank=True, max_length=100)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('pincode', models.CharField(blank=True, max_length=20)),
                ('address_type', models.CharField(blank=True, choices=[('office', 'Office'), ('residence', 'Residence')], default='residence', max_length=20)),
                ('is_default', models.BooleanField(default=False)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='addresses', to='api.patient')),
            ],
            options={
                'ordering': ['sort_order', 'id'],
            },
        ),
    ]

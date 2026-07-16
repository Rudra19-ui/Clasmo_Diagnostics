from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_login_auth_storage'),
    ]

    operations = [
        migrations.AddField(
            model_name='joinrequest',
            name='branch',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='contact_person',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='current_employer',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='experience_type',
            field=models.CharField(blank=True, choices=[('fresher', 'Fresher'), ('experienced', 'Experienced')], max_length=20),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='full_address',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='lab_interior_photo',
            field=models.FileField(blank=True, null=True, upload_to='join/franchise/'),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='last_salary',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='letterhead_photo',
            field=models.FileField(blank=True, null=True, upload_to='join/franchise/'),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='partnership_type',
            field=models.CharField(blank=True, choices=[('brand', 'Brand'), ('self', 'Self')], max_length=10),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='pincode',
            field=models.CharField(blank=True, max_length=12),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='proof_of_address',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='request_type',
            field=models.CharField(blank=True, choices=[('franchise', 'Franchise'), ('job', 'Job Vacancy')], max_length=20),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='resume',
            field=models.FileField(blank=True, null=True, upload_to='join/job/'),
        ),
        migrations.AddField(
            model_name='joinrequest',
            name='total_experience',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='joinrequest',
            name='phone',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]

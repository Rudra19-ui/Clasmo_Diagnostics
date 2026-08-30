from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0045_ensure_nashik_login_accounts'),
    ]

    operations = [
        migrations.CreateModel(
            name='OutsourceTransfer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('barcode', models.CharField(blank=True, db_index=True, max_length=100)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('outsourced', 'Outsourced'),
                        ('received', 'Received'),
                        ('report_uploaded', 'Report uploaded'),
                    ],
                    db_index=True,
                    default='outsourced',
                    max_length=30,
                )),
                ('notes', models.CharField(blank=True, max_length=500)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('received_at', models.DateTimeField(blank=True, null=True)),
                ('report_file', models.FileField(blank=True, null=True, upload_to='outsource-reports/')),
                ('report_uploaded_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('from_zone', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='outsource_sent',
                    to='api.zone',
                )),
                ('to_zone', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='outsource_received',
                    to='api.zone',
                )),
                ('received_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='outsource_received_by',
                    to='api.user',
                )),
                ('registration', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='outsource_transfers',
                    to='api.registration',
                )),
                ('report_uploaded_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='outsource_reports_uploaded',
                    to='api.user',
                )),
                ('sent_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='outsource_sent',
                    to='api.user',
                )),
            ],
            options={
                'ordering': ['-sent_at', '-created_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='outsourcetransfer',
            index=models.Index(fields=['is_active', 'from_zone', 'status', '-sent_at'], name='api_outsour_from_zo_idx'),
        ),
        migrations.AddIndex(
            model_name='outsourcetransfer',
            index=models.Index(
                fields=['is_active', 'to_zone', 'status', '-sent_at'],
                name='api_outsour_to_zone_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='outsourcetransfer',
            index=models.Index(fields=['barcode', 'is_active'], name='api_outsour_barcode_idx'),
        ),
    ]

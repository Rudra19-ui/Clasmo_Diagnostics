from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0051_reportformatasset_test'),
    ]

    operations = [
        migrations.AddField(
            model_name='test',
            name='report_note',
            field=models.TextField(
                blank=True,
                help_text='NOTE block shown on sample / final report for this test.',
            ),
        ),
        migrations.AddField(
            model_name='test',
            name='report_comments',
            field=models.TextField(
                blank=True,
                help_text='Comments block shown on sample / final report for this test.',
            ),
        ),
        migrations.AddField(
            model_name='test',
            name='clinical_significance',
            field=models.TextField(
                blank=True,
                help_text='Clinical significance text for this test report.',
            ),
        ),
        migrations.AddField(
            model_name='test',
            name='report_extra_sections',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Extra titled report sections, e.g. Interpretation, USES, Abnormal findings.',
            ),
        ),
    ]

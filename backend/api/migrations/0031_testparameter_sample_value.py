from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_user_franchise_hierarchy'),
    ]

    operations = [
        migrations.AddField(
            model_name='testparameter',
            name='sample_value',
            field=models.CharField(
                blank=True,
                help_text='Example result shown on Sample Report',
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name='testparameter',
            name='method',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='testparameter',
            name='sort_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='testparameter',
            options={'ordering': ['test__name', 'sort_order', 'parameter_name']},
        ),
    ]

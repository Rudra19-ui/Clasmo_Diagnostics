"""Ensure Nashik demo login accounts exist after deploy (admin, hr, supreme, etc.)."""

from django.db import migrations


def ensure_login_accounts(apps, schema_editor):
    from api.trial_users import ensure_trial_users

    ensure_trial_users(reset_passwords=True)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0044_sample_rejection'),
    ]

    operations = [
        migrations.RunPython(ensure_login_accounts, migrations.RunPython.noop),
    ]

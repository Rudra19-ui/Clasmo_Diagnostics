from django.db import migrations


def split_price_and_mrp(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    for role in LabRole.objects.all():
        permissions = dict(role.permissions or {})
        combined = bool(permissions.get('show_price_mrp'))
        if role.code in {'admin', 'super_admin'}:
            combined = True
        if 'show_price' not in permissions:
            permissions['show_price'] = combined
        if 'show_mrp' not in permissions:
            permissions['show_mrp'] = combined
        role.permissions = permissions
        role.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0054_role_price_mrp_visibility'),
    ]

    operations = [
        migrations.RunPython(split_price_and_mrp, migrations.RunPython.noop),
    ]

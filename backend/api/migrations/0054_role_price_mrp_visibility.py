from django.db import migrations


FRANCHISE_ROLES = {'super_franchisee', 'franchisee', 'sub_franchise'}
ALWAYS_VISIBLE = {'admin', 'super_admin'}


def set_price_visibility(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    for role in LabRole.objects.all():
        permissions = dict(role.permissions or {})
        if role.code in ALWAYS_VISIBLE:
            permissions['show_price_mrp'] = True
        elif role.code in FRANCHISE_ROLES:
            permissions['show_price_mrp'] = False
        else:
            permissions['show_price_mrp'] = True
        role.permissions = permissions
        role.save(update_fields=['permissions'])

    if not LabRole.objects.filter(code='super_admin').exists():
        LabRole.objects.create(
            code='super_admin',
            name='Super Admin',
            description='Full access, including Price and MRP visibility for every module.',
            permissions={
                'search': True,
                'registration': True,
                'test_result': True,
                'administration': True,
                'reports': True,
                'device_request': True,
                'dashboard': True,
                'elab_pay': True,
                'help': True,
                'result_entry': True,
                'report_preview': True,
                'test_parameters': True,
                'manage_users': True,
                'manage_roles': True,
                'show_price_mrp': True,
            },
            is_system=True,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0053_testpackage_mrp_rate'),
    ]

    operations = [
        migrations.RunPython(set_price_visibility, migrations.RunPython.noop),
    ]

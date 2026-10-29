from django.db import migrations

ENTRY_DEFAULT_ROLES = {
    'super_admin',
    'admin',
    'super_franchisee',
    'franchisee',
    'sub_franchise',
}


def add_entry_section_permission(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    for role in LabRole.objects.all():
        permissions = dict(role.permissions or {})
        if 'entry_section' not in permissions:
            permissions['entry_section'] = role.code in ENTRY_DEFAULT_ROLES
            role.permissions = permissions
            role.save(update_fields=['permissions'])


def remove_entry_section_permission(apps, schema_editor):
    LabRole = apps.get_model('api', 'LabRole')
    for role in LabRole.objects.all():
        permissions = dict(role.permissions or {})
        if 'entry_section' in permissions:
            permissions.pop('entry_section', None)
            role.permissions = permissions
            role.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0056_user_login_password'),
    ]

    operations = [
        migrations.RunPython(add_entry_section_permission, remove_entry_section_permission),
    ]

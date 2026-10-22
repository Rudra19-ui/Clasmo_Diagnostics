"""Lab role permission definitions and defaults."""

ROLE_PERMISSION_SCHEMA = [
    {'key': 'search', 'label': 'Search'},
    {'key': 'registration', 'label': 'Test Registration'},
    {'key': 'test_result', 'label': 'Test Result'},
    {'key': 'administration', 'label': 'Administration'},
    {'key': 'reports', 'label': 'Reports'},
    {'key': 'device_request', 'label': 'Device Request'},
    {'key': 'dashboard', 'label': 'Dashboard'},
    {'key': 'elab_pay', 'label': 'Elab-PAY'},
    {'key': 'help', 'label': 'Help'},
    {'key': 'result_entry', 'label': 'Result Entry'},
    {'key': 'report_preview', 'label': 'Report Preview'},
    {'key': 'test_parameters', 'label': 'Test Parameter Master'},
    {'key': 'manage_users', 'label': 'Manage Users'},
    {'key': 'manage_roles', 'label': 'Manage Roles'},
    {'key': 'show_price', 'label': 'Show Price'},
    {'key': 'show_mrp', 'label': 'Show MRP'},
]

# These roles always see catalog Price and MRP.
PRICE_ALWAYS_VISIBLE_ROLES = {'admin', 'super_admin'}

ALL_PERMISSION_KEYS = [item['key'] for item in ROLE_PERMISSION_SCHEMA]


def all_permissions_enabled():
    return {key: True for key in ALL_PERMISSION_KEYS}


def build_permissions(**enabled):
    return {key: bool(enabled.get(key, False)) for key in ALL_PERMISSION_KEYS}


def role_shows_amount(role_code: str, permissions: dict | None, key: str) -> bool:
    if role_code in PRICE_ALWAYS_VISIBLE_ROLES:
        return True
    stored = permissions or {}
    if key in stored:
        return bool(stored.get(key))
    # Older roles stored one combined switch.
    return bool(stored.get('show_price_mrp'))


DEFAULT_ROLE_DEFINITIONS = [
    {
        'code': 'admin',
        'name': 'Admin',
        'description': 'Full access to all lab modules and administration.',
        'permissions': all_permissions_enabled(),
    },
    {
        'code': 'super_admin',
        'name': 'Super Admin',
        'description': 'Full access, including Price and MRP visibility for every module.',
        'permissions': all_permissions_enabled(),
    },
    {
        'code': 'user',
        'name': 'User',
        'description': 'Front-desk and registration workflows.',
        'permissions': build_permissions(
            search=True,
            registration=True,
            test_result=True,
            administration=True,
            reports=True,
            device_request=True,
            dashboard=True,
            elab_pay=True,
            help=True,
            report_preview=True,
            show_price=True,
            show_mrp=True,
        ),
    },
    {
        'code': 'technician',
        'name': 'Technician',
        'description': 'Sample processing and result entry.',
        'permissions': build_permissions(
            search=True,
            registration=True,
            test_result=True,
            administration=True,
            reports=True,
            device_request=True,
            dashboard=True,
            elab_pay=True,
            help=True,
            result_entry=True,
            report_preview=True,
            show_price=True,
            show_mrp=True,
        ),
    },
    {
        'code': 'pathologist',
        'name': 'Pathologist',
        'description': 'Report review, authorization, and verification.',
        'permissions': build_permissions(
            search=True,
            test_result=True,
            administration=True,
            reports=True,
            dashboard=True,
            help=True,
            report_preview=True,
            test_parameters=True,
            show_price=True,
            show_mrp=True,
        ),
    },
    {
        'code': 'hr',
        'name': 'HR',
        'description': 'Human resources, enquiries, and staff administration.',
        'permissions': build_permissions(
            search=True,
            administration=True,
            reports=True,
            dashboard=True,
            help=True,
            manage_users=True,
            show_price=True,
            show_mrp=True,
        ),
    },
    {
        'code': 'receptionist',
        'name': 'Receptionist',
        'description': 'Front desk, patient registration, and search.',
        'permissions': build_permissions(
            search=True,
            registration=True,
            test_result=True,
            reports=True,
            device_request=True,
            dashboard=True,
            help=True,
            report_preview=True,
            show_price=True,
            show_mrp=True,
        ),
    },
    {
        'code': 'super_franchisee',
        'name': 'Supreme',
        'description': 'Top-level franchise owner who manages Prime accounts.',
        'permissions': build_permissions(
            search=True,
            registration=True,
            reports=True,
            dashboard=True,
            help=True,
            manage_users=True,
            show_price=False,
            show_mrp=False,
        ),
    },
    {
        'code': 'franchisee',
        'name': 'Prime',
        'description': 'Prime managed by a Supreme; can oversee Sub-Franchise accounts.',
        'permissions': build_permissions(
            search=True,
            registration=True,
            reports=True,
            dashboard=True,
            help=True,
            manage_users=True,
            show_price=False,
            show_mrp=False,
        ),
    },
    {
        'code': 'sub_franchise',
        'name': 'Sub-Franchise',
        'description': 'Sub-franchise unit managed by a Prime supervisor.',
        'permissions': build_permissions(
            search=True,
            registration=True,
            reports=True,
            dashboard=True,
            help=True,
            show_price=False,
            show_mrp=False,
        ),
    },
]

export const ROLE_PERMISSION_SCHEMA = [
  { key: 'search', label: 'Search' },
  { key: 'registration', label: 'Test Registration' },
  { key: 'test_result', label: 'Test Result' },
  { key: 'administration', label: 'Administration' },
  { key: 'reports', label: 'Reports' },
  { key: 'device_request', label: 'Device Request' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'elab_pay', label: 'Elab-PAY' },
  { key: 'help', label: 'Help' },
  { key: 'result_entry', label: 'Result Entry' },
  { key: 'report_preview', label: 'Report Preview' },
  { key: 'test_parameters', label: 'Test Parameter Master' },
  { key: 'manage_users', label: 'Manage Users' },
  { key: 'manage_roles', label: 'Manage Roles' },
  { key: 'show_price', label: 'Show Price' },
  { key: 'show_mrp', label: 'Show MRP' },
];

export const PRICE_ALWAYS_VISIBLE_ROLES = ['admin', 'super_admin'];

function alwaysSeesAmounts(user) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export function canViewPrice(user) {
  if (!user) return false;
  if (alwaysSeesAmounts(user)) return true;
  if (typeof user.show_price === 'boolean') return user.show_price;
  return Boolean(user.show_price_mrp);
}

export function canViewMrp(user) {
  if (!user) return false;
  if (alwaysSeesAmounts(user)) return true;
  if (typeof user.show_mrp === 'boolean') return user.show_mrp;
  return Boolean(user.show_price_mrp);
}

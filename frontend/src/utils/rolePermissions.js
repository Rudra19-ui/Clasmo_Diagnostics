export const ROLE_PERMISSION_SCHEMA = [
  { key: 'search', label: 'Search' },
  { key: 'registration', label: 'Test Registration' },
  { key: 'entry_section', label: 'Entry Section' },
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
  { key: 'expense_type', label: 'Expense Type' },
  { key: 'notes', label: 'Notes' },
  { key: 'test_profile', label: 'Test Profile' },
  { key: 'show_price', label: 'Show Price' },
  { key: 'show_mrp', label: 'Show MRP' },
];

export const PRICE_ALWAYS_VISIBLE_ROLES = ['admin', 'super_admin'];

/** Roles that had Entry Section before the Role Management toggle existed. */
export const ENTRY_SECTION_DEFAULT_ROLES = [
  'super_admin',
  'admin',
  'super_franchisee',
  'franchisee',
  'sub_franchise',
];

/** Roles that could open Expense Type before the dedicated permission existed. */
export const EXPENSE_TYPE_DEFAULT_ROLES = [
  'super_admin',
  'admin',
  'hr',
  'user',
  'technician',
];

/** Roles that could open Notes (Test Mgmt) before the dedicated permission existed. */
export const NOTES_DEFAULT_ROLES = [
  'super_admin',
  'admin',
  'hr',
  'user',
  'technician',
];

/** Roles that could open Test Profile before the dedicated permission existed. */
export const TEST_PROFILE_DEFAULT_ROLES = [
  'super_admin',
  'admin',
  'hr',
  'user',
  'technician',
  'pathologist',
  'super_franchisee',
  'franchisee',
  'sub_franchise',
];

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

export function canAccessEntrySection(user) {
  if (!user) return false;
  if (typeof user.entry_section === 'boolean') return user.entry_section;
  return ENTRY_SECTION_DEFAULT_ROLES.includes(user.role);
}

export function canAccessExpenseType(user) {
  if (!user) return false;
  if (typeof user.expense_type === 'boolean') return user.expense_type;
  if (user.permissions && typeof user.permissions.expense_type === 'boolean') {
    return user.permissions.expense_type;
  }
  return EXPENSE_TYPE_DEFAULT_ROLES.includes(user.role);
}

export function canAccessNotes(user) {
  if (!user) return false;
  if (typeof user.notes === 'boolean') return user.notes;
  if (user.permissions && typeof user.permissions.notes === 'boolean') {
    return user.permissions.notes;
  }
  return NOTES_DEFAULT_ROLES.includes(user.role);
}

export function canAccessTestProfile(user) {
  if (!user) return false;
  if (typeof user.test_profile === 'boolean') return user.test_profile;
  if (user.permissions && typeof user.permissions.test_profile === 'boolean') {
    return user.permissions.test_profile;
  }
  return TEST_PROFILE_DEFAULT_ROLES.includes(user.role);
}

export function userHasPermission(user, key) {
  if (!user || !key) return false;
  if (key === 'entry_section') return canAccessEntrySection(user);
  if (key === 'expense_type') return canAccessExpenseType(user);
  if (key === 'notes') return canAccessNotes(user);
  if (key === 'test_profile') return canAccessTestProfile(user);
  if (key === 'show_price') return canViewPrice(user);
  if (key === 'show_mrp') return canViewMrp(user);
  if (user.permissions && typeof user.permissions[key] === 'boolean') {
    return user.permissions[key];
  }
  return false;
}

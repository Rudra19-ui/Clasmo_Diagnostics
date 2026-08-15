export const ROLES = {
  USER: 'user',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HR: 'hr',
  PATHOLOGIST: 'pathologist',
  TECHNICIAN: 'technician',
  RECEPTIONIST: 'receptionist',
  SUPER_FRANCHISEE: 'super_franchisee',
  FRANCHISEE: 'franchisee',
  SUB_FRANCHISE: 'sub_franchise',
};

export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.USER]: 'User',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.HR]: 'HR',
  [ROLES.PATHOLOGIST]: 'Pathologist',
  [ROLES.TECHNICIAN]: 'Technician',
  [ROLES.RECEPTIONIST]: 'Receptionist',
  [ROLES.SUPER_FRANCHISEE]: 'Supreme',
  [ROLES.FRANCHISEE]: 'Prime',
  [ROLES.SUB_FRANCHISE]: 'Sub-Franchise',
};

export const SIGNUP_ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.HR, label: 'HR' },
  { value: ROLES.PATHOLOGIST, label: 'Pathologist' },
  { value: ROLES.TECHNICIAN, label: 'Technician' },
  { value: ROLES.USER, label: 'User' },
  { value: ROLES.RECEPTIONIST, label: 'Receptionist' },
  { value: ROLES.SUPER_FRANCHISEE, label: 'Supreme' },
  { value: ROLES.FRANCHISEE, label: 'Prime' },
  { value: ROLES.SUB_FRANCHISE, label: 'Sub-Franchise' },
];

export const ROLE_OPTIONS = ALL_ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export const CLINICAL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST];

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const FRANCHISE_ROLES = [
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
  ROLES.SUB_FRANCHISE,
];

/** Roles blocked from patient booking / registration entry. */
export const NO_PATIENT_ENTRY_ROLES = [
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.HR,
  ROLES.USER,
];

/** Roles that can access patient booking / registration entry. */
export const PATIENT_ENTRY_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ...FRANCHISE_ROLES,
];

/** Admin + franchise — pricing, wallets, commissions. */
export const PRICING_WALLET_ROLES = PATIENT_ENTRY_ROLES;

/** Roles that can view held tests list (staff + franchise). */
export const HOLD_ACCESS_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.USER,
  ...FRANCHISE_ROLES,
];

/** Lab staff who place holds by barcode / QR (list + create). */
export const HOLD_STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.USER,
];

/** Staff who can reject samples by barcode / QR. */
export const REJECTION_STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.USER,
];

export const PARENT_REQUIRED_ROLES = [ROLES.FRANCHISEE, ROLES.SUB_FRANCHISE];

/** Roles allowed to open New User Sign Up and create accounts. */
export const USER_CREATOR_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
];

export const SAMPLE_SCAN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.TECHNICIAN,
  ROLES.PATHOLOGIST,
  ROLES.RECEPTIONIST,
];

/** Expected parent role for franchise hierarchy signup/edit. */
export function getExpectedParentRole(role) {
  if (role === ROLES.FRANCHISEE) return ROLES.SUPER_FRANCHISEE;
  if (role === ROLES.SUB_FRANCHISE) return ROLES.FRANCHISEE;
  return null;
}

export function requiresParentFranchisee(role) {
  return PARENT_REQUIRED_ROLES.includes(role);
}

export function canCreateUserAccounts(user) {
  return hasRole(user, USER_CREATOR_ROLES);
}

/** Signup role options the logged-in user is allowed to create. */
export function getSignupRoleOptionsForUser(user) {
  if (!user) return [];
  if (user.role === ROLES.SUPER_ADMIN) {
    return SIGNUP_ROLE_OPTIONS;
  }
  if (user.role === ROLES.ADMIN) {
    return SIGNUP_ROLE_OPTIONS.filter((option) => option.value !== ROLES.SUPER_ADMIN);
  }
  if (user.role === ROLES.SUPER_FRANCHISEE) {
    return SIGNUP_ROLE_OPTIONS.filter((option) => (
      option.value === ROLES.FRANCHISEE || option.value === ROLES.SUB_FRANCHISE
    ));
  }
  if (user.role === ROLES.FRANCHISEE) {
    return SIGNUP_ROLE_OPTIONS.filter((option) => option.value === ROLES.SUB_FRANCHISE);
  }
  if (user.role === ROLES.HR) {
    return SIGNUP_ROLE_OPTIONS.filter((option) => (
      [ROLES.USER, ROLES.RECEPTIONIST, ROLES.TECHNICIAN, ROLES.PATHOLOGIST].includes(option.value)
    ));
  }
  return [];
}

export function hasRole(user, roles) {
  if (!user || !roles?.length) return false;
  return roles.includes(user.role);
}

export function canScanSampleBarcode(user) {
  return hasRole(user, SAMPLE_SCAN_ROLES);
}

export function canManageParameters(user) {
  return hasRole(user, ADMIN_ROLES);
}

export function canEnterResults(user) {
  return hasRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TECHNICIAN]);
}

export function canVerifyReports(user) {
  return hasRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PATHOLOGIST]);
}

export function flagClass(flag) {
  switch (flag) {
    case 'Critical': return 'flag-critical';
    case 'High': return 'flag-high';
    case 'Low': return 'flag-low';
    default: return 'flag-normal';
  }
}

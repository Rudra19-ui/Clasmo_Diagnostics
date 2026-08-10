export const ROLES = {
  USER: 'user',
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

export const CLINICAL_ROLES = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST];

export const FRANCHISE_ROLES = [
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
  ROLES.SUB_FRANCHISE,
];

export const PARENT_REQUIRED_ROLES = [ROLES.FRANCHISEE, ROLES.SUB_FRANCHISE];

/** Roles allowed to open New User Sign Up and create accounts. */
export const USER_CREATOR_ROLES = [
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
];

export const SAMPLE_SCAN_ROLES = [
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
  if (user.role === ROLES.ADMIN) {
    return SIGNUP_ROLE_OPTIONS;
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
  return user?.role === ROLES.ADMIN;
}

export function canEnterResults(user) {
  return hasRole(user, [ROLES.ADMIN, ROLES.TECHNICIAN]);
}

export function canVerifyReports(user) {
  return hasRole(user, [ROLES.ADMIN, ROLES.PATHOLOGIST]);
}

export function flagClass(flag) {
  switch (flag) {
    case 'Critical': return 'flag-critical';
    case 'High': return 'flag-high';
    case 'Low': return 'flag-low';
    default: return 'flag-normal';
  }
}

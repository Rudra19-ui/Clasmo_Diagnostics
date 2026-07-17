export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  HR: 'hr',
  PATHOLOGIST: 'pathologist',
  TECHNICIAN: 'technician',
  RECEPTIONIST: 'receptionist',
};

export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.USER]: 'User',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.HR]: 'HR',
  [ROLES.PATHOLOGIST]: 'Pathologist',
  [ROLES.TECHNICIAN]: 'Technician',
  [ROLES.RECEPTIONIST]: 'Receptionist',
};

export const SIGNUP_ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.HR, label: 'HR' },
  { value: ROLES.PATHOLOGIST, label: 'Pathologist' },
  { value: ROLES.TECHNICIAN, label: 'Technician' },
  { value: ROLES.USER, label: 'User' },
  { value: ROLES.RECEPTIONIST, label: 'Receptionist' },
];

export const ROLE_OPTIONS = ALL_ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export const CLINICAL_ROLES = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST];

export function hasRole(user, roles) {
  if (!user || !roles?.length) return false;
  return roles.includes(user.role);
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

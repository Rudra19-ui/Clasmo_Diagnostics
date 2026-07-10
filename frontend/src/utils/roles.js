export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  PATHOLOGIST: 'pathologist',
};

export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.USER]: 'User',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.TECHNICIAN]: 'Technician',
  [ROLES.PATHOLOGIST]: 'Pathologist',
};

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

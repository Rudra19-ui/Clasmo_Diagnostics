import { ROLES, NO_PATIENT_ENTRY_ROLES, HOLD_STAFF_ROLES, REJECTION_STAFF_ROLES } from './roles';

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    excludeRoles: NO_PATIENT_ENTRY_ROLES,
  },
  {
    id: 'registration',
    label: 'Test Registration',
    href: '/registration',
    excludeRoles: NO_PATIENT_ENTRY_ROLES,
  },
  {
    id: 'barcode-link',
    label: 'Link Barcode',
    href: '/barcode-link',
    excludeRoles: NO_PATIENT_ENTRY_ROLES,
  },
  {
    id: 'sample-scan',
    label: 'Sample Scan',
    href: '/sample-scan',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
  },
  {
    id: 'test-result',
    label: 'Test Result',
    href: '/test-result',
    excludeRoles: NO_PATIENT_ENTRY_ROLES,
  },
  {
    id: 'test-portfolio',
    label: 'Test Portfolio',
    href: '/portfolio/test-list',
    excludeRoles: [ROLES.PATHOLOGIST],
    children: [
      { label: 'Test List', href: '/portfolio/test-list' },
      { label: 'Test Profile', href: '/portfolio/test-profile' },
      { label: 'Sample Report', href: '/portfolio/sample-report' },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    href: '/administration',
    megaMenu: true,
    excludeRoles: [ROLES.PATHOLOGIST],
  },
  {
    id: 'user-signup',
    label: 'New User Sign Up',
    href: '/user-signup',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.SUPER_FRANCHISEE, ROLES.FRANCHISEE],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    excludeRoles: NO_PATIENT_ENTRY_ROLES,
    children: [
      { label: 'Daily Summary', href: '/reports#daily' },
      { label: 'Collection Report', href: '/reports#collection' },
      { label: 'Outstanding Report', href: '/reports#outstanding' },
      { label: 'TAT Report', href: '/reports#tat' },
    ],
  },
  {
    id: 'device-request',
    label: 'Device Request',
    href: '/device/pickup-request',
    excludeRoles: [ROLES.PATHOLOGIST],
    children: [
      { label: 'Pickup Request Page', href: '/device/pickup-request' },
      { label: 'Patient Appointment', href: '/device/patient-appointment' },
      { label: 'Message To Lab', href: '/device/message-to-lab' },
      { label: 'Schedular', href: '/device/schedular' },
      { label: 'Trip Management', href: '/device/trip-management' },
      { label: 'Batch Upload', href: '/device/batch-upload' },
      { label: 'Test Result Batch', href: '/device/test-result-batch' },
    ],
  },
  {
    id: 'changelab',
    label: 'ChangeLab',
    excludeRoles: [ROLES.PATHOLOGIST],
    children: [
      { label: 'CLASMO DIAGNOSTICS PVT.LTD.', href: '/search', active: true },
    ],
  },
  { id: 'give-feedback', label: 'Give Feedback', href: '/give-feedback', excludeRoles: [ROLES.PATHOLOGIST] },
  { id: 'help', label: 'Help', href: '/help' },
];

/** Portal sidebar layout for non-franchise roles (Admin, HR, Pathologist, etc.). */
export const STANDARD_NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: 'search',
    excludeRoles: NO_PATIENT_ENTRY_ROLES,
  },
  {
    id: 'sample-scan',
    label: 'Sample Scan',
    href: '/sample-scan',
    icon: 'chip',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
  },
  {
    id: 'hold-tests',
    label: 'Hold Tests',
    href: '/hold-tests',
    icon: 'test-result',
    roles: HOLD_STAFF_ROLES,
  },
  {
    id: 'sample-rejection',
    label: 'Sample Rejection',
    href: '/sample-rejection',
    icon: 'layers',
    roles: REJECTION_STAFF_ROLES,
  },
  {
    section: 'REGISTRATION',
    items: [
      {
        id: 'registration',
        label: 'Test Registration',
        href: '/registration',
        icon: 'registration',
        excludeRoles: NO_PATIENT_ENTRY_ROLES,
      },
      {
        id: 'barcode-link',
        label: 'Link Barcode',
        href: '/barcode-link',
        icon: 'chip',
        excludeRoles: NO_PATIENT_ENTRY_ROLES,
      },
      {
        id: 'test-result',
        label: 'Test Result',
        href: '/test-result',
        icon: 'test-result',
        excludeRoles: NO_PATIENT_ENTRY_ROLES,
      },
    ],
  },
  {
    section: 'TEST PORTFOLIO',
    items: [
      {
        id: 'test-portfolio',
        label: 'Test Portfolio',
        href: '/portfolio/test-list',
        icon: 'layers',
        excludeRoles: [ROLES.PATHOLOGIST],
        children: [
          { label: 'Test List', href: '/portfolio/test-list' },
          { label: 'Test Profile', href: '/portfolio/test-profile' },
          { label: 'Sample Report', href: '/portfolio/sample-report' },
        ],
      },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        href: '/reports',
        icon: 'reports',
        excludeRoles: NO_PATIENT_ENTRY_ROLES,
        children: [
          { label: 'Daily Summary', href: '/reports#daily' },
          { label: 'Collection Report', href: '/reports#collection' },
          { label: 'Outstanding Report', href: '/reports#outstanding' },
          { label: 'TAT Report', href: '/reports#tat' },
        ],
      },
    ],
  },
  {
    section: 'DEVICE',
    items: [
      {
        id: 'device-request',
        label: 'Device Request',
        href: '/device/pickup-request',
        icon: 'device-request',
        excludeRoles: [ROLES.PATHOLOGIST],
        children: [
          { label: 'Pickup Request Page', href: '/device/pickup-request' },
          { label: 'Patient Appointment', href: '/device/patient-appointment' },
          { label: 'Message To Lab', href: '/device/message-to-lab' },
          { label: 'Schedular', href: '/device/schedular' },
          { label: 'Trip Management', href: '/device/trip-management' },
          { label: 'Batch Upload', href: '/device/batch-upload' },
          { label: 'Test Result Batch', href: '/device/test-result-batch' },
        ],
      },
    ],
  },
  {
    section: 'FRANCHISE',
    items: [
      {
        id: 'list-franchisee',
        label: 'List Franchisee',
        href: '/admin/list-franchisee',
        icon: 'franchise',
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        id: 'add-franchisee',
        label: 'Add Franchisee',
        href: '/admin/add-franchisee',
        icon: 'user-signup',
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        id: 'franchise-bulk-pricing',
        label: 'Franchise Pricing',
        href: '/admin/franchise-bulk-pricing',
        icon: 'payment',
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        id: 'franchise-transfer-pricing',
        label: 'Transfer Price',
        href: '/admin/franchise-transfer-pricing',
        icon: 'layers',
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
    ],
  },
  {
    section: 'ADMINISTRATION',
    items: [
      {
        id: 'administration',
        label: 'Administration',
        href: '/administration',
        icon: 'administration',
        excludeRoles: [ROLES.PATHOLOGIST],
      },
      {
        id: 'user-signup',
        label: 'New User Sign Up',
        href: '/user-signup',
        icon: 'user-signup',
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.SUPER_FRANCHISEE, ROLES.FRANCHISEE],
      },
    ],
  },
  {
    section: 'SETTINGS',
    items: [
      {
        id: 'give-feedback',
        label: 'Give Feedback',
        href: '/give-feedback',
        icon: 'give-feedback',
        excludeRoles: [ROLES.PATHOLOGIST],
      },
      { id: 'help', label: 'Help', href: '/help', icon: 'help' },
      { id: 'logout', label: 'Logout', href: '#logout', icon: 'logout', action: 'logout' },
    ],
  },
];

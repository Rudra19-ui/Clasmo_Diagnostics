import { ROLES } from './roles';

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    excludeRoles: [ROLES.PATHOLOGIST],
  },
  {
    id: 'registration',
    label: 'Test Registration',
    href: '/registration',
    excludeRoles: [ROLES.PATHOLOGIST],
  },
  {
    id: 'barcode-link',
    label: 'Link Barcode',
    href: '/barcode-link',
    excludeRoles: [ROLES.PATHOLOGIST],
  },
  {
    id: 'sample-scan',
    label: 'Sample Scan',
    href: '/sample-scan',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
  },
  {
    id: 'test-result',
    label: 'Test Result',
    href: '/test-result',
    excludeRoles: [ROLES.PATHOLOGIST],
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
    roles: [ROLES.ADMIN, ROLES.HR, ROLES.SUPER_FRANCHISEE, ROLES.FRANCHISEE],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    excludeRoles: [ROLES.PATHOLOGIST],
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

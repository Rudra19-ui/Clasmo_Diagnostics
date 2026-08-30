import {
  ROLES,
  ADMIN_ROLES,
  NO_PATIENT_ENTRY_ROLES,
  HOLD_STAFF_ROLES,
  REJECTION_STAFF_ROLES,
  SAMPLE_SCAN_ROLES,
  PATIENT_ENTRY_ROLES,
  EXTRA_SAMPLE_ROLES,
} from './roles';
import { RECEPTION_NAV_ITEMS } from './receptionNav';

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
    href: '/entry/new',
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
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.PATHOLOGIST],
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
    excludeRoles: [ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
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
    excludeRoles: [ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
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
    section: 'SAMPLE WORKFLOW',
    items: RECEPTION_NAV_ITEMS,
  },
  {
    section: 'SCAN',
    items: [
      {
        id: 'barcode-scan',
        label: 'Scan',
        href: '/notifications/scan',
        icon: 'chip',
        roles: EXTRA_SAMPLE_ROLES,
        excludeRoles: [ROLES.RECEPTIONIST],
      },
    ],
  },
  {
    section: 'REGISTRATION SECTIONS',
    items: [
      {
        id: 'registration-entry',
        label: 'Entry Section',
        href: '/entry/new',
        icon: 'layers',
        excludeRoles: NO_PATIENT_ENTRY_ROLES,
        children: [
          { label: 'New Entry', href: '/entry/new' },
          { label: 'Edit Entry', href: '/entry/list' },
          { label: 'Test Addition', href: '/entry/test-addition' },
        ],
      },
      {
        id: 'registration-report',
        label: 'Report Section',
        href: '/reports-section/all',
        icon: 'layers',
        excludeRoles: NO_PATIENT_ENTRY_ROLES,
        children: [
          { label: 'All Reports', href: '/reports-section/all' },
          { label: 'Search Reports', href: '/reports-section/search' },
        ],
      },
    ],
  },
  {
    section: 'NOTIFICATIONS',
    items: [
      {
        id: 'sample-scan',
        label: 'Sample Scan',
        href: '/sample-scan',
        icon: 'chip',
        roles: SAMPLE_SCAN_ROLES,
        excludeRoles: [ROLES.RECEPTIONIST],
      },
      {
        id: 'find-barcode',
        label: 'Find Barcode',
        href: '/notifications/find-barcode',
        icon: 'chip',
        roles: PATIENT_ENTRY_ROLES,
      },
      {
        id: 'clinical-history',
        label: 'Clinical History',
        href: '/notifications/clinical-history',
        icon: 'chip',
        roles: PATIENT_ENTRY_ROLES,
      },
      {
        id: 'test-cancellation',
        label: 'Test Cancellation',
        href: '/notifications/test-cancellation',
        icon: 'layers',
        roles: PATIENT_ENTRY_ROLES,
      },
      {
        id: 'hold-tests',
        label: 'Hold',
        href: '/hold-tests',
        icon: 'chip',
        roles: HOLD_STAFF_ROLES,
        excludeRoles: [ROLES.RECEPTIONIST],
      },
      {
        id: 'sample-rejection',
        label: 'Rejection',
        href: '/sample-rejection',
        icon: 'layers',
        roles: REJECTION_STAFF_ROLES,
        excludeRoles: [ROLES.RECEPTIONIST],
      },
    ],
  },
  {
    section: 'PAYMENT SECTION',
    items: [
      {
        id: 'online-payment',
        label: 'Online Payment',
        href: '/franchise/online-payment',
        icon: 'payment',
        accent: true,
        roles: ADMIN_ROLES,
      },
      {
        id: 'payment-history',
        label: 'Payment History',
        href: '/franchise/payment-history',
        icon: 'layers',
        roles: ADMIN_ROLES,
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
        excludeRoles: [ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
        children: [
          { label: 'Test List', href: '/portfolio/test-list' },
          { label: 'Test Profile', href: '/portfolio/test-profile' },
          { label: 'Sample Report', href: '/portfolio/sample-report' },
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
        excludeRoles: [ROLES.PATHOLOGIST, ROLES.RECEPTIONIST],
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
        id: 'change-password',
        label: 'Change Password',
        href: '/admin/change-password',
        icon: 'settings',
      },
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

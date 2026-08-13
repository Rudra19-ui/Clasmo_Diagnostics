import { STANDARD_NAV } from './nav';
import { FRANCHISE_ROLES, ROLES } from './roles';

/** Shared franchise portal sidebar for Supreme, Prime, and Sub-Franchise. */
export const FRANCHISE_NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/franchise/analytics',
    icon: 'analytics',
    excludeRoles: [ROLES.SUB_FRANCHISE],
  },

  {
    section: 'BOOKING SECTIONS',
    items: [
      {
        id: 'manage-booking',
        label: 'Entry Section',
        href: '/franchise/manage-booking/new',
        icon: 'layers',
        children: [
          { label: 'New Entry', href: '/franchise/manage-booking/new' },
          { label: 'Edit Entry', href: '/franchise/manage-booking/list' },
          { label: 'Test Addition', href: '/franchise/manage-booking/test-addition' },
        ],
      },
      {
        id: 'manage-reports',
        label: 'Report Section',
        href: '/franchise/manage-reports/all',
        icon: 'layers',
        children: [
          { label: 'All Reports', href: '/franchise/manage-reports/all' },
          { label: 'Search Reports', href: '/franchise/manage-reports/search' },
        ],
      },
    ],
  },

  {
    section: 'NOTIFICATIONS',
    items: [
      {
        id: 'find-barcode',
        label: 'Find Barcode',
        href: '/franchise/find-barcode',
        icon: 'chip',
      },
      {
        id: 'clinical-history',
        label: 'Clinical History',
        href: '/franchise/clinical-history',
        icon: 'chip',
      },
      {
        id: 'test-cancellation',
        label: 'Test Cancellation',
        href: '/franchise/test-cancellation',
        icon: 'layers',
      },
      {
        id: 'extra-sample',
        label: 'Extra Sample',
        href: '/franchise/extra-sample',
        icon: 'chip',
      },
      {
        id: 'hold',
        label: 'Hold',
        href: '/franchise/hold',
        icon: 'chip',
      },
      { id: 'rejection', label: 'Rejection', href: '/franchise/rejection', icon: 'layers' },
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
      },
      {
        id: 'payment-history',
        label: 'Payment History',
        href: '/franchise/payment-history',
        icon: 'layers',
      },
    ],
  },

  {
    section: 'BILL SECTION',
    items: [
      { id: 'make-bill', label: 'Make Bill', href: '/franchise/make-bill', icon: 'layers' },
      { id: 'billing-list', label: 'Billing List', href: '/franchise/billing-list', icon: 'layers' },
    ],
  },

  {
    section: 'ACCOUNTING',
    items: [
      {
        id: 'track-ledger',
        label: 'Track Ledger / Accounting',
        href: '/franchise/track-ledger',
        icon: 'analytics',
      },
      {
        id: 'pricing-credits',
        label: 'Pricing & Credits',
        href: '/franchise/pricing-credits',
        icon: 'analytics',
      },
      {
        id: 'franchisee-pricing',
        label: 'Prime Pricing',
        href: '/franchise/franchisee-pricing',
        icon: 'layers',
        excludeRoles: [ROLES.FRANCHISEE, ROLES.SUB_FRANCHISE],
      },
    ],
  },

  {
    section: 'TEST SECTION',
    items: [
      { id: 'all-tests', label: 'All Tests', href: '/portfolio/test-list', icon: 'layers' },
      { id: 'package-list', label: 'Package Lists', href: '/portfolio/test-profile', icon: 'layers' },
      { id: 'reports-format', label: 'Reports Format', href: '/portfolio/sample-report', icon: 'layers' },
    ],
  },

  {
    section: 'STAFF',
    items: [
      { id: 'my-staff', label: 'My Staff', href: '/franchise/my-staff', icon: 'layers' },
    ],
  },

  {
    section: 'SUB FRANCHISEE',
    items: [
      {
        id: 'sub-franchisee',
        label: 'Sub Franchisee',
        href: '/franchise/sub-franchisee',
        icon: 'layers',
        excludeRoles: [ROLES.SUB_FRANCHISE],
      },
      {
        id: 'sub-franchisee-pricing',
        label: 'SubFranchisee Pricing',
        href: '/franchise/sub-franchisee-pricing',
        icon: 'layers',
        excludeRoles: [ROLES.SUPER_FRANCHISEE, ROLES.SUB_FRANCHISE],
      },
      {
        id: 'sub-franchisee-credits',
        label: 'SubFranchisee Credits',
        href: '/franchise/sub-franchisee-credits',
        icon: 'layers',
        excludeRoles: [ROLES.SUB_FRANCHISE],
      },
    ],
  },

  {
    section: 'SETTINGS',
    items: [
      { id: 'update-profile', label: 'Update Profile', href: '/franchise/update-profile', icon: 'settings' },
      { id: 'change-password', label: 'Change Password', href: '/admin/change-password', icon: 'settings' },
      { id: 'logout', label: 'Logout', href: '#logout', icon: 'logout', action: 'logout' },
    ],
  },
];

export function isFranchiseRole(role) {
  return FRANCHISE_ROLES.includes(role);
}

export function getNavForRole(role) {
  if (isFranchiseRole(role)) return FRANCHISE_NAV;
  return null;
}

export function getSidebarNavForRole(role) {
  if (isFranchiseRole(role)) return FRANCHISE_NAV;
  return STANDARD_NAV;
}

export { ROLES };

import { FRANCHISE_ROLES, ROLES } from './roles';

/** Shared franchise portal sidebar for Super Franchisee, Franchisee, and Sub-Franchise. */
export const FRANCHISE_NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { id: 'analytics', label: 'Analytics', href: '/franchise/analytics', icon: 'analytics' },

  {
    section: 'BOOKING',
    items: [
      { id: 'manage-booking', label: 'Manage Booking', href: '/franchise/manage-booking', icon: 'layers' },
      { id: 'manage-reports', label: 'Manage Reports', href: '/franchise/manage-reports', icon: 'layers' },
      { id: 'old-reports', label: 'Old Reports', href: '/franchise/old-reports', icon: 'layers' },
    ],
  },

  {
    section: 'NOTIFICATIONS',
    items: [
      {
        id: 'barcode-mismatch',
        label: 'Barcode Mismatch',
        href: '/franchise/barcode-mismatch',
        icon: 'chip',
        badge: 240,
        badgeTone: 'danger',
      },
      {
        id: 'hold',
        label: 'Hold',
        href: '/franchise/hold',
        icon: 'chip',
        badge: 0,
        badgeTone: 'success',
      },
      {
        id: 'clinical-alerts',
        label: 'Clinical',
        href: '/franchise/clinical',
        icon: 'chip',
        badge: 11,
        badgeTone: 'danger',
      },
      { id: 'cancellations', label: 'Cancellations', href: '/franchise/cancellations', icon: 'layers' },
    ],
  },

  {
    section: 'BILLING',
    items: [
      { id: 'generate-bill', label: 'Generate Bill', href: '/franchise/generate-bill', icon: 'layers' },
      { id: 'generate-bill-old', label: 'Generate Bill Old', href: '/franchise/generate-bill-old', icon: 'layers' },
      {
        id: 'online-payment',
        label: 'Online Payment',
        href: '/franchise/online-payment',
        icon: 'payment',
        accent: true,
      },
      { id: 'payment-history', label: 'Payment History', href: '/franchise/payment-history', icon: 'layers' },
      { id: 'track-ledger', label: 'Track Ledger', href: '/franchise/track-ledger', icon: 'layers' },
      { id: 'manage-doctors', label: 'Manage Doctors', href: '/franchise/manage-doctors', icon: 'layers' },
      { id: 'manage-lab', label: 'Manage Lab', href: '/franchise/manage-lab', icon: 'layers' },
      {
        id: 'test-portfolio',
        label: 'Test Portfolio',
        href: '/portfolio/test-list',
        icon: 'layers',
        children: [
          { label: 'Test List', href: '/portfolio/test-list' },
          { label: 'Test Profile', href: '/portfolio/test-profile' },
          { label: 'Sample Report', href: '/portfolio/sample-report' },
        ],
      },
      { id: 'commission', label: 'Commission', href: '/franchise/commission', icon: 'layers' },
    ],
  },

  {
    section: 'INVENTORY',
    items: [
      { id: 'inventory', label: 'Inventory', href: '/franchise/inventory', icon: 'layers' },
      { id: 'slide-request', label: 'Slide/Request', href: '/franchise/slide-request', icon: 'layers' },
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
      { id: 'sub-franchisee', label: 'Sub Franchisee', href: '/franchise/sub-franchisee', icon: 'layers' },
      {
        id: 'sub-franchisee-pricing',
        label: 'SubFranchisee Pricing',
        href: '/franchise/sub-franchisee-pricing',
        icon: 'layers',
      },
      {
        id: 'sub-franchisee-credits',
        label: 'SubFranchisee Credits',
        href: '/franchise/sub-franchisee-credits',
        icon: 'layers',
      },
    ],
  },

  {
    section: 'SETTINGS',
    items: [
      {
        id: 'generate-certificate',
        label: 'Generate Certificate',
        href: '/franchise/generate-certificate',
        icon: 'settings',
      },
      { id: 'kyc-verification', label: 'KYC Verification', href: '/franchise/kyc-verification', icon: 'settings' },
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

export { ROLES };

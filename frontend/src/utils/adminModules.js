import { ROLES } from './roles';

/** Workflow modules shown only to Super Admin inside Administration. */
export const SUPER_ADMIN_WORKFLOW_COLUMNS = [
  {
    id: 'registration-sections',
    title: 'Registration Sections',
    roles: [ROLES.SUPER_ADMIN],
    links: [
      { href: '/entry/new', label: 'New Entry', desc: 'Register a new patient visit.' },
      { href: '/entry/list', label: 'Edit Entry', desc: 'Find and edit registrations.' },
      { href: '/entry/test-addition', label: 'Test Addition', desc: 'Add tests to an existing entry.' },
      { href: '/reports-section/all', label: 'All Reports', desc: 'Open the full reports worklist.' },
      { href: '/reports-section/search', label: 'Search Reports', desc: 'Search registration reports.' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    roles: [ROLES.SUPER_ADMIN],
    links: [
      { href: '/notifications/find-barcode', label: 'Find Barcode', desc: 'Look up barcodes and linked patients.' },
      { href: '/notifications/clinical-history', label: 'Clinical History', desc: 'Patient clinical history records.' },
      { href: '/notifications/test-cancellation', label: 'Test Cancellation', desc: 'Cancel ordered tests.' },
      { href: '/hold-tests', label: 'Hold Tests', desc: 'Hold tests pending review.' },
      { href: '/sample-rejection', label: 'Rejection', desc: 'Reject samples from workflow.' },
    ],
  },
];

/** Franchise tools in Administration for Super Admin and Admin. */
export const FRANCHISE_ADMIN_COLUMN = {
  id: 'franchise-management',
  title: 'Franchise',
  roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  links: [
    { href: '/admin/list-franchisee', label: 'List Franchisee', desc: 'View Supreme, Prime, and Sub accounts.' },
    { href: '/admin/add-franchisee', label: 'Add Franchisee', desc: 'Create a new franchise account.' },
    { href: '/admin/franchise-bulk-pricing', label: 'Franchise Pricing', desc: 'Set bulk franchise test pricing.' },
    { href: '/admin/franchise-transfer-pricing', label: 'Transfer Price', desc: 'Copy test rates Supreme→Supreme, Prime→Prime, or Sub→Sub.' },
    {
      href: '/admin/franchise-pricing-credits',
      label: 'Franchise Credits',
      desc: 'Zone pricing, commission rates, wallet balances, and manual credit adjustments.',
    },
  ],
};

/** Paths that keep the Administration sidebar open for Super Admin. */
export const SUPER_ADMIN_ADMIN_SHELL_PATHS = [
  '/sample-scan',
  '/entry',
  '/barcode-link',
  '/registration',
  '/reports-section',
  '/notifications/find-barcode',
  '/notifications/clinical-history',
  '/notifications/test-cancellation',
  '/hold-tests',
  '/sample-rejection',
  '/admin/list-franchisee',
  '/admin/add-franchisee',
  '/admin/franchise-bulk-pricing',
  '/admin/franchise-transfer-pricing',
  '/admin/franchise-pricing-credits',
];

export function isSuperAdminAdminShellPath(pathname = '') {
  return SUPER_ADMIN_ADMIN_SHELL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export const ADMIN_COLUMNS = [
  ...SUPER_ADMIN_WORKFLOW_COLUMNS,
  FRANCHISE_ADMIN_COLUMN,
  {
    id: 'user-management',
    title: 'User Management',
    links: [
      { slug: 'user-lock-management', label: 'User Lock Management', desc: 'Lock or unlock user accounts.' },
      { slug: 'user-management', label: 'User Management', desc: 'Create and manage lab users.' },
      { slug: 'role-management', label: 'Role Management', desc: 'Define roles and permissions.' },
      { slug: 'change-password', label: 'Change Password', desc: 'Reset passwords and policies.' },
      { slug: 'membership', label: 'Membership', desc: 'Membership plans and access.' },
      { slug: 'crm', label: 'CRM', desc: 'Customer relationship management.' },
      { slug: 'qc-report', label: 'QC Report', desc: 'Quality control reports.' },
      { slug: 'collection-center-boy', label: 'Collection Center Boy', desc: 'Manage collection staff.' },
      { slug: 'icmr-batches', label: 'ICMR Batches', desc: 'ICMR batch tracking.' },
      { slug: 'discount-reason', label: 'Discount Reason', desc: 'Discount reason codes.' },
      { slug: 'discount-authority', label: 'Discount Authority', desc: 'Discount approval limits.' },
      { slug: 'whatsapp-logger', label: 'WhatsApp Logger', desc: 'WhatsApp message logs.' },
      { slug: 'expense-type', label: 'Expense Type', desc: 'Expense categories.' },
    ],
  },
  {
    id: 'lab-management',
    title: 'Lab Management',
    links: [
      { slug: 'collection-center-management', label: 'Collection Center Management', desc: 'Manage collection centers.' },
      { slug: 'doctor-management', label: 'Doctor Management', desc: 'Referring doctors master.' },
      { slug: 'patient-management', label: 'Patient Management', desc: 'Patient records master.' },
      { slug: 'lab-configuration', label: 'Lab Configuration', desc: 'Lab profile and settings.' },
      { slug: 'services-in-area', label: 'Services In Area', desc: 'Service areas and zones.' },
      { slug: 'download-offline-data', label: 'Download offline data', desc: 'Export offline master data.' },
      { slug: 'checklist', label: 'CheckList', desc: 'Operational checklists.' },
      { slug: 'create-activity', label: 'Create Activity', desc: 'Schedule new activities.' },
      { slug: 'activities', label: 'Activities', desc: 'View scheduled activities.' },
      { slug: 'machine-mapping', label: 'Machine Mapping', desc: 'Analyzer to test mapping.' },
      { slug: 'area-master', label: 'Area Master', desc: 'Geographic area master.' },
      { slug: 'sales-reference-master', label: 'Sales Reference Master', desc: 'Sales reference contacts.' },
    ],
  },
  {
    id: 'accounting',
    title: 'Accounting',
    links: [
      { slug: 'lab-accounting', label: 'Lab Accounting', desc: 'Revenue and expense summaries.' },
      { slug: 'billing', label: 'Billing', desc: 'Billing and invoices.' },
      { slug: 'rate-master', label: 'Rate Master', desc: 'Test pricing and MRP.' },
    ],
  },
  {
    id: 'test-mgmt',
    title: 'Test Mgmt',
    links: [
      { slug: 'test-details', label: 'Test Details', desc: 'Individual test definitions.' },
      { slug: 'test-category', label: 'Test Category', desc: 'Clinical test categories.' },
      { slug: 'test-group', label: 'Test Group', desc: 'Group related tests.' },
      { slug: 'test-profile', label: 'Test Profile', desc: 'Health packages and profiles.' },
      { slug: 'test-unit', label: 'Test Unit', desc: 'Measurement units.' },
      { slug: 'upload-special-offers', label: 'Upload Special Offers', desc: 'Promotional offers.' },
      { slug: 'notes', label: 'Notes', desc: 'Standard report notes.' },
      { slug: 'machine-interface', label: 'Machine Interface', desc: 'Analyzer interface settings.' },
      { slug: 'popular-test', label: 'Popular Test', desc: 'Frequently ordered tests.' },
      { slug: 'complete-test-list', label: 'Complete Test List', desc: 'Full test catalog.' },
      { slug: 'outsource-lab', label: 'OutSource Lab', desc: 'External lab partners.' },
      { slug: 'external-test-mapping', label: 'External Test Mapping', desc: 'Outsource test code mapping.' },
    ],
  },
];

export function getAdminPath(slug) {
  return `/admin/${slug}`;
}

export function getAllAdminModules() {
  return ADMIN_COLUMNS.flatMap((column) =>
    column.links.map((link) => ({
      ...link,
      columnId: column.id,
      columnTitle: column.title,
      path: link.href || getAdminPath(link.slug),
    })),
  );
}

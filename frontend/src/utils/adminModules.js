export const ADMIN_COLUMNS = [
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
      { slug: 'enquiries', label: 'Enquiries', desc: 'Website join requests.' },
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

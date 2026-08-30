import { ROLES } from './roles';

/** Front-desk reception sample workflow modules. */
export const RECEPTION_WORKFLOW_ROLES = [ROLES.RECEPTIONIST];

export const RECEPTION_NAV_ITEMS = [
  {
    id: 'sample-accession',
    label: 'Sample Accession',
    href: '/reception/sample-accession',
    icon: 'chip',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
  {
    id: 'extra-sample',
    label: 'Extra Sample',
    href: '/reception/extra-sample',
    icon: 'chip',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
  {
    id: 'out-sources',
    label: 'Out Sources',
    href: '/reception/out-sources',
    icon: 'layers',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
  {
    id: 'out-received',
    label: 'Out Received',
    href: '/reception/out-received',
    icon: 'layers',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
  {
    id: 'sample-rack',
    label: 'Sample Rack',
    href: '/reception/sample-rack',
    icon: 'layers',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
  {
    id: 'sample-log',
    label: 'Sample Log',
    href: '/reception/sample-log',
    icon: 'layers',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
  {
    id: 'scan-log',
    label: 'Scan Log',
    href: '/reception/scan-log',
    icon: 'chip',
    roles: RECEPTION_WORKFLOW_ROLES,
  },
];

export const RECEPTION_PAGES = [
  {
    path: 'sample-accession',
    title: 'Sample Accession',
    activePage: 'sample-accession',
    description: 'Accession incoming samples, link barcodes, and mark samples received in the lab.',
  },
  {
    path: 'extra-sample',
    title: 'Extra Sample',
    activePage: 'extra-sample',
    description: 'Scan unlinked barcodes and save them as extra samples for follow-up.',
  },
  {
    path: 'out-sources',
    title: 'Out Sources',
    activePage: 'out-sources',
    description: 'Track samples and tests sent to external / outsource partner laboratories.',
  },
  {
    path: 'out-received',
    title: 'Out Received',
    activePage: 'out-received',
    description: 'Record and review results received back from outsource partner laboratories.',
  },
  {
    path: 'sample-rack',
    title: 'Sample Rack',
    activePage: 'sample-rack',
    description: 'Assign samples to storage racks and shelf positions in the lab.',
  },
  {
    path: 'sample-log',
    title: 'Sample Log',
    activePage: 'sample-log',
    description: 'View the chronological log of sample collection, movement, and status changes.',
  },
  {
    path: 'scan-log',
    title: 'Scan Log',
    activePage: 'scan-log',
    description: 'Audit trail of barcode / tube scans performed at reception and accession.',
  },
];

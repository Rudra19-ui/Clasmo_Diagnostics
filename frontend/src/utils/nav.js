export const NAV = [
  { id: 'search', label: 'Search', href: '/search' },
  { id: 'registration', label: 'Test Registration', href: '/registration' },
  { id: 'test-result', label: 'Test Result', href: '/test-result' },
  {
    id: 'administration',
    label: 'Administration',
    href: '/administration',
    megaMenu: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
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
    children: [
      { label: 'CLASMO DIAGNOSTICS PVT.LTD.', href: '/search', active: true },
      { label: 'Administration', href: '/administration' },
    ],
  },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'elab-pay', label: 'Elab-PAY', href: '/elab-pay' },
  { id: 'help', label: 'Help', href: '/help' },
];

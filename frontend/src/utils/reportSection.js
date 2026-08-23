/** Shared Report Section paths for Admin (/reports-section) and Franchise. */

export function getReportSectionPaths(pathname = '') {
  if (String(pathname).startsWith('/franchise/manage-reports')) {
    return {
      all: '/franchise/manage-reports/all',
      search: '/franchise/manage-reports/search',
      detail: (labCode) => `/franchise/manage-reports/detail/${encodeURIComponent(labCode)}`,
      activePage: 'manage-reports',
    };
  }
  return {
    all: '/reports-section/all',
    search: '/reports-section/search',
    detail: (labCode) => `/reports-section/detail/${encodeURIComponent(labCode)}`,
    activePage: 'registration-report',
  };
}

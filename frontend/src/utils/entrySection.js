/** Shared Entry Section paths for Admin (/entry) and Franchise (/franchise/manage-booking). */

export function getEntrySectionPaths(pathname = '') {
  if (String(pathname).startsWith('/franchise/manage-booking')) {
    return {
      new: '/franchise/manage-booking/new',
      list: '/franchise/manage-booking/list',
      testAddition: '/franchise/manage-booking/test-addition',
      activePage: 'manage-booking',
    };
  }
  return {
    new: '/entry/new',
    list: '/entry/list',
    testAddition: '/entry/test-addition',
    activePage: 'registration-entry',
  };
}

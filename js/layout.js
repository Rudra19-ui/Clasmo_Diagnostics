/**
 * Shared shell: header, main nav (proper ul/li), footer
 */
window.ClasmoLayout = (function () {
  const PHONES = '+91-8975273383 / +91-9146188320';

  function basePath() {
    return window.location.pathname.indexOf('/device/') !== -1 ? '../' : '';
  }

  function href(path) {
    if (!path || path === '#') return path;
    return basePath() + path;
  }

  const NAV = [
    { id: 'search', label: 'Search', href: 'search.html' },
    { id: 'registration', label: 'Test Registration', href: 'registration.html' },
    { id: 'test-result', label: 'Test Result', href: 'test-result.html' },
    {
      id: 'administration',
      label: 'Administration',
      href: 'administration.html',
      adminOnly: true,
      children: [
        { label: 'User Management', href: 'administration.html#users' },
        { label: 'Test Master', href: 'administration.html#tests' },
        { label: 'Collection Center', href: 'administration.html#centers' },
        { label: 'Doctor Master', href: 'administration.html#doctors' },
        { label: 'Rate Master', href: 'administration.html#rates' }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      href: 'reports.html',
      children: [
        { label: 'Daily Summary', href: 'reports.html#daily' },
        { label: 'Collection Report', href: 'reports.html#collection' },
        { label: 'Outstanding Report', href: 'reports.html#outstanding' },
        { label: 'TAT Report', href: 'reports.html#tat' }
      ]
    },
    {
      id: 'device-request',
      label: 'Device Request',
      href: 'device/pickup-request.html',
      children: [
        { label: 'Pickup Request Page', href: 'device/pickup-request.html' },
        { label: 'Patient Appointment', href: 'device/patient-appointment.html' },
        { label: 'Message To Lab', href: 'device/message-to-lab.html' },
        { label: 'Schedular', href: 'device/schedular.html' },
        { label: 'Trip Management', href: 'device/trip-management.html' },
        { label: 'Batch Upload', href: 'device/batch-upload.html' },
        { label: 'Test Result Batch', href: 'device/test-result-batch.html' }
      ]
    },
    {
      id: 'changelab',
      label: 'ChangeLab',
      children: [
        { label: 'CLASMO DIAGNOSTICS PVT.LTD.', href: 'search.html', active: true },
        { label: 'Admin', href: 'administration.html', adminOnly: true }
      ]
    },
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'elab-pay', label: 'Elab-PAY', href: 'elab-pay.html' },
    { id: 'help', label: 'Help', href: 'help.html' }
  ];

  function canSee(item, session) {
    if (item.adminOnly && session.role !== 'admin') return false;
    return true;
  }

  function renderNavItem(item, activePage, session) {
    if (!canSee(item, session)) return '';

    const isActive = item.id === activePage;
    const hasChildren = item.children && item.children.length;
    const visibleChildren = hasChildren
      ? item.children.filter(function (c) { return canSee(c, session); })
      : [];

    if (hasChildren && visibleChildren.length) {
      const childLis = visibleChildren.map(function (c) {
        const cls = c.active ? ' class="active"' : '';
        return '<li><a href="' + href(c.href) + '"' + cls + '>' + c.label + '</a></li>';
      }).join('');
      return (
        '<li class="has-submenu' + (isActive ? ' active' : '') + '">' +
        '<a href="' + href(item.href || '#') + '">' + item.label + ' ▾</a>' +
        '<ul class="submenu">' + childLis + '</ul></li>'
      );
    }

    return (
      '<li' + (isActive ? ' class="active"' : '') + '>' +
      '<a href="' + href(item.href) + '">' + item.label + '</a></li>'
    );
  }

  function renderShell(activePage) {
    const session = window.ClasmoAuth.requireAuth();
    if (!session) return;

    const navItems = NAV.map(function (item) {
      return renderNavItem(item, activePage, session);
    }).join('');

    const shell = document.getElementById('clasmo-shell');
    if (!shell) return session;

    shell.innerHTML =
      '<div class="top-utility">' +
      '<div class="global-search">' +
      '<input type="search" placeholder="Search by Name, Labcode, Mobile Number, Adhar Number" aria-label="Global search">' +
      '</div>' +
      '<div class="brand-title">CLASMO DIAGNOSTICS PVT.LTD. <span class="brand-sub">(CLASMO Diagnostics pvt.ltd) — ' + session.labCode + '</span></div>' +
      '<ul class="utility-icons">' +
      '<li><span class="util-label">' + session.displayName + '</span></li>' +
      '<li><button type="button" class="icon-btn" title="Payments">$</button></li>' +
      '<li><button type="button" class="icon-btn" title="Mail">✉</button></li>' +
      '<li><button type="button" class="icon-btn badge" title="Notifications">🔔<span>4</span></button></li>' +
      '<li><button type="button" class="icon-btn" title="Language">🌐</button></li>' +
      '<li><button type="button" class="icon-btn" title="Calendar">📅</button></li>' +
      '<li><button type="button" class="icon-btn" id="btnLogout" title="Logout">⏻</button></li>' +
      '</ul></div>' +
      '<nav class="main-menu-bar" aria-label="Main navigation">' +
      '<ul class="main-menu">' + navItems + '</ul>' +
      '<div class="nav-phones">' + PHONES + '</div>' +
      '</nav>';

    document.getElementById('btnLogout')?.addEventListener('click', function () {
      window.ClasmoAuth.logout();
    });

    shell.querySelectorAll('.has-submenu > a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (link.getAttribute('href') === '#') e.preventDefault();
        const li = link.parentElement;
        li.classList.toggle('open');
      });
    });

    return session;
  }

  function renderFilterPanel() {
    const today = formatDate(new Date());
    return (
      '<section class="filter-panel" aria-label="Search filters">' +
      '<div class="filter-grid">' +
      '<div class="form-row"><label>Patient Name</label><input type="text" name="patientName"></div>' +
      '<div class="form-row"><label>From Date</label><input type="text" name="fromDate" value="' + today + '"></div>' +
      '<div class="form-row"><label>To Date</label><input type="text" name="toDate" value="' + today + '"></div>' +
      '<div class="form-row"><label>Select Test</label><input type="text" name="selectTest"></div>' +
      '<div class="form-row"><label>Labcode</label><input type="text" placeholder="From Labcode" name="fromLabcode"></div>' +
      '<div class="form-row"><label>&nbsp;</label><input type="text" placeholder="To Labcode" name="toLabcode"></div>' +
      '<div class="form-row"><label>Test Category</label>' +
      '<select multiple size="4" name="testCategory" class="multi-select">' +
      '<option>Biochemistry</option><option>Hematology</option><option>Serology</option><option>Microbiology</option>' +
      '</select></div>' +
      '<div class="form-row"><label>Collection Center</label><input type="text" name="collectionCenter"></div>' +
      '<div class="filter-actions">' +
      '<button type="button" class="btn-blue">Direct Print</button>' +
      '<button type="button" class="btn-link" id="btnFilterSearch">Search</button>' +
      '</div></div></section>'
    );
  }

  function renderStatusTabs() {
    return (
      '<ul class="status-tabs" role="tablist">' +
      '<li class="status-level"><label>Status Level</label><select><option>Default</option></select></li>' +
      '<li class="active" role="tab"><span class="tab-icon">📋</span> All</li>' +
      '<li role="tab"><span class="tab-icon">✏</span> Registrations &amp; Collection</li>' +
      '<li role="tab"><span class="tab-icon">📄</span> Results &amp; Authorization</li>' +
      '<li role="tab"><span class="tab-icon">🖨</span> Print &amp; Release</li>' +
      '<li role="tab"><span class="tab-icon">⏱</span> Pending TAT</li>' +
      '</ul>'
    );
  }

  function renderDataTable(id) {
    return (
      '<div class="data-table-wrap" id="' + (id || 'dataTable') + '">' +
      '<div class="table-toolbar"><button type="button" class="table-menu" title="Table options">☰</button></div>' +
      '<table class="data-table"><thead><tr>' +
      '<th>Lab Code</th><th>Patient Name</th><th>Test</th><th>Reg. Date</th><th>Status</th><th>Amount</th>' +
      '</tr></thead><tbody></tbody></table></div>'
    );
  }

  function formatDate(d) {
    const p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear();
  }

  return {
    renderShell,
    renderFilterPanel,
    renderStatusTabs,
    renderDataTable,
    formatDate,
    NAV
  };
})();

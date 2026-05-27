(function () {
  const MOCK = [
    { labCode: '270526041', name: 'Rajesh Kumar', test: 'CBC', date: '27-05-2026', status: 'Registered', amount: 250 },
    { labCode: '270526042', name: 'Priya Sharma', test: 'Lipid Profile', date: '27-05-2026', status: 'Collection', amount: 650 },
    { labCode: '270526038', name: 'Amit Patel', test: 'Thyroid Profile', date: '26-05-2026', status: 'Result Ready', amount: 750 },
    { labCode: '270526035', name: 'Sneha Desai', test: 'HBA1C', date: '26-05-2026', status: 'Printed', amount: 450 }
  ];

  function renderRows(rows) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No records found. Try Search.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return '<tr><td>' + r.labCode + '</td><td>' + r.name + '</td><td>' + r.test +
        '</td><td>' + r.date + '</td><td><span class="badge-status">' + r.status +
        '</span></td><td>₹' + r.amount + '</td></tr>';
    }).join('');
  }

  document.getElementById('btnFilterSearch')?.addEventListener('click', function () {
    const name = (document.querySelector('[name="patientName"]')?.value || '').toLowerCase();
    const filtered = name
      ? MOCK.filter(function (r) { return r.name.toLowerCase().includes(name); })
      : MOCK;
    renderRows(filtered);
  });

  renderRows(MOCK);
})();

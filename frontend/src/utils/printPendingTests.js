function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRegnDate(row) {
  const raw = row.registration_date || row.created_at || row.date;
  if (!raw) return '—';

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).substring(0, 10);

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatPatientType(patient = {}) {
  const value = patient.patient_type || 'O.P.D.';
  if (value.includes('I.P.D')) return 'IPD';
  if (value.includes('O.P.D')) return 'OPD';
  if (value.toLowerCase() === 'corporate') return 'Corporate';
  return value.replace(/\./g, '');
}

function formatReferDoctor(patient = {}) {
  if (patient.affiliation) return patient.affiliation;
  if (patient.doctor_name) return patient.doctor_name;
  return formatPatientType(patient);
}

function formatTestNames(row) {
  const names = (row.tests || []).map((t) => t.test_name || t.name).filter(Boolean);
  if (names.length) return names.join(' , ');
  return row.test || '—';
}

export function isPendingTestRow(row) {
  const status = row.status || '';
  return !['Result Ready', 'Printed'].includes(status);
}

function mapRowToPrint(row) {
  const patient = row.patient || {};
  return {
    regnDate: formatRegnDate(row),
    regnId: row.lab_code || '—',
    patientType: formatPatientType(patient),
    patientName: (patient.patient_name || row.patient_name || '—').toUpperCase(),
    referDoctor: formatReferDoctor(patient),
    testName: formatTestNames(row),
    sortDate: new Date(row.registration_date || row.created_at || row.date || 0).getTime() || 0,
    sortId: row.lab_code || '',
  };
}

function buildPendingTestsHtml(rows) {
  const mapped = rows
    .map(mapRowToPrint)
    .sort((a, b) => {
      if (b.sortDate !== a.sortDate) return b.sortDate - a.sortDate;
      return String(b.sortId).localeCompare(String(a.sortId));
    });

  const tableRows = mapped.map((row) => `
    <tr>
      <td>${escapeHtml(row.regnDate)}</td>
      <td>${escapeHtml(row.regnId)}</td>
      <td>${escapeHtml(row.patientType)}</td>
      <td>${escapeHtml(row.patientName)}</td>
      <td>${escapeHtml(row.referDoctor)}</td>
      <td class="pt-tests">${escapeHtml(row.testName)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pending Test Details</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: portrait; margin: 12mm; }
    body {
      margin: 18px 24px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
    }
    h1 {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #111;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
      line-height: 1.35;
    }
    th {
      font-weight: 700;
      background: #fff;
    }
    .pt-tests { word-break: break-word; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>Pending Test Details</h1>
  <table>
    <thead>
      <tr>
        <th>RegnDate</th>
        <th>Regn ID</th>
        <th>Patient Type</th>
        <th>Patient Name</th>
        <th>Refer Doctor Name</th>
        <th>Test Name</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <script>
    window.addEventListener('load', function () {
      window.focus();
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function printPendingTests(rows) {
  const pendingRows = (rows || []).filter(isPendingTestRow);

  if (!pendingRows.length) {
    alert('No pending tests found in the current search results.');
    return;
  }

  const html = buildPendingTestsHtml(pendingRows);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to view pending test details.');
    return;
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
}

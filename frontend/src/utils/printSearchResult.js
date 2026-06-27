function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatReqnDate(row) {
  const raw = row.created_at || row.registration_date || row.date;
  if (!raw) return '—';

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return String(raw).replace('T', ' ').substring(0, 16);
  }

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function formatBalance(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTestNames(row) {
  const names = (row.tests || []).map((t) => t.test_name || t.name).filter(Boolean);
  if (names.length) return names.join(', ');
  return row.test || '—';
}

function mapRowToPrint(row) {
  const patient = row.patient || {};
  return {
    labCode: row.lab_code || '—',
    ipdOpd: patient.patient_type || 'O.P.D.',
    patientName: (patient.patient_name || row.patient_name || '—').toUpperCase(),
    affiliation: patient.affiliation || 'OPD',
    tests: getTestNames(row),
    reqnDate: formatReqnDate(row),
    balance: formatBalance(row.balance ?? 0),
    collectionCenter: patient.collection_center || 'CLASMO Diagnostics pvt.ltd',
    doctorName: patient.doctor_name || '—',
  };
}

function buildSearchResultHtml(rows) {
  const tableRows = rows.map((row) => {
    const r = mapRowToPrint(row);
    return `
      <tr>
        <td>${escapeHtml(r.labCode)}</td>
        <td>${escapeHtml(r.ipdOpd)}</td>
        <td>${escapeHtml(r.patientName)}</td>
        <td>${escapeHtml(r.affiliation)}</td>
        <td class="sr-tests">${escapeHtml(r.tests)}</td>
        <td>${escapeHtml(r.reqnDate)}</td>
        <td class="sr-num">${escapeHtml(r.balance)}</td>
        <td>${escapeHtml(r.collectionCenter)}</td>
        <td>${escapeHtml(r.doctorName)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Search Result</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: portrait; margin: 12mm; }
    body {
      margin: 18px 24px;
      font-family: "Times New Roman", Times, serif;
      font-size: 11px;
      color: #111;
    }
    h1 {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 10px;
      letter-spacing: 0.5px;
    }
    .sr-rule {
      border: none;
      border-top: 1px solid #111;
      margin: 0 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #111;
      padding: 5px 6px;
      text-align: left;
      vertical-align: top;
      line-height: 1.35;
    }
    th {
      font-weight: 700;
      background: #fff;
    }
    .sr-tests { max-width: 140px; word-break: break-word; }
    .sr-num { text-align: right; white-space: nowrap; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>Search Result</h1>
  <hr class="sr-rule" />
  <table>
    <thead>
      <tr>
        <th>Lab Code</th>
        <th>IPD/OPD</th>
        <th>Patient Name</th>
        <th>Affiliation</th>
        <th>Tests</th>
        <th>Reqn Date</th>
        <th>Balance</th>
        <th>Collection Center</th>
        <th>Doctor Name</th>
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

export function printSearchResult(rows) {
  if (!rows?.length) {
    alert('No records to print. Run a search first or select rows using the checkboxes.');
    return;
  }

  const html = buildSearchResultHtml(rows);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to print the search result.');
    return;
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
}

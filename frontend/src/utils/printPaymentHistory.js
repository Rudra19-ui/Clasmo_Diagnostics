function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatRegnDate(row) {
  const raw = row.registration_date || row.created_at || row.date;
  if (!raw) return '—';

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).substring(0, 11);

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyPlain(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0';
  if (Number.isInteger(num)) return num.toLocaleString('en-IN');
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRegNo(row) {
  if (row.bill_receipt_no) {
    const num = Number(String(row.bill_receipt_no).replace(/,/g, ''));
    if (!Number.isNaN(num)) return num.toLocaleString('en-IN');
    return row.bill_receipt_no;
  }
  const id = Number(row.id);
  if (!Number.isNaN(id)) return (20000 + id).toLocaleString('en-IN');
  return '—';
}

function getTestNames(row) {
  const names = (row.tests || []).map((t) => t.test_name || t.name).filter(Boolean);
  if (names.length) return names.join(', ');
  return row.test || '—';
}

function getPayModeLabel(method) {
  const key = String(method || 'cash').toLowerCase();
  if (key === 'cash') return 'Cash';
  if (key === 'credit' || key === 'debit' || key === 'cheque' || key === 'others') return 'Online/UPI';
  return method || 'Cash';
}

function getUserId() {
  return 'CD1';
}

function getPatientName(row) {
  const patient = row.patient || {};
  const title = patient.title ? `${patient.title} ` : '';
  const name = patient.patient_name || row.patient_name || '—';
  return `${title}${name}`.trim();
}

function mapRow(row) {
  const patient = row.patient || {};
  const discount = Number(row.discount_test ?? 0) + Number(row.discount_regn ?? 0);
  const rawDate = row.registration_date || row.created_at || row.date;

  return {
    regnDate: formatRegnDate(row),
    sortDate: rawDate ? new Date(rawDate).getTime() : 0,
    labCode: row.lab_code || '—',
    regNo: formatRegNo(row),
    patientName: getPatientName(row),
    tests: getTestNames(row),
    mrp: Number(row.total ?? row.net_amount ?? 0),
    discount,
    paidAmt: Number(row.paid ?? 0),
    balance: Number(row.balance ?? 0),
    refundAmt: Number(row.refund_amount ?? 0),
    payMode: getPayModeLabel(row.payment_method),
    payGroup: getPayModeLabel(row.payment_method),
    userId: getUserId(row),
    collectionCenter: patient.collection_center || 'CLASMO Diagnostics pvt.ltd',
  };
}

function sumField(rows, key) {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function buildTableHeader() {
  return `
    <thead>
      <tr>
        <th>Regn Date</th>
        <th>LabCode</th>
        <th>Reg No</th>
        <th>Patient Name</th>
        <th>Tests</th>
        <th>MRP</th>
        <th>Discount</th>
        <th>Paid Amt</th>
        <th>Balance</th>
        <th>RefundAmt</th>
        <th>Pay Mode</th>
        <th>User ID</th>
      </tr>
    </thead>
  `;
}

function buildDataRows(rows) {
  return rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.regnDate)}</td>
      <td>${escapeHtml(row.labCode)}</td>
      <td class="ph-num">${escapeHtml(row.regNo)}</td>
      <td>${escapeHtml(row.patientName)}</td>
      <td class="ph-tests">${escapeHtml(row.tests)}</td>
      <td class="ph-num">${escapeHtml(formatMoneyPlain(row.mrp))}</td>
      <td class="ph-num">${escapeHtml(formatMoneyPlain(row.discount))}</td>
      <td class="ph-num">${escapeHtml(formatMoneyPlain(row.paidAmt))}</td>
      <td class="ph-num">${escapeHtml(formatMoney(row.balance))}</td>
      <td class="ph-num">${escapeHtml(formatMoneyPlain(row.refundAmt))}</td>
      <td>${escapeHtml(row.payMode)}</td>
      <td>${escapeHtml(row.userId)}</td>
    </tr>
  `).join('');
}

function buildSubtotalRow(rows) {
  const totalMrp = sumField(rows, 'mrp');
  const totalPaid = sumField(rows, 'paidAmt');
  const totalBalance = sumField(rows, 'balance');

  return `
    <tr class="ph-subtotal">
      <td colspan="5"></td>
      <td class="ph-num"><strong>${escapeHtml(formatMoneyPlain(totalMrp))}</strong></td>
      <td></td>
      <td class="ph-num"><strong>${escapeHtml(formatMoneyPlain(totalPaid))}</strong></td>
      <td class="ph-num"><strong>${escapeHtml(formatMoney(totalBalance))}</strong></td>
      <td colspan="3"></td>
    </tr>
  `;
}

function buildPayModeSection(groupName, rows) {
  const sorted = [...rows].sort((a, b) => {
    if (b.sortDate !== a.sortDate) return b.sortDate - a.sortDate;
    return String(b.labCode).localeCompare(String(a.labCode));
  });

  return `
    <div class="ph-section">
      <div class="ph-paymode-label">Pay Mode : ${escapeHtml(groupName)}</div>
      <div class="ph-current-date">Current Date</div>
      <table class="ph-main">
        ${buildTableHeader()}
        <tbody>
          ${buildDataRows(sorted)}
          ${buildSubtotalRow(sorted)}
        </tbody>
      </table>
    </div>
  `;
}

function buildSummaryTable(label, total, cash, online) {
  return `
    <table class="ph-summary">
      <thead>
        <tr>
          <th></th>
          <th>Total</th>
          <th>Cash</th>
          <th>Online/UP</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total</strong></td>
          <td class="ph-num">${escapeHtml(formatMoney(total))}</td>
          <td class="ph-num">${escapeHtml(formatMoney(cash))}</td>
          <td class="ph-num">${escapeHtml(formatMoney(online))}</td>
        </tr>
        <tr>
          <td><strong>${escapeHtml(label)}</strong></td>
          <td class="ph-num">${escapeHtml(formatMoney(total))}</td>
          <td class="ph-num">${escapeHtml(formatMoney(cash))}</td>
          <td class="ph-num">${escapeHtml(formatMoney(online))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function normalizeCenterName(name) {
  const value = String(name || 'CLASMO Diagnostics pvt.ltd').trim();
  if (value.toLowerCase().includes('clasmo') && !value.toLowerCase().includes('ltd')) {
    return `${value}.ltd`;
  }
  return value;
}

function buildPaymentHistoryHtml(rows, { fromDate, toDate } = {}) {
  const mapped = rows.map(mapRow);
  const collectionCenter = normalizeCenterName(mapped[0]?.collectionCenter);
  const centerCode = 'CD1';
  const dateRange = `${fromDate || '—'} To ${toDate || '—'}`;

  const groups = {};
  mapped.forEach((row) => {
    if (!groups[row.payGroup]) groups[row.payGroup] = [];
    groups[row.payGroup].push(row);
  });

  const groupOrder = ['Cash', 'Online/UPI'];
  const orderedGroups = [
    ...groupOrder.filter((g) => groups[g]?.length),
    ...Object.keys(groups).filter((g) => !groupOrder.includes(g)),
  ];

  const sections = orderedGroups.map((name) => buildPayModeSection(name, groups[name])).join('');

  const totalMrp = sumField(mapped, 'mrp');
  const cashMrp = sumField(mapped.filter((r) => r.payGroup === 'Cash'), 'mrp');
  const onlineMrp = sumField(mapped.filter((r) => r.payGroup === 'Online/UPI'), 'mrp');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payment History Report</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: portrait; margin: 10mm; }
    body {
      margin: 14px 18px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #111;
    }
    .ph-title-bar {
      background: #f9cb9c;
      border: 1px solid #111;
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      padding: 7px 8px;
      letter-spacing: 0.5px;
    }
    .ph-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 10px 0 8px;
      font-size: 11px;
    }
    .ph-center-name { font-weight: 700; }
    .ph-center-code { margin-top: 3px; font-weight: 700; }
    .ph-date-range { font-weight: 400; white-space: nowrap; }
    .ph-section { margin-bottom: 16px; page-break-inside: avoid; }
    .ph-paymode-label {
      font-weight: 700;
      font-size: 11px;
      margin: 8px 0 4px;
    }
    .ph-current-date {
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 4px;
    }
    table.ph-main {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .ph-main th, .ph-main td {
      border: 1px solid #111;
      padding: 4px 5px;
      text-align: left;
      vertical-align: top;
      line-height: 1.35;
    }
    .ph-main th {
      background: #f9cb9c;
      font-weight: 700;
    }
    .ph-subtotal td { border-top: 2px solid #111; }
    .ph-tests { max-width: 180px; word-break: break-word; }
    .ph-num { text-align: right; white-space: nowrap; }
    .ph-summaries {
      display: flex;
      gap: 48px;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    table.ph-summary {
      border-collapse: collapse;
      min-width: 230px;
    }
    .ph-summary th, .ph-summary td {
      border: 1px solid #111;
      padding: 4px 8px;
    }
    .ph-summary th { background: #f9cb9c; font-weight: 700; }
    @media print {
      body { margin: 0; }
      .ph-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="ph-title-bar">PAYMENT HISTORY REPORT</div>
  <div class="ph-meta">
    <div>
      <div class="ph-center-name">COLLECTION CENTER NAME : ${escapeHtml(collectionCenter)}</div>
      <div class="ph-center-code">${escapeHtml(centerCode)}</div>
    </div>
    <div class="ph-date-range">${escapeHtml(dateRange)}</div>
  </div>

  ${sections}

  <div class="ph-summaries">
    ${buildSummaryTable(centerCode, totalMrp, cashMrp, onlineMrp)}
    ${buildSummaryTable(collectionCenter.length > 24 ? `${collectionCenter.substring(0, 24)}…` : collectionCenter, totalMrp, cashMrp, onlineMrp)}
  </div>

  <script>
    window.addEventListener('load', function () {
      window.focus();
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function printPaymentHistory(rows, options = {}) {
  if (!rows?.length) {
    alert('No records for payment history. Run a search first or select rows using the checkboxes.');
    return;
  }

  const html = buildPaymentHistoryHtml(rows, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to view the payment history report.');
    return;
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
}

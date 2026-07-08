function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function buildBillReceiptHtml(bill, patientName, labCode, options = {}) {
  const showHeader = options.show_header || options.show_header_footer;
  const showFooter = options.show_footer || options.show_header_footer;
  const showTestDetails = options.show_test_details !== false;
  const patient = options.patient || bill.patient || {};

  const testRows = showTestDetails
    ? (bill.tests || []).map((test) => `
    <tr>
      <td>${escapeHtml(test.name)}</td>
      <td class="br-num">${escapeHtml(formatMoney(test.price))}</td>
    </tr>
  `).join('')
    : '';

  const testTable = showTestDetails && testRows ? `
  <table>
    <thead>
      <tr><th>Test Name</th><th>Amount</th></tr>
    </thead>
    <tbody>${testRows}</tbody>
  </table>` : '';

  const patientBlock = patient.name ? `
  <div class="br-patient-grid">
    <div><strong>Name:</strong> ${escapeHtml(patient.name)}</div>
    <div><strong>Gender:</strong> ${escapeHtml(patient.gender || '—')}</div>
    <div><strong>Age:</strong> ${escapeHtml(patient.age_display || '—')}</div>
    <div><strong>Address:</strong> ${escapeHtml(patient.address || '—')}</div>
    <div><strong>Email:</strong> ${escapeHtml(patient.email || '—')}</div>
    <div><strong>Refered By:</strong> ${escapeHtml(patient.doctor_name || '—')}</div>
    <div><strong>Contact:</strong> ${escapeHtml(patient.mobile || '—')}</div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Bill Receipt - ${escapeHtml(labCode)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 24px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
    }
    h1, h2 { text-align: center; margin: 0 0 8px; }
    .br-meta { margin-bottom: 14px; line-height: 1.6; }
    .br-patient-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 16px;
      margin: 12px 0;
      line-height: 1.5;
    }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #111; padding: 6px 8px; text-align: left; }
    th { background: #eef4f9; }
    .br-num { text-align: right; }
    .br-summary { margin-top: 12px; width: 300px; margin-left: auto; }
    .br-summary div { display: flex; justify-content: space-between; padding: 3px 0; }
    .br-footer { margin-top: 18px; text-align: center; font-size: 11px; }
  </style>
</head>
<body>
  ${showHeader ? '<h1>CLASMO Diagnostics pvt.ltd</h1><h2>Bill Receipt</h2>' : '<h2>Bill Receipt</h2>'}
  <div class="br-meta">
    <div><strong>Patient:</strong> ${escapeHtml(patientName)}</div>
    <div><strong>Lab Code:</strong> ${escapeHtml(labCode)}</div>
    <div><strong>Receipt No:</strong> ${escapeHtml(bill.bill_receipt_no || '—')}</div>
    <div><strong>Date:</strong> ${escapeHtml(bill.registration_date || '—')}</div>
    <div><strong>Payment Method:</strong> ${escapeHtml(bill.payment_method || '—')}</div>
  </div>
  ${patientBlock}
  ${testTable}
  <div class="br-summary">
    <div><span>Sub Total</span><strong>${escapeHtml(formatMoney(bill.total))}</strong></div>
    <div><span>Discount (Test)</span><strong>${escapeHtml(formatMoney(bill.discount_test))}</strong></div>
    <div><span>Discount</span><strong>${escapeHtml(formatMoney(bill.discount_regn ?? bill.discount))}</strong></div>
    <div><span>Visiting Charges</span><strong>${escapeHtml(formatMoney(bill.visiting_charges))}</strong></div>
    <div><span>Net Amount</span><strong>${escapeHtml(formatMoney(bill.net_amount))}</strong></div>
    <div><span>Paid</span><strong>${escapeHtml(formatMoney(bill.paid))}</strong></div>
    <div><span>Balance</span><strong>${escapeHtml(formatMoney(bill.balance))}</strong></div>
    ${bill.refund_amount ? `<div><span>Refund</span><strong>${escapeHtml(formatMoney(bill.refund_amount))}</strong></div>` : ''}
  </div>
  ${showFooter ? '<div class="br-footer">Thank you for choosing CLASMO Diagnostics.</div>' : ''}
  <script>
    window.addEventListener('load', function () {
      window.focus();
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function printBillReceipt(bill, patientName, labCode, options = {}) {
  const html = buildBillReceiptHtml(bill, patientName, labCode, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to view the bill receipt.');
    return false;
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
  return true;
}

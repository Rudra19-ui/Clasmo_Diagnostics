function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatReceiptNo(receipt) {
  if (receipt.bill_receipt_no) {
    const num = Number(String(receipt.bill_receipt_no).replace(/,/g, ''));
    if (!Number.isNaN(num)) return num.toLocaleString('en-IN');
    return receipt.bill_receipt_no;
  }
  const id = Number(receipt.registration_id);
  if (!Number.isNaN(id)) return (20000 + id).toLocaleString('en-IN');
  return '—';
}

function formatReceiptDate(receipt) {
  if (receipt.receipt_date_print) return receipt.receipt_date_print;
  if (!receipt.receipt_date) return '—';

  const match = receipt.receipt_date.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}:00 ${match[6].toLowerCase()}`;
  }
  return receipt.receipt_date;
}

function getAgeGen(receipt) {
  const age = receipt.patient?.age_display || '—';
  const gender = (receipt.patient?.gender || '—').toUpperCase();
  return `${age} / ${gender}`;
}

function getDiscount(receipt) {
  return Number(receipt.discount_test || 0) + Number(receipt.discount_regn || 0);
}

function renderReceiptBlock(receipt, index, total) {
  const testRows = (receipt.tests || []).map((test, idx) => `
    <tr>
      <td class="mbr-sr">${idx + 1}</td>
      <td class="mbr-test">${escapeHtml(test.name)}</td>
      <td class="mbr-charge">${escapeHtml(formatMoney(test.price))}</td>
    </tr>
  `).join('');

  const discount = getDiscount(receipt);
  const totalAmount = Number(receipt.net_amount || receipt.sub_total || receipt.total || 0);
  const paidAmount = Number(receipt.paid || 0);
  const balanceAmount = Number(receipt.balance ?? (totalAmount - paidAmount));

  return `
    <section class="mbr-receipt ${index < total - 1 ? 'mbr-page-break' : ''}">
      <h2 class="mbr-title">BILL / RECEIPT</h2>

      <div class="mbr-header">
        <div class="mbr-header-col">
          <div>Lab Code : <strong>${escapeHtml(receipt.lab_code)}</strong></div>
          <div>Patent Name : <strong>${escapeHtml(receipt.patient?.name || '—')}</strong></div>
          <div>Age/Gen : <strong>${escapeHtml(getAgeGen(receipt))}</strong></div>
        </div>
        <div class="mbr-header-col mbr-header-col--right">
          <div>Receipt No : <strong>${escapeHtml(formatReceiptNo(receipt))}</strong></div>
          <div>Date : <strong>${escapeHtml(formatReceiptDate(receipt))}</strong></div>
          <div>Doctor Name : <strong>${escapeHtml(receipt.patient?.doctor_name || '—')}</strong></div>
        </div>
      </div>

      <table class="mbr-table">
        <thead>
          <tr>
            <th>Sr.No.</th>
            <th>Investgaton</th>
            <th>Charges</th>
          </tr>
        </thead>
        <tbody>${testRows}</tbody>
      </table>

      <div class="mbr-totals">
        <div class="mbr-totals-col">
          <div>Total Amount : <strong>${escapeHtml(formatMoney(totalAmount))}</strong></div>
          <div>Paid Amount : <strong>${escapeHtml(formatMoney(paidAmount))}</strong></div>
        </div>
        <div class="mbr-totals-col mbr-totals-col--right">
          <div>Discount : <strong>${escapeHtml(formatMoney(discount))}</strong></div>
          <div>Balance Amount : <strong>${escapeHtml(formatMoney(balanceAmount))}</strong></div>
        </div>
      </div>

      <div class="mbr-footer">
        <div class="mbr-note">Note : This is computer generated document.No signature is requried.</div>
        <div class="mbr-signature">Authority Signature</div>
      </div>
    </section>
  `;
}

function buildMultipleBillReceiptHtml(receipts) {
  const blocks = (receipts || []).map((receipt, index) => renderReceiptBlock(receipt, index, receipts.length)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Multiple Bill Receipt</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
    }
    .mbr-receipt {
      max-width: 760px;
      margin: 0 auto 32px;
      padding-bottom: 8px;
    }
    .mbr-page-break {
      page-break-after: always;
      break-after: page;
    }
    .mbr-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 16px;
      letter-spacing: 0.5px;
    }
    .mbr-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      margin-bottom: 12px;
      line-height: 1.7;
    }
    .mbr-header-col--right {
      text-align: right;
    }
    .mbr-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 14px;
    }
    .mbr-table th,
    .mbr-table td {
      border-top: 1px solid #111;
      border-bottom: 1px solid #111;
      padding: 6px 8px;
      text-align: left;
    }
    .mbr-table th {
      font-weight: 700;
    }
    .mbr-sr {
      width: 70px;
    }
    .mbr-charge {
      width: 120px;
      text-align: right;
    }
    .mbr-totals {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin: 12px 0 24px;
      line-height: 1.8;
    }
    .mbr-totals-col--right {
      text-align: right;
    }
    .mbr-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-top: 28px;
      font-size: 11px;
    }
    .mbr-note {
      max-width: 420px;
      line-height: 1.5;
    }
    .mbr-signature {
      font-weight: 700;
      white-space: nowrap;
    }
    @media print {
      body { padding: 12px; }
      .mbr-receipt { margin-bottom: 0; }
    }
  </style>
</head>
<body>
  ${blocks || '<p>No receipts to print.</p>'}
  <script>
    window.addEventListener('load', function () {
      window.focus();
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function printMultipleBillReceipt(receipts, loadingWindow = null) {
  const html = buildMultipleBillReceiptHtml(receipts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const printWindow = loadingWindow || window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to view the bill receipts.');
    return false;
  }

  if (loadingWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });

  return true;
}

export function openMultipleBillReceiptLoadingWindow() {
  const loadingWindow = window.open('', '_blank');
  if (!loadingWindow) return null;

  loadingWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Loading Bill Receipts…</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;">Generating bill receipts…</body>
</html>`);
  return loadingWindow;
}

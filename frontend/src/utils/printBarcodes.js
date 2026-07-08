function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINTER_FORMATS = {
  TVSEBC: { barWidth: 2, barHeight: 52, fontSize: 11 },
  TSC: { barWidth: 2.2, barHeight: 48, fontSize: 10 },
  ZEBRA: { barWidth: 1.8, barHeight: 50, fontSize: 10 },
};

function buildLabelHtml(label, index) {
  return `
    <div class="label">
      <div class="label-name">${escapeHtml(label.patientName)}</div>
      <div class="label-meta">${escapeHtml(label.ageSex)} &nbsp; ${escapeHtml(label.labCode)}</div>
      <div class="label-group">${escapeHtml(label.groupName)}</div>
      <svg id="bc-${index}" class="label-barcode"></svg>
      <div class="label-code">${escapeHtml(label.barcode)}</div>
    </div>
  `;
}

function buildBarcodePrintHtml(labels, formatKey) {
  const format = PRINTER_FORMATS[formatKey] || PRINTER_FORMATS.TVSEBC;
  const labelBlocks = labels.map((label, index) => buildLabelHtml(label, index)).join('');
  const barcodeInit = labels.map((label, index) => `
      JsBarcode('#bc-${index}', ${JSON.stringify(label.barcode)}, {
        format: 'CODE128',
        width: ${format.barWidth},
        height: ${format.barHeight},
        displayValue: false,
        margin: 0,
      });`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Barcode Labels</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    * { box-sizing: border-box; }
    @page { size: auto; margin: 8mm; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
    }
    .labels-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .label {
      width: 50mm;
      min-height: 30mm;
      border: 1px dashed #999;
      padding: 4px 6px;
      page-break-inside: avoid;
    }
    .label-name {
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .label-meta, .label-group {
      font-size: 10px;
      line-height: 1.25;
      margin-top: 2px;
    }
    .label-group { font-weight: 700; }
    .label-barcode {
      width: 100%;
      height: auto;
      margin-top: 4px;
    }
    .label-code {
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5px;
    }
    @media print {
      .label { border: none; }
    }
  </style>
</head>
<body>
  <div class="labels-wrap">
    ${labelBlocks}
  </div>
  <script>
    window.addEventListener('load', function () {
      try {
        ${barcodeInit}
      } catch (e) {}
      window.focus();
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
}

export function printBarcodeLabels({ patientName, ageSex, labCode, groups, copies = 1, printerFormat = 'TVSEBC' }) {
  const selectedGroups = (groups || []).filter((group) => group.selected !== false);
  if (!selectedGroups.length) {
    alert('Please select at least one barcode group to print.');
    return;
  }

  const copyCount = Math.max(1, Number(copies) || 1);
  const labels = [];

  selectedGroups.forEach((group) => {
    for (let i = 0; i < copyCount; i += 1) {
      labels.push({
        patientName,
        ageSex,
        labCode,
        groupName: group.group_name,
        barcode: group.barcode,
      });
    }
  });

  const html = buildBarcodePrintHtml(labels, printerFormat);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to print barcodes.');
    return;
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
}

export { PRINTER_FORMATS };

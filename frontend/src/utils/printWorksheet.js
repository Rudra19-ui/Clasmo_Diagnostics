function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderParameters(parameters) {
  if (!parameters?.length) return '';
  return `
    <div class="ws-params-grid">
      ${parameters.map((param) => `
        <div class="ws-param">
          <b>${escapeHtml(param.parameter_name)}</b> :
          <span class="ws-value">${escapeHtml(param.value || '—')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPatientBlock(patient, index, total) {
  const ageGender = [patient.age_display ? `${patient.age_display} Years` : '', patient.gender]
    .filter(Boolean)
    .join(' / ');

  const sections = (patient.test_sections || []).map((section) => `
    <div class="ws-test-section">
      <div class="ws-test-title"><u>${escapeHtml(section.test_name)}</u></div>
      ${renderParameters(section.parameters)}
    </div>
  `).join('');

  return `
    <section class="ws-patient ${index < total - 1 ? 'ws-page-break' : ''}">
      <table class="ws-patient-header">
        <thead>
          <tr>
            <th>VST DATE</th>
            <th>PAT ID</th>
            <th>PATIENT NAME</th>
            <th>DOCTOR</th>
            <th>CENTER</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(patient.visit_date)}</td>
            <td><u>${escapeHtml(patient.lab_code)}</u></td>
            <td>${escapeHtml(patient.patient_name)} ${escapeHtml(ageGender)}</td>
            <td>${escapeHtml(patient.doctor_name)}</td>
            <td>${escapeHtml(patient.collection_center)}</td>
          </tr>
        </tbody>
      </table>

      <div class="ws-tests">${sections || '<p class="ws-empty">No tests ordered.</p>'}</div>

      <div class="ws-footer">
        <span>DONE BY</span>
        <span>Page ${index + 1} of ${total}</span>
        <span>SUPERVISED BY</span>
      </div>
    </section>
  `;
}

function buildWorksheetHtml(patients) {
  const isSingle = patients.length === 1;
  const title = isSingle ? 'WorkSheet' : 'BIOCHEMISTRY';
  const body = patients.map((patient, index) => renderPatientBlock(patient, index, patients.length)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - Print WorkSheet</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 24px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
    }
    h1 {
      text-align: center;
      font-size: 18px;
      letter-spacing: 2px;
      margin: 0 0 18px;
      text-decoration: underline;
    }
    .ws-patient {
      margin-bottom: 28px;
      padding-bottom: 18px;
      border-bottom: 1px solid #999;
    }
    .ws-patient-header {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .ws-patient-header th,
    .ws-patient-header td {
      border: 1px solid #999;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    .ws-patient-header th {
      background: #f2f2f2;
      font-weight: 700;
    }
    .ws-test-section { margin-top: 10px; }
    .ws-test-title { font-weight: 700; margin-bottom: 6px; }
    .ws-params-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px 18px;
      margin-left: 8px;
    }
    .ws-param { white-space: nowrap; }
    .ws-value { text-decoration: underline; font-weight: 600; }
    .ws-empty { color: #666; font-style: italic; margin: 8px 0; }
    .ws-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 8px;
      font-weight: 700;
    }
    .ws-page-break { page-break-after: always; }
    @media print {
      body { margin: 12mm; }
      .ws-patient { border-bottom: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
  <script>
    window.addEventListener('load', function () {
      window.focus();
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function openWorksheetLoadingWindow() {
  const html = `<!DOCTYPE html><html><head><title>Loading WorkSheet</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;color:#1a4a7a;}</style>
    </head><body><h2>Loading worksheet...</h2><p>Please wait.</p></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow._worksheetBlobUrl = url;
  } else {
    URL.revokeObjectURL(url);
  }
  return printWindow;
}

export function printWorksheet(patients, existingWindow = null) {
  if (!patients?.length) {
    if (existingWindow && !existingWindow.closed) existingWindow.close();
    alert('No worksheet data to print.');
    return;
  }

  const html = buildWorksheetHtml(patients);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (existingWindow && !existingWindow.closed) {
    if (existingWindow._worksheetBlobUrl) {
      URL.revokeObjectURL(existingWindow._worksheetBlobUrl);
    }
    existingWindow.location.href = url;
    existingWindow._worksheetBlobUrl = url;
    existingWindow.focus();
    return;
  }

  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to print the worksheet.');
    return;
  }

  printWindow._worksheetBlobUrl = url;
  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
  }, { once: true });
}

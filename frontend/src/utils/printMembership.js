function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function printMembership(membership) {
  const imageBlock = membership.profile_image_url
    ? `<div class="photo"><img src="${escapeHtml(membership.profile_image_url)}" alt="Profile" /></div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Membership - ${escapeHtml(membership.membership_number)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1, h2 { text-align: center; margin: 0 0 8px; }
    .sub { text-align: center; color: #555; margin-bottom: 20px; }
    .card { border: 1px solid #ccc; padding: 20px; max-width: 640px; margin: 0 auto; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .label { font-weight: 700; color: #1a4a7a; }
    .photo { text-align: center; margin-top: 16px; }
    .photo img { max-width: 140px; max-height: 140px; border: 1px solid #ddd; border-radius: 4px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <h1>CLASMO DIAGNOSTICS PVT. LTD.</h1>
  <h2>Membership Card</h2>
  <p class="sub">Membership Certificate</p>
  <div class="card">
    <div class="row"><span class="label">Membership No.</span><span>${escapeHtml(membership.membership_number)}</span></div>
    <div class="row"><span class="label">Patient</span><span>${escapeHtml(membership.patient_name)}</span></div>
    <div class="row"><span class="label">Membership Type</span><span>${escapeHtml(membership.membership_type_name)}</span></div>
    <div class="row"><span class="label">Valid Till</span><span>${escapeHtml(formatDate(membership.membership_validation))}</span></div>
    <div class="row"><span class="label">Issued On</span><span>${escapeHtml(formatDate(membership.created_at))}</span></div>
    ${imageBlock}
  </div>
  <p class="footer">Copyright © Clasmo Diagnostics · All rights reserved.</p>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=800,height=700');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

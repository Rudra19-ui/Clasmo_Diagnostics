/** Worklist chips on All Reports. A booking can match more than one chip. */

export const WORKLIST_FILTERS = [
  { id: 'lis', label: 'LIS', tone: 'lis' },
  { id: 'pending', label: 'Pending', tone: 'pending' },
  { id: 'doctor', label: 'Doctor Approval', tone: 'doctor' },
  { id: 'hold', label: 'Recheck & Hold', tone: 'hold' },
  { id: 'complete', label: 'Complete', tone: 'complete' },
  { id: 'expired', label: 'Expired TAT', tone: 'expired' },
  { id: 'history', label: 'Clinical History', tone: 'history' },
];

function progress(row) {
  const match = String(row?.report_progress || '').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return { completed: 0, total: 0 };
  return { completed: Number(match[1]), total: Number(match[2]) };
}

function isComplete(row) {
  const status = row?.status || '';
  if (status === 'Result Ready' || status === 'Printed') return true;
  return (row?.report_status || '') === 'verified';
}

function isOnHold(row) {
  return (row?.tests || []).some((test) => test?.is_on_hold);
}

function isInLab(row) {
  if (row?.reception_scanned === true) return true;
  const status = String(row?.status || '').trim();
  return status !== '' && status !== 'Registered';
}

function tatHours(value) {
  const text = String(value || '').toLowerCase();
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hrs?)\b/);
  if (hours) return Number(hours[1]);
  const days = text.match(/(\d+(?:\.\d+)?)\s*days?\b/);
  if (days) return Number(days[1]) * 24;
  if (text.includes('same day')) return 24;
  return null;
}

export function isTatExpired(row, now = new Date()) {
  if (isComplete(row)) return false;
  const hours = (row?.tests || [])
    .map((test) => tatHours(test?.tat))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!hours.length) return false;
  const allowed = Math.max(...hours);
  const started = new Date(row.registration_date || row.created_at || '');
  if (Number.isNaN(started.getTime())) return false;
  return now.getTime() > started.getTime() + allowed * 60 * 60 * 1000;
}

export function hasClinicalHistory(row) {
  return Boolean((row?.comment || '').trim() || row?.clinical_pdf_url || row?.clinical_pdf_name);
}

export function matchesWorklist(row, filterId) {
  if (!filterId) return true;
  const { completed } = progress(row);
  const complete = isComplete(row);
  const hold = isOnHold(row);
  const doctor = !complete && (row?.report_status || '') === 'entered';
  const lis = !complete && !hold && !doctor && isInLab(row);
  const pending = !complete && !hold && !doctor && !lis && completed === 0;

  switch (filterId) {
    case 'lis':
      return lis;
    case 'pending':
      return pending;
    case 'doctor':
      return doctor;
    case 'hold':
      return hold;
    case 'complete':
      return complete;
    case 'expired':
      return isTatExpired(row);
    case 'history':
      return hasClinicalHistory(row);
    default:
      return true;
  }
}

export function summarizeWorklist(rows) {
  const counts = Object.fromEntries(WORKLIST_FILTERS.map((item) => [item.id, 0]));
  (rows || []).forEach((row) => {
    WORKLIST_FILTERS.forEach((item) => {
      if (matchesWorklist(row, item.id)) counts[item.id] += 1;
    });
  });
  return counts;
}

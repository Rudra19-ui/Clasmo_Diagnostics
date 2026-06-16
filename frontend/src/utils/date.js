export function formatDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatDateTime(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${formatDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Parse DD-MM-YYYY string into a local Date, or null if invalid. */
export function parseDDMMYYYY(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Age in years, months, and days from DOB to a reference date (default: today). */
export function calculateAge(dob, referenceDate = new Date()) {
  let years = referenceDate.getFullYear() - dob.getFullYear();
  let months = referenceDate.getMonth() - dob.getMonth();
  let days = referenceDate.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

/**
 * Normalize uploaded media URLs so images load through the app origin
 * (Vite /media proxy in dev, Django in production).
 */
export function resolveMediaUrl(value) {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  if (raw.startsWith('/media/')) {
    return raw;
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.pathname.startsWith('/media/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return raw;
  }

  return raw;
}

export function getSelfPatientQueryPhotoUrl(row) {
  if (!row) return '';
  return resolveMediaUrl(row.photo_url || row.photo || '');
}

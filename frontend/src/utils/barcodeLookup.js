import { api } from '../services/api';

export async function resolveScannedBarcode(cleaned) {
  const data = await api.scanSampleBarcode(cleaned);
  if (data?.found) {
    return { found: true, scan: data };
  }

  const link = await api.lookupPatientBarcode(cleaned).catch(() => null);
  if (link?.found && (link.lab_code || link.patient_id)) {
    return { found: true, link };
  }

  return {
    found: false,
    barcode: cleaned,
    message: data?.message || 'No data found.',
  };
}

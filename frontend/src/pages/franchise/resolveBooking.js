import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';
import { api } from '../../services/api';

/** Resolve a franchise booking by sample barcode, lab / book id, or patient id. */
export async function resolveFranchiseBooking({ barcode = '', bookId = '', patientId = '' } = {}) {
  const cleanedBarcode = sanitizeBarcodeScannedValue(barcode);
  const cleanedBookId = String(bookId || '').trim();
  const cleanedPatientId = String(patientId || '').trim();

  if (!cleanedBarcode && !cleanedBookId && !cleanedPatientId) {
    throw new Error('Enter a barcode, Lab Code, or Patient ID.');
  }

  if (cleanedBarcode) {
    try {
      const lookup = await api.lookupPatientBarcode(cleanedBarcode);
      if (lookup?.found && lookup.lab_code) {
        return api.getRegistration(lookup.lab_code);
      }
    } catch {
      // fall through to registration search
    }
    const rows = await api.searchRegistrations({ barcode: cleanedBarcode });
    const match = Array.isArray(rows) ? rows[0] : null;
    if (match?.lab_code) {
      return api.getRegistration(match.lab_code);
    }
  }

  if (cleanedBookId) {
    try {
      return await api.getRegistration(cleanedBookId);
    } catch {
      const rows = await api.searchRegistrations({
        from_labcode: cleanedBookId,
        to_labcode: cleanedBookId,
      });
      const match = Array.isArray(rows) ? rows[0] : null;
      if (match?.lab_code) {
        return api.getRegistration(match.lab_code);
      }
    }
  }

  if (cleanedPatientId) {
    const rows = await api.searchRegistrations({ patient_id: cleanedPatientId });
    const match = Array.isArray(rows) ? rows[0] : null;
    if (match?.lab_code) {
      return api.getRegistration(match.lab_code);
    }
  }

  throw new Error('No booking found for the given barcode, Lab Code, or Patient ID.');
}

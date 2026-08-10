import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';
import { api } from '../../services/api';

/** Resolve a franchise booking by sample barcode and/or lab / book id. */
export async function resolveFranchiseBooking({ barcode = '', bookId = '' } = {}) {
  const cleanedBarcode = sanitizeBarcodeScannedValue(barcode);
  const cleanedBookId = String(bookId || '').trim();

  if (!cleanedBarcode && !cleanedBookId) {
    throw new Error('Enter a barcode or Book ID / Lab Code.');
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
      const rows = await api.searchRegistrations({ from_labcode: cleanedBookId, to_labcode: cleanedBookId });
      const match = Array.isArray(rows) ? rows[0] : null;
      if (match?.lab_code) {
        return api.getRegistration(match.lab_code);
      }
    }
  }

  throw new Error('No booking found for the given barcode / Book ID.');
}

import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';
import { api } from '../../services/api';

/** Resolve a booking by sample barcode, lab / book id, patient id, or patient name. */
export async function resolveFranchiseBooking({
  barcode = '',
  bookId = '',
  patientId = '',
  patientName = '',
} = {}) {
  const cleanedBarcode = sanitizeBarcodeScannedValue(barcode);
  const cleanedBookId = String(bookId || '').trim();
  const cleanedPatientId = String(patientId || '').trim();
  const cleanedPatientName = String(patientName || '').trim();

  if (!cleanedBarcode && !cleanedBookId && !cleanedPatientId && !cleanedPatientName) {
    throw new Error('Enter a barcode, Lab Code, Patient ID, or Patient Name.');
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
    try {
      const scan = await api.scanSampleBarcode(cleanedBarcode);
      if (scan?.found && scan.lab_code) {
        return api.getRegistration(scan.lab_code);
      }
    } catch {
      // fall through
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

  if (cleanedPatientName) {
    const rows = await api.searchRegistrations({ patient_name: cleanedPatientName });
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 1 && list[0]?.lab_code) {
      return api.getRegistration(list[0].lab_code);
    }
    if (list.length > 1) {
      const err = new Error(`Found ${list.length} bookings for that patient name. Use Lab Code or barcode to pick one.`);
      err.matches = list;
      throw err;
    }
  }

  throw new Error('No booking found for the given barcode, Lab Code, Patient ID, or Patient Name.');
}

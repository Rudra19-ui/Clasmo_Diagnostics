import { sanitizeBarcodeScannedValue } from './barcodeScan';

/** Build a URL that opens the patient when scanned with the phone's native camera app. */
export function buildOpenBarcodeUrl(barcode, origin = window.location.origin) {
  const cleaned = sanitizeBarcodeScannedValue(barcode);
  if (!cleaned) return '';
  return `${origin}/open?barcode=${encodeURIComponent(cleaned)}`;
}

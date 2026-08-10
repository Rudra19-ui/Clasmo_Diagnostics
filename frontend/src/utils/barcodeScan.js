/** Strip scanner control characters but keep HIBC/GS1 printable symbols (+ / $ etc.). */
export function sanitizeBarcodeScannedValue(value) {
  return String(value ?? '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .trim();
}

export function buildSampleBarcodePayload(sampleGroups, sampleBarcodes) {
  return sampleGroups
    .map(({ sampleType, tests = [] }) => {
      const entry = sampleBarcodes[sampleType];
      const barcode = sanitizeBarcodeScannedValue(entry?.enter);
      if (!barcode) return null;
      const confirm = sanitizeBarcodeScannedValue(entry?.confirm);
      if (!confirm) return null;
      if (barcode !== confirm) return null;
      return {
        sample_type: sampleType,
        barcode,
        confirm_barcode: confirm,
        test_ids: tests.map((test) => test.id),
      };
    })
    .filter(Boolean);
}

export function buildRegistrationBarcodePayload(registrationBarcode, sampleGroups, sampleBarcodes) {
  const payloads = [];
  const primary = sanitizeBarcodeScannedValue(registrationBarcode);

  if (primary) {
    payloads.push({
      sample_type: 'Primary',
      barcode: primary,
      confirm_barcode: primary,
    });
  }

  for (const item of buildSampleBarcodePayload(sampleGroups, sampleBarcodes)) {
    if (primary && item.barcode === primary && item.sample_type !== 'Primary') {
      continue;
    }
    payloads.push(item);
  }

  return payloads;
}

export function validateSampleBarcodes(sampleGroups, sampleBarcodes) {
  const seenByBarcode = new Map();

  for (const { sampleType } of sampleGroups) {
    const entry = sampleBarcodes[sampleType];
    const barcode = sanitizeBarcodeScannedValue(entry?.enter);
    const confirm = sanitizeBarcodeScannedValue(entry?.confirm);
    if (!barcode) {
      return `${sampleType}: enter the barcode number.`;
    }
    if (!confirm) {
      return `${sampleType}: confirm the barcode number.`;
    }
    if (barcode !== confirm) {
      return `${sampleType}: barcode and confirmation do not match.`;
    }

    const key = barcode.toUpperCase();
    const previousType = seenByBarcode.get(key);
    if (previousType && previousType !== sampleType) {
      return (
        `Barcode ${barcode} cannot be used for both ${previousType} and ${sampleType}. `
        + 'Use a different barcode for each sample type.'
      );
    }
    seenByBarcode.set(key, sampleType);
  }
  return '';
}

export function validateRegistrationBarcodes(registrationBarcode, sampleGroups, sampleBarcodes) {
  return validateSampleBarcodes(sampleGroups, sampleBarcodes);
}

export function validateBarcodePayload(barcodesPayload) {
  const seenByBarcode = new Map();

  for (const item of barcodesPayload || []) {
    const label = item.sample_type || 'Barcode';
    const barcode = sanitizeBarcodeScannedValue(item.barcode);
    const confirm = sanitizeBarcodeScannedValue(item.confirm_barcode);
    if (!barcode) return `${label}: scan or enter the preprinted barcode.`;
    if (barcode !== confirm) return `${label}: barcode and confirmation do not match.`;

    const key = barcode.toUpperCase();
    const previousType = seenByBarcode.get(key);
    if (previousType && previousType !== label) {
      return (
        `Barcode ${barcode} cannot be used for both ${previousType} and ${label}. `
        + 'Use a different barcode for each sample type.'
      );
    }
    seenByBarcode.set(key, label);
  }
  return '';
}

export function getBarcodeFieldStatus(enterValue, confirmValue) {
  const enter = sanitizeBarcodeScannedValue(enterValue);
  const confirm = sanitizeBarcodeScannedValue(confirmValue);
  if (!enter && !confirm) return 'empty';
  if (!enter || !confirm) return 'pending';
  if (enter === confirm) return 'matched';
  return 'mismatch';
}

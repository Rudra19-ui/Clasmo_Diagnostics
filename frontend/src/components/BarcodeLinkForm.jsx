import { useEffect, useMemo, useRef, useState } from 'react';
import { QrScanButton } from './QrCameraScanner';
import {
  buildSampleBarcodePayload,
  getBarcodeFieldStatus,
  sanitizeBarcodeScannedValue,
  validateBarcodePayload,
  validateSampleBarcodes,
} from '../utils/barcodeScan';

export {
  buildSampleBarcodePayload,
  validateSampleBarcodes,
  validateBarcodePayload,
  validateRegistrationBarcodes,
} from '../utils/barcodeScan';

function BarcodeScanRow({
  sampleType,
  enterValue,
  confirmValue,
  onBarcodeChange,
  autoFocus = false,
  singleScanMode = false,
  showCameraScan = true,
  compact = false,
  hideFieldLabels = false,
}) {
  const enterRef = useRef(null);
  const confirmRef = useRef(null);
  const effectiveConfirm = singleScanMode ? enterValue : confirmValue;
  const status = getBarcodeFieldStatus(enterValue, effectiveConfirm);

  useEffect(() => {
    if (autoFocus) {
      enterRef.current?.focus();
    }
  }, [autoFocus, sampleType]);

  const handleEnterChange = (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue);
    onBarcodeChange?.(sampleType, 'enter', cleaned);
    if (singleScanMode) {
      onBarcodeChange?.(sampleType, 'confirm', cleaned);
    }
  };

  const handleConfirmChange = (rawValue) => {
    onBarcodeChange?.(sampleType, 'confirm', sanitizeBarcodeScannedValue(rawValue));
  };

  const handleEnterKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    confirmRef.current?.focus();
    confirmRef.current?.select();
  };

  const handleConfirmKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (status === 'matched') {
      confirmRef.current?.blur();
    }
  };

  return (
    <div className={`reg-sketch-barcode-scan-row reg-sketch-barcode-scan-row--${status}${compact ? ' reg-sketch-barcode-scan-row--compact' : ''}`}>
      <label className="reg-sketch-barcode-field">
        {!hideFieldLabels && <span>{singleScanMode ? 'Sample Barcode' : 'Enter Barcode'}</span>}
        <div className="reg-sketch-barcode-input-row">
          <input
            ref={enterRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            value={enterValue}
            onChange={(e) => handleEnterChange(e.target.value)}
            onKeyDown={singleScanMode ? undefined : handleEnterKeyDown}
            placeholder={singleScanMode ? 'Optional — links on Submit' : 'Enter Barcode'}
            aria-label={`Barcode for ${sampleType}`}
          />
          {showCameraScan && !compact && (
            <QrScanButton
              label="Scan QR"
              title={`Scan ${sampleType} barcode with phone camera`}
              onScan={handleEnterChange}
            />
          )}
        </div>
      </label>
      {!singleScanMode && (
        <label className="reg-sketch-barcode-field">
          {!hideFieldLabels && <span>Confirm Barcode</span>}
          <input
            ref={confirmRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            value={confirmValue}
            onChange={(e) => handleConfirmChange(e.target.value)}
            onKeyDown={handleConfirmKeyDown}
            placeholder="Confirm Barcode"
            aria-label={`Confirm barcode for ${sampleType}`}
          />
        </label>
      )}
      {!compact && (
        <p className="reg-sketch-barcode-status" aria-live="polite">
          {status === 'empty' && (singleScanMode ? 'Optional sample barcode' : 'Ready to scan')}
          {status === 'pending' && 'Scan the same barcode into Confirm'}
          {status === 'matched' && (singleScanMode ? 'Sample barcode ready — links on Submit' : 'Barcode matched — will save on Submit')}
          {status === 'mismatch' && 'Barcodes do not match — scan again'}
        </p>
      )}
    </div>
  );
}

export default function BarcodeLinkForm({
  sampleGroups = [],
  sampleBarcodes = {},
  onBarcodeChange,
  onSubmit,
  submitLabel = 'Link Barcode',
  isSubmitting = false,
  showSampleTable = true,
  singleBarcode = false,
  singleScanMode = false,
  registrationLayout = false,
}) {
  const [singleEnter, setSingleEnter] = useState('');
  const [singleConfirm, setSingleConfirm] = useState('');

  const rows = useMemo(() => {
    if (singleBarcode) {
      return [{ sampleType: 'General', tests: [] }];
    }
    return sampleGroups;
  }, [sampleGroups, singleBarcode]);

  const singleStatus = getBarcodeFieldStatus(singleEnter, singleConfirm);

  const handleSingleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) return;
    onSubmit([
      {
        sample_type: '',
        barcode: sanitizeBarcodeScannedValue(singleEnter),
        confirm_barcode: sanitizeBarcodeScannedValue(singleConfirm),
      },
    ]);
  };

  const handleTableSubmit = (event) => {
    event?.preventDefault?.();
    if (!onSubmit) return;
    onSubmit(buildSampleBarcodePayload(rows, sampleBarcodes));
  };

  if (singleBarcode) {
    return (
      <form className="barcode-link-form" onSubmit={handleSingleSubmit}>
        <BarcodeScanRow
          sampleType="General"
          enterValue={singleEnter}
          confirmValue={singleConfirm}
          onBarcodeChange={(_, field, value) => {
            if (field === 'enter') setSingleEnter(value);
            if (field === 'confirm') setSingleConfirm(value);
          }}
          autoFocus
        />
        {onSubmit && (
          <button type="submit" className="barcode-link-submit" disabled={isSubmitting || singleStatus !== 'matched'}>
            {isSubmitting ? 'Linking…' : submitLabel}
          </button>
        )}
      </form>
    );
  }

  return (
    <div className={`barcode-link-form${registrationLayout ? ' barcode-link-form--registration' : ''}`}>
      {!registrationLayout && (
        <p className="reg-sketch-barcode-help">
          {singleScanMode
            ? 'Enter the main barcode in Patient Barcode above. Optional sample barcodes below also link on Submit.'
            : 'Click Enter Barcode, scan the label, then scan the same label into Confirm. Barcodes link when you click Submit.'}
        </p>
      )}
      {showSampleTable && (
        <div className="reg-sketch-sample-table-wrap">
          <table className={`reg-sketch-sample-table${registrationLayout ? ' reg-sketch-sample-table--registration' : ''}`}>
            <thead>
              <tr>
                {registrationLayout && <th>#</th>}
                <th>Type Of Sample</th>
                <th>{registrationLayout ? 'Barcode ID' : 'Preprinted Barcode'}</th>
                {registrationLayout && <th>Test Name</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={registrationLayout ? 4 : 2} className="reg-sketch-empty">
                    Add tests to populate sample types (EDTA, Serum, Urine, etc.)
                  </td>
                </tr>
              ) : (
                rows.map(({ sampleType, tests = [] }, index) => (
                  <tr key={sampleType}>
                    {registrationLayout && <td className="reg-sketch-sample-index">{index + 1}</td>}
                    <td className="reg-sketch-sample-type-cell">
                      {registrationLayout ? (
                        sampleType
                      ) : (
                        <>
                          <strong>{sampleType}</strong>
                          {tests.length > 0 && (
                            <div className="reg-sketch-sample-tests">
                              {tests.map((t) => t.name).join(', ')}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="reg-sketch-barcode-cell">
                      <BarcodeScanRow
                        sampleType={sampleType}
                        enterValue={sampleBarcodes[sampleType]?.enter || ''}
                        confirmValue={sampleBarcodes[sampleType]?.confirm || ''}
                        onBarcodeChange={onBarcodeChange}
                        autoFocus={index === 0 && !singleScanMode}
                        singleScanMode={singleScanMode}
                        compact={registrationLayout}
                        hideFieldLabels={registrationLayout}
                        showCameraScan={!registrationLayout}
                      />
                    </td>
                    {registrationLayout && (
                      <td className="reg-sketch-sample-test-names">
                        {tests.map((t) => t.name).join(', ')}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {onSubmit && (
        <button
          type="button"
          className="barcode-link-submit"
          disabled={isSubmitting || rows.length === 0}
          onClick={handleTableSubmit}
        >
          {isSubmitting ? 'Linking…' : submitLabel}
        </button>
      )}
    </div>
  );
}

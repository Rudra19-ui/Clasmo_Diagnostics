import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

export function QrCameraScanner({ open, onClose, onScan, title = 'Scan QR / Barcode' }) {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setError('');
    const html5QrCode = new Html5Qrcode(regionId);
    scannerRef.current = html5QrCode;

    const qrbox = Math.min(280, Math.max(180, window.innerWidth - 64));
    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: qrbox, height: qrbox } },
        (decodedText) => {
          if (!active) return;
          active = false;
          const cleaned = sanitizeBarcodeScannedValue(decodedText);
          html5QrCode
            .stop()
            .catch(() => {})
            .finally(() => {
              if (cleaned) onScan?.(cleaned);
              onClose?.();
            });
        },
        () => {},
      )
      .catch((err) => {
        setError(err?.message || 'Could not access camera. Allow camera permission and try again.');
      });

    return () => {
      active = false;
      const instance = scannerRef.current;
      if (instance?.isScanning) {
        instance.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [open, onClose, onScan, regionId]);

  if (!open) return null;

  return (
    <div className="qr-scanner-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="qr-scanner-modal">
        <div className="qr-scanner-header">
          <h2>{title}</h2>
          <button type="button" className="qr-scanner-close" onClick={onClose} aria-label="Close scanner">
            ×
          </button>
        </div>
        <p className="qr-scanner-hint">Point your phone camera at the QR code on the label.</p>
        <div id={regionId} className="qr-scanner-region" />
        {error && <p className="qr-scanner-error">{error}</p>}
      </div>
    </div>
  );
}

export function QrScanButton({ onScan, label = 'Scan', className = '', title = 'Scan QR / Barcode' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`qr-scan-btn ${className}`.trim()}
        onClick={() => setOpen(true)}
        aria-label={title}
      >
        {label}
      </button>
      <QrCameraScanner
        open={open}
        onClose={() => setOpen(false)}
        onScan={onScan}
        title={title}
      />
    </>
  );
}

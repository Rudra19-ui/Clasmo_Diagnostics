import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrScanButton } from './QrCameraScanner';
import SampleScanResultPanel from './SampleScanResultPanel';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';
import { ROLE_LABELS } from '../utils/roles';

const LAST_SCAN_KEY = 'clasmo_sample_barcode_last_scan';

function readLastScan() {
  try {
    const raw = sessionStorage.getItem(LAST_SCAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastScan(data) {
  if (data?.found) {
    sessionStorage.setItem(LAST_SCAN_KEY, JSON.stringify(data));
  }
}

export default function PathologistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleLabel = ROLE_LABELS[user?.role] || 'User';
  const inputRef = useRef(null);
  const [scanOpen, setScanOpen] = useState(true);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(() => readLastScan());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const runScan = useCallback(async (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue ?? barcode);
    if (!cleaned) {
      setError('Scan the barcode from the blood tube.');
      setResult(null);
      return;
    }

    setBarcode(cleaned);
    setLoading(true);
    setError('');
    setMessage('');
    setScanOpen(true);

    try {
      const data = await api.scanSampleBarcode(cleaned);
      setResult(data);
      if (data.found) {
        saveLastScan(data);
      } else {
        setError(data.message || 'Barcode not linked to any patient.');
      }
    } catch (err) {
      setError(err.message || 'Scan failed. Try again.');
      setResult(null);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode]);

  useEffect(() => {
    if (scanOpen) {
      inputRef.current?.focus();
    }
  }, [scanOpen]);

  const handleScannerInput = (event) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    runScan(event.currentTarget.value);
  };

  const openScan = () => {
    setScanOpen(true);
    setError('');
    setMessage('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleViewReport = () => {
    const scan = result?.found ? result : readLastScan();
    if (!scan?.registration_id) {
      setError('Scan a blood tube barcode first.');
      return;
    }
    navigate(`/clinical/report-preview?id=${scan.registration_id}`);
  };

  const handleSubmit = async () => {
    const scan = result?.found ? result : readLastScan();
    if (!scan?.registration_id) {
      setError('Scan a blood tube barcode first.');
      return;
    }
    if (!window.confirm(`Submit / verify report for ${scan.patient_name}?`)) return;

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await api.verifyReport(scan.registration_id);
      setMessage(`Report submitted for ${scan.patient_name} (Lab Code ${scan.lab_code}).`);
    } catch (err) {
      setError(err.message || 'Could not submit report. Results may not be entered yet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pathologist-dashboard">
      <h1 className="dashboard-welcome-heading">
        Welcome, <span>{roleLabel}</span>
      </h1>
      <p className="pathologist-dashboard-intro">
        Scan a sample tube barcode to see Lab Code, Patient ID, Patient Name, Age, Gender,
        Register Date, Test Type, and all tests for that sample.
      </p>

      <section className="pathologist-action-grid">
        <button type="button" className="pathologist-action-btn pathologist-action-btn--scan" onClick={openScan}>
          Scan Barcode
        </button>
        <button type="button" className="pathologist-action-btn pathologist-action-btn--report" onClick={handleViewReport}>
          View Report
        </button>
        <button
          type="button"
          className="pathologist-action-btn pathologist-action-btn--submit"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </section>

      {scanOpen && (
        <section className="pathologist-scan-panel">
          <h2>Scan Blood Tube</h2>
          <p>
            Use a scanner machine, type the barcode and press Enter, or tap <strong>Scan by Phone</strong>.
          </p>
          <div className="pathologist-scan-input-row">
            <input
              ref={inputRef}
              type="text"
              className="field-highlight-barcode pathologist-scan-input"
              value={barcode}
              placeholder="Scan or type barcode number and press Enter…"
              onChange={(e) => {
                setBarcode(sanitizeBarcodeScannedValue(e.target.value));
                setError('');
              }}
              onKeyDown={handleScannerInput}
              autoComplete="off"
              spellCheck={false}
            />
            <QrScanButton label="Scan by Phone" title="Scan QR code with phone camera" onScan={runScan} />
            <button type="button" className="pathologist-scan-lookup" onClick={() => runScan(barcode)} disabled={loading}>
              {loading ? 'Loading…' : 'Look up'}
            </button>
          </div>
        </section>
      )}

      {error && <p className="pathologist-message pathologist-message--error">{error}</p>}
      {message && <p className="pathologist-message pathologist-message--success">{message}</p>}
      <SampleScanResultPanel result={result} classPrefix="pathologist" />
    </div>
  );
}

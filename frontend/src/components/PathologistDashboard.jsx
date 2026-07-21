import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrScanButton } from '../components/QrCameraScanner';
import { api } from '../services/api';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

const LAST_SCAN_KEY = 'clasmo_pathologist_last_scan';

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

function ScanResultPanel({ result }) {
  if (!result?.found) return null;

  return (
    <div className="pathologist-scan-result">
      <div className="pathologist-scan-result-header">
        <div>
          <h2>{result.patient_name}</h2>
          <p className="pathologist-scan-subtitle">
            Patient ID: <strong>{result.patient_id}</strong>
            {' · '}
            Lab Code: <strong>{result.lab_code}</strong>
          </p>
        </div>
        <span className="pathologist-scan-badge">{result.registration_status || 'Registered'}</span>
      </div>

      <div className="pathologist-scan-grid">
        <div><span>Age / Sex</span><strong>{result.age_sex}</strong></div>
        <div><span>Sample Type</span><strong>{result.sample_type || '—'}</strong></div>
        <div><span>Barcode</span><strong>{result.barcode}</strong></div>
        <div><span>Register Date</span><strong>{result.registration_date || '—'}</strong></div>
        <div><span>Doctor</span><strong>{result.doctor_name || '—'}</strong></div>
        <div><span>Mobile</span><strong>{result.mobile || '—'}</strong></div>
      </div>

      <h3 className="pathologist-tests-title">Tests for this sample</h3>
      {result.tests?.length ? (
        <div className="pathologist-table-wrap">
          <table className="pathologist-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Test Name</th>
                <th>Sample</th>
              </tr>
            </thead>
            <tbody>
              {result.tests.map((test, index) => (
                <tr key={test.id || `${test.test_id}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{test.name}</td>
                  <td>{test.sample_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="pathologist-message pathologist-message--warn">No tests found for this sample.</p>
      )}
    </div>
  );
}

export default function PathologistDashboard() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [scanOpen, setScanOpen] = useState(false);
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
        Welcome, <span>Pathologist</span>
      </h1>
      <p className="pathologist-dashboard-intro">
        For testing: register a patient with a barcode number, then scan the same QR here using Scan by Phone.
      </p>

      <section className="pathologist-action-grid">
        <button type="button" className="pathologist-action-btn pathologist-action-btn--scan" onClick={openScan}>
          Scan
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
            No scanner machine? Tap <strong>Scan by Phone</strong> and point your camera at the QR code.
            The QR must contain the same barcode number entered at registration.
          </p>
          <div className="pathologist-scan-input-row">
            <input
              ref={inputRef}
              type="text"
              className="field-highlight-barcode pathologist-scan-input"
              value={barcode}
              placeholder="Or type barcode number and press Enter…"
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
      <ScanResultPanel result={result} />
    </div>
  );
}

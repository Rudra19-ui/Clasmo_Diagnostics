import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import { api } from '../services/api';
import { canEnterResults, canVerifyReports } from '../utils/roles';
import { useAuth } from '../context/AuthContext';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

export default function SampleScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runScan = useCallback(async (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue ?? barcode);
    if (!cleaned) {
      setError('Scan or enter the barcode from the blood tube.');
      setResult(null);
      return;
    }

    setBarcode(cleaned);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.scanSampleBarcode(cleaned);
      setResult(data);
      if (!data.found) {
        setError(data.message || 'Barcode not linked to any patient.');
      }
    } catch (err) {
      setError(err.message || 'Scan failed. Try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode]);

  const handleScannerInput = (event) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    runScan(event.currentTarget.value);
  };

  const openReportPreview = () => {
    if (!result?.registration_id) return;
    navigate(`/clinical/report-preview?id=${result.registration_id}`);
  };

  const openResultEntry = () => {
    if (!result?.registration_id) return;
    navigate(`/test-result-entry?registrationId=${result.registration_id}`);
  };

  return (
    <Layout activePage="sample-scan">
      <main className="dash-main sample-scan-page">
        <section className="sample-scan-panel">
          <h1 className="sample-scan-title">Scan Sample Tube</h1>
          <p className="sample-scan-intro">
            Scan the pre-printed barcode on the blood tube with your QR scanner machine or phone camera.
            Patient details and ordered tests will appear here.
          </p>

          <div className="sample-scan-input-row">
            <input
              ref={inputRef}
              type="text"
              className="field-highlight-barcode sample-scan-input"
              value={barcode}
              placeholder="Click here and scan tube barcode…"
              onChange={(e) => {
                setBarcode(sanitizeBarcodeScannedValue(e.target.value));
                setError('');
              }}
              onKeyDown={handleScannerInput}
              autoComplete="off"
              spellCheck={false}
              aria-label="Sample tube barcode scanner input"
            />
            <QrScanButton
              label="Scan QR"
              title="Scan tube barcode with phone camera"
              onScan={runScan}
            />
            <button type="button" className="sample-scan-submit" onClick={() => runScan(barcode)} disabled={loading}>
              {loading ? 'Loading…' : 'Look up'}
            </button>
          </div>

          {error && <p className="sample-scan-message sample-scan-message--error">{error}</p>}

          {result?.found && (
            <div className="sample-scan-result">
              <div className="sample-scan-result-header">
                <div>
                  <h2>{result.patient_name}</h2>
                  <p className="sample-scan-subtitle">
                    Patient ID: <strong>{result.patient_id}</strong>
                    {' · '}
                    Lab Code: <strong>{result.lab_code}</strong>
                  </p>
                </div>
                <span className="sample-scan-status-badge">{result.registration_status || 'Registered'}</span>
              </div>

              <div className="sample-scan-grid">
                <div><span>Age / Sex</span><strong>{result.age_sex}</strong></div>
                <div><span>Sample Type</span><strong>{result.sample_type || '—'}</strong></div>
                <div><span>Barcode</span><strong>{result.barcode}</strong></div>
                <div><span>Register Date</span><strong>{result.registration_date || '—'}</strong></div>
                <div><span>Doctor</span><strong>{result.doctor_name || '—'}</strong></div>
                <div><span>Mobile</span><strong>{result.mobile || '—'}</strong></div>
                <div><span>Collection Center</span><strong>{result.collection_center || '—'}</strong></div>
                <div><span>Patient Type</span><strong>{result.patient_type || '—'}</strong></div>
              </div>

              <h3 className="sample-scan-tests-title">Tests for this sample</h3>
              {result.tests?.length ? (
                <div className="sample-scan-table-wrap">
                  <table className="sample-scan-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Test Name</th>
                        <th>Sample</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tests.map((test, index) => (
                        <tr key={test.id || `${test.test_id}-${index}`}>
                          <td>{index + 1}</td>
                          <td>{test.name}</td>
                          <td>{test.sample_type || '—'}</td>
                          <td>{test.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="sample-scan-message sample-scan-message--warn">No tests found for this sample type.</p>
              )}

              {result.linked_barcodes?.length > 1 && (
                <div className="sample-scan-linked">
                  <h4>All linked barcodes for this patient</h4>
                  <ul>
                    {result.linked_barcodes.map((item) => (
                      <li key={`${item.sample_type}-${item.barcode}`}>
                        <strong>{item.sample_type || 'General'}</strong>: {item.barcode}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="sample-scan-actions">
                <button type="button" className="sample-scan-action-btn" onClick={openReportPreview}>
                  View Report
                </button>
                {canEnterResults(user) && (
                  <button type="button" className="sample-scan-action-btn sample-scan-action-btn--secondary" onClick={openResultEntry}>
                    Enter Results
                  </button>
                )}
                {canVerifyReports(user) && !canEnterResults(user) && (
                  <button type="button" className="sample-scan-action-btn sample-scan-action-btn--secondary" onClick={openReportPreview}>
                    Verify Report
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

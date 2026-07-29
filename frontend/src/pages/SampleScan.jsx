import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import SampleScanResultPanel from '../components/SampleScanResultPanel';
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
            Scan the tube barcode to see Lab Code, Patient ID, Patient Name, Age, Gender,
            Register Date, Test Type, and all tests for that sample.
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

          <SampleScanResultPanel
            result={result}
            classPrefix="sample-scan"
            showActions
            actions={(
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
            )}
          />
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

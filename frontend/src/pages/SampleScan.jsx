import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import SampleScanResultPanel from '../components/SampleScanResultPanel';
import ExtraSampleNoDataModal from '../components/ExtraSampleNoDataModal';
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
  const [noDataBarcode, setNoDataBarcode] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const openMachineEntry = useCallback((registrationId) => {
    if (!registrationId) return;
    navigate(`/clinical/result-entry?registrationId=${registrationId}`);
  }, [navigate]);

  const openReportPreview = useCallback((registrationId) => {
    if (!registrationId) return;
    navigate(`/clinical/report-preview?id=${registrationId}`);
  }, [navigate]);

  const runScan = useCallback(async (rawValue, { autoOpen = false } = {}) => {
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
        setNoDataBarcode(cleaned);
        setError('');
        return;
      }
      // Technician workflow: scan opens report format with machine-reading placeholders.
      if (autoOpen && canEnterResults(user) && data.registration_id) {
        openMachineEntry(data.registration_id);
      }
    } catch (err) {
      setError(err.message || 'Scan failed. Try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode, openMachineEntry, user]);

  const handleScannerInput = (event) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    runScan(event.currentTarget.value, { autoOpen: true });
  };

  return (
    <Layout activePage="sample-scan">
      <main className="dash-main sample-scan-page">
        <section className="sample-scan-panel">
          <h1 className="sample-scan-title">Scan Sample Tube</h1>
          <p className="sample-scan-intro">
            Scan the tube barcode to load patient and ordered tests.
            {canEnterResults(user)
              ? ' After a successful scan, open the report format and enter machine readings in the placeholders.'
              : canVerifyReports(user)
                ? ' After entry, open Verify Report to cross-check values and approve the final report for the franchisee.'
                : ' View patient details for this sample.'}
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
              onScan={(value) => runScan(value, { autoOpen: true })}
            />
            <button
              type="button"
              className="sample-scan-submit"
              onClick={() => runScan(barcode, { autoOpen: true })}
              disabled={loading}
            >
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
                {canEnterResults(user) && (
                  <button
                    type="button"
                    className="sample-scan-action-btn"
                    onClick={() => openMachineEntry(result?.registration_id)}
                  >
                    Enter Machine Readings
                  </button>
                )}
                {canVerifyReports(user) && (
                  <button
                    type="button"
                    className="sample-scan-action-btn sample-scan-action-btn--secondary"
                    onClick={() => openReportPreview(result?.registration_id)}
                  >
                    Cross-verify / Approve
                  </button>
                )}
                <button
                  type="button"
                  className="sample-scan-action-btn sample-scan-action-btn--secondary"
                  onClick={() => openReportPreview(result?.registration_id)}
                >
                  View Report
                </button>
              </div>
            )}
          />
        </section>
      </main>
      <Footer />
      <ExtraSampleNoDataModal barcode={noDataBarcode} onClose={() => setNoDataBarcode(null)} />
    </Layout>
  );
}

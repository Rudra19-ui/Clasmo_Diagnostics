import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import ExtraSampleNoDataModal from '../components/ExtraSampleNoDataModal';
import { api } from '../services/api';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

export default function OpenBarcode() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [noDataBarcode, setNoDataBarcode] = useState(null);

  const runLookup = useCallback(async (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue);
    if (!cleaned) {
      setError('Enter or scan a barcode first.');
      setResult(null);
      return;
    }

    setBarcode(cleaned);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.lookupPatientBarcode(cleaned);
      setResult(data);
      setSearchParams({ barcode: cleaned }, { replace: true });
      if (!data?.found) {
        setNoDataBarcode(cleaned);
      }
    } catch (err) {
      setError(err.message || 'Could not look up barcode.');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const param = searchParams.get('barcode');
    if (param) {
      runLookup(param);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openInSearch = () => {
    if (!result?.found) return;
    const params = new URLSearchParams();
    params.set('barcode', result.barcode);
    if (result.lab_code) params.set('lab_code', result.lab_code);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <Layout activePage="search">
      <main className="dash-main open-barcode-page">
        <section className="open-barcode-panel">
          <h1 className="open-barcode-title">Open Patient by Barcode</h1>
          <p className="open-barcode-intro">
            Scan a QR code with your phone camera. If the QR contains a CLASMO link, this page opens automatically.
            You can also scan here using the button below.
          </p>

          <div className="open-barcode-input-row">
            <input
              type="text"
              className="field-highlight-barcode"
              value={barcode}
              placeholder="Barcode or HIBC text"
              onChange={(e) => {
                setBarcode(sanitizeBarcodeScannedValue(e.target.value));
                setResult(null);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runLookup(barcode);
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <QrScanButton label="Scan QR" title="Scan barcode with phone camera" onScan={runLookup} />
            <button type="button" className="open-barcode-lookup-btn" onClick={() => runLookup(barcode)} disabled={loading}>
              {loading ? 'Looking up…' : 'Look up'}
            </button>
          </div>

          {error && <p className="open-barcode-message open-barcode-message--error">{error}</p>}

          {result?.found && (
            <div className="open-barcode-result">
              <p className="open-barcode-message open-barcode-message--success">Patient found</p>
              <dl className="open-barcode-details">
                <div><dt>Patient</dt><dd>{result.patient_name}</dd></div>
                <div><dt>Patient ID</dt><dd>{result.patient_id}</dd></div>
                <div><dt>Lab Code</dt><dd>{result.lab_code || '—'}</dd></div>
                <div><dt>Barcode</dt><dd>{result.barcode}</dd></div>
              </dl>
              <button type="button" className="open-barcode-open-btn" onClick={openInSearch}>
                Open full record
              </button>
            </div>
          )}

        </section>
      </main>
      <Footer />
      <ExtraSampleNoDataModal barcode={noDataBarcode} onClose={() => setNoDataBarcode(null)} />
    </Layout>
  );
}

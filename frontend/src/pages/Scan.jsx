import { useCallback, useEffect, useRef, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import ExtraSampleNoDataPanel from '../components/ExtraSampleNoDataPanel';
import SampleScanResultPanel from '../components/SampleScanResultPanel';
import { useExtraSamples } from '../context/ExtraSampleContext';
import { resolveScannedBarcode } from '../utils/barcodeLookup';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Scan({ activePage = 'barcode-scan', pageTitle = 'Scan' }) {
  const inputRef = useRef(null);
  const { samples, loading, refresh, removeSample } = useExtraSamples();
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [noDataBarcode, setNoDataBarcode] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runScan = useCallback(async (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue ?? barcode);
    if (!cleaned) {
      setError('Scan or enter a barcode number.');
      setScanResult(null);
      return;
    }

    setBarcode(cleaned);
    setScanning(true);
    setError('');
    setSuccessMessage('');
    setScanResult(null);
    setNoDataBarcode(null);

    try {
      const result = await resolveScannedBarcode(cleaned);
      if (result.found) {
        if (result.scan) {
          setScanResult(result.scan);
        } else {
          setScanResult({
            found: true,
            barcode: result.link?.barcode || cleaned,
            lab_code: result.link?.lab_code || '',
            patient_name: result.link?.patient_name || '',
            patient_id: result.link?.patient_id || '',
          });
        }
        return;
      }

      setNoDataBarcode(cleaned);
    } catch (err) {
      setNoDataBarcode(cleaned);
      setError(err.message || 'Lookup failed. You can still add this barcode to Extra Sample.');
    } finally {
      setScanning(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode]);

  const handleScannerInput = (event) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    runScan(event.currentTarget.value);
  };

  const handleRemove = async (sampleId) => {
    if (!confirm('Remove this barcode from the saved list?')) return;
    try {
      await removeSample(sampleId);
    } catch (err) {
      alert(err.message || 'Could not remove barcode.');
    }
  };

  return (
    <Layout activePage={activePage}>
      <main className="dash-main scan-page">
        <section className="scan-panel">
          <h1 className="scan-title">{pageTitle}</h1>
          <p className="scan-intro">
            Scan a tube barcode or type the barcode number below.
            {pageTitle === 'Extra Sample' ? ' If no data is found, add the barcode to Extra Sample.' : ''}
          </p>

          <div className="scan-input-row">
            <input
              ref={inputRef}
              type="text"
              className="field-highlight-barcode sample-scan-input"
              value={barcode}
              placeholder="Click here and scan or enter barcode number…"
              onChange={(e) => {
                setBarcode(sanitizeBarcodeScannedValue(e.target.value));
                setError('');
                setSuccessMessage('');
                setScanResult(null);
                setNoDataBarcode(null);
              }}
              onKeyDown={handleScannerInput}
              autoComplete="off"
              spellCheck={false}
              aria-label="Barcode scanner input"
            />
            <QrScanButton
              label="Scan QR"
              title="Scan barcode with camera"
              onScan={runScan}
            />
            <button type="button" className="sample-scan-submit" onClick={() => runScan(barcode)} disabled={scanning}>
              {scanning ? 'Looking up…' : 'Look up'}
            </button>
          </div>

          {error && <p className="sample-scan-message sample-scan-message--error">{error}</p>}
          {successMessage && <p className="sample-scan-message sample-scan-message--success">{successMessage}</p>}

          <ExtraSampleNoDataPanel
            barcode={noDataBarcode}
            onDismiss={() => setNoDataBarcode(null)}
            onAdded={(value) => {
              setSuccessMessage(`Barcode ${value} added to Extra Sample.`);
              setBarcode('');
            }}
          />

          <SampleScanResultPanel
            result={scanResult}
            classPrefix="sample-scan"
          />

          {samples.length > 0 && (
            <>
              <div className="scan-list-head">
                <h2>Saved barcodes (no patient data)</h2>
                <button type="button" className="scan-refresh" onClick={refresh} disabled={loading}>
                  {loading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              <div className="scan-table-wrap">
                <table className="scan-table">
                  <thead>
                    <tr>
                      <th>Barcode</th>
                      <th>Added</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((row) => (
                      <tr key={row.id}>
                        <td>{row.barcode}</td>
                        <td>{formatWhen(row.added_at)}</td>
                        <td>
                          <button type="button" className="scan-remove" onClick={() => handleRemove(row.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

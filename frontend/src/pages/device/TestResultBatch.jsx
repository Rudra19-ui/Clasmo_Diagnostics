import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const SAMPLE_CBC_JSON = `{
  "barcode": "PASTE-SAMPLE-BARCODE",
  "instrument_id": "Sysmex-XN",
  "results": [
    {"code": "HGB", "value": "12.1"},
    {"code": "RBC", "value": "4.31"},
    {"code": "HCT", "value": "34.6"},
    {"code": "WBC", "value": "7.61"},
    {"code": "NEUT%", "value": "58.1"},
    {"code": "LYMPH%", "value": "34.1"},
    {"code": "EO%", "value": "2.8"},
    {"code": "MONO%", "value": "4.8"},
    {"code": "BASO%", "value": "0.2"},
    {"code": "NEUT#", "value": "4.41"},
    {"code": "LYMPH#", "value": "2.60"},
    {"code": "EO#", "value": "0.21"},
    {"code": "MONO#", "value": "0.37"},
    {"code": "BASO#", "value": "0.02"},
    {"code": "MCV", "value": "80.28"},
    {"code": "MCH", "value": "28.07"},
    {"code": "MCHC", "value": "34.97"},
    {"code": "RDW-CV", "value": "15.2"},
    {"code": "PLT", "value": "152"},
    {"code": "MPV", "value": "11.6"},
    {"code": "PCT", "value": "0.176"},
    {"code": "PDW", "value": "16.2"},
    {"code": "PLCC", "value": "52"},
    {"code": "PLCR", "value": "34.4"}
  ]
}`;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.');
  }
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const barcodeIdx = headers.findIndex((h) => ['barcode', 'sample_id', 'sampleid'].includes(h));
  const codeIdx = headers.findIndex((h) => ['code', 'analyzer_code', 'analyte', 'parameter'].includes(h));
  const valueIdx = headers.findIndex((h) => ['value', 'result'].includes(h));
  if (barcodeIdx < 0 || codeIdx < 0 || valueIdx < 0) {
    throw new Error('CSV headers must include barcode, code, and value columns.');
  }

  const byBarcode = new Map();
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim());
    const barcode = cols[barcodeIdx];
    const code = cols[codeIdx];
    const value = cols[valueIdx];
    if (!barcode || !code) continue;
    if (!byBarcode.has(barcode)) byBarcode.set(barcode, []);
    byBarcode.get(barcode).push({ code, value });
  }
  return [...byBarcode.entries()].map(([barcode, results]) => ({ barcode, results }));
}

export default function TestResultBatch() {
  const [mode, setMode] = useState('json');
  const [jsonText, setJsonText] = useState(SAMPLE_CBC_JSON);
  const [instrumentId, setInstrumentId] = useState('Sysmex-XN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  async function runBatches(payloads) {
    const out = [];
    for (const payload of payloads) {
      out.push(await api.ingestInstrumentResults(payload));
    }
    return out;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResults([]);
    setBusy(true);
    try {
      const payload = JSON.parse(jsonText);
      const list = Array.isArray(payload) ? payload : [payload];
      setResults(await runBatches(list));
    } catch (err) {
      setError(err.message || 'Ingest failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCsvFile(file) {
    setError('');
    setResults([]);
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const batches = parseCsv(text).map((item) => ({
        barcode: item.barcode,
        instrument_id: instrumentId.trim(),
        results: item.results,
      }));
      setResults(await runBatches(batches));
    } catch (err) {
      setError(err.message || 'CSV ingest failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout activePage="device-request">
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>Test Result Batch</li>
          </ul>
        </nav>
        <h2 className="page-heading">Test Result Batch</h2>
        <p className="portfolio-intro">
          Capture analyzer results, match the patient via sample barcode, and populate the CBC report.
        </p>

        <section className="content-panel">
          <div className="instrument-ingest-tabs" role="tablist">
            <button type="button" className={mode === 'json' ? 'is-active' : ''} onClick={() => setMode('json')}>
              JSON payload
            </button>
            <button type="button" className={mode === 'csv' ? 'is-active' : ''} onClick={() => setMode('csv')}>
              CSV upload
            </button>
          </div>

          {mode === 'json' && (
            <form className="instrument-ingest-form" onSubmit={handleSubmit}>
              <label>
                <span>JSON payload</span>
                <textarea
                  rows={18}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="instrument-ingest-actions">
                <button type="submit" className="sample-report-btn" disabled={busy}>
                  {busy ? 'Capturing…' : 'Capture & match barcode'}
                </button>
                <Link to="/portfolio/sample-report" className="sample-report-btn sample-report-btn--secondary">
                  Open CBC Sample Report
                </Link>
              </div>
            </form>
          )}

          {mode === 'csv' && (
            <div className="instrument-ingest-form">
              <label>
                <span>Instrument ID</span>
                <input
                  value={instrumentId}
                  onChange={(e) => setInstrumentId(e.target.value)}
                />
              </label>
              <label>
                <span>CSV file (columns: barcode, code, value)</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => handleCsvFile(e.target.files?.[0])}
                  disabled={busy}
                />
              </label>
              <p className="instrument-ingest-hint">
                Example row: <code>BC12345,HGB,12.1</code>
              </p>
              <Link to="/portfolio/sample-report" className="sample-report-btn sample-report-btn--secondary">
                Open CBC Sample Report
              </Link>
            </div>
          )}

          {error && <p className="change-password-message error">{error}</p>}

          {results.length > 0 && (
            <div className="instrument-ingest-results">
              <h3>Ingest result</h3>
              {results.map((row, index) => (
                <article key={row.batch_id || index} className="instrument-ingest-result-card">
                  <p><strong>{row.message || 'OK'}</strong></p>
                  <p>
                    Patient: {row.patient_name || '—'} · Lab: {row.lab_code || '—'} · Matched: {row.matched_count ?? 0}
                  </p>
                  {row.unmatched_codes?.length > 0 && (
                    <p>Unmatched codes: {row.unmatched_codes.join(', ')}</p>
                  )}
                  <p>
                    <Link to={`/portfolio/sample-report?barcode=${encodeURIComponent(row.barcode || '')}`}>
                      View patient CBC report
                    </Link>
                    {' · '}
                    <Link to="/clinical/result-entry">Result Entry</Link>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

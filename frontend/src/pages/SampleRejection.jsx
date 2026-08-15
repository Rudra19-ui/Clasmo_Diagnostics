import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import { api } from '../services/api';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

export default function SampleRejection() {
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [reason, setReason] = useState('');
  const [lookup, setLookup] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.listRejections();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    inputRef.current?.focus();
  }, [loadList]);

  const runLookup = useCallback(async (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue ?? barcode);
    if (!cleaned) {
      setError('Scan or enter a barcode / QR number.');
      setLookup(null);
      return;
    }

    setBarcode(cleaned);
    setLookingUp(true);
    setError('');
    setMessage('');
    setLookup(null);

    try {
      const data = await api.scanSampleBarcode(cleaned);
      if (data?.found) {
        setLookup({
          barcode: data.barcode || cleaned,
          lab_code: data.lab_code || '',
          patient_name: data.patient_name || '',
          patient_id: data.patient_id || '',
          tests: (data.tests || []).map((t) => ({
            id: t.id || t.test_id,
            test_name: t.name || t.test_name,
          })),
          status: data.registration_status || '',
        });
        return;
      }

      // Fallback: treat value as lab / book code via barcode lookup + registration search
      const link = await api.lookupPatientBarcode(cleaned).catch(() => null);
      if (link?.found && link.lab_code) {
        setLookup({
          barcode: link.barcode || cleaned,
          lab_code: link.lab_code,
          patient_name: link.patient_name || '',
          patient_id: link.patient_id || '',
          tests: [],
          status: '',
        });
        return;
      }

      setError(data?.message || 'No patient entry found for that barcode or QR number.');
    } catch (err) {
      setError(err.message || 'Lookup failed.');
    } finally {
      setLookingUp(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode]);

  const handleReject = async () => {
    if (!lookup?.lab_code && !barcode) {
      setError('Scan or look up a barcode first.');
      return;
    }
    if (!window.confirm(`Reject sample for Book ID ${lookup?.lab_code || barcode}?`)) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await api.createRejection({
        barcode: lookup?.barcode || barcode,
        lab_code: lookup?.lab_code || '',
        reason,
      });
      setMessage(`Rejected ${created.lab_code}. Visible to the entry initiator.`);
      setReason('');
      setLookup(null);
      setBarcode('');
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not reject sample.');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    if (!window.confirm('Clear this rejection?')) return;
    try {
      await api.resolveRejection(id);
      setMessage('Rejection cleared.');
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not clear rejection.');
    }
  };

  return (
    <Layout activePage="sample-rejection">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Sample Rejection</li>
            </ul>
          </nav>
          <h2 className="page-heading">Sample Rejection</h2>
          <p className="portfolio-intro">
            Scan or enter barcode / QR to reject a patient entry. The rejection is shown to the
            franchise or user who created that entry.
          </p>
        </header>

        <section className="franchise-module-panel">
          <div className="sample-scan-input-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              className="field-highlight-barcode sample-scan-input"
              value={barcode}
              placeholder="Scan or enter barcode / QR number"
              onChange={(e) => {
                setBarcode(sanitizeBarcodeScannedValue(e.target.value));
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  runLookup(e.currentTarget.value);
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <QrScanButton
              label="Scan QR"
              title="Scan barcode or QR with camera"
              onScan={runLookup}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => runLookup(barcode)}
              disabled={lookingUp}
            >
              {lookingUp ? 'Looking up…' : 'Look up'}
            </button>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}
          {message && <p className="form-success-msg">{message}</p>}

          {lookup && (
            <div style={{ marginTop: 16 }}>
              <div className="test-addition-summary">
                <div><span>Book ID</span><strong>{lookup.lab_code}</strong></div>
                <div><span>Patient</span><strong>{lookup.patient_name || '—'}</strong></div>
                <div><span>Patient ID</span><strong>{lookup.patient_id || '—'}</strong></div>
                <div><span>Barcode</span><strong>{lookup.barcode}</strong></div>
                <div><span>Status</span><strong>{lookup.status || '—'}</strong></div>
              </div>

              <h3 className="test-addition-subtitle">Tests</h3>
              <ul className="test-addition-current-list">
                {(lookup.tests || []).map((row) => (
                  <li key={row.id}>{row.test_name || 'Test'}</li>
                ))}
                {!(lookup.tests || []).length && <li>No tests listed.</li>}
              </ul>

              <label className="test-cancel-reason">
                <span>Rejection reason</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason"
                />
              </label>

              <div className="test-addition-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleReject}
                  disabled={saving}
                >
                  {saving ? 'Rejecting…' : 'Reject Sample'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Your rejections</h3>
          {loadingList ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p>No rejections in your scope.</p>
          ) : (
            <div className="table-wrap rejection-table-wrap">
              <table className="data-table rejection-table">
                <thead>
                  <tr>
                    <th>Book ID</th>
                    <th>Patient</th>
                    <th>Barcode</th>
                    <th>Reason</th>
                    <th>Entry by</th>
                    <th>Rejected at</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name || '—'}</td>
                      <td>{row.barcode || '—'}</td>
                      <td>{row.reason || '—'}</td>
                      <td>
                        {row.entry_initiated_by_name || '—'}
                        {row.entry_initiated_by_role ? ` (${row.entry_initiated_by_role})` : ''}
                      </td>
                      <td>{row.rejected_at ? new Date(row.rejected_at).toLocaleString() : '—'}</td>
                      <td>
                        <button type="button" className="btn-secondary" onClick={() => handleResolve(row.id)}>
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

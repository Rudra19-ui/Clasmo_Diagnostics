import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { QrScanButton } from '../components/QrCameraScanner';
import { api } from '../services/api';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';

export default function HoldTests() {
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [reason, setReason] = useState('');
  const [lookup, setLookup] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.listHolds();
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
      setSelectedIds([]);
      return;
    }

    setBarcode(cleaned);
    setLookingUp(true);
    setError('');
    setMessage('');
    setLookup(null);
    setSelectedIds([]);

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

      const link = await api.lookupPatientBarcode(cleaned).catch(() => null);
      if (link?.found && link.lab_code) {
        setLookup({
          barcode: link.barcode || cleaned,
          lab_code: link.lab_code,
          patient_name: link.patient_name || '',
          patient_id: link.patient_id || '',
          tests: (link.tests || []).map((t) => ({
            id: t.id || t.test_id,
            test_name: t.name || t.test_name,
          })),
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

  const heldTestIds = new Set(
    rows
      .filter((row) => lookup?.lab_code && row.lab_code === lookup.lab_code)
      .map((row) => row.registration_test_id),
  );

  const toggleTest = (rowId) => {
    if (heldTestIds.has(rowId)) return;
    setSelectedIds((prev) => (
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    ));
  };

  const handleHold = async () => {
    if (!lookup?.lab_code && !barcode) {
      setError('Scan or look up a barcode first.');
      return;
    }
    if (!selectedIds.length) {
      setError('Select at least one test to hold.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await api.createHolds({
        barcode: lookup?.barcode || barcode,
        lab_code: lookup?.lab_code || '',
        registration_test_ids: selectedIds,
        reason,
      });
      const held = result.held_count ?? selectedIds.length;
      const skipped = result.skipped_already_held || 0;
      setMessage(
        skipped
          ? `Held ${held} test(s). ${skipped} already on hold. Visible to the entry initiator.`
          : `Held ${held} test(s) on ${lookup?.lab_code || barcode}. Visible to the entry initiator.`,
      );
      setReason('');
      setLookup(null);
      setSelectedIds([]);
      setBarcode('');
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not hold tests.');
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (id) => {
    if (!window.confirm('Release this hold so the test can proceed?')) return;
    try {
      await api.releaseHold(id);
      setMessage('Hold released.');
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not release hold.');
    }
  };

  return (
    <Layout activePage="hold-tests">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Hold Tests</li>
            </ul>
          </nav>
          <h2 className="page-heading">Hold Tests</h2>
          <p className="portfolio-intro">
            Scan or enter barcode / QR, then hold selected tests. Held tests are shown to the
            franchise or user who created that patient entry.
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

              <h3 className="test-addition-subtitle">Select tests to hold</h3>
              {!(lookup.tests || []).length ? (
                <p>No tests listed on this entry.</p>
              ) : (
                <ul className="test-cancel-list">
                  {lookup.tests.map((row) => {
                    const onHold = heldTestIds.has(row.id);
                    return (
                      <li key={row.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleTest(row.id)}
                            disabled={onHold}
                          />
                          <span>
                            {row.test_name || 'Test'}
                            {onHold ? ' (already on hold)' : ''}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              <label className="test-cancel-reason">
                <span>Hold reason</span>
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
                  onClick={handleHold}
                  disabled={saving || !(lookup.tests || []).length}
                >
                  {saving ? 'Holding…' : 'Hold Selected Tests'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="franchise-module-panel rejection-panel">
          <div className="rejection-toolbar">
            <h3 className="rejection-toolbar-title">
              Your holds
              <span className="rejection-count">{rows.length}</span>
            </h3>
            <button type="button" className="btn-secondary" onClick={loadList} disabled={loadingList}>
              {loadingList ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="table-wrap rejection-table-wrap">
            <table className="data-table rejection-table">
              <thead>
                <tr>
                  <th>Book ID</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Reason</th>
                  <th>Entry by</th>
                  <th>Held at</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingList && !rows.length && (
                  <tr>
                    <td colSpan={7} className="empty-msg">Loading held tests…</td>
                  </tr>
                )}
                {!loadingList && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-msg">No tests currently on hold.</td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="rejection-col-id">{row.lab_code || '—'}</td>
                    <td>{row.patient_name || row.patient_id || '—'}</td>
                    <td>{row.test_name || '—'}</td>
                    <td>{row.reason || '—'}</td>
                    <td>
                      {row.entry_initiated_by_name || '—'}
                      {row.entry_initiated_by_role ? ` (${row.entry_initiated_by_role})` : ''}
                    </td>
                    <td className="rejection-col-date">
                      {row.held_at ? new Date(row.held_at).toLocaleString() : '—'}
                    </td>
                    <td className="rejection-col-action">
                      <button type="button" className="btn-secondary" onClick={() => handleRelease(row.id)}>
                        Release
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

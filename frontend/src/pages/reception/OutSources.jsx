import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { QrScanButton } from '../../components/QrCameraScanner';
import ExtraSampleNoDataModal from '../../components/ExtraSampleNoDataModal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';

const STATUS_LABELS = {
  outsourced: 'Outsourced',
  received: 'Sample received',
  report_uploaded: 'Report uploaded',
};

function formatWhen(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function rowClassForStatus(status) {
  if (status === 'received') return 'outsource-row--received';
  if (status === 'report_uploaded') return 'outsource-row--report-uploaded';
  return '';
}

export default function OutSources() {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [lookup, setLookup] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [toZoneId, setToZoneId] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [noDataBarcode, setNoDataBarcode] = useState(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.listOutsourceTransfers({ direction: 'sent' });
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
    api.getZones()
      .then((data) => setZones(Array.isArray(data) ? data : []))
      .catch(() => setZones([]));
  }, [loadList]);

  const destinationZones = useMemo(() => {
    const ownZoneId = user?.zone_id ?? user?.zone?.id;
    if (!ownZoneId) return zones;
    return zones.filter((zone) => zone.id !== ownZoneId);
  }, [zones, user]);

  const outsourcedTestIds = useMemo(() => {
    if (!lookup?.lab_code) return new Set();
    const ids = new Set();
    rows
      .filter((row) => row.lab_code === lookup.lab_code && row.status !== 'report_uploaded')
      .forEach((row) => {
        (row.registration_test_ids || []).forEach((id) => ids.add(Number(id)));
      });
    return ids;
  }, [lookup?.lab_code, rows]);

  const toggleTest = (testId) => {
    setSelectedIds((prev) => (
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    ));
  };

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
      if (data?.found && data.lab_code) {
        const sourceTests = data.all_tests?.length ? data.all_tests : data.tests;
        const tests = (sourceTests || []).map((t) => ({
          id: t.id,
          test_name: t.name || t.test_name,
        })).filter((t) => t.id);

        setLookup({
          barcode: data.barcode || cleaned,
          lab_code: data.lab_code,
          patient_name: data.patient_name || '',
          patient_id: data.patient_id || '',
          tests,
          status: data.registration_status || '',
        });
        return;
      }

      const link = await api.lookupPatientBarcode(cleaned).catch(() => null);
      if (link?.found && link.lab_code) {
        const rescan = await api.scanSampleBarcode(link.barcode || cleaned).catch(() => null);
        const sourceTests = rescan?.all_tests?.length ? rescan.all_tests : rescan?.tests;
        const tests = (sourceTests || []).map((t) => ({
          id: t.id,
          test_name: t.name || t.test_name,
        })).filter((t) => t.id);

        setLookup({
          barcode: link.barcode || cleaned,
          lab_code: link.lab_code,
          patient_name: link.patient_name || rescan?.patient_name || '',
          patient_id: link.patient_id || rescan?.patient_id || '',
          tests,
          status: rescan?.registration_status || '',
        });
        return;
      }

      setNoDataBarcode(cleaned);
      setError('');
    } catch (err) {
      setError(err.message || 'Lookup failed.');
    } finally {
      setLookingUp(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode]);

  const handleSend = async () => {
    if (!lookup?.lab_code && !barcode) {
      setError('Scan or look up a barcode first.');
      return;
    }
    if (!selectedIds.length) {
      setError('Select at least one test to outsource.');
      return;
    }
    if (!toZoneId) {
      setError('Select a destination zone.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await api.createOutsourceTransfer({
        barcode: lookup?.barcode || barcode,
        lab_code: lookup?.lab_code || '',
        to_zone_id: Number(toZoneId),
        registration_test_ids: selectedIds,
        notes,
      });
      setMessage(`Sample ${created.lab_code} outsourced to ${created.to_zone_name}.`);
      setNotes('');
      setLookup(null);
      setSelectedIds([]);
      setBarcode('');
      setToZoneId('');
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not outsource sample.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="out-sources">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Out Sources</li>
            </ul>
          </nav>
          <h2 className="page-heading">Out Sources</h2>
          <p className="portfolio-intro">
            Scan a sample barcode and choose which tests to send to another zone
            (Nashik, Mumbai, Pune, Dhule, or Ratnagiri).
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
            <QrScanButton label="Scan QR" title="Scan barcode or QR with camera" onScan={runLookup} />
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
              </div>

              <h3 className="test-addition-subtitle">Select tests to outsource</h3>
              {!(lookup.tests || []).length ? (
                <p>No tests listed on this entry.</p>
              ) : (
                <ul className="test-cancel-list">
                  {lookup.tests.map((row) => {
                    const alreadyOutsourced = outsourcedTestIds.has(row.id);
                    return (
                      <li key={row.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleTest(row.id)}
                            disabled={alreadyOutsourced}
                          />
                          <span>
                            {row.test_name || 'Test'}
                            {alreadyOutsourced ? ' (already outsourced)' : ''}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              <label className="test-cancel-reason">
                <span>Destination zone</span>
                <select value={toZoneId} onChange={(e) => setToZoneId(e.target.value)}>
                  <option value="">Select zone…</option>
                  {destinationZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </label>

              <label className="test-cancel-reason">
                <span>Notes</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </label>

              <div className="test-addition-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSend}
                  disabled={saving || !(lookup.tests || []).length}
                >
                  {saving ? 'Sending…' : 'Send to Outsource Zone'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Samples sent from your zone</h3>
          {loadingList ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p>No outsource transfers sent yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table outsource-table">
                <thead>
                  <tr>
                    <th>Book ID</th>
                    <th>Patient</th>
                    <th>Barcode</th>
                    <th>Tests</th>
                    <th>To zone</th>
                    <th>Status</th>
                    <th>Sent at</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={rowClassForStatus(row.status)}>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name || '—'}</td>
                      <td>{row.barcode || '—'}</td>
                      <td>{(row.tests_list || []).join(', ') || '—'}</td>
                      <td>{row.to_zone_name || '—'}</td>
                      <td>{STATUS_LABELS[row.status] || row.status}</td>
                      <td>{formatWhen(row.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
      <ExtraSampleNoDataModal barcode={noDataBarcode} onClose={() => setNoDataBarcode(null)} />
    </Layout>
  );
}

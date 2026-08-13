import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { resolveFranchiseBooking } from './resolveBooking';

export default function FranchiseHold() {
  const [searchParams] = useSearchParams();
  const [barcode, setBarcode] = useState('');
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [patientId, setPatientId] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState('');
  const [heldList, setHeldList] = useState([]);
  const [loadingHeld, setLoadingHeld] = useState(false);

  const loadHeld = useCallback(async () => {
    setLoadingHeld(true);
    try {
      const rows = await api.listHolds();
      setHeldList(Array.isArray(rows) ? rows : []);
    } catch {
      setHeldList([]);
    } finally {
      setLoadingHeld(false);
    }
  }, []);

  useEffect(() => {
    loadHeld();
  }, [loadHeld]);

  const runSearch = useCallback(async (overrides = {}) => {
    setSearching(true);
    setError('');
    setMessage('');
    setRegistration(null);
    setSelectedIds([]);
    try {
      const detail = await resolveFranchiseBooking({
        barcode: overrides.barcode ?? barcode,
        bookId: overrides.bookId ?? bookId,
        patientId: overrides.patientId ?? patientId,
      });
      setRegistration(detail);
      setBookId(detail.lab_code || bookId);
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }, [barcode, bookId, patientId]);

  useEffect(() => {
    const preset = searchParams.get('bookId');
    if (preset) runSearch({ bookId: preset, barcode: '', patientId: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTest = (rowId) => {
    setSelectedIds((prev) => (
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    ));
  };

  const handleHold = async () => {
    if (!registration?.lab_code) {
      setError('Find a booking first.');
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
        lab_code: registration.lab_code,
        registration_test_ids: selectedIds,
        reason,
      });
      setRegistration(result.registration || registration);
      setSelectedIds([]);
      setReason('');
      const held = result.held_count ?? selectedIds.length;
      const skipped = result.skipped_already_held || 0;
      setMessage(
        skipped
          ? `Held ${held} test(s). ${skipped} already on hold.`
          : `Held ${held} test(s) on ${registration.lab_code}.`,
      );
      await loadHeld();
    } catch (err) {
      setError(err.message || 'Could not hold tests.');
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (holdId) => {
    if (!window.confirm('Release this hold?')) return;
    try {
      await api.releaseHold(holdId);
      setMessage('Hold released.');
      await loadHeld();
      if (registration?.lab_code) {
        const detail = await api.getRegistration(registration.lab_code);
        setRegistration(detail);
      }
    } catch (err) {
      setError(err.message || 'Could not release hold.');
    }
  };

  const patient = registration?.patient;
  const tests = registration?.tests || [];

  return (
    <Layout activePage="hold">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Notifications</li>
              <li>Hold</li>
            </ul>
          </nav>
          <h2 className="page-heading">Hold</h2>
          <p className="portfolio-intro">
            Search by barcode, lab code, or patient ID, then hold selected tests. Held tests appear for lab staff.
          </p>
        </header>

        <section className="franchise-module-panel">
          <form
            className="franchise-search-reports-form"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
          >
            <label>
              <span>Barcode</span>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Sample barcode"
              />
            </label>
            <label>
              <span>Book ID / Lab Code</span>
              <input
                type="text"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="Lab / Book ID"
              />
            </label>
            <label>
              <span>Patient ID</span>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Patient ID"
              />
            </label>
            <div className="franchise-search-reports-actions">
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        {registration && (
          <section className="franchise-module-panel">
            <div className="test-addition-summary">
              <div><span>Book ID</span><strong>{registration.lab_code}</strong></div>
              <div><span>Patient</span><strong>{patient?.patient_name || registration.patient_name}</strong></div>
              <div><span>Patient ID</span><strong>{patient?.patient_id || '—'}</strong></div>
            </div>

            <h3 className="test-addition-subtitle">Select tests to hold</h3>
            {tests.length === 0 ? (
              <p>No active tests on this booking.</p>
            ) : (
              <ul className="test-cancel-list">
                {tests.map((row) => {
                  const label = row.test_name || 'Test';
                  const onHold = Boolean(row.is_on_hold);
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
                          {label}
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
                disabled={saving || !tests.length}
              >
                {saving ? 'Holding…' : 'Hold Selected Tests'}
              </button>
            </div>
          </section>
        )}

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Currently held tests</h3>
          {loadingHeld ? (
            <p>Loading…</p>
          ) : heldList.length === 0 ? (
            <p>No tests currently on hold.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Lab Code</th>
                    <th>Patient</th>
                    <th>Test</th>
                    <th>Reason</th>
                    <th>Held by</th>
                    <th>Held at</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {heldList.map((row) => (
                    <tr key={row.id}>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name || row.patient_id}</td>
                      <td>{row.test_name}</td>
                      <td>{row.reason || '—'}</td>
                      <td>{row.held_by_name || '—'}</td>
                      <td>{row.held_at ? new Date(row.held_at).toLocaleString() : '—'}</td>
                      <td>
                        <button type="button" className="btn-secondary" onClick={() => handleRelease(row.id)}>
                          Release
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

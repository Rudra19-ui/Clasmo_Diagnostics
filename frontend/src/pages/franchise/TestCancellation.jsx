import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FRANCHISE_ROLES, TEST_CANCEL_STAFF_ROLES } from '../../utils/roles';
import { resolveFranchiseBooking } from './resolveBooking';

function formatWhen(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function TestCancellation() {
  const { user } = useAuth();
  const isFranchise = FRANCHISE_ROLES.includes(user?.role);
  const canCancel = TEST_CANCEL_STAFF_ROLES.includes(user?.role);
  const [searchParams] = useSearchParams();
  const [barcode, setBarcode] = useState('');
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [patientName, setPatientName] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState(null);
  const [nameMatches, setNameMatches] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listQuery, setListQuery] = useState('');

  const loadList = useCallback(async (q = '') => {
    setLoadingList(true);
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      const data = await api.listTestCancellations(params);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const applyRegistration = (detail) => {
    setRegistration(detail);
    setBookId(detail.lab_code || bookId);
    setNameMatches([]);
    setSelectedIds([]);
  };

  const runSearch = useCallback(async (overrides = {}) => {
    setSearching(true);
    setError('');
    setMessage('');
    setRegistration(null);
    setNameMatches([]);
    setSelectedIds([]);
    try {
      const detail = await resolveFranchiseBooking({
        barcode: overrides.barcode ?? barcode,
        bookId: overrides.bookId ?? bookId,
        patientName: overrides.patientName ?? patientName,
      });
      applyRegistration(detail);
    } catch (err) {
      if (Array.isArray(err.matches) && err.matches.length) {
        setNameMatches(err.matches);
        setError(err.message || 'Multiple patients found. Select one.');
      } else {
        setError(err.message || 'Search failed.');
      }
    } finally {
      setSearching(false);
    }
  }, [barcode, bookId, patientName]);

  useEffect(() => {
    if (!canCancel) return undefined;
    const preset = searchParams.get('bookId');
    if (preset) runSearch({ bookId: preset, barcode: '', patientName: '' });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickMatch = async (row) => {
    if (!row?.lab_code) return;
    setSearching(true);
    setError('');
    try {
      const detail = await api.getRegistration(row.lab_code);
      applyRegistration(detail);
      setMessage(`Selected booking ${detail.lab_code}.`);
    } catch (err) {
      setError(err.message || 'Could not open booking.');
    } finally {
      setSearching(false);
    }
  };

  const toggleTest = (rowId) => {
    setSelectedIds((prev) => (
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    ));
  };

  const handleCancel = async () => {
    if (!registration?.lab_code) {
      setError('Find a booking first.');
      return;
    }
    if (!selectedIds.length) {
      setError('Select at least one test to cancel.');
      return;
    }
    if (!reason.trim()) {
      setError('Enter a cancellation reason.');
      return;
    }
    if (!window.confirm('Cancel the selected tests on this booking?')) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.cancelRegistrationTests(registration.lab_code, {
        registration_test_ids: selectedIds,
        reason: reason.trim(),
      });
      setRegistration(updated);
      setSelectedIds([]);
      setReason('');
      setMessage(`Cancelled selected tests on ${updated.lab_code}. The franchise who created this booking will see it in Test Cancellation.`);
      loadList(listQuery);
    } catch (err) {
      setError(err.message || 'Could not cancel tests.');
    } finally {
      setSaving(false);
    }
  };

  const patient = registration?.patient;
  const tests = registration?.tests || [];

  return (
    <Layout activePage="test-cancellation">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Notifications</li>
              <li>Test Cancellation</li>
            </ul>
          </nav>
          <h2 className="page-heading">Test Cancellation</h2>
          <p className="portfolio-intro">
            {isFranchise
              ? 'Cancellations on your patient entries (with reason) appear here. Only your bookings are shown.'
              : 'Search by barcode or patient name, cancel tests with a reason. The franchise who created the booking will see it in their Test Cancellation list.'}
          </p>
        </header>

        {canCancel && (
          <>
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
                    placeholder="Sample barcode / QR"
                  />
                </label>
                <label>
                  <span>Patient Name</span>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Patient name"
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
                <div className="franchise-search-reports-actions">
                  <button type="submit" className="btn-primary" disabled={searching}>
                    {searching ? 'Searching…' : 'Search'}
                  </button>
                </div>
              </form>
            </section>

            {nameMatches.length > 0 && (
              <section className="franchise-module-panel">
                <h3 className="test-addition-subtitle">Select booking</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Lab Code</th>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {nameMatches.map((row) => (
                        <tr key={row.id || row.lab_code}>
                          <td><code>{row.lab_code}</code></td>
                          <td>{row.patient_name || row.patient?.patient_name || '—'}</td>
                          <td>{row.registration_date || '—'}</td>
                          <td>{row.status || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => pickMatch(row)}
                              disabled={searching}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {registration && (
              <section className="franchise-module-panel">
                <div className="test-addition-summary">
                  <div><span>Book ID</span><strong>{registration.lab_code}</strong></div>
                  <div><span>Patient</span><strong>{patient?.patient_name || registration.patient_name}</strong></div>
                  <div><span>Status</span><strong>{registration.status}</strong></div>
                  {registration.created_by_name || registration.created_by_username ? (
                    <div>
                      <span>Booked by</span>
                      <strong>
                        {registration.created_by_name || registration.created_by_username}
                      </strong>
                    </div>
                  ) : null}
                </div>

                <h3 className="test-addition-subtitle">Select tests to cancel</h3>
                {tests.length === 0 ? (
                  <p>No active tests on this booking.</p>
                ) : (
                  <ul className="test-cancel-list">
                    {tests.map((row) => {
                      const label = row.test_name || (typeof row.test === 'object' ? row.test?.name : null) || 'Test';
                      return (
                        <li key={row.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(row.id)}
                              onChange={() => toggleTest(row.id)}
                            />
                            <span>{label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <label className="test-cancel-reason">
                  <span>Cancellation reason *</span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Required reason"
                    required
                  />
                </label>

                <div className="test-addition-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCancel}
                    disabled={saving || !tests.length}
                  >
                    {saving ? 'Cancelling…' : 'Cancel Selected Tests'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        <section className="franchise-module-panel">
          <div className="test-cancel-list-header">
            <h3 className="test-addition-subtitle">
              {isFranchise ? 'Cancellations on your entries' : 'Cancellation log'}
            </h3>
            <form
              className="franchise-search-reports-form test-cancel-list-filter"
              onSubmit={(e) => {
                e.preventDefault();
                loadList(listQuery);
              }}
            >
              <label>
                <span>Search</span>
                <input
                  type="search"
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Lab code, patient, test, reason"
                />
              </label>
              <button type="submit" className="btn-secondary btn-sm" disabled={loadingList}>
                {loadingList ? 'Loading…' : 'Apply'}
              </button>
            </form>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Book ID</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Reason</th>
                  <th>Cancelled by</th>
                  {!isFranchise && <th>Booked by</th>}
                </tr>
              </thead>
              <tbody>
                {!loadingList && rows.length === 0 && (
                  <tr>
                    <td colSpan={isFranchise ? 6 : 7} className="empty-msg">
                      No cancellations found.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.cancelled_at)}</td>
                    <td><code>{row.lab_code}</code></td>
                    <td>
                      <strong>{row.patient_name || '—'}</strong>
                      {row.patient_id ? <div className="muted-text">{row.patient_id}</div> : null}
                    </td>
                    <td>{row.test_name || '—'}</td>
                    <td>{row.reason || '—'}</td>
                    <td>
                      {row.cancelled_by_name || '—'}
                      {row.cancelled_by_role ? (
                        <div className="muted-text">{row.cancelled_by_role}</div>
                      ) : null}
                    </td>
                    {!isFranchise && (
                      <td>
                        {row.entry_initiated_by_name || '—'}
                        {row.entry_initiated_by_role ? (
                          <div className="muted-text">{row.entry_initiated_by_role}</div>
                        ) : null}
                      </td>
                    )}
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

import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { resolveFranchiseBooking } from './resolveBooking';

export default function TestCancellation() {
  const [searchParams] = useSearchParams();
  const [barcode, setBarcode] = useState('');
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState('');

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
      });
      setRegistration(detail);
      setBookId(detail.lab_code || bookId);
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }, [barcode, bookId]);

  useEffect(() => {
    const preset = searchParams.get('bookId');
    if (preset) runSearch({ bookId: preset, barcode: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!window.confirm('Cancel the selected tests on this booking?')) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.cancelRegistrationTests(registration.lab_code, {
        registration_test_ids: selectedIds,
        reason,
      });
      setRegistration(updated);
      setSelectedIds([]);
      setReason('');
      setMessage(`Cancelled selected tests on ${updated.lab_code}.`);
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
          <p className="portfolio-intro">Find a booking, select tests, and cancel them from the order.</p>
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
              <div><span>Status</span><strong>{registration.status}</strong></div>
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
              <span>Cancellation reason</span>
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
                onClick={handleCancel}
                disabled={saving || !tests.length}
              >
                {saving ? 'Cancelling…' : 'Cancel Selected Tests'}
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

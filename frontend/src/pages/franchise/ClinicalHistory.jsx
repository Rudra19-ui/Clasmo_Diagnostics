import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { resolveFranchiseBooking } from './resolveBooking';

export default function ClinicalHistory() {
  const [searchParams] = useSearchParams();
  const [barcode, setBarcode] = useState('');
  const [bookId, setBookId] = useState(searchParams.get('bookId') || '');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const runSearch = useCallback(async (overrides = {}) => {
    setSearching(true);
    setError('');
    setRegistration(null);
    setAccessGranted(false);
    setWorkflow(null);
    setReport(null);
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
    if (preset) {
      runSearch({ bookId: preset, barcode: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockHistory = async () => {
    if (!registration?.id) return;
    setAccessGranted(true);
    setLoadingHistory(true);
    setError('');
    try {
      const [flow, clinical] = await Promise.all([
        api.getWorkflowHistory(registration.id).catch(() => null),
        api.getReport(registration.id).catch(() => null),
      ]);
      setWorkflow(flow);
      setReport(clinical);
    } catch (err) {
      setError(err.message || 'Could not load clinical history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const patient = registration?.patient;

  return (
    <Layout activePage="clinical-history">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Notifications</li>
              <li>Clinical History</li>
            </ul>
          </nav>
          <h2 className="page-heading">Clinical History</h2>
          <p className="portfolio-intro">
            Search by barcode or Book ID. Access opens only after you click Barcode or Book ID.
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
            <div className="franchise-search-reports-actions">
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}

        {registration && !accessGranted && (
          <section className="franchise-module-panel">
            <p className="portfolio-intro" style={{ marginBottom: 12 }}>
              Click <strong>Barcode</strong> or <strong>Book ID</strong> below to unlock clinical history access.
            </p>
            <div className="clinical-history-gate">
              <button type="button" className="clinical-history-key" onClick={unlockHistory}>
                <span>Barcode</span>
                <strong>{barcode || registration.lab_code || '—'}</strong>
              </button>
              <button type="button" className="clinical-history-key" onClick={unlockHistory}>
                <span>Book ID</span>
                <strong>{registration.lab_code}</strong>
              </button>
            </div>
          </section>
        )}

        {registration && accessGranted && (
          <section className="franchise-module-panel">
            <div className="test-addition-summary">
              <div><span>Book ID</span><strong>{registration.lab_code}</strong></div>
              <div><span>Patient</span><strong>{patient?.patient_name || registration.patient_name}</strong></div>
              <div><span>Age / Gender</span>
                <strong>
                  {patient?.age_years ?? '—'} / {patient?.gender || '—'}
                </strong>
              </div>
              <div><span>Doctor</span><strong>{patient?.doctor_name || '—'}</strong></div>
              <div><span>Status</span><strong>{registration.status}</strong></div>
              <div><span>Mobile</span><strong>{patient?.mobile || '—'}</strong></div>
            </div>

            {loadingHistory && <p>Loading clinical history…</p>}

            <h3 className="test-addition-subtitle">Ordered tests</h3>
            <ul className="test-addition-current-list">
              {(registration.tests || []).map((row) => (
                <li key={row.id}>
                  {row.test_name || (typeof row.test === 'object' ? row.test?.name : null) || 'Test'}
                </li>
              ))}
              {(registration.tests || []).length === 0 && <li>No tests listed.</li>}
            </ul>

            <h3 className="test-addition-subtitle">Workflow</h3>
            <ul className="test-addition-current-list">
              {(workflow?.events || []).map((event, index) => (
                <li key={`${event.action_taken}-${index}`}>
                  {event.action_taken}
                  {event.action_on ? ` — ${new Date(event.action_on).toLocaleString()}` : ''}
                  {event.action_by ? ` (${event.action_by})` : ''}
                </li>
              ))}
              {!loadingHistory && !(workflow?.events || []).length && <li>No workflow events yet.</li>}
            </ul>

            <h3 className="test-addition-subtitle">Clinical report</h3>
            {report?.status ? (
              <p>
                Status: <strong>{report.status}</strong>
                {' · '}
                <Link to={`/clinical/report-preview?id=${registration.id}`}>Open full report</Link>
              </p>
            ) : (
              <p>No clinical report entered yet.</p>
            )}
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

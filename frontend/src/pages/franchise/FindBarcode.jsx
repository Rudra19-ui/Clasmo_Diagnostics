import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { resolveFranchiseBooking } from './resolveBooking';

export default function FindBarcode() {
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);

  const runSearch = useCallback(async (raw = barcode) => {
    setSearching(true);
    setError('');
    setRegistration(null);
    try {
      const detail = await resolveFranchiseBooking({ barcode: raw });
      setRegistration(detail);
    } catch (err) {
      setError(err.message || 'Barcode search failed.');
    } finally {
      setSearching(false);
    }
  }, [barcode]);

  const patient = registration?.patient;

  return (
    <Layout activePage="find-barcode">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Notifications</li>
              <li>Find Barcode</li>
            </ul>
          </nav>
          <h2 className="page-heading">Find Barcode</h2>
          <p className="portfolio-intro">Search a sample barcode to locate the linked booking.</p>
        </header>

        <section className="franchise-module-panel test-addition-search">
          <label className="test-addition-search-label" htmlFor="find-barcode-input">
            Find Barcode
          </label>
          <div className="test-addition-search-row">
            <input
              id="find-barcode-input"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch(e.currentTarget.value);
                }
              }}
              placeholder="Scan or type barcode"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-primary test-addition-search-btn"
              onClick={() => runSearch()}
              disabled={searching}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}

        {registration && (
          <section className="franchise-module-panel">
            <div className="test-addition-summary">
              <div><span>Book ID / Lab Code</span><strong>{registration.lab_code}</strong></div>
              <div><span>Patient</span><strong>{patient?.patient_name || registration.patient_name}</strong></div>
              <div><span>Patient ID</span><strong>{patient?.patient_id || '—'}</strong></div>
              <div><span>Doctor</span><strong>{patient?.doctor_name || '—'}</strong></div>
              <div><span>Status</span><strong>{registration.status}</strong></div>
              <div><span>Mobile</span><strong>{patient?.mobile || '—'}</strong></div>
            </div>
            <div className="franchise-notif-actions">
              <Link className="btn-primary" to={`/franchise/clinical-history?bookId=${encodeURIComponent(registration.lab_code)}`}>
                Open Clinical History
              </Link>
              <Link className="btn-secondary" to={`/franchise/test-cancellation?bookId=${encodeURIComponent(registration.lab_code)}`}>
                Test Cancellation
              </Link>
              <Link className="btn-secondary" to={`/clinical/report-preview?id=${registration.id}`}>
                Report Preview
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

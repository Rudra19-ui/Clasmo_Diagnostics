import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ExtraSampleNoDataModal from '../../components/ExtraSampleNoDataModal';
import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';
import { resolveFranchiseBooking } from './resolveBooking';

export default function FindBarcode() {
  const [searchParams] = useSearchParams();
  const [barcode, setBarcode] = useState('');
  const [bookId, setBookId] = useState(searchParams.get('labCode') || '');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [noDataBarcode, setNoDataBarcode] = useState(null);

  const runSearch = useCallback(async (raw = barcode, labCode = bookId) => {
    setSearching(true);
    setError('');
    setRegistration(null);
    try {
      const detail = await resolveFranchiseBooking({ barcode: raw, bookId: labCode });
      setRegistration(detail);
      if (detail.lab_code) setBookId(detail.lab_code);
    } catch (err) {
      setError(err.message || 'Barcode search failed.');
      const cleaned = sanitizeBarcodeScannedValue(raw);
      if (cleaned && !String(labCode || '').trim()) {
        setNoDataBarcode(cleaned);
        setError('');
      }
    } finally {
      setSearching(false);
    }
  }, [barcode, bookId]);

  useEffect(() => {
    const labCode = searchParams.get('labCode')?.trim();
    if (labCode) {
      setBookId(labCode);
      runSearch('', labCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      <ExtraSampleNoDataModal barcode={noDataBarcode} onClose={() => setNoDataBarcode(null)} />
    </Layout>
  );
}

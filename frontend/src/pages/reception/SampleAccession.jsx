import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ReportSectionTable from '../../components/franchise/ReportSectionTable';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

function toApiDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

export default function SampleAccession() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      const from = toApiDate(fromDate);
      const to = toApiDate(toDate);
      if (from) params.from_date = from;
      if (to) params.to_date = to;
      const data = await api.listSampleAccession(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load sample accession list.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [load]);

  return (
    <Layout activePage="sample-accession">
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>Sample Accession</li>
          </ul>
        </nav>
        <h2 className="page-heading">Sample Accession</h2>
        <p className="portfolio-intro">
          All bookings in
          {' '}
          <strong>{user?.zone_name || 'your zone'}</strong>
          {' '}
          — entries from every role (Supreme, Prime, Admin, Reception, etc.) appear here for sample scanning.
        </p>

        <section className="franchise-module-panel">
          <div className="franchise-report-filters">
            <label>
              <span>From date</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              <span>To date</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <ReportSectionTable
            rows={rows}
            loading={loading}
            from="accession"
            linkPatient={false}
            emptyMessage="No bookings found for your zone in the selected date range."
          />
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

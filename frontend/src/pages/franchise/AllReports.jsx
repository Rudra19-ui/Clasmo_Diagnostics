import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

function toApiDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

export default function AllReports() {
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
      const data = await api.searchRegistrations(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load reports.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout activePage="manage-reports">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to="/franchise/manage-reports/all">Report Section</Link></li>
              <li>All Reports</li>
            </ul>
          </nav>
          <h2 className="page-heading">All Reports</h2>
          <p className="portfolio-intro">Browse bookings and reports filtered by date.</p>
        </header>

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

          <div className="table-wrap">
            <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Lab Code</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Test</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={6} className="empty-msg">No reports found for the selected dates.</td></tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date || '—'}</td>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name}</td>
                      <td>{row.patient?.doctor_name || '—'}</td>
                      <td>{row.test || row.test_names || '—'}</td>
                      <td>{row.status}</td>
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

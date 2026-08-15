import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

export default function FranchiseRejection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listRejections();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load rejections.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (id) => {
    if (!window.confirm('Clear this rejection for your entry?')) return;
    setMessage('');
    setError('');
    try {
      await api.resolveRejection(id);
      setMessage('Rejection cleared.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not clear rejection.');
    }
  };

  return (
    <Layout activePage="rejection">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Notifications</li>
              <li>Rejection</li>
            </ul>
          </nav>
          <h2 className="page-heading">Rejection</h2>
          <p className="portfolio-intro">
            Sample rejections for entries you (or your franchisees) initiated. Lab staff reject by barcode;
            those rejections appear here only for your bookings.
          </p>
        </header>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        <section className="franchise-module-panel">
          <div className="franchise-search-reports-actions" style={{ marginBottom: 12 }}>
            <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading && !rows.length ? (
            <p>Loading rejections…</p>
          ) : rows.length === 0 ? (
            <p>No rejected samples for your entries.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Book ID</th>
                    <th>Patient</th>
                    <th>Barcode</th>
                    <th>Tests</th>
                    <th>Reason</th>
                    <th>Rejected by</th>
                    <th>Rejected at</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name || row.patient_id || '—'}</td>
                      <td>{row.barcode || '—'}</td>
                      <td>
                        {Array.isArray(row.tests_list) && row.tests_list.length
                          ? row.tests_list.join(', ')
                          : '—'}
                      </td>
                      <td>{row.reason || '—'}</td>
                      <td>
                        {row.rejected_by_name || '—'}
                        {row.rejected_by_role ? ` (${row.rejected_by_role})` : ''}
                      </td>
                      <td>{row.rejected_at ? new Date(row.rejected_at).toLocaleString() : '—'}</td>
                      <td>
                        <button type="button" className="btn-secondary" onClick={() => handleResolve(row.id)}>
                          Clear
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

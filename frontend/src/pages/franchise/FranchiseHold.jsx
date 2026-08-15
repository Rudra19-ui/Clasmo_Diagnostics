import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

function formatHeldAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FranchiseHold() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listHolds();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load held tests.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRelease = async (id) => {
    if (!window.confirm('Release this hold for your entry?')) return;
    setMessage('');
    setError('');
    try {
      await api.releaseHold(id);
      setMessage('Hold released.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not release hold.');
    }
  };

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
            Tests placed on hold for bookings you (or your franchisees) created.
            Lab staff hold by barcode; those records appear here only for your entries.
          </p>
        </header>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        <section className="franchise-module-panel rejection-panel">
          <div className="rejection-toolbar">
            <h3 className="rejection-toolbar-title">
              Held tests
              <span className="rejection-count">{rows.length}</span>
            </h3>
            <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="table-wrap rejection-table-wrap">
            <table className="data-table rejection-table">
              <thead>
                <tr>
                  <th>Book ID</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Reason</th>
                  <th>Held by</th>
                  <th>Held at</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && !rows.length && (
                  <tr>
                    <td colSpan={7} className="empty-msg">Loading held tests…</td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-msg">No held tests for your entries.</td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="rejection-col-id">{row.lab_code || '—'}</td>
                    <td>{row.patient_name || row.patient_id || '—'}</td>
                    <td>{row.test_name || '—'}</td>
                    <td>{row.reason || '—'}</td>
                    <td>
                      {row.held_by_name || '—'}
                      {row.held_by_role ? ` (${row.held_by_role})` : ''}
                    </td>
                    <td className="rejection-col-date">{formatHeldAt(row.held_at)}</td>
                    <td className="rejection-col-action">
                      <button type="button" className="btn-secondary" onClick={() => handleRelease(row.id)}>
                        Release
                      </button>
                    </td>
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

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function HoldTests() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listHolds(query ? { q: query } : {});
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

  const handleRelease = async (holdId) => {
    if (!window.confirm('Release this hold so the test can proceed?')) return;
    setMessage('');
    setError('');
    try {
      await api.releaseHold(holdId);
      setMessage('Hold released.');
      await load(q);
    } catch (err) {
      setError(err.message || 'Could not release hold.');
    }
  };

  return (
    <Layout activePage="hold-tests">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Hold Tests</li>
            </ul>
          </nav>
          <h2 className="page-heading">Hold Tests</h2>
          <p className="portfolio-intro">
            Tests placed on hold by franchise (Supreme / Prime / Sub) in your zone.
          </p>
        </header>

        <section className="franchise-module-panel">
          <form
            className="franchise-search-reports-form"
            onSubmit={(e) => {
              e.preventDefault();
              load(q);
            }}
          >
            <label>
              <span>Filter</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Lab code, patient, test, reason"
              />
            </label>
            <div className="franchise-search-reports-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Loading…' : 'Search'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setQ('');
                  load('');
                }}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </form>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        <section className="franchise-module-panel">
          {loading && !rows.length ? (
            <p>Loading held tests…</p>
          ) : rows.length === 0 ? (
            <p>No tests currently on hold.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Lab Code</th>
                    <th>Patient</th>
                    <th>Patient ID</th>
                    <th>Test</th>
                    <th>Sample</th>
                    <th>Reason</th>
                    <th>Held by</th>
                    <th>Held at</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name || '—'}</td>
                      <td>{row.patient_id || '—'}</td>
                      <td>{row.test_name}</td>
                      <td>{row.sample_type || '—'}</td>
                      <td>{row.reason || '—'}</td>
                      <td>
                        {row.held_by_name || '—'}
                        {row.held_by_role ? ` (${row.held_by_role})` : ''}
                      </td>
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

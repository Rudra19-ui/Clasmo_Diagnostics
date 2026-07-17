import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

function formatDate(value, displayValue) {
  if (displayValue) return displayValue;
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageToLab() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMessages();
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Unable to load feedback.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.created_by_name,
        row.message,
        row.created_at_display,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const submit = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    setSubmitting(true);
    setStatus('');
    try {
      await api.createMessage(text);
      setStatus('Feedback submitted successfully.');
      setMessage('');
      await loadMessages();
    } catch (err) {
      setStatus(err.message || 'Unable to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout activePage="device-request">
      <main className="dash-main query-complaint-main">
        <nav className="breadcrumb">
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li>Query Complaint</li>
          </ul>
        </nav>

        <section className="activity-checklist-panel query-complaint-panel">
          <div className="query-complaint-intro">
            <h2 className="page-heading">Query Complaint</h2>
            <p className="query-complaint-subtitle">
              All feedback, queries, and complaints submitted from the dashboard appear here.
            </p>
            <div className="query-complaint-stats">
              <span>Total feedback: <strong>{rows.length}</strong></span>
            </div>
          </div>

          <form className="content-panel query-complaint-form" onSubmit={submit}>
            <div className="form-row">
              <label htmlFor="query-complaint-message">
                Submit feedback
                {user?.display_name ? ` (${user.display_name})` : ''}
              </label>
              <textarea
                id="query-complaint-message"
                required
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your query or complaint..."
              />
            </div>
            <button type="submit" className="btn-blue" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            {status && <p className="query-complaint-status">{status}</p>}
          </form>

          <div className="activity-checklist-filters">
            <div className="activity-checklist-filter-grid query-complaint-filter-grid">
              <div className="activity-checklist-field">
                <label htmlFor="query-complaint-search">Search</label>
                <input
                  id="query-complaint-search"
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by user, message, or date"
                />
              </div>
            </div>
          </div>

          {error && <p className="change-password-message error" role="alert">{error}</p>}

          <div className="data-table-wrap master-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table master-table activity-checklist-table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>User</th>
                    <th>Feedback / Query</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={3} className="empty-msg">Loading...</td></tr>
                  )}
                  {!loading && filteredRows.length === 0 && (
                    <tr><td colSpan={3} className="empty-msg">No feedback submitted yet.</td></tr>
                  )}
                  {!loading && filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at, row.created_at_display)}</td>
                      <td>{row.created_by_name || 'User'}</td>
                      <td className="query-complaint-message-cell">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

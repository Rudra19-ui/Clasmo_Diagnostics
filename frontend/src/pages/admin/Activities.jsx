import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one_time', label: 'One Time' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateDisplay(value) {
  if (!value) return '-';
  if (typeof value === 'string' && value.includes('/')) {
    const [day, month, year] = value.split('/');
    const yy = year.length === 4 ? year.slice(-2) : year;
    const monthLabel = MONTHS[Number(month) - 1] || month;
    return `${day.padStart(2, '0')}-${monthLabel}-${yy}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const monthLabel = MONTHS[date.getMonth()];
  const yy = String(date.getFullYear()).slice(-2);
  return `${day}-${monthLabel}-${yy}`;
}

const defaultFilters = () => ({
  search: '',
  from_date: '',
  to_date: '',
  activity_type: '',
  status: 'pending',
});

export default function Activities() {
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notesPreview, setNotesPreview] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (appliedFilters.search.trim()) params.search = appliedFilters.search.trim();
      if (appliedFilters.from_date.trim()) params.from_date = appliedFilters.from_date.trim();
      if (appliedFilters.to_date.trim()) params.to_date = appliedFilters.to_date.trim();
      if (appliedFilters.activity_type) params.activity_type = appliedFilters.activity_type;
      if (appliedFilters.status) params.status = appliedFilters.status;
      const data = await api.getActivities(params);
      setRows(data);
    } catch (err) {
      setError(err.message || 'Unable to load activities.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const setDraft = (key, value) => setDraftFilters((prev) => ({ ...prev, [key]: value }));

  const handleSearch = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const handleShowNotes = (row) => {
    const text = (row.notes || '').trim() || 'No notes available.';
    setNotesPreview({ title: row.title, text });
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Activities</li>
          </ul>
        </nav>

        <section className="activity-checklist-panel">
          <div className="activity-checklist-filters">
            <div className="activity-checklist-filter-grid">
              <div className="activity-checklist-field">
                <label htmlFor="activity-search">Search Activity</label>
                <input
                  id="activity-search"
                  type="text"
                  value={draftFilters.search}
                  onChange={(event) => setDraft('search', event.target.value)}
                />
              </div>
              <div className="activity-checklist-field">
                <label htmlFor="activity-from-date">From Date</label>
                <input
                  id="activity-from-date"
                  type="text"
                  value={draftFilters.from_date}
                  onChange={(event) => setDraft('from_date', event.target.value)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div className="activity-checklist-field">
                <label htmlFor="activity-to-date">To Date</label>
                <input
                  id="activity-to-date"
                  type="text"
                  value={draftFilters.to_date}
                  onChange={(event) => setDraft('to_date', event.target.value)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div className="activity-checklist-field">
                <label htmlFor="activity-frequency">Activity Frequency</label>
                <select
                  id="activity-frequency"
                  value={draftFilters.activity_type}
                  onChange={(event) => setDraft('activity_type', event.target.value)}
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="activity-checklist-field">
                <label htmlFor="activity-status">Status</label>
                <select
                  id="activity-status"
                  value={draftFilters.status}
                  onChange={(event) => setDraft('status', event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="activity-checklist-search-wrap">
                <button type="button" className="sfb-btn-search" onClick={handleSearch} disabled={loading}>
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="activity-checklist-toolbar">
            <Link to="/admin/create-activity" className="btn-blue btn-sm">
              Create New Activity
            </Link>
          </div>

          {error && <p className="change-password-message error" role="alert">{error}</p>}

          <div className="data-table-wrap master-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table master-table activity-checklist-table">
                <thead>
                  <tr>
                    <th>Activity Frequency</th>
                    <th>Activity</th>
                    <th>Date</th>
                    <th>Completion DateTime</th>
                    <th>Status</th>
                    <th>Remark</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="empty-msg">Loading...</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={7} className="empty-msg">No activities found.</td></tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.activity_type_display}</td>
                      <td>{row.title}</td>
                      <td>{formatDateDisplay(row.creation_date || row.activity_date)}</td>
                      <td>{row.completed_at_display || '-'}</td>
                      <td>{row.status_display}</td>
                      <td>{row.remark || ''}</td>
                      <td>
                        <button
                          type="button"
                          className="activity-notes-btn"
                          title="View notes"
                          onClick={() => handleShowNotes(row)}
                          aria-label={`View notes for ${row.title}`}
                        >
                          ...
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {notesPreview && (
          <div className="activity-notes-modal" role="dialog" aria-modal="true" aria-labelledby="activity-notes-title">
            <div className="activity-notes-modal-content">
              <h3 id="activity-notes-title">Notes — {notesPreview.title}</h3>
              <p>{notesPreview.text}</p>
              <button type="button" className="btn-outline btn-sm" onClick={() => setNotesPreview(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

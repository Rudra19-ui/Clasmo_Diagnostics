import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Pending' },
  { value: 'true', label: 'Handled' },
];

export default function SelfPatientQueryPanel({ title = 'Self Patient Query' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [draftFilters, setDraftFilters] = useState({ search: '', is_handled: '' });
  const [filters, setFilters] = useState({ search: '', is_handled: '' });
  const [preview, setPreview] = useState(null);

  const setDraft = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSelfPatientQueries(filters);
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Unable to load patient queries.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleSearch = () => {
    setFilters({ ...draftFilters });
  };

  const markHandled = async (row) => {
    setSavingId(row.id);
    setError('');
    try {
      await api.updateSelfPatientQuery(row.id, { is_handled: true });
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to update query.');
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = useMemo(
    () => rows.filter((row) => !row.is_handled).length,
    [rows],
  );

  return (
    <section className="activity-checklist-panel self-patient-query-panel">
      <div className="self-patient-query-intro">
        <h2 className="page-heading">{title}</h2>
        <p className="self-patient-query-subtitle">
          Patient queries submitted from Test Quorum with photo and description appear here.
        </p>
        <div className="self-patient-query-stats">
          <span>Pending: <strong>{pendingCount}</strong></span>
          <span>Total shown: <strong>{rows.length}</strong></span>
        </div>
      </div>

      <div className="activity-checklist-filters">
        <div className="activity-checklist-filter-grid self-patient-query-filter-grid">
          <div className="activity-checklist-field">
            <label htmlFor="patient-query-search">Search</label>
            <input
              id="patient-query-search"
              type="text"
              value={draftFilters.search}
              onChange={(event) => setDraft('search', event.target.value)}
              placeholder="Test name or description"
            />
          </div>
          <div className="activity-checklist-field">
            <label htmlFor="patient-query-status">Status</label>
            <select
              id="patient-query-status"
              value={draftFilters.is_handled}
              onChange={(event) => setDraft('is_handled', event.target.value)}
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

      {error && <p className="change-password-message error" role="alert">{error}</p>}

      <div className="data-table-wrap master-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table master-table activity-checklist-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Test Name</th>
                <th>Description</th>
                <th>Photo</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="empty-msg">Loading...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="empty-msg">No patient queries yet.</td></tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at_display || '-'}</td>
                  <td>{row.test_name}</td>
                  <td className="self-patient-query-desc">{row.description || '-'}</td>
                  <td>
                    {row.photo_url ? (
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => setPreview(row)}
                      >
                        View Photo
                      </button>
                    ) : '-'}
                  </td>
                  <td>{row.is_handled ? 'Handled' : 'Pending'}</td>
                  <td>
                    {!row.is_handled && (
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        disabled={savingId === row.id}
                        onClick={() => markHandled(row)}
                      >
                        {savingId === row.id ? 'Saving…' : 'Mark Handled'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div className="activity-notes-modal" role="dialog" aria-modal="true">
          <div className="activity-notes-modal-content self-patient-query-modal">
            <h3>{preview.test_name}</h3>
            <p className="self-patient-query-desc">{preview.description || 'No description provided.'}</p>
            {preview.photo_url && (
              <img src={preview.photo_url} alt={preview.test_name} className="self-patient-query-photo" />
            )}
            <button type="button" className="btn-outline btn-sm" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

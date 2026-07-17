import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'false', label: 'Pending' },
  { value: 'true', label: 'Handled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'job', label: 'Job Vacancy' },
];

const defaultFilters = () => ({
  search: '',
  is_handled: '',
  request_type: '',
});

function partnershipLabel(value) {
  if (value === 'brand') return 'Brand Partner';
  if (value === 'self') return 'Self-Operated Lab';
  return value || '-';
}

function buildDetailLines(row) {
  const lines = [];
  if (row.request_type_display) lines.push(`Type: ${row.request_type_display}`);
  if (row.name) lines.push(`Name: ${row.name}`);
  if (row.contact_person) lines.push(`Contact person: ${row.contact_person}`);
  if (row.phone) lines.push(`Contact number: ${row.phone}`);
  if (row.email) lines.push(`Email: ${row.email}`);
  if (row.city) lines.push(`City: ${row.city}`);

  if (row.request_type === 'franchise') {
    lines.push(`Partnership: ${partnershipLabel(row.partnership_type)}`);
    if (row.organization) lines.push(`Brand / organization: ${row.organization}`);
    if (row.full_address) lines.push(`Address: ${row.full_address}`);
    if (row.pincode) lines.push(`Pincode: ${row.pincode}`);
    if (row.proof_of_address) lines.push(`Proof of address: ${row.proof_of_address}`);
  }

  if (row.request_type === 'job') {
    if (row.branch) lines.push(`Branch: ${row.branch}`);
    if (row.experience_type) lines.push(`Experience: ${row.experience_type}`);
    if (row.current_employer) lines.push(`Current employer: ${row.current_employer}`);
    if (row.total_experience) lines.push(`Total experience: ${row.total_experience}`);
    if (row.last_salary) lines.push(`Last salary: ${row.last_salary}`);
  }

  if (row.message) lines.push(`Message: ${row.message}`);
  return lines.length ? lines.join('\n') : 'No additional details.';
}

export default function EnquireBoxPanel({ title = 'Enquire Box' }) {
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [messagePreview, setMessagePreview] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (appliedFilters.search.trim()) params.search = appliedFilters.search.trim();
      if (appliedFilters.is_handled) params.is_handled = appliedFilters.is_handled;
      if (appliedFilters.request_type) params.request_type = appliedFilters.request_type;
      const data = await api.getJoinRequests(params);
      setRows(data);
    } catch (err) {
      setError(err.message || 'Unable to load enquiries.');
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

  const handleToggleHandled = async (row) => {
    setSavingId(row.id);
    setError('');
    try {
      await api.updateJoinRequest(row.id, { is_handled: !row.is_handled });
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to update enquiry.');
    } finally {
      setSavingId(null);
    }
  };

  const franchiseCount = rows.filter((row) => row.request_type === 'franchise').length;
  const jobCount = rows.filter((row) => row.request_type === 'job').length;

  return (
    <section className="activity-checklist-panel enquire-box-panel">
      <div className="enquire-box-intro">
        <h2 className="page-heading">{title}</h2>
        <p className="enquire-box-subtitle">
          Franchise and job vacancy applications from the landing page appear here.
        </p>
        <div className="enquire-box-stats">
          <span>Franchise: <strong>{franchiseCount}</strong></span>
          <span>Job Vacancy: <strong>{jobCount}</strong></span>
          <span>Total shown: <strong>{rows.length}</strong></span>
        </div>
      </div>

      <div className="activity-checklist-filters">
        <div className="activity-checklist-filter-grid enquire-box-filter-grid">
          <div className="activity-checklist-field">
            <label htmlFor="enquiry-search">Search Enquiry</label>
            <input
              id="enquiry-search"
              type="text"
              value={draftFilters.search}
              onChange={(event) => setDraft('search', event.target.value)}
              placeholder="Name, phone, email, branch, contact person"
            />
          </div>
          <div className="activity-checklist-field">
            <label htmlFor="enquiry-type">Type</label>
            <select
              id="enquiry-type"
              value={draftFilters.request_type}
              onChange={(event) => setDraft('request_type', event.target.value)}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="activity-checklist-field">
            <label htmlFor="enquiry-status">Status</label>
            <select
              id="enquiry-status"
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
                <th>Type</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Branch / Details</th>
                <th>City</th>
                <th>Details</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="empty-msg">Loading...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="empty-msg">No franchise or job vacancy enquiries yet.</td></tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at_display}</td>
                  <td>
                    <span className={`enquire-type-badge enquire-type-${row.request_type || 'general'}`}>
                      {row.request_type_display || 'General'}
                    </span>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.phone || '-'}</td>
                  <td>{row.email || '-'}</td>
                  <td>
                    {row.request_type === 'job'
                      ? (row.branch || '-')
                      : (partnershipLabel(row.partnership_type) || '-')}
                  </td>
                  <td>{row.city || '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="activity-notes-btn"
                      title="View details"
                      onClick={() => setMessagePreview({ title: row.name, text: buildDetailLines(row), row })}
                      aria-label={`View details for ${row.name}`}
                    >
                      ...
                    </button>
                  </td>
                  <td>{row.is_handled ? 'Handled' : 'Pending'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => handleToggleHandled(row)}
                      disabled={savingId === row.id}
                    >
                      {row.is_handled ? 'Mark Pending' : 'Mark Handled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {messagePreview && (
        <div className="activity-notes-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-message-title">
          <div className="activity-notes-modal-content enquire-detail-modal">
            <h3 id="enquiry-message-title">Details — {messagePreview.title}</h3>
            <p className="enquire-detail-text">{messagePreview.text}</p>
            <button type="button" className="btn-outline btn-sm" onClick={() => setMessagePreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

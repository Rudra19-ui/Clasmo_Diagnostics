import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Pending' },
  { value: 'true', label: 'Handled' },
];

const defaultFilters = () => ({
  search: '',
  is_handled: 'false',
});

export default function Enquiries() {
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

  const handleShowMessage = (row) => {
    const lines = [];
    if (row.request_type_display) lines.push(`Type: ${row.request_type_display}`);
    if (row.partnership_type) lines.push(`Partnership: ${row.partnership_type}`);
    if (row.contact_person) lines.push(`Contact person: ${row.contact_person}`);
    if (row.full_address) lines.push(`Address: ${row.full_address}`);
    if (row.pincode) lines.push(`Pincode: ${row.pincode}`);
    if (row.proof_of_address) lines.push(`Proof: ${row.proof_of_address}`);
    if (row.branch) lines.push(`Branch: ${row.branch}`);
    if (row.experience_type) lines.push(`Experience: ${row.experience_type}`);
    if (row.current_employer) lines.push(`Employer: ${row.current_employer}`);
    if (row.total_experience) lines.push(`Total experience: ${row.total_experience}`);
    if (row.last_salary) lines.push(`Last salary: ${row.last_salary}`);
    if (row.message) lines.push(`Message: ${row.message}`);
    if (row.letterhead_photo_url) lines.push(`Letterhead/ID: ${row.letterhead_photo_url}`);
    if (row.lab_interior_photo_url) lines.push(`Lab photo: ${row.lab_interior_photo_url}`);
    if (row.resume_url) lines.push(`Resume: ${row.resume_url}`);
    const text = lines.length ? lines.join('\n') : 'No additional details.';
    setMessagePreview({ title: row.name, text });
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Enquiries</li>
          </ul>
        </nav>

        <section className="activity-checklist-panel">
          <div className="activity-checklist-filters">
            <div className="activity-checklist-filter-grid">
              <div className="activity-checklist-field">
                <label htmlFor="enquiry-search">Search Enquiry</label>
                <input
                  id="enquiry-search"
                  type="text"
                  value={draftFilters.search}
                  onChange={(event) => setDraft('search', event.target.value)}
                  placeholder="Name, phone, email, organization"
                />
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
                    <th>Lab / Organization</th>
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
                    <tr><td colSpan={10} className="empty-msg">No enquiries found.</td></tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.created_at_display}</td>
                      <td>{row.request_type_display || 'General'}</td>
                      <td>{row.name}</td>
                      <td>{row.phone}</td>
                      <td>{row.email || '-'}</td>
                      <td>{row.organization || '-'}</td>
                      <td>{row.city || '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="activity-notes-btn"
                          title="View details"
                          onClick={() => handleShowMessage(row)}
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
        </section>

        {messagePreview && (
          <div className="activity-notes-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-message-title">
            <div className="activity-notes-modal-content">
              <h3 id="enquiry-message-title">Details — {messagePreview.title}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{messagePreview.text}</p>
              <button type="button" className="btn-outline btn-sm" onClick={() => setMessagePreview(null)}>
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

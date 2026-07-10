import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const emptyForm = () => ({ reason: '', comment: '' });
const emptyFilters = () => ({ reason: '', comment: '' });

export default function DiscountReason() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [filters, setFilters] = useState(emptyFilters());
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDiscountReasons(filters);
      setRows(data);
    } catch (err) {
      setError(err.message || 'Unable to load discount reasons.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setSelectedId(null);
  };

  const handleSelectRow = (row) => {
    setSelectedId(row.id);
    setEditingId(row.id);
    setForm({ reason: row.reason || '', comment: row.comment || '' });
    setSuccess('');
    setError('');
  };

  const handleAddNew = () => {
    resetForm();
    setSuccess('');
    setError('');
  };

  const handleSave = async () => {
    if (!form.reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        reason: form.reason.trim(),
        comment: form.comment.trim(),
      };
      if (editingId) {
        await api.updateDiscountReason(editingId, payload);
        setSuccess('Discount reason updated successfully.');
      } else {
        const created = await api.createDiscountReason(payload);
        setEditingId(created.id);
        setSelectedId(created.id);
        setSuccess('Discount reason added successfully.');
      }
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to save discount reason.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) {
      setError('Select a record to delete.');
      return;
    }
    if (!window.confirm('Delete this discount reason?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.deleteDiscountReason(editingId);
      setSuccess('Discount reason deleted successfully.');
      resetForm();
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to delete discount reason.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>User Management</li>
            <li>Discount Reason</li>
          </ul>
        </nav>

        <section className="master-panel">
          <h2 className="change-password-title">Discount Reason</h2>

          <form className="master-form" onSubmit={(event) => event.preventDefault()}>
            <div className="master-form-grid">
              <div className="master-field">
                <label htmlFor="discount-reason">Reason</label>
                <input
                  id="discount-reason"
                  type="text"
                  value={form.reason}
                  onChange={(event) => setField('reason', event.target.value)}
                  placeholder="Reason"
                />
              </div>
              <div className="master-field">
                <label htmlFor="discount-comment">Comment</label>
                <input
                  id="discount-comment"
                  type="text"
                  value={form.comment}
                  onChange={(event) => setField('comment', event.target.value)}
                  placeholder="Comment"
                />
              </div>
            </div>

            {error && <p className="change-password-message error" role="alert">{error}</p>}
            {success && <p className="change-password-message success" role="status">{success}</p>}

            <div className="master-actions">
              <button type="button" className="btn-blue btn-sm" onClick={handleAddNew} disabled={submitting}>Add New</button>
              <button type="button" className="btn-blue btn-sm" onClick={handleSave} disabled={submitting}>
                {submitting ? 'Saving...' : 'Update'}
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={handleDelete} disabled={submitting || !editingId}>Delete</button>
              <button type="button" className="btn-outline btn-sm" onClick={resetForm} disabled={submitting}>Cancel</button>
            </div>
          </form>

          <div className="data-table-wrap master-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table master-table">
                <thead>
                  <tr>
                    <th />
                    <th>Reason</th>
                    <th>Comment</th>
                  </tr>
                  <tr className="master-filter-row">
                    <th />
                    <th>
                      <input
                        type="text"
                        value={filters.reason}
                        onChange={(event) => setFilter('reason', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.comment}
                        onChange={(event) => setFilter('comment', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={3} className="empty-msg">Loading...</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={3} className="empty-msg">No records found.</td></tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? 'master-row-selected' : ''}
                      onClick={() => handleSelectRow(row)}
                    >
                      <td>
                        <input
                          type="radio"
                          name="discount-reason-selected"
                          checked={selectedId === row.id}
                          onChange={() => handleSelectRow(row)}
                          aria-label={`Select ${row.reason}`}
                        />
                      </td>
                      <td>{row.reason}</td>
                      <td>{row.comment || '—'}</td>
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

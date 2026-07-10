import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const emptyForm = () => ({
  authorization_name: '',
  authorized_user: '',
  mobile: '',
});

const emptyFilters = () => ({
  authorization_name: '',
  authorization_uid: '',
  mobile: '',
});

export default function DiscountAuthority() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [filters, setFilters] = useState(emptyFilters());
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDiscountAuthorities(filters);
      setRows(data);
    } catch (err) {
      setError(err.message || 'Unable to load discount authorities.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    setForm({
      authorization_name: row.authorization_name || '',
      authorized_user: row.authorized_user || '',
      mobile: row.mobile || '',
    });
    setSuccess('');
    setError('');
  };

  const handleAddNew = () => {
    resetForm();
    setSuccess('');
    setError('');
  };

  const handleSave = async () => {
    if (!form.authorization_name.trim()) {
      setError('Authorization By Name is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        authorization_name: form.authorization_name.trim(),
        authorized_user: form.authorized_user ? Number(form.authorized_user) : null,
        mobile: form.mobile.trim(),
      };
      if (editingId) {
        await api.updateDiscountAuthority(editingId, payload);
        setSuccess('Discount authority updated successfully.');
      } else {
        const created = await api.createDiscountAuthority(payload);
        setEditingId(created.id);
        setSelectedId(created.id);
        setSuccess('Discount authority added successfully.');
      }
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to save discount authority.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) {
      setError('Select a record to delete.');
      return;
    }
    if (!window.confirm('Delete this discount authority?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.deleteDiscountAuthority(editingId);
      setSuccess('Discount authority deleted successfully.');
      resetForm();
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to delete discount authority.');
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
            <li>Discount Authority</li>
          </ul>
        </nav>

        <section className="master-panel">
          <h2 className="change-password-title">Discount Authority</h2>

          <form className="master-form" onSubmit={(event) => event.preventDefault()}>
            <div className="master-form-grid master-form-grid-3">
              <div className="master-field">
                <label htmlFor="auth-name">Authorization By Name</label>
                <input
                  id="auth-name"
                  type="text"
                  value={form.authorization_name}
                  onChange={(event) => setField('authorization_name', event.target.value)}
                  placeholder="Authorization By Name"
                />
              </div>
              <div className="master-field">
                <label htmlFor="auth-uid">Authorization By UID</label>
                <select
                  id="auth-uid"
                  value={form.authorized_user}
                  onChange={(event) => setField('authorized_user', event.target.value)}
                >
                  <option value="">Select</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.display_name || user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="master-field">
                <label htmlFor="auth-mobile">Mobile Number</label>
                <input
                  id="auth-mobile"
                  type="text"
                  value={form.mobile}
                  onChange={(event) => setField('mobile', event.target.value)}
                  placeholder="Mobile Number"
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
                    <th>Authorisation By Name</th>
                    <th>Authorisation By UID</th>
                    <th>Mobile Number</th>
                  </tr>
                  <tr className="master-filter-row">
                    <th />
                    <th>
                      <input
                        type="text"
                        value={filters.authorization_name}
                        onChange={(event) => setFilter('authorization_name', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.authorization_uid}
                        onChange={(event) => setFilter('authorization_uid', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.mobile}
                        onChange={(event) => setFilter('mobile', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={4} className="empty-msg">Loading...</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={4} className="empty-msg">No records found.</td></tr>
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
                          name="discount-authority-selected"
                          checked={selectedId === row.id}
                          onChange={() => handleSelectRow(row)}
                          aria-label={`Select ${row.authorization_name}`}
                        />
                      </td>
                      <td>{row.authorization_name}</td>
                      <td>{row.authorization_uid || '—'}</td>
                      <td>{row.mobile || '—'}</td>
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

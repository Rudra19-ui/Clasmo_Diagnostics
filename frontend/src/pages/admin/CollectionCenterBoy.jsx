import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const emptyForm = () => ({
  first_name: '',
  middle_name: '',
  last_name: '',
  short_name: '',
  age: '',
  gender: '',
  email: '',
  mobile: '',
  address: '',
  collection_center: '',
});

const emptyFilters = () => ({
  first_name: '',
  middle_name: '',
  last_name: '',
  short_name: '',
  age: '',
  gender: '',
  mobile: '',
  email: '',
  address: '',
  collection_center: '',
});

const GENDER_OPTIONS = [
  { value: '', label: '--Select--' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

function rowToForm(row) {
  return {
    first_name: row.first_name || '',
    middle_name: row.middle_name || '',
    last_name: row.last_name || '',
    short_name: row.short_name || '',
    age: row.age ?? '',
    gender: row.gender || '',
    email: row.email || '',
    mobile: row.mobile || '',
    address: row.address || '',
    collection_center: row.collection_center || '',
  };
}

export default function CollectionCenterBoy() {
  const [centers, setCenters] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [filters, setFilters] = useState(emptyFilters());
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCenters = useCallback(async () => {
    const data = await api.getCollectionCenters();
    setCenters(data);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCollectionCenterBoys(filters);
      setRows(data);
    } catch (err) {
      setError(err.message || 'Unable to load collection center boys.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCenters().catch((err) => setError(err.message));
  }, [loadCenters]);

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
    setForm(rowToForm(row));
    setSuccess('');
    setError('');
  };

  const buildPayload = () => ({
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    short_name: form.short_name.trim(),
    age: form.age === '' ? null : Number(form.age),
    gender: form.gender || '',
    email: form.email.trim(),
    mobile: form.mobile.trim(),
    address: form.address.trim(),
    collection_center: Number(form.collection_center),
  });

  const validateForm = () => {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.collection_center) return 'Please select collection center.';
    if (form.age !== '' && (!Number.isFinite(Number(form.age)) || Number(form.age) < 0)) {
      return 'Please enter a valid age.';
    }
    return '';
  };

  const handleAddNew = () => {
    resetForm();
    setSuccess('');
    setError('');
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await api.updateCollectionCenterBoy(editingId, payload);
        setSuccess('Collection center boy updated successfully.');
      } else {
        const created = await api.createCollectionCenterBoy(payload);
        setEditingId(created.id);
        setSelectedId(created.id);
        setSuccess('Collection center boy added successfully.');
      }
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to save record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) {
      setError('Select a record to delete.');
      return;
    }
    if (!window.confirm('Delete this collection center boy?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.deleteCollectionCenterBoy(editingId);
      setSuccess('Collection center boy deleted successfully.');
      resetForm();
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to delete record.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCount = useMemo(() => rows.length, [rows]);

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>User Management</li>
            <li>Collection Center Boy</li>
          </ul>
        </nav>

        <section className="ccb-panel">
          <h2 className="change-password-title">Collection Center Boys</h2>

          <form className="ccb-form" onSubmit={(event) => event.preventDefault()}>
            <div className="ccb-form-grid">
              <div className="ccb-form-col">
                <div className="ccb-field">
                  <label htmlFor="ccb-first-name">First Name</label>
                  <input id="ccb-first-name" type="text" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="First Name" />
                </div>
                <div className="ccb-field">
                  <label htmlFor="ccb-short-name">Short Name</label>
                  <input id="ccb-short-name" type="text" value={form.short_name} onChange={(e) => setField('short_name', e.target.value)} placeholder="Short Name" />
                </div>
                <div className="ccb-field">
                  <label htmlFor="ccb-email">Email Id</label>
                  <input id="ccb-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="Email Id" />
                </div>
              </div>

              <div className="ccb-form-col">
                <div className="ccb-field">
                  <label htmlFor="ccb-middle-name">Middle Name</label>
                  <input id="ccb-middle-name" type="text" value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} placeholder="Middle Name" />
                </div>
                <div className="ccb-field ccb-age-gender">
                  <div>
                    <label htmlFor="ccb-age">Age</label>
                    <input id="ccb-age" type="number" min="0" value={form.age} onChange={(e) => setField('age', e.target.value)} placeholder="Age" />
                  </div>
                  <div>
                    <label htmlFor="ccb-gender">Gender</label>
                    <select id="ccb-gender" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="ccb-field">
                  <label htmlFor="ccb-address">Address</label>
                  <textarea id="ccb-address" rows={3} value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Address" />
                </div>
              </div>

              <div className="ccb-form-col">
                <div className="ccb-field">
                  <label htmlFor="ccb-last-name">Last Name</label>
                  <input id="ccb-last-name" type="text" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} placeholder="Last Name" />
                </div>
                <div className="ccb-field">
                  <label htmlFor="ccb-mobile">Mobile Number</label>
                  <input id="ccb-mobile" type="text" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="Mobile Number" />
                </div>
                <div className="ccb-field">
                  <label htmlFor="ccb-center">Collection Center Name</label>
                  <select id="ccb-center" value={form.collection_center} onChange={(e) => setField('collection_center', e.target.value)}>
                    <option value="">--Select--</option>
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>{center.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="change-password-message error" role="alert">{error}</p>}
            {success && <p className="change-password-message success" role="status">{success}</p>}

            <div className="ccb-actions">
              <button type="button" className="btn-blue btn-sm" onClick={handleAddNew} disabled={submitting}>Add New</button>
              <button type="button" className="btn-blue btn-sm" onClick={handleSave} disabled={submitting}>
                {submitting ? 'Saving...' : 'Update'}
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={handleDelete} disabled={submitting || !editingId}>Delete</button>
              <button type="button" className="btn-outline btn-sm" onClick={resetForm} disabled={submitting}>Cancel</button>
            </div>
          </form>

          <div className="data-table-wrap ccb-table-wrap">
            <div className="ccb-table-meta">{filteredCount} record{filteredCount === 1 ? '' : 's'}</div>
            <div className="data-table-scroll">
              <table className="data-table ccb-table">
                <thead>
                  <tr>
                    <th />
                    <th>First Name</th>
                    <th>Middle Name</th>
                    <th>Last Name</th>
                    <th>Short Name</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Mobile No</th>
                    <th>Email I D</th>
                    <th>Boy Address</th>
                    <th>Collection Center</th>
                  </tr>
                  <tr className="ccb-filter-row">
                    <th />
                    {Object.keys(emptyFilters()).map((key) => (
                      <th key={key}>
                        {key === 'gender' ? (
                          <select value={filters.gender} onChange={(e) => setFilter('gender', e.target.value)}>
                            <option value="">All</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={filters[key]}
                            onChange={(e) => setFilter(key, e.target.value)}
                            placeholder="Filter"
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={11} className="empty-msg">Loading...</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={11} className="empty-msg">No records found.</td></tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? 'ccb-row-selected' : ''}
                      onClick={() => handleSelectRow(row)}
                    >
                      <td>
                        <input
                          type="radio"
                          name="ccb-selected"
                          checked={selectedId === row.id}
                          onChange={() => handleSelectRow(row)}
                          aria-label={`Select ${row.first_name}`}
                        />
                      </td>
                      <td>{row.first_name}</td>
                      <td>{row.middle_name || '—'}</td>
                      <td>{row.last_name || '—'}</td>
                      <td>{row.short_name || '—'}</td>
                      <td>{row.age ?? '—'}</td>
                      <td>{row.sex || '—'}</td>
                      <td>{row.mobile || '—'}</td>
                      <td>{row.email || '—'}</td>
                      <td>{row.address || '—'}</td>
                      <td>{row.collection_center_name || '—'}</td>
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

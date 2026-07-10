import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one_time', label: 'One Time' },
];

function formatDateDDMMYYYY(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const emptyForm = () => ({
  title: '',
  description: '',
  creation_date: formatDateDDMMYYYY(),
  activity_type: 'daily',
  eta: '',
  remark: '',
  notes: '',
  is_active: true,
});

export default function CreateActivity() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCancel = () => {
    setForm(emptyForm());
    setError('');
    setSuccess('');
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.creation_date.trim()) {
      setError('Creation date is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.createActivity({
        title: form.title.trim(),
        description: form.description.trim(),
        creation_date: form.creation_date.trim(),
        activity_type: form.activity_type,
        eta: form.eta.trim(),
        remark: form.remark.trim(),
        notes: form.notes.trim(),
        is_active: form.is_active,
      });
      setSuccess('Activity created successfully.');
      setForm(emptyForm());
    } catch (err) {
      setError(err.message || 'Unable to create activity.');
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
            <li>Lab Management</li>
            <li>Create Activity</li>
          </ul>
        </nav>

        <section className="cc-mgmt-panel activity-panel">
          <h2 className="change-password-title activity-title">Create New Activity</h2>

          <form className="cc-mgmt-form activity-form" onSubmit={(event) => event.preventDefault()}>
            <div className="cc-mgmt-row">
              <label htmlFor="activity-title">Title</label>
              <input
                id="activity-title"
                type="text"
                value={form.title}
                onChange={(event) => setField('title', event.target.value)}
              />
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-description">Description</label>
              <textarea
                id="activity-description"
                rows={4}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-date">Creation Date</label>
              <input
                id="activity-date"
                type="text"
                value={form.creation_date}
                onChange={(event) => setField('creation_date', event.target.value)}
                placeholder="dd/mm/yyyy"
              />
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-type">Type of Activity</label>
              <select
                id="activity-type"
                value={form.activity_type}
                onChange={(event) => setField('activity_type', event.target.value)}
              >
                {ACTIVITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-eta">E.T.A</label>
              <input
                id="activity-eta"
                type="text"
                value={form.eta}
                onChange={(event) => setField('eta', event.target.value)}
              />
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-remark">Remark</label>
              <input
                id="activity-remark"
                type="text"
                value={form.remark}
                onChange={(event) => setField('remark', event.target.value)}
              />
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-notes">Notes</label>
              <textarea
                id="activity-notes"
                rows={4}
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
              />
            </div>

            <div className="cc-mgmt-row">
              <label htmlFor="activity-active">Activate</label>
              <input
                id="activity-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setField('is_active', event.target.checked)}
              />
            </div>

            {error && <p className="change-password-message error" role="alert">{error}</p>}
            {success && <p className="change-password-message success" role="status">{success}</p>}

            <div className="cc-mgmt-actions">
              <button type="button" className="btn-blue btn-sm" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={handleCancel} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

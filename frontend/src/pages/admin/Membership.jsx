import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { printMembership } from '../../utils/printMembership';

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toISOString().slice(0, 10);
}

const emptyForm = () => ({
  patient_name: '',
  membership_type: '',
  membership_validation: '',
  profile_image: null,
});

export default function Membership() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMembershipTypes();
      setTypes(data);
    } catch (err) {
      setError(err.message || 'Unable to load membership types.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleTypeChange = (typeId) => {
    const selected = types.find((item) => String(item.id) === String(typeId));
    setForm((prev) => ({
      ...prev,
      membership_type: typeId,
      membership_validation: selected
        ? addMonths(new Date(), selected.duration_months)
        : prev.membership_validation,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setField('profile_image', file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.patient_name.trim()) {
      setError('Please enter patient name.');
      return;
    }
    if (!form.membership_type) {
      setError('Please select membership type.');
      return;
    }
    if (!form.membership_validation.trim()) {
      setError('Please enter membership validation.');
      return;
    }

    const payload = new FormData();
    payload.append('patient_name', form.patient_name.trim());
    payload.append('membership_type', form.membership_type);
    payload.append('membership_validation', form.membership_validation.trim());
    if (form.profile_image) payload.append('profile_image', form.profile_image);

    setSubmitting(true);
    try {
      const saved = await api.createMembership(payload);
      setLastSaved(saved);
      setSuccess(`Membership ${saved.membership_number} saved successfully.`);
      printMembership(saved);
      setForm(emptyForm());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (err) {
      setError(err.message || 'Unable to save membership.');
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
            <li>Membership</li>
          </ul>
        </nav>

        <section className="membership-panel">
          <h2 className="change-password-title">Create Membership</h2>

          <form className="membership-form" onSubmit={handleSubmit}>
            <div className="membership-form-row">
              <label htmlFor="patient-name">Patient</label>
              <input
                id="patient-name"
                type="text"
                value={form.patient_name}
                onChange={(event) => setField('patient_name', event.target.value)}
                placeholder="Patient Name"
                disabled={submitting}
              />
            </div>

            <div className="membership-form-row">
              <label htmlFor="membership-type">Select Membership Type</label>
              <select
                id="membership-type"
                value={form.membership_type}
                onChange={(event) => handleTypeChange(event.target.value)}
                disabled={submitting || loading}
              >
                <option value="">-Select-</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="membership-form-row">
              <label htmlFor="profile-image">Upload Profile Image</label>
              <div className="membership-file-field">
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={submitting}
                />
                {previewUrl && (
                  <img src={previewUrl} alt="Profile preview" className="membership-image-preview" />
                )}
              </div>
            </div>

            <div className="membership-form-row">
              <label htmlFor="membership-validation">Membership Validation</label>
              <input
                id="membership-validation"
                type="date"
                value={form.membership_validation}
                onChange={(event) => setField('membership_validation', event.target.value)}
                disabled={submitting}
              />
            </div>

            {error && <p className="change-password-message error" role="alert">{error}</p>}
            {success && <p className="change-password-message success" role="status">{success}</p>}

            <div className="membership-actions">
              <button type="submit" className="membership-save-btn" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save & Print'}
              </button>
              {lastSaved && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => printMembership(lastSaved)}
                >
                  Reprint Last
                </button>
              )}
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

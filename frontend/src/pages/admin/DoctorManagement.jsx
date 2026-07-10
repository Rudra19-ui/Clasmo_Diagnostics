import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const DEFAULT_CONTACT_OPTIONS = [
  { value: 'office', label: 'Office' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'residence', label: 'Residence' },
];

const ADDRESS_TYPE_OPTIONS = [
  { value: 'office', label: 'Office' },
  { value: 'residence', label: 'Residence' },
];

const emptyForm = () => ({
  registration_number: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  short_name: '',
  gender: '',
  age: '',
  date_of_birth: '',
  specialization: '',
  telephone_office: '',
  telephone_residence: '',
  mobile: '',
  default_contact: 'office',
  email: '',
  alternate_email: '',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  country: '',
  state: '',
  city: '',
  pincode: '',
  address_type: 'office',
  is_default_address: false,
  affiliation: '',
  sales_reference: '',
  commission_applicable: false,
  is_postpaid: false,
  invoice_payment_period_days: '0',
  credit_limit: '0',
  communication_language: '',
  comment: '',
  report_print_exception: false,
});

function rowToForm(row) {
  return {
    registration_number: row.registration_number || '',
    first_name: row.first_name || '',
    middle_name: row.middle_name || '',
    last_name: row.last_name || '',
    short_name: row.short_name || '',
    gender: row.gender || '',
    age: row.age ?? '',
    date_of_birth: row.date_of_birth || '',
    specialization: row.specialization || '',
    telephone_office: row.telephone_office || '',
    telephone_residence: row.telephone_residence || '',
    mobile: row.mobile || '',
    default_contact: row.default_contact || 'office',
    email: row.email || '',
    alternate_email: row.alternate_email || '',
    address_line1: row.address_line1 || '',
    address_line2: row.address_line2 || '',
    address_line3: row.address_line3 || '',
    country: row.country || '',
    state: row.state || '',
    city: row.city || '',
    pincode: row.pincode || '',
    address_type: row.address_type || 'office',
    is_default_address: Boolean(row.is_default_address),
    affiliation: row.affiliation || '',
    sales_reference: row.sales_reference || '',
    commission_applicable: Boolean(row.commission_applicable),
    is_postpaid: Boolean(row.is_postpaid),
    invoice_payment_period_days: row.invoice_payment_period_days ?? '0',
    credit_limit: row.credit_limit ?? '0',
    communication_language: row.communication_language || '',
    comment: row.comment || '',
    report_print_exception: Boolean(row.report_print_exception),
  };
}

function formToPayload(form) {
  return {
    registration_number: form.registration_number.trim(),
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    short_name: form.short_name.trim(),
    gender: form.gender,
    age: form.age === '' ? null : Number(form.age),
    date_of_birth: form.date_of_birth.trim(),
    specialization: form.specialization.trim(),
    telephone_office: form.telephone_office.trim(),
    telephone_residence: form.telephone_residence.trim(),
    mobile: form.mobile.trim(),
    default_contact: form.default_contact || 'office',
    email: form.email.trim(),
    alternate_email: form.alternate_email.trim(),
    address_line1: form.address_line1.trim(),
    address_line2: form.address_line2.trim(),
    address_line3: form.address_line3.trim(),
    country: form.country.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    pincode: form.pincode.trim(),
    address_type: form.address_type || 'office',
    is_default_address: form.is_default_address,
    affiliation: form.affiliation,
    sales_reference: form.sales_reference,
    commission_applicable: form.commission_applicable,
    is_postpaid: form.is_postpaid,
    invoice_payment_period_days: form.invoice_payment_period_days === ''
      ? 0
      : Number(form.invoice_payment_period_days),
    credit_limit: form.credit_limit === '' ? 0 : Number(form.credit_limit),
    communication_language: form.communication_language.trim(),
    comment: form.comment.trim(),
    report_print_exception: form.report_print_exception,
  };
}

function exportDoctorsToCsv(rows) {
  const headers = [
    'Registration Number', 'First Name', 'Middle Name', 'Last Name', 'Short Name',
    'Gender', 'Age', 'Mobile', 'Email', 'Specialization', 'Affiliation', 'City',
  ];
  const lines = rows.map((row) => [
    row.registration_number,
    row.first_name,
    row.middle_name,
    row.last_name,
    row.short_name,
    row.gender_display || row.gender,
    row.age,
    row.mobile,
    row.email,
    row.specialization,
    row.affiliation,
    row.city,
  ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'doctors.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [salesReferences, setSalesReferences] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadLookups = useCallback(async () => {
    const [doctorData, affiliationData, salesData] = await Promise.all([
      api.getDoctors(),
      api.getAffiliations(),
      api.getSalesReferences(),
    ]);
    setDoctors(doctorData);
    setAffiliations(affiliationData);
    setSalesReferences(salesData);
    return doctorData;
  }, []);

  useEffect(() => {
    loadLookups().catch((err) => {
      setError(err.message || 'Unable to load doctor data.');
    }).finally(() => setLoading(false));
  }, [loadLookups]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setSelectedDoctorId('');
    setError('');
    setSuccess('');
  };

  const handleSelectDoctor = (doctorId) => {
    setSelectedDoctorId(doctorId);
    if (!doctorId) {
      resetForm();
      return;
    }
    const row = doctors.find((item) => String(item.id) === String(doctorId));
    if (row) {
      setEditingId(row.id);
      setForm(rowToForm(row));
      setError('');
      setSuccess('');
    }
  };

  const handleAddDoctor = () => {
    resetForm();
  };

  const handleSave = async (isNew = false) => {
    if (!form.registration_number.trim()) {
      setError('Registration number is required.');
      return;
    }
    if (!form.first_name.trim()) {
      setError('First name is required.');
      return;
    }
    if (!form.last_name.trim()) {
      setError('Last name is required.');
      return;
    }
    if (form.age === '') {
      setError('Age is required.');
      return;
    }
    if (!form.mobile.trim()) {
      setError('Mobile is required.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!form.address_line1.trim()) {
      setError('Address line 1 is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = formToPayload(form);
      if (editingId && !isNew) {
        const updated = await api.updateDoctor(editingId, payload);
        setEditingId(updated.id);
        setSelectedDoctorId(String(updated.id));
        setForm(rowToForm(updated));
        setSuccess('Doctor updated successfully.');
      } else {
        const created = await api.createDoctor(payload);
        setEditingId(created.id);
        setSelectedDoctorId(String(created.id));
        setForm(rowToForm(created));
        setSuccess('Doctor added successfully.');
      }
      await loadLookups();
    } catch (err) {
      setError(err.message || 'Unable to save doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) {
      setError('Select a doctor to delete.');
      return;
    }
    if (!window.confirm('Delete this doctor record?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.deleteDoctor(editingId);
      setSuccess('Doctor deleted successfully.');
      resetForm();
      await loadLookups();
    } catch (err) {
      setError(err.message || 'Unable to delete doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (editingId) {
      const row = doctors.find((item) => item.id === editingId);
      if (row) {
        setForm(rowToForm(row));
        setSelectedDoctorId(String(row.id));
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
    setError('');
    setSuccess('');
  };

  const handleExportExcel = async () => {
    try {
      const data = await api.getDoctors();
      exportDoctorsToCsv(data);
    } catch (err) {
      setError(err.message || 'Unable to export doctors.');
    }
  };

  const doctorLabel = (doctor) => {
    const name = doctor.full_name || `${doctor.first_name} ${doctor.last_name}`.trim();
    return doctor.registration_number ? `${name} (${doctor.registration_number})` : name;
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Doctor Management</li>
          </ul>
        </nav>

        <section className="cc-mgmt-panel">
          <div className="cc-mgmt-header">
            <h2 className="change-password-title">Doctor Details</h2>
            <div className="cc-mgmt-top-actions">
              <label className="cc-mgmt-toggle">
                <span>Report Print Exception</span>
                <input
                  type="checkbox"
                  checked={form.report_print_exception}
                  onChange={(event) => setField('report_print_exception', event.target.checked)}
                />
                <span className="cc-mgmt-toggle-slider" />
              </label>
              <button type="button" className="btn-outline btn-sm" onClick={handleExportExcel}>
                Doctor Excel
              </button>
              <button type="button" className="btn-blue btn-sm" onClick={handleAddDoctor}>
                Add Doctor
              </button>
            </div>
          </div>

          {loading ? (
            <p className="empty-msg">Loading...</p>
          ) : (
            <form className="cc-mgmt-form" onSubmit={(event) => event.preventDefault()}>
              <div className="cc-mgmt-row">
                <label htmlFor="doctor-select">Select Doctor</label>
                <select
                  id="doctor-select"
                  value={selectedDoctorId}
                  onChange={(event) => handleSelectDoctor(event.target.value)}
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctorLabel(doctor)}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-reg">Registration Number <span className="required">*</span></label>
                <input id="doctor-reg" type="text" value={form.registration_number} onChange={(e) => setField('registration_number', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-first">First Name <span className="required">*</span></label>
                <input id="doctor-first" type="text" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-middle">Middle Name</label>
                <input id="doctor-middle" type="text" value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-last">Last Name <span className="required">*</span></label>
                <input id="doctor-last" type="text" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-short">Short Name</label>
                <input id="doctor-short" type="text" value={form.short_name} onChange={(e) => setField('short_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label>Gender</label>
                <div className="cc-mgmt-radio-group">
                  {GENDER_OPTIONS.map((option) => (
                    <label key={option.value} className="cc-mgmt-radio">
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={form.gender === option.value}
                        onChange={(event) => setField('gender', event.target.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-age">Age <span className="required">*</span></label>
                <input id="doctor-age" type="number" min="0" value={form.age} onChange={(e) => setField('age', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-dob">Date of Birth (dd/mm/yyyy)</label>
                <input id="doctor-dob" type="text" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} placeholder="dd/mm/yyyy" />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-spec">Specialization</label>
                <input id="doctor-spec" type="text" value={form.specialization} onChange={(e) => setField('specialization', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-tel-office">Telephone-Office (022-247090)</label>
                <input id="doctor-tel-office" type="text" value={form.telephone_office} onChange={(e) => setField('telephone_office', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-tel-res">Telephone-Residence (022-247090)</label>
                <input id="doctor-tel-res" type="text" value={form.telephone_residence} onChange={(e) => setField('telephone_residence', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-mobile">Mobile <span className="required">*</span></label>
                <input id="doctor-mobile" type="text" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-default-contact">Default Contact</label>
                <select id="doctor-default-contact" value={form.default_contact} onChange={(e) => setField('default_contact', e.target.value)}>
                  {DEFAULT_CONTACT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-email">Email <span className="required">*</span></label>
                <input id="doctor-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-alt-email">Alternate Email</label>
                <input id="doctor-alt-email" type="email" value={form.alternate_email} onChange={(e) => setField('alternate_email', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-address1">Address Line 1 <span className="required">*</span></label>
                <input id="doctor-address1" type="text" value={form.address_line1} onChange={(e) => setField('address_line1', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-address2">Address Line 2</label>
                <input id="doctor-address2" type="text" value={form.address_line2} onChange={(e) => setField('address_line2', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-address3">Address Line 3</label>
                <input id="doctor-address3" type="text" value={form.address_line3} onChange={(e) => setField('address_line3', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-country">Country</label>
                <input id="doctor-country" type="text" value={form.country} onChange={(e) => setField('country', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-state">State</label>
                <input id="doctor-state" type="text" value={form.state} onChange={(e) => setField('state', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-city">City</label>
                <input id="doctor-city" type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-pincode">Pincode</label>
                <input id="doctor-pincode" type="text" value={form.pincode} onChange={(e) => setField('pincode', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label>Address Type</label>
                <div className="cc-mgmt-radio-group">
                  {ADDRESS_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="cc-mgmt-radio">
                      <input
                        type="radio"
                        name="address_type"
                        value={option.value}
                        checked={form.address_type === option.value}
                        onChange={(event) => setField('address_type', event.target.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-default-address">Set as Default Address</label>
                <input
                  id="doctor-default-address"
                  type="checkbox"
                  checked={form.is_default_address}
                  onChange={(event) => setField('is_default_address', event.target.checked)}
                />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-affiliation">Affiliation</label>
                <select id="doctor-affiliation" value={form.affiliation} onChange={(e) => setField('affiliation', e.target.value)}>
                  <option value="">-- Select Affiliation --</option>
                  {affiliations.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-sales-ref">Select Sales Reference</label>
                <select id="doctor-sales-ref" value={form.sales_reference} onChange={(e) => setField('sales_reference', e.target.value)}>
                  <option value="">Select</option>
                  {salesReferences.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-commission">Commission Applicable</label>
                <input
                  id="doctor-commission"
                  type="checkbox"
                  checked={form.commission_applicable}
                  onChange={(event) => setField('commission_applicable', event.target.checked)}
                />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-postpaid">Is Postpaid</label>
                <input
                  id="doctor-postpaid"
                  type="checkbox"
                  checked={form.is_postpaid}
                  onChange={(event) => setField('is_postpaid', event.target.checked)}
                />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-invoice-days">Invoice Payment Period (In Days)</label>
                <input id="doctor-invoice-days" type="number" min="0" value={form.invoice_payment_period_days} onChange={(e) => setField('invoice_payment_period_days', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-credit-limit">Credit Limit</label>
                <input id="doctor-credit-limit" type="number" step="0.01" min="0" value={form.credit_limit} onChange={(e) => setField('credit_limit', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-language">Communication Language</label>
                <input id="doctor-language" type="text" value={form.communication_language} onChange={(e) => setField('communication_language', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="doctor-comment">Comment</label>
                <textarea id="doctor-comment" rows={3} value={form.comment} onChange={(e) => setField('comment', e.target.value)} />
              </div>

              {error && <p className="change-password-message error" role="alert">{error}</p>}
              {success && <p className="change-password-message success" role="status">{success}</p>}

              <div className="cc-mgmt-actions">
                <button type="button" className="btn-blue btn-sm" onClick={() => handleSave(true)} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add'}
                </button>
                <button type="button" className="btn-blue btn-sm" onClick={() => handleSave(false)} disabled={submitting || !editingId}>
                  {submitting ? 'Saving...' : 'Update'}
                </button>
                <button type="button" className="btn-outline btn-sm" onClick={handleCancel} disabled={submitting}>Cancel</button>
                <button type="button" className="btn-outline btn-sm" onClick={handleDelete} disabled={submitting || !editingId}>Delete</button>
              </div>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

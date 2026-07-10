import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const TITLE_OPTIONS = [
  { value: '', label: '-- Select Title --' },
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Mrs.', label: 'Mrs.' },
  { value: 'MT.', label: 'MT.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Master', label: 'Master' },
  { value: 'B/O', label: 'B/O' },
  { value: 'Baby', label: 'Baby' },
];

const SEX_OPTIONS = [
  { value: '', label: '-- Select Sex --' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const AGE_UNIT_OPTIONS = [
  { value: 'yr', label: 'Yr' },
  { value: 'month', label: 'Month' },
  { value: 'day', label: 'Day' },
];

const MARITAL_OPTIONS = [
  { value: '', label: '-- Select Status --' },
  { value: 'married', label: 'Married' },
  { value: 'unmarried', label: 'Unmarried' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widow', label: 'Widow' },
];

const BLOOD_GROUP_OPTIONS = [
  { value: '', label: '-- Select Blood Group --' },
  { value: 'A +ve', label: 'A +ve' },
  { value: 'A -ve', label: 'A -ve' },
  { value: 'B +ve', label: 'B +ve' },
  { value: 'B -ve', label: 'B -ve' },
  { value: 'AB +ve', label: 'AB +ve' },
  { value: 'AB -ve', label: 'AB -ve' },
  { value: 'O +ve', label: 'O +ve' },
  { value: 'O -ve', label: 'O -ve' },
];

const PRIMARY_TEL_OPTIONS = [
  { value: '', label: '-- Select Type --' },
  { value: 'office', label: 'TelePhone office' },
  { value: 'residence', label: 'Telephone Res' },
  { value: 'mobile', label: 'TelePhone Mobile' },
];

const ADDRESS_TYPE_OPTIONS = [
  { value: 'office', label: 'Office' },
  { value: 'residence', label: 'Residence' },
];

const emptyAddress = () => ({
  address_line1: '',
  address_line2: '',
  address_line3: '',
  country: '',
  state: '',
  city: '',
  pincode: '',
  address_type: 'residence',
  is_default: false,
});

const emptyForm = () => ({
  medical_record_no: '',
  bar_code: '',
  title: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  short_name: '',
  gender: '',
  age: '',
  age_unit: 'yr',
  date_of_birth: '',
  marital_status: '',
  blood_group: '',
  family_doctor: '',
  religion: '',
  telephone_office: '',
  telephone_residence: '',
  mobile: '',
  send_result_sms: false,
  primary_tel_type: '',
  email: '',
  email2: '',
  master_comment: '',
  insurance_id: '',
  insurance_company: '',
  insurance_start_date: '',
  insurance_expiry_date: '',
  other_data_comment: '',
  addresses: [emptyAddress()],
});

function rowToForm(row) {
  return {
    medical_record_no: row.medical_record_no || '',
    bar_code: row.bar_code || '',
    title: row.title || '',
    first_name: row.first_name || '',
    middle_name: row.middle_name || '',
    last_name: row.last_name || '',
    short_name: row.short_name || '',
    gender: row.gender || '',
    age: row.age ?? '',
    age_unit: row.age_unit || 'yr',
    date_of_birth: row.date_of_birth || '',
    marital_status: row.marital_status || '',
    blood_group: row.blood_group || '',
    family_doctor: row.family_doctor ? String(row.family_doctor) : '',
    religion: row.religion || '',
    telephone_office: row.telephone_office || '',
    telephone_residence: row.telephone_residence || '',
    mobile: row.mobile || '',
    send_result_sms: Boolean(row.send_result_sms),
    primary_tel_type: row.primary_tel_type || '',
    email: row.email || '',
    email2: row.email2 || '',
    master_comment: row.master_comment || '',
    insurance_id: row.insurance_id || '',
    insurance_company: row.insurance_company || '',
    insurance_start_date: row.insurance_start_date || '',
    insurance_expiry_date: row.insurance_expiry_date || '',
    other_data_comment: row.other_data_comment || '',
    addresses: (row.addresses && row.addresses.length > 0)
      ? row.addresses.map((addr) => ({
        address_line1: addr.address_line1 || '',
        address_line2: addr.address_line2 || '',
        address_line3: addr.address_line3 || '',
        country: addr.country || '',
        state: addr.state || '',
        city: addr.city || '',
        pincode: addr.pincode || '',
        address_type: addr.address_type || 'residence',
        is_default: Boolean(addr.is_default),
      }))
      : [emptyAddress()],
  };
}

function formToPayload(form) {
  return {
    medical_record_no: form.medical_record_no.trim(),
    bar_code: form.bar_code.trim(),
    title: form.title,
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    short_name: form.short_name.trim(),
    gender: form.gender,
    age: form.age === '' ? null : Number(form.age),
    age_unit: form.age_unit || 'yr',
    date_of_birth: form.date_of_birth.trim(),
    marital_status: form.marital_status,
    blood_group: form.blood_group,
    family_doctor: form.family_doctor ? Number(form.family_doctor) : null,
    religion: form.religion.trim(),
    telephone_office: form.telephone_office.trim(),
    telephone_residence: form.telephone_residence.trim(),
    mobile: form.mobile.trim(),
    send_result_sms: form.send_result_sms,
    primary_tel_type: form.primary_tel_type,
    email: form.email.trim(),
    email2: form.email2.trim(),
    master_comment: form.master_comment.trim(),
    insurance_id: form.insurance_id.trim(),
    insurance_company: form.insurance_company.trim(),
    insurance_start_date: form.insurance_start_date.trim(),
    insurance_expiry_date: form.insurance_expiry_date.trim(),
    other_data_comment: form.other_data_comment.trim(),
    addresses: form.addresses.map((addr) => ({
      address_line1: addr.address_line1.trim(),
      address_line2: addr.address_line2.trim(),
      address_line3: addr.address_line3.trim(),
      country: addr.country.trim(),
      state: addr.state.trim(),
      city: addr.city.trim(),
      pincode: addr.pincode.trim(),
      address_type: addr.address_type || 'residence',
      is_default: addr.is_default,
    })),
  };
}

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadLookups = useCallback(async () => {
    const [patientData, doctorData] = await Promise.all([
      api.getPatients(),
      api.getDoctors(),
    ]);
    setPatients(patientData);
    setDoctors(doctorData);
    return patientData;
  }, []);

  useEffect(() => {
    loadLookups().catch((err) => {
      setError(err.message || 'Unable to load patient data.');
    }).finally(() => setLoading(false));
  }, [loadLookups]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setAddressField = (index, key, value) => {
    setForm((prev) => {
      const addresses = prev.addresses.map((addr, i) => (
        i === index ? { ...addr, [key]: value } : addr
      ));
      return { ...prev, addresses };
    });
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setSelectedPatientId('');
    setError('');
    setSuccess('');
  };

  const handleSelectPatient = async (patientId) => {
    setSelectedPatientId(patientId);
    if (!patientId) {
      resetForm();
      return;
    }
    try {
      const row = await api.getPatient(patientId);
      setEditingId(row.id);
      setForm(rowToForm(row));
      setError('');
      setSuccess('');
    } catch (err) {
      setError(err.message || 'Unable to load patient.');
    }
  };

  const handleAddPatient = () => resetForm();

  const handleAddAddress = () => {
    setForm((prev) => ({ ...prev, addresses: [...prev.addresses, emptyAddress()] }));
  };

  const handleDeleteAddress = (index) => {
    setForm((prev) => {
      if (prev.addresses.length <= 1) return prev;
      return { ...prev, addresses: prev.addresses.filter((_, i) => i !== index) };
    });
  };

  const handleSave = async (isNew = false) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = formToPayload(form);
      if (editingId && !isNew) {
        const updated = await api.updatePatient(editingId, payload);
        setEditingId(updated.id);
        setSelectedPatientId(String(updated.id));
        setForm(rowToForm(updated));
        setSuccess('Patient updated successfully.');
      } else {
        const created = await api.createPatient(payload);
        setEditingId(created.id);
        setSelectedPatientId(String(created.id));
        setForm(rowToForm(created));
        setSuccess('Patient added successfully.');
      }
      await loadLookups();
    } catch (err) {
      setError(err.message || 'Unable to save patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) {
      setError('Select a patient to delete.');
      return;
    }
    if (!window.confirm('Delete this patient record?')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.deletePatient(editingId);
      setSuccess('Patient deleted successfully.');
      resetForm();
      await loadLookups();
    } catch (err) {
      setError(err.message || 'Unable to delete patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (editingId) {
      handleSelectPatient(String(editingId));
    } else {
      resetForm();
    }
    setError('');
    setSuccess('');
  };

  const patientLabel = (patient) => {
    const name = patient.display_name || patient.patient_name;
    return patient.medical_record_no ? `${name} (${patient.medical_record_no})` : name;
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Patient Management</li>
          </ul>
        </nav>

        <section className="cc-mgmt-panel">
          <div className="cc-mgmt-header">
            <h2 className="change-password-title">Patient Details</h2>
            <button type="button" className="btn-blue btn-sm" onClick={handleAddPatient}>Add New Patient</button>
          </div>

          {loading ? (
            <p className="empty-msg">Loading...</p>
          ) : (
            <form className="cc-mgmt-form" onSubmit={(event) => event.preventDefault()}>
              <div className="cc-mgmt-row">
                <label htmlFor="patient-select">Select Patient Name</label>
                <select id="patient-select" value={selectedPatientId} onChange={(e) => handleSelectPatient(e.target.value)}>
                  <option value="">-- Select Patient --</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patientLabel(patient)}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-mrn">Medical Record No <span className="required">*</span></label>
                <input id="pm-mrn" type="text" value={form.medical_record_no} onChange={(e) => setField('medical_record_no', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-barcode">Bar Code</label>
                <input id="pm-barcode" type="text" value={form.bar_code} onChange={(e) => setField('bar_code', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-title">Title <span className="required">*</span></label>
                <select id="pm-title" value={form.title} onChange={(e) => setField('title', e.target.value)}>
                  {TITLE_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-first">First Name <span className="required">*</span></label>
                <input id="pm-first" type="text" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-middle">Middle Name</label>
                <input id="pm-middle" type="text" value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-last">Last Name <span className="required">*</span></label>
                <input id="pm-last" type="text" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-short">Short Name</label>
                <input id="pm-short" type="text" value={form.short_name} onChange={(e) => setField('short_name', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-sex">Sex <span className="required">*</span></label>
                <select id="pm-sex" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                  {SEX_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="cc-mgmt-row cc-mgmt-inline-row">
                <label htmlFor="pm-age">Age <span className="required">*</span></label>
                <div className="cc-mgmt-inline-fields">
                  <input id="pm-age" type="number" min="0" value={form.age} onChange={(e) => setField('age', e.target.value)} />
                  <select value={form.age_unit} onChange={(e) => setField('age_unit', e.target.value)}>
                    {AGE_UNIT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-dob">Date Of Birth</label>
                <input id="pm-dob" type="text" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} placeholder="dd/mm/yyyy" />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-marital">Marital Status</label>
                <select id="pm-marital" value={form.marital_status} onChange={(e) => setField('marital_status', e.target.value)}>
                  {MARITAL_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-blood">Blood Group</label>
                <select id="pm-blood" value={form.blood_group} onChange={(e) => setField('blood_group', e.target.value)}>
                  {BLOOD_GROUP_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-doctor">Family Doctor <span className="required">*</span></label>
                <select id="pm-doctor" value={form.family_doctor} onChange={(e) => setField('family_doctor', e.target.value)}>
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.full_name || `${doctor.first_name} ${doctor.last_name}`}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-religion">Religion</label>
                <input id="pm-religion" type="text" value={form.religion} onChange={(e) => setField('religion', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-tel-office">Telephone office</label>
                <input id="pm-tel-office" type="text" value={form.telephone_office} onChange={(e) => setField('telephone_office', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-tel-res">Telephone Res</label>
                <input id="pm-tel-res" type="text" value={form.telephone_residence} onChange={(e) => setField('telephone_residence', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-mobile">Telephone Mobile <span className="required">*</span></label>
                <input id="pm-mobile" type="text" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-sms">Having Result SMS</label>
                <input id="pm-sms" type="checkbox" checked={form.send_result_sms} onChange={(e) => setField('send_result_sms', e.target.checked)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-primary-tel">Primary Tel Type <span className="required">*</span></label>
                <select id="pm-primary-tel" value={form.primary_tel_type} onChange={(e) => setField('primary_tel_type', e.target.value)}>
                  {PRIMARY_TEL_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-email1">E mail ID 1 <span className="required">*</span></label>
                <input id="pm-email1" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-email2">E mail ID 2</label>
                <input id="pm-email2" type="email" value={form.email2} onChange={(e) => setField('email2', e.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-comment">Comment</label>
                <textarea id="pm-comment" rows={3} value={form.master_comment} onChange={(e) => setField('master_comment', e.target.value)} />
              </div>

              <h3 className="pm-section-title">Address</h3>
              {form.addresses.map((addr, index) => (
                <div key={`address-${index}`} className="pm-address-block">
                  <div className="pm-address-header">
                    <span>Address {index + 1}</span>
                    {form.addresses.length > 1 && (
                      <button type="button" className="btn-outline btn-sm" onClick={() => handleDeleteAddress(index)}>Delete Address</button>
                    )}
                  </div>

                  <div className="cc-mgmt-row">
                    <label>Address Line 1</label>
                    <input type="text" value={addr.address_line1} onChange={(e) => setAddressField(index, 'address_line1', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>Address Line 2</label>
                    <input type="text" value={addr.address_line2} onChange={(e) => setAddressField(index, 'address_line2', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>Address Line 3</label>
                    <input type="text" value={addr.address_line3} onChange={(e) => setAddressField(index, 'address_line3', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>Country</label>
                    <input type="text" value={addr.country} onChange={(e) => setAddressField(index, 'country', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>State</label>
                    <input type="text" value={addr.state} onChange={(e) => setAddressField(index, 'state', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>City</label>
                    <input type="text" value={addr.city} onChange={(e) => setAddressField(index, 'city', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>Pincode</label>
                    <input type="text" value={addr.pincode} onChange={(e) => setAddressField(index, 'pincode', e.target.value)} />
                  </div>
                  <div className="cc-mgmt-row">
                    <label>Address Type</label>
                    <div className="cc-mgmt-radio-group">
                      {ADDRESS_TYPE_OPTIONS.map((option) => (
                        <label key={option.value} className="cc-mgmt-radio">
                          <input
                            type="radio"
                            name={`address_type_${index}`}
                            value={option.value}
                            checked={addr.address_type === option.value}
                            onChange={() => setAddressField(index, 'address_type', option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="cc-mgmt-row">
                    <label>Set as Default Address</label>
                    <input
                      type="checkbox"
                      checked={addr.is_default}
                      onChange={(e) => setAddressField(index, 'is_default', e.target.checked)}
                    />
                  </div>
                </div>
              ))}

              <div className="pm-add-address-wrap">
                <button type="button" className="btn-outline btn-sm" onClick={handleAddAddress}>(+) Add Address</button>
              </div>

              <h3 className="pm-section-title">Other Data</h3>

              <div className="cc-mgmt-row">
                <label htmlFor="pm-insurance-id">Insurance ID</label>
                <input id="pm-insurance-id" type="text" value={form.insurance_id} onChange={(e) => setField('insurance_id', e.target.value)} />
              </div>
              <div className="cc-mgmt-row">
                <label htmlFor="pm-insurance-co">Insurance Company Name</label>
                <input id="pm-insurance-co" type="text" value={form.insurance_company} onChange={(e) => setField('insurance_company', e.target.value)} />
              </div>
              <div className="cc-mgmt-row">
                <label htmlFor="pm-ins-start">Start Date</label>
                <input id="pm-ins-start" type="text" value={form.insurance_start_date} onChange={(e) => setField('insurance_start_date', e.target.value)} placeholder="dd/mm/yyyy" />
              </div>
              <div className="cc-mgmt-row">
                <label htmlFor="pm-ins-expiry">Expiry Date</label>
                <input id="pm-ins-expiry" type="text" value={form.insurance_expiry_date} onChange={(e) => setField('insurance_expiry_date', e.target.value)} placeholder="dd/mm/yyyy" />
              </div>
              <div className="cc-mgmt-row">
                <label htmlFor="pm-other-comment">Comment</label>
                <textarea id="pm-other-comment" rows={3} value={form.other_data_comment} onChange={(e) => setField('other_data_comment', e.target.value)} />
              </div>

              {error && <p className="change-password-message error" role="alert">{error}</p>}
              {success && <p className="change-password-message success" role="status">{success}</p>}

              <div className="cc-mgmt-actions">
                <button type="button" className="btn-blue btn-sm" onClick={() => handleSave(true)} disabled={submitting}>Add</button>
                <button type="button" className="btn-blue btn-sm" onClick={() => handleSave(false)} disabled={submitting || !editingId}>Update</button>
                <button type="button" className="btn-outline btn-sm" onClick={handleDelete} disabled={submitting || !editingId}>Delete</button>
                <button type="button" className="btn-outline btn-sm" onClick={handleCancel} disabled={submitting}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

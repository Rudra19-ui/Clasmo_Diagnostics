import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const defaultForm = () => ({
  sms_to_patient: false,
  sms_to_doctor: false,
  sms_to_lab: false,
  sms_to_lab_mobile: '',
  sms_to_other: false,
  sms_to_other_mobile: '',
  sms_to_pathologist_appointment: false,
  sms_to_pathologist_mobile: '',
  sms_to_collection_center: false,
  sms_to_affiliation: false,
  email_to_patient: true,
  email_to_doctor: true,
  email_to_lab: true,
  email_to_lab_address: '',
  email_to_collection_center: true,
  email_to_affiliation: false,
  whatsapp_to_patient: true,
  whatsapp_to_doctor: false,
  whatsapp_to_affiliation: false,
  whatsapp_to_autorelease: false,
  lab_code_prefix: '1',
  lab_code_start: '69',
  lab_code_frequency: 'daily',
  lab_code_auto_increment: true,
  report_show_header: true,
  report_show_footer: true,
  allow_print_without_approve: false,
  reprint_report_roles: 'Admin,Pathologis',
  test_auto_approval: false,
  auto_registration_transfer: false,
  mera_batuva_token_id: '',
  mera_batuva_instance_id: '',
  lab_qr_code_url: '',
});

function ConfigRow({ label, col2, col3 }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{col2 || null}</td>
      <td>{col3 || null}</td>
    </tr>
  );
}

export default function LabConfiguration() {
  const [form, setForm] = useState(defaultForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrSuccess, setQrSuccess] = useState('');
  const qrInputRef = useRef(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLabConfiguration();
      setForm({ ...defaultForm(), ...data });
    } catch (err) {
      setError(err.message || 'Unable to load lab configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const { lab_qr_code_url, id, updated_at, ...payload } = form;
      const updated = await api.updateLabConfiguration(payload);
      setForm({ ...defaultForm(), ...updated });
      setSuccess('Lab configuration saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save lab configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQrSave = async () => {
    const file = qrInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a QR code image file first.');
      return;
    }
    setQrSubmitting(true);
    setError('');
    setQrSuccess('');
    try {
      const formData = new FormData();
      formData.append('lab_qr_code', file);
      const updated = await api.uploadLabQrCode(formData);
      setForm((prev) => ({ ...prev, lab_qr_code_url: updated.lab_qr_code_url }));
      setQrSuccess('Lab QR code saved successfully.');
      if (qrInputRef.current) qrInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Unable to upload QR code.');
    } finally {
      setQrSubmitting(false);
    }
  };

  const checkbox = (key) => (
    <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setField(key, e.target.checked)} />
  );

  const textInput = (key, props = {}) => (
    <input type="text" value={form[key] || ''} onChange={(e) => setField(key, e.target.value)} {...props} />
  );

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Lab Configuration</li>
          </ul>
        </nav>

        <section className="cc-mgmt-panel lab-config-panel">
          <h2 className="change-password-title">Lab Configuration</h2>

          {loading ? (
            <p className="empty-msg">Loading...</p>
          ) : (
            <form className="lab-config-form" onSubmit={(event) => event.preventDefault()}>
              <div className="data-table-wrap lab-config-table-wrap">
                <table className="lab-config-table">
                  <tbody>
                    <ConfigRow label="Send SMS to Patient Mobile no." col2={checkbox('sms_to_patient')} />
                    <ConfigRow label="Send SMS to Doctor Mobile no." col2={checkbox('sms_to_doctor')} />
                    <ConfigRow
                      label="Send SMS to Lab Mobile no."
                      col2={checkbox('sms_to_lab')}
                      col3={textInput('sms_to_lab_mobile')}
                    />
                    <ConfigRow
                      label="Send SMS to Other Mobile no."
                      col2={checkbox('sms_to_other')}
                      col3={textInput('sms_to_other_mobile')}
                    />
                    <ConfigRow
                      label="Send SMS to Pathologist/Doctor on Appointment"
                      col2={checkbox('sms_to_pathologist_appointment')}
                      col3={textInput('sms_to_pathologist_mobile')}
                    />
                    <ConfigRow label="Send SMS to Collection Center" col2={checkbox('sms_to_collection_center')} />
                    <ConfigRow label="Send SMS to Affiliation" col2={checkbox('sms_to_affiliation')} />

                    <ConfigRow label="Email To Patient EmailID" col2={checkbox('email_to_patient')} />
                    <ConfigRow label="Email To Doctor EmailID" col2={checkbox('email_to_doctor')} />
                    <ConfigRow
                      label="Email To Lab EmailID"
                      col2={checkbox('email_to_lab')}
                      col3={textInput('email_to_lab_address', { type: 'email' })}
                    />
                    <ConfigRow label="Email To Collection Center" col2={checkbox('email_to_collection_center')} />
                    <ConfigRow label="Email To Affiliation" col2={checkbox('email_to_affiliation')} />

                    <ConfigRow label="WhatsApp To Patient" col2={checkbox('whatsapp_to_patient')} />
                    <ConfigRow label="WhatsApp To Doctor" col2={checkbox('whatsapp_to_doctor')} />
                    <ConfigRow label="WhatsApp To Affiliation" col2={checkbox('whatsapp_to_affiliation')} />
                    <ConfigRow label="WhatsApp To Autorelease" col2={checkbox('whatsapp_to_autorelease')} />

                    <ConfigRow
                      label="Lab Code"
                      col2={(
                        <div className="lab-config-inline">
                          {textInput('lab_code_prefix', { className: 'lab-config-short' })}
                          {textInput('lab_code_start', { className: 'lab-config-short' })}
                        </div>
                      )}
                      col3={(
                        <div className="lab-config-inline">
                          <select
                            value={form.lab_code_frequency}
                            onChange={(e) => setField('lab_code_frequency', e.target.value)}
                            disabled={!form.lab_code_auto_increment}
                          >
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <label className="cc-mgmt-checkbox-inline">
                            <input
                              type="checkbox"
                              checked={form.lab_code_auto_increment}
                              onChange={(e) => setField('lab_code_auto_increment', e.target.checked)}
                            />
                            Auto Increment
                          </label>
                        </div>
                      )}
                    />

                    <ConfigRow
                      label="Report Setting"
                      col3={(
                        <div className="lab-config-inline">
                          <label className="cc-mgmt-checkbox-inline">
                            <input
                              type="checkbox"
                              checked={form.report_show_header}
                              onChange={(e) => setField('report_show_header', e.target.checked)}
                            />
                            Show Header
                          </label>
                          <label className="cc-mgmt-checkbox-inline">
                            <input
                              type="checkbox"
                              checked={form.report_show_footer}
                              onChange={(e) => setField('report_show_footer', e.target.checked)}
                            />
                            Show Footer
                          </label>
                        </div>
                      )}
                    />

                    <ConfigRow
                      label="Allow Report Printing Without Approve"
                      col3={checkbox('allow_print_without_approve')}
                    />
                    <ConfigRow
                      label="User Role To Reprint Report"
                      col3={textInput('reprint_report_roles')}
                    />
                    <ConfigRow label="Test Auto Approval" col2={checkbox('test_auto_approval')} />
                    <ConfigRow label="Auto Registration Transfer" col2={checkbox('auto_registration_transfer')} />
                    <ConfigRow label="Mera Batuva Whatsapp TokenID" col3={textInput('mera_batuva_token_id')} />
                    <ConfigRow label="Mera Batuva Whatsapp InstanceID" col3={textInput('mera_batuva_instance_id')} />
                    <ConfigRow
                      label="Lab QR CODE"
                      col3={(
                        <div className="lab-config-qr-row">
                          <input ref={qrInputRef} type="file" accept="image/*" />
                          <button type="button" className="btn-blue btn-sm" onClick={handleQrSave} disabled={qrSubmitting}>
                            {qrSubmitting ? 'Saving...' : 'Save'}
                          </button>
                          {form.lab_qr_code_url && (
                            <a href={form.lab_qr_code_url} target="_blank" rel="noreferrer" className="lab-config-qr-link">View QR</a>
                          )}
                        </div>
                      )}
                    />
                  </tbody>
                </table>
              </div>

              {error && <p className="change-password-message error" role="alert">{error}</p>}
              {success && <p className="change-password-message success" role="status">{success}</p>}
              {qrSuccess && <p className="change-password-message success" role="status">{qrSuccess}</p>}

              <div className="cc-mgmt-actions">
                <button type="button" className="btn-blue btn-sm" onClick={handleSave} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

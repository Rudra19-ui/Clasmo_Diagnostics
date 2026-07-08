import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { printBillReceipt } from '../utils/printBillReceipt';

const DEFAULT_OPTIONS = {
  show_header: true,
  show_footer: true,
  show_header_footer: false,
  merge_attachment: true,
};

export default function SendSMSModal({
  open,
  onClose,
  registrationId,
}) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [patientName, setPatientName] = useState('');
  const [labCode, setLabCode] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [bill, setBill] = useState(null);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);

  useEffect(() => {
    if (!open || !registrationId) return undefined;

    setLoading(true);
    setError('');
    setRecipients([]);
    setBill(null);
    setOptions(DEFAULT_OPTIONS);

    api.getNotificationPrefill(registrationId)
      .then((data) => {
        setPatientName(data.patient_name || '');
        setLabCode(data.lab_code || '');
        setRecipients(data.recipients || []);
        setBill(data.bill || null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load notification details.');
      })
      .finally(() => setLoading(false));

    return undefined;
  }, [open, registrationId]);

  if (!open) return null;

  const updateRecipient = (category, field, value) => {
    setRecipients((prev) => prev.map((item) => (
      item.category === category ? { ...item, [field]: value } : item
    )));
  };

  const toggleRecipient = (category) => {
    setRecipients((prev) => prev.map((item) => (
      item.category === category ? { ...item, selected: !item.selected } : item
    )));
  };

  const updateOption = (key, value) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'show_header_footer' && value) {
        next.show_header = true;
        next.show_footer = true;
      }
      return next;
    });
  };

  const handleSend = async (action) => {
    setSending(true);
    setError('');

    try {
      const response = await api.sendNotification({
        registration_id: registrationId,
        action,
        recipients,
        options,
      });

      if (action === 'bill_receipt' && bill) {
        printBillReceipt(bill, patientName, labCode, options);
      }

      alert(response.message || 'Notification sent successfully.');
      if (action !== 'bill_receipt') {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="send-sms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-sms-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="send-sms-header">
          <h2 id="send-sms-title">Send SMS</h2>
          <button type="button" className="send-sms-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="send-sms-body">
          {loading && <p className="send-sms-message">Loading contact details…</p>}
          {error && <p className="send-sms-message send-sms-message--error">{error}</p>}

          {!loading && (
            <>
              <div className="send-sms-table-wrap">
                <table className="send-sms-table">
                  <thead>
                    <tr>
                      <th aria-label="Select" />
                      <th>Category</th>
                      <th>Mobile Number</th>
                      <th>Email-Id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((item) => (
                      <tr key={item.category}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!item.selected}
                            onChange={() => toggleRecipient(item.category)}
                          />
                        </td>
                        <td>{item.label}</td>
                        <td>
                          <input
                            type="text"
                            value={item.mobile || ''}
                            onChange={(e) => updateRecipient(item.category, 'mobile', e.target.value)}
                            placeholder="Mobile Number"
                          />
                        </td>
                        <td>
                          <input
                            type="email"
                            value={item.email || ''}
                            onChange={(e) => updateRecipient(item.category, 'email', e.target.value)}
                            placeholder="Email-Id"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="send-sms-options">
                <label>
                  <input
                    type="checkbox"
                    checked={options.show_header}
                    onChange={(e) => updateOption('show_header', e.target.checked)}
                  />
                  Show Header
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.show_footer}
                    onChange={(e) => updateOption('show_footer', e.target.checked)}
                  />
                  Show Footer
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.show_header_footer}
                    onChange={(e) => updateOption('show_header_footer', e.target.checked)}
                  />
                  Show Header and Footer
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.merge_attachment}
                    onChange={(e) => updateOption('merge_attachment', e.target.checked)}
                  />
                  Merge Attachment
                </label>
              </div>

              <div className="send-sms-actions">
                <button type="button" disabled={sending} onClick={() => handleSend('sms')}>Send SMS</button>
                <button type="button" disabled={sending} onClick={() => handleSend('email')}>Send Email</button>
                <button type="button" disabled={sending} onClick={() => handleSend('whatsapp')}>Send WhatsApp</button>
                <button type="button" disabled={sending} onClick={() => handleSend('sms_email')}>Send SMS and Email</button>
              </div>
              <div className="send-sms-actions send-sms-actions--row2">
                <button type="button" disabled={sending} onClick={() => handleSend('bill_receipt')}>Send BillReceipt</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

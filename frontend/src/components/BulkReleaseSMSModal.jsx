import { useState } from 'react';
import { api } from '../services/api';

const DEFAULT_OPTIONS = {
  sms_to_patient: false,
  sms_to_collection_center: false,
  sms_to_affiliation: false,
  show_header_on_report: false,
  email_to_patient: false,
  email_to_collection_center: false,
  email_to_affiliation: false,
  show_footer_on_report: false,
};

export default function BulkReleaseSMSModal({
  open,
  onClose,
  registrationIds = [],
  recordCount = 0,
}) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const updateOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleSend = async (action) => {
    if (!registrationIds.length) {
      alert('No registrations selected for bulk release.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await api.sendBulkNotification({
        registration_ids: registrationIds,
        action,
        options,
      });

      const skippedNote = response.skipped_count
        ? ` ${response.skipped_count} record(s) skipped (no contact details).`
        : '';
      alert(`${response.message}. Sent: ${response.sent_count}.${skippedNote}`);
      onClose();
      setOptions(DEFAULT_OPTIONS);
    } catch (err) {
      setError(err.message || 'Failed to send bulk notifications.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setError('');
    setOptions(DEFAULT_OPTIONS);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="presentation">
      <div
        className="bulk-release-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-release-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bulk-release-header">
          <h2 id="bulk-release-title">Bulk Release SMS</h2>
          <button type="button" className="bulk-release-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="bulk-release-body">
          <p className="bulk-release-count">
            {recordCount} registration{recordCount === 1 ? '' : 's'} selected for bulk release.
          </p>

          {error && <p className="bulk-release-message bulk-release-message--error">{error}</p>}

          <div className="bulk-release-options">
            <div className="bulk-release-column">
              <label>
                <input
                  type="checkbox"
                  checked={options.sms_to_patient}
                  onChange={(e) => updateOption('sms_to_patient', e.target.checked)}
                />
                SMS To Patient
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.sms_to_collection_center}
                  onChange={(e) => updateOption('sms_to_collection_center', e.target.checked)}
                />
                SMS To Collection Center
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.sms_to_affiliation}
                  onChange={(e) => updateOption('sms_to_affiliation', e.target.checked)}
                />
                SMS To Affiliation
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.show_header_on_report}
                  onChange={(e) => updateOption('show_header_on_report', e.target.checked)}
                />
                Show Header on Report
              </label>
            </div>

            <div className="bulk-release-column">
              <label>
                <input
                  type="checkbox"
                  checked={options.email_to_patient}
                  onChange={(e) => updateOption('email_to_patient', e.target.checked)}
                />
                Email To Patient
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.email_to_collection_center}
                  onChange={(e) => updateOption('email_to_collection_center', e.target.checked)}
                />
                Email To Collection Center
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.email_to_affiliation}
                  onChange={(e) => updateOption('email_to_affiliation', e.target.checked)}
                />
                Email To Affiliation
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.show_footer_on_report}
                  onChange={(e) => updateOption('show_footer_on_report', e.target.checked)}
                />
                Show Footer on Report
              </label>
            </div>
          </div>

          <div className="bulk-release-actions">
            <button type="button" disabled={sending} onClick={() => handleSend('sms')}>Send SMS</button>
            <button type="button" disabled={sending} onClick={() => handleSend('email')}>Send Email</button>
            <button type="button" disabled={sending} onClick={() => handleSend('sms_email')}>Send SMS and Email</button>
          </div>
          <div className="bulk-release-actions bulk-release-actions--row2">
            <button type="button" disabled={sending} onClick={() => handleSend('whatsapp')}>Send WhatsApp</button>
            <button type="button" disabled={sending} onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

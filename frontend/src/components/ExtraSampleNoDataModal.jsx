import { useState } from 'react';
import { useExtraSamples } from '../context/ExtraSampleContext';

export default function ExtraSampleNoDataModal({ barcode, onClose }) {
  const { addSample } = useExtraSamples();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  if (!barcode) return null;

  const handleAdd = async () => {
    setAdding(true);
    setError('');
    try {
      await addSample(barcode);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not add extra sample.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="modal-overlay extra-sample-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="extra-sample-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="extra-sample-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="extra-sample-modal-header">
          <h2 id="extra-sample-modal-title">No data found</h2>
          <button type="button" className="extra-sample-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="extra-sample-modal-body">
          <p>
            No patient entry is linked to barcode
            {' '}
            <strong>{barcode}</strong>
            .
          </p>
          {error && <p className="extra-sample-modal-error">{error}</p>}
        </div>
        <footer className="extra-sample-modal-actions">
          <button type="button" className="extra-sample-modal-btn" onClick={onClose} disabled={adding}>
            Cancel
          </button>
          <button
            type="button"
            className="extra-sample-modal-btn extra-sample-modal-btn--primary"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? 'Adding…' : 'Add in Extra Sample'}
          </button>
        </footer>
      </div>
    </div>
  );
}

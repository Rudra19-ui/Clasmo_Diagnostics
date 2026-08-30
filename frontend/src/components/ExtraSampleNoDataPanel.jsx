import { useState } from 'react';
import { useExtraSamples } from '../context/ExtraSampleContext';

export default function ExtraSampleNoDataPanel({
  barcode,
  onDismiss,
  onAdded,
  className = '',
}) {
  const { addSample, canUseExtraSamples } = useExtraSamples();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  if (!barcode) return null;

  const handleAdd = async () => {
    if (!canUseExtraSamples) {
      setError('Your account cannot add extra samples.');
      return;
    }

    setAdding(true);
    setError('');
    try {
      await addSample(barcode);
      onAdded?.(barcode);
      onDismiss?.();
    } catch (err) {
      setError(err.message || 'Could not add extra sample.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={`scan-no-data-panel ${className}`.trim()} role="status">
      <p className="scan-no-data-title">No data found</p>
      <p className="scan-no-data-text">
        No patient entry is linked to barcode
        {' '}
        <strong>{barcode}</strong>
        .
      </p>
      {error && <p className="scan-no-data-error">{error}</p>}
      <div className="scan-no-data-actions">
        <button
          type="button"
          className="extra-sample-modal-btn extra-sample-modal-btn--primary"
          onClick={handleAdd}
          disabled={adding || !canUseExtraSamples}
        >
          {adding ? 'Adding…' : 'Add in Extra Sample'}
        </button>
        {onDismiss && (
          <button type="button" className="extra-sample-modal-btn" onClick={onDismiss} disabled={adding}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

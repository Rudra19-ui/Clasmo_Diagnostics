export default function TestBillModal({
  open,
  onClose,
  tests,
  subTotal,
  discount,
  charges,
  visitingCharges,
  netAmount,
  paid,
  balance,
  onSave,
  onTestResult,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="test-bill-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-bill-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="test-bill-header">
          <h2 id="test-bill-title">Test Bill</h2>
          <button type="button" className="test-bill-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="test-bill-body">
          <div className="test-bill-list">
            {tests.map((test) => (
              <div key={test.id} className="test-bill-row">
                <span className="test-bill-name">{test.name}</span>
                <span className="test-bill-price">{Number(test.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="test-bill-summary">
            <div className="test-bill-summary-row">
              <span>Sub Total</span>
              <strong>{Number(subTotal).toFixed(2)}</strong>
            </div>
            <div className="test-bill-summary-row">
              <span>Discount</span>
              <strong>{Number(discount).toFixed(2)}</strong>
            </div>
            <div className="test-bill-summary-row">
              <span>Charges</span>
              <strong>{Number(charges).toFixed(2)}</strong>
            </div>
            <div className="test-bill-summary-row">
              <span>Visiting Charges</span>
              <strong>{Number(visitingCharges).toFixed(2)}</strong>
            </div>
            <div className="test-bill-summary-row">
              <span>Net Amount</span>
              <strong>{Number(netAmount).toFixed(2)}</strong>
            </div>
            <div className="test-bill-summary-row">
              <span>Paid</span>
              <strong>{Number(paid).toFixed(2)}</strong>
            </div>
            <div className="test-bill-summary-row">
              <span>Balance</span>
              <strong>{Number(balance).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className="test-bill-actions">
          <button type="button" onClick={onSave}>Save</button>
          <button type="button" onClick={onTestResult}>Test Result</button>
          <button type="button" onClick={() => window.print()}>Receipt</button>
          <button type="button" onClick={() => window.print()}>Receipt&amp;JobSheet</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

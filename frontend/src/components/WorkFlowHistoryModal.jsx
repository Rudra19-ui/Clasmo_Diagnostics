function formatActionDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

export default function WorkFlowHistoryModal({ open, onClose, data, loading, error }) {
  if (!open) return null;

  const events = data?.events || [];
  const tests = data?.tests || [];

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="workflow-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="workflow-history-header">
          <h2 id="workflow-history-title">Work Flow History</h2>
          <button type="button" className="workflow-history-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="workflow-history-body">
          {loading && <p className="workflow-history-message">Loading workflow history…</p>}
          {error && !loading && <p className="workflow-history-message workflow-history-message--error">{error}</p>}

          {!loading && !error && (
            <>
              <div className="workflow-history-table-wrap">
                <table className="workflow-history-table">
                  <thead>
                    <tr>
                      <th>Action By</th>
                      <th>Action Taken</th>
                      <th>Action on Date Time</th>
                      <th>Comment</th>
                      <th>Update History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="workflow-history-empty">No workflow history found.</td>
                      </tr>
                    ) : (
                      events.map((event, index) => (
                        <tr key={`${event.action_taken}-${index}`}>
                          <td>{event.action_by || '—'}</td>
                          <td>{event.action_taken || '—'}</td>
                          <td>{formatActionDate(event.action_on)}</td>
                          <td>{event.comment || ''}</td>
                          <td>{event.update_history || ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="workflow-test-history">
                <h3>Test Level History :</h3>
                {tests.length === 0 ? (
                  <p className="workflow-history-message">No tests found for this registration.</p>
                ) : (
                  <div className="workflow-test-list">
                    {tests.map((test) => (
                      <div key={test} className="workflow-test-item">{test}</div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

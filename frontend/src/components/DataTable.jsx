export default function DataTable({ rows = [] }) {
  return (
    <div className="data-table-wrap">
      <div className="table-toolbar">
        <button type="button" className="table-menu" title="Table options">☰</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Lab Code</th>
            <th>Patient Name</th>
            <th>Test</th>
            <th>Reg. Date</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan="6" className="empty-msg">No records found. Try Search.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.lab_code}>
                <td>{row.lab_code}</td>
                <td>{row.patient_name}</td>
                <td>{row.test}</td>
                <td>{row.date}</td>
                <td><span className="badge-status">{row.status}</span></td>
                <td>₹{row.amount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

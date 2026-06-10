const DEFAULT_COLUMNS = [
  { key: 'lab_code', label: 'Lab Code' },
  { key: 'patient_name', label: 'Patient Name' },
  { key: 'test', label: 'Test' },
  { key: 'date', label: 'Reg. Date' },
  { key: 'status', label: 'Status', render: (row) => <span className="badge-status">{row.status}</span> },
  { key: 'amount', label: 'Amount', render: (row) => `₹${row.amount}` },
];

export default function DataTable({ rows = [], columns = DEFAULT_COLUMNS }) {
  return (
    <div className="data-table-wrap">
      <div className="table-toolbar">
        <button type="button" className="table-menu" title="Table options">☰</button>
      </div>

      <table className="data-table data-table-desktop">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length} className="empty-msg">No records found. Try Search.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.lab_code || row.id}>
                {columns.map((column) => (
                  <td key={column.key} data-label={column.label}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="data-table-cards" aria-label="Search results cards">
        {!rows.length ? (
          <p className="empty-msg">No records found. Try Search.</p>
        ) : (
          rows.map((row) => (
            <article className="data-table-card" key={row.lab_code || row.id}>
              {columns.map((column) => (
                <div className="data-table-card-row" key={column.key}>
                  <span className="data-table-card-label">{column.label}</span>
                  <span className="data-table-card-value">
                    {column.render ? column.render(row) : row[column.key]}
                  </span>
                </div>
              ))}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'All', icon: '📋', label: 'All' },
  { id: 'Registered', icon: '✏', label: 'Registrations & Collection' },
  { id: 'Result Ready', icon: '📄', label: 'Results & Authorization' },
  { id: 'Printed', icon: '🖨', label: 'Print & Release' },
  { id: 'Collection', icon: '⏱', label: 'Pending TAT' },
];

export default function StatusTabs({ activeStatus, onChange }) {
  return (
    <ul className="status-tabs" role="tablist">
      <li className="status-level">
        <label>Status Level</label>
        <select><option>Default</option></select>
      </li>
      {TABS.map((tab) => (
        <li
          key={tab.id}
          role="tab"
          className={activeStatus === tab.id ? 'active' : ''}
          onClick={() => onChange(tab.id)}
          style={{ cursor: 'pointer' }}
        >
          <span className="tab-icon">{tab.icon}</span> {tab.label}
        </li>
      ))}
    </ul>
  );
}

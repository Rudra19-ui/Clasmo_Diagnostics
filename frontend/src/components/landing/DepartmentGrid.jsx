const DEPARTMENTS = [
  { id: 'clinical-pathology', label: 'Clinical Pathology', accent: '#0ea5e9', bg: '#e0f2fe' },
  { id: 'haematology', label: 'Haematology', accent: '#dc2626', bg: '#fee2e2' },
  { id: 'clinical-biochemistry', label: 'Clinical Biochemistry', accent: '#2563eb', bg: '#dbeafe' },
  { id: 'histopathology', label: 'Histopathology', accent: '#7c3aed', bg: '#ede9fe' },
  { id: 'microbiology', label: 'Microbiology', accent: '#059669', bg: '#d1fae5' },
  { id: 'serology', label: 'Serology', accent: '#d97706', bg: '#ffedd5' },
  { id: 'biochemical-genetics', label: 'Biochemical Genetics', accent: '#4f46e5', bg: '#e0e7ff' },
  { id: 'cytogenetics', label: 'Cytogenetics', accent: '#db2777', bg: '#fce7f3' },
  { id: 'molecular-diagnostics', label: 'Molecular Diagnostics', accent: '#0891b2', bg: '#cffafe' },
];

function DepartmentIcon({ id, accent }) {
  const stroke = accent;
  const fill = accent;

  switch (id) {
    case 'clinical-pathology':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <rect x="24" y="10" width="16" height="44" rx="2" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <rect x="26" y="18" width="4" height="6" fill={fill} opacity="0.85" />
          <rect x="32" y="24" width="4" height="6" fill={fill} opacity="0.65" />
          <rect x="26" y="30" width="4" height="6" fill={fill} opacity="0.85" />
          <rect x="32" y="36" width="4" height="6" fill={fill} opacity="0.65" />
          <path d="M20 54h24" stroke={stroke} strokeWidth="2.5" />
        </svg>
      );
    case 'haematology':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <circle cx="20" cy="32" r="8" fill={fill} opacity="0.9" />
          <circle cx="36" cy="20" r="7" fill={fill} opacity="0.55" />
          <circle cx="44" cy="38" r="9" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <line x1="27" y1="28" x2="32" y2="24" stroke={stroke} strokeWidth="2.5" />
          <line x1="28" y1="34" x2="36" y2="34" stroke={stroke} strokeWidth="2.5" />
        </svg>
      );
    case 'clinical-biochemistry':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <path d="M22 18 L34 18 L42 52 L14 52 Z" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <path d="M18 52 H38" stroke={stroke} strokeWidth="2.5" />
          <rect x="24" y="34" width="16" height="12" rx="2" fill={fill} opacity="0.55" />
        </svg>
      );
    case 'histopathology':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <polygon points="32,8 44,18 44,34 32,44 20,34 20,18" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <polygon points="32,20 38,26 38,34 32,40 26,34 26,26" fill={fill} opacity="0.45" />
          <circle cx="32" cy="30" r="4" fill={fill} />
        </svg>
      );
    case 'microbiology':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <ellipse cx="32" cy="36" rx="22" ry="14" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <circle cx="24" cy="34" r="4" fill={fill} opacity="0.85" />
          <circle cx="34" cy="30" r="3" fill={fill} opacity="0.55" />
          <circle cx="40" cy="38" r="3.5" fill={fill} opacity="0.85" />
          <circle cx="28" cy="40" r="2.5" fill={fill} opacity="0.55" />
        </svg>
      );
    case 'serology':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <rect x="26" y="12" width="12" height="40" rx="6" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <rect x="28" y="28" width="8" height="18" rx="4" fill={fill} opacity="0.55" />
          <ellipse cx="32" cy="12" rx="6" ry="3" fill="#fff" stroke={stroke} strokeWidth="2.5" />
        </svg>
      );
    case 'biochemical-genetics':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <path d="M20 14 C28 22, 28 42, 20 50" fill="none" stroke={stroke} strokeWidth="3" />
          <path d="M44 14 C36 22, 36 42, 44 50" fill="none" stroke={stroke} strokeWidth="3" />
          <line x1="24" y1="24" x2="40" y2="30" stroke={fill} strokeWidth="2.5" />
          <line x1="24" y1="34" x2="40" y2="40" stroke={fill} strokeWidth="2.5" />
          <circle cx="46" cy="46" r="10" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <line x1="43" y1="46" x2="49" y2="46" stroke={stroke} strokeWidth="2.5" />
          <line x1="46" y1="43" x2="46" y2="49" stroke={stroke} strokeWidth="2.5" />
        </svg>
      );
    case 'cytogenetics':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <ellipse cx="22" cy="32" rx="10" ry="14" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <ellipse cx="42" cy="28" rx="9" ry="12" fill={fill} opacity="0.45" />
          <ellipse cx="36" cy="42" rx="8" ry="11" fill={fill} opacity="0.75" />
        </svg>
      );
    case 'molecular-diagnostics':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="10" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <line x1="32" y1="8" x2="32" y2="22" stroke={stroke} strokeWidth="2.5" />
          <line x1="32" y1="42" x2="32" y2="56" stroke={stroke} strokeWidth="2.5" />
          <line x1="8" y1="32" x2="22" y2="32" stroke={stroke} strokeWidth="2.5" />
          <line x1="42" y1="32" x2="56" y2="32" stroke={stroke} strokeWidth="2.5" />
          <circle cx="32" cy="8" r="4" fill={fill} />
          <circle cx="32" cy="56" r="4" fill={fill} />
          <circle cx="8" cy="32" r="4" fill={fill} />
          <circle cx="56" cy="32" r="4" fill={fill} />
        </svg>
      );
    default:
      return null;
  }
}

export default function DepartmentGrid() {
  return (
    <div className="landing-department-panel">
      <ul className="landing-department-grid">
        {DEPARTMENTS.map((item) => (
          <li
            key={item.id}
            className="landing-department-item"
            style={{ '--dept-accent': item.accent, '--dept-bg': item.bg }}
          >
            <span className="landing-department-icon">
              <DepartmentIcon id={item.id} accent={item.accent} />
            </span>
            <span className="landing-department-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

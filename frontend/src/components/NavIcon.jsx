const ICON_COLORS = {
  search: '#4a90e2',
  registration: '#43a047',
  'test-result': '#e53935',
  clinical: '#00acc1',
  administration: '#7e57c2',
  'user-signup': '#5c6bc0',
  'enquire-box': '#00838f',
  reports: '#8e24aa',
  'device-request': '#fb8c00',
  changelab: '#fbc02d',
  dashboard: '#c9a66b',
  profile: '#4a90e2',
  'elab-pay': '#29b6f6',
  help: '#9e9e9e',
};

export default function NavIcon({ id }) {
  const color = ICON_COLORS[id] || '#90caf9';

  const icons = {
    search: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth="2.2" />
        <path d="M16 16l5 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
    registration: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="4" width="14" height="16" rx="2" stroke={color} strokeWidth="2" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 15l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    'test-result': (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke={color} strokeWidth="2" />
        <path d="M8 15l3-4 3 2 4-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    clinical: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth="2" />
        <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
    administration: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="2" />
        <path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M17 6l2-2M19 10h2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    'user-signup': (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="3" stroke={color} strokeWidth="2" />
        <path d="M4 19c0-3 2.5-5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M16 11v6M13 14h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'enquire-box': (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="6" width="16" height="13" rx="2" stroke={color} strokeWidth="2" />
        <path d="M8 10h8M8 14h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    reports: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 5h10l4 4v11a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={color} strokeWidth="2" />
        <path d="M16 5v4h4M8 12h8M8 16h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    'device-request': (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="8" width="16" height="11" rx="2" stroke={color} strokeWidth="2" />
        <path d="M9 8V6a3 3 0 016 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12h16" stroke={color} strokeWidth="1.8" />
      </svg>
    ),
    changelab: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5a7 7 0 107 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M12 12l4-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.8" fill={color} />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="2" />
        <path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'elab-pay': (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" />
        <path d="M3 10h18" stroke={color} strokeWidth="2" />
        <path d="M7 15h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    help: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" />
        <path d="M9.5 9a2.6 2.6 0 014.7 1c0 1.7-2.2 1.8-2.2 3.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16.2" r="1" fill={color} />
      </svg>
    ),
  };

  return (
    <span className="nav-item-icon" style={{ '--nav-icon-color': color }}>
      {icons[id] || icons.help}
    </span>
  );
}

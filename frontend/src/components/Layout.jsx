import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import AdminSidebar from './AdminSidebar';
import FranchiseSidebar from './FranchiseSidebar';
import LandingBrandTitle from './landing/LandingBrandTitle';
import { getSidebarNavForRole } from '../utils/franchiseNav';
import { ROLE_LABELS } from '../utils/roles';

function formatUserDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
];

function readStoredLanguage() {
  return localStorage.getItem('clasmo_ui_lang') || 'en';
}

export default function Layout({ activePage, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { navOpen, openMenu, setOpenMenu, closeNav, toggleNav } = useNav();
  const [globalQuery, setGlobalQuery] = useState('');
  const [language, setLanguage] = useState(readStoredLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [utilityNote, setUtilityNote] = useState('');
  const languageRef = useRef(null);
  const profileRef = useRef(null);
  const isStandalonePage = activePage === 'enquire-box' || activePage === 'user-signup' || activePage === 'self-patient-query' || activePage === 'give-feedback';
  const isAdminRoute = !isStandalonePage && (activePage === 'administration' || location.pathname.startsWith('/admin/'));
  const isPathologist = user?.role === 'pathologist';

  const handleSidebarClick = useCallback((event) => {
    const link = event.target.closest('#main-navigation a[href]');
    if (link) closeNav();
  }, [closeNav]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const showUtilityNote = (message) => {
    setUtilityNote(message);
    window.setTimeout(() => setUtilityNote(''), 2500);
  };

  const handleGlobalSearch = (event) => {
    event.preventDefault();
    const query = globalQuery.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handlePayments = () => {
    navigate('/reports#outstanding');
  };

  const handleMail = () => {
    navigate('/device/message-to-lab');
  };

  const handleCalendar = () => {
    navigate('/dashboard');
  };

  const handleLanguageSelect = (code) => {
    setLanguage(code);
    localStorage.setItem('clasmo_ui_lang', code);
    document.documentElement.lang = code;
    setLanguageOpen(false);
    const label = LANGUAGE_OPTIONS.find((item) => item.code === code)?.label || code;
    showUtilityNote(`Language set to ${label}`);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!languageOpen && !profileOpen) return undefined;

    const onPointerDown = (event) => {
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setLanguageOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [languageOpen, profileOpen]);

  useEffect(() => {
    document.body.classList.toggle('nav-scroll-lock', navOpen && window.innerWidth < 1024);
    return () => document.body.classList.remove('nav-scroll-lock');
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeNav();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen, closeNav]);

  const previousLocation = useRef(`${location.pathname}${location.search}${location.hash}`);
  useEffect(() => {
    const currentLocation = `${location.pathname}${location.search}${location.hash}`;
    if (previousLocation.current === currentLocation) return;
    previousLocation.current = currentLocation;
    closeNav();
  }, [location.pathname, location.search, location.hash, closeNav]);

  const profileName = user?.display_name || user?.username || 'User';
  const profileInitial = profileName.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || '';
  const sidebarNav = getSidebarNavForRole(user?.role);

  return (
    <div className={`dashboard app-with-sidebar franchise-shell${navOpen ? ' sidebar-open' : ''}`}>
      <div
        className={`nav-drawer-overlay${navOpen ? ' open' : ''}`}
        onClick={closeNav}
        aria-hidden={!navOpen}
      />

      <aside
        id="main-navigation"
        className={`app-sidebar franchise-sidebar${navOpen ? ' nav-open' : ''}`}
        aria-label="Main navigation"
        onClick={handleSidebarClick}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <LandingBrandTitle showLogo compact variant="sidebar" />
          </div>
        </div>

        <FranchiseSidebar
          navConfig={sidebarNav}
          activePage={activePage}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          closeNav={closeNav}
          onLogout={handleLogout}
          user={user}
          roleLabel={roleLabel}
        />
      </aside>

      <div className="app-main">
        <div className="top-utility">
          <div className="top-utility-start">
            <button
              type="button"
              className="nav-toggle hamburger-btn"
              aria-expanded={navOpen}
              aria-controls="main-navigation"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={(event) => {
                event.stopPropagation();
                toggleNav();
              }}
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
            <LandingBrandTitle showLogo compact className="app-brand-header app-brand-header-compact" />
          </div>

          {!isPathologist && (
            <form className="global-search" onSubmit={handleGlobalSearch}>
              <input
                type="search"
                value={globalQuery}
                onChange={(event) => setGlobalQuery(event.target.value)}
                placeholder="Search by Name, Labcode, Mobile Number, Adhar Number"
                aria-label="Global search"
              />
            </form>
          )}

          <div className="top-utility-end">
            {utilityNote && (
              <div className="utility-note" role="status" aria-live="polite">{utilityNote}</div>
            )}
            <ul className="utility-icons">
            {!isPathologist && (
              <>
                <li>
                  <button type="button" className="icon-btn" title="Payments & outstanding" onClick={handlePayments}>
                    $
                  </button>
                </li>
                <li>
                  <button type="button" className="icon-btn" title="Message to lab" onClick={handleMail}>
                    ✉
                  </button>
                </li>
                <li className="utility-language-wrap" ref={languageRef}>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Language"
                    aria-expanded={languageOpen}
                    aria-haspopup="listbox"
                    onClick={() => setLanguageOpen((open) => !open)}
                  >
                    🌐
                  </button>
                  {languageOpen && (
                    <ul className="utility-language-menu" role="listbox" aria-label="Select language">
                      {LANGUAGE_OPTIONS.map((option) => (
                        <li key={option.code}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={language === option.code}
                            className={language === option.code ? 'active' : ''}
                            onClick={() => handleLanguageSelect(option.code)}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                <li>
                  <button type="button" className="icon-btn" title="Dashboard & calendar" onClick={handleCalendar}>
                    📅
                  </button>
                </li>
              </>
            )}
            <li className="utility-profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="icon-btn utility-profile-btn"
                title="Profile"
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="utility-profile-initial" aria-hidden="true">{profileInitial}</span>
              </button>
              {profileOpen && (
                <div className="utility-profile-panel" role="dialog" aria-label="Logged in user profile">
                  <div className="utility-profile-panel-header">
                    <div className="utility-profile-avatar" aria-hidden="true">{profileInitial}</div>
                    <div>
                      <p className="utility-profile-title">Logged in as</p>
                      <p className="utility-profile-name">{profileName}</p>
                    </div>
                  </div>
                  <dl className="utility-profile-details">
                    <div>
                      <dt>Full Name</dt>
                      <dd>{user?.display_name || '—'}</dd>
                    </div>
                    <div>
                      <dt>Username</dt>
                      <dd>{user?.username || '—'}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{ROLE_LABELS[user?.role] || user?.role || '—'}</dd>
                    </div>
                    <div>
                      <dt>Mobile</dt>
                      <dd>{user?.mobile || '—'}</dd>
                    </div>
                    <div>
                      <dt>Lab Code</dt>
                      <dd>{user?.lab_code || '—'}</dd>
                    </div>
                    <div>
                      <dt>Last Login</dt>
                      <dd>{formatUserDateTime(user?.last_login)}</dd>
                    </div>
                    <div>
                      <dt>Account Status</dt>
                      <dd>{user?.is_active === false ? 'Inactive' : 'Active'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </li>
            <li>
              <button type="button" className="icon-btn" onClick={handleLogout} title="Logout">
                ⏻
              </button>
            </li>
          </ul>
          </div>
        </div>
        {isAdminRoute ? (
          <div className="admin-page-shell">
            <AdminSidebar />
            <div className="admin-page-content">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

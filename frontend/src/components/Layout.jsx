import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavIcon from './NavIcon';
import AdminSidebar from './AdminSidebar';
import { NAV } from '../utils/nav';

const PHONES = '+91-8975273383 / +91-9146188320';

function canSee(item, user) {
  if (item.adminOnly && user?.role !== 'admin') return false;
  if (item.roles?.length && !item.roles.includes(user?.role)) return false;
  return true;
}

function SidebarLink({ item, isActive, onClick, asButton, showCaret, caretOpen }) {
  const className = `sidebar-nav-link${isActive ? ' is-active' : ''}`;
  const content = (
    <>
      <NavIcon id={item.id} />
      <span className="sidebar-nav-label">{item.label}</span>
      {showCaret && <span className={`submenu-caret${caretOpen ? ' open' : ''}`} aria-hidden>▾</span>}
    </>
  );

  if (asButton) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link to={item.href} className={className} onClick={onClick}>
      {content}
    </Link>
  );
}

export default function Layout({ activePage, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const isAdminRoute = activePage === 'administration' || location.pathname.startsWith('/admin/');

  const closeNav = useCallback(() => {
    setNavOpen(false);
    setOpenMenu(null);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    document.body.classList.toggle('nav-scroll-lock', navOpen);
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

  const navItems = NAV.filter((item) => canSee(item, user));

  return (
    <div className="dashboard app-with-sidebar">
      <div
        className={`nav-drawer-overlay${navOpen ? ' open' : ''}`}
        onClick={closeNav}
        aria-hidden={!navOpen}
      />

      <aside
        id="main-navigation"
        className={`app-sidebar${navOpen ? ' nav-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-title">CLASMO</span>
            <span className="sidebar-brand-sub">Diagnostics Pvt. Ltd.</span>
          </div>
          <button
            type="button"
            className="nav-close"
            aria-label="Close navigation menu"
            onClick={closeNav}
          >
            ✕
          </button>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const visibleChildren = item.children?.filter((c) => canSee(c, user)) || [];
            const isActive = item.id === activePage || (item.id === 'administration' && isAdminRoute);

            if (item.megaMenu && item.id === 'administration') {
              return (
                <li key={item.id} className={isActive ? 'active' : ''}>
                  <SidebarLink item={item} isActive={isActive} onClick={closeNav} />
                </li>
              );
            }

            if (visibleChildren.length) {
              return (
                <li
                  key={item.id}
                  className={`has-submenu${isActive ? ' active' : ''}${openMenu === item.id ? ' open' : ''}`}
                >
                  <SidebarLink
                    item={item}
                    isActive={isActive}
                    asButton
                    showCaret
                    caretOpen={openMenu === item.id}
                    onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                  />
                  <ul className="submenu">
                    {visibleChildren.map((child) => (
                      <li key={child.label}>
                        <Link
                          to={child.href}
                          className={child.active ? 'active' : ''}
                          onClick={closeNav}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }

            return (
              <li key={item.id} className={isActive ? 'active' : ''}>
                <SidebarLink item={item} isActive={isActive} onClick={closeNav} />
              </li>
            );
          })}
        </ul>

        <div className="nav-phones">{PHONES}</div>
      </aside>

      <div className="app-main">
        <div className="top-utility">
          <button
            type="button"
            className="nav-toggle hamburger-btn"
            aria-expanded={navOpen}
            aria-controls="main-navigation"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
          <div className="global-search">
            <input type="search" placeholder="Search by Name, Labcode, Mobile Number, Adhar Number" aria-label="Global search" />
          </div>
          <div className="brand-title">
            CLASMO DIAGNOSTICS PVT.LTD.{' '}
            <span className="brand-sub">(CLASMO Diagnostics pvt.ltd) — {user?.lab_code}</span>
          </div>
          <ul className="utility-icons">
            <li><span className="util-label">{user?.display_name}</span></li>
            <li><button type="button" className="icon-btn" title="Payments">$</button></li>
            <li><button type="button" className="icon-btn" title="Mail">✉</button></li>
            <li><button type="button" className="icon-btn badge" title="Notifications">🔔<span>4</span></button></li>
            <li><button type="button" className="icon-btn" title="Language">🌐</button></li>
            <li><button type="button" className="icon-btn" title="Calendar">📅</button></li>
            <li><button type="button" className="icon-btn" onClick={handleLogout} title="Logout">⏻</button></li>
          </ul>
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

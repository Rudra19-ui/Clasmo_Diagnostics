import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavIcon from './NavIcon';
import { FRANCHISE_NAV } from '../utils/franchiseNav';

function FranchiseNavIcon({ iconId }) {
  return <NavIcon id={iconId} />;
}

function canSeeNavItem(item, role) {
  if (item.excludeRoles?.includes(role)) return false;
  if (item.roles?.length && !item.roles.includes(role)) return false;
  return true;
}

function menuIdForPath(pathname) {
  if (pathname.startsWith('/franchise/manage-reports')) return 'manage-reports';
  if (pathname.startsWith('/franchise/manage-booking')) return 'manage-booking';
  return null;
}

function NavRow({
  item,
  isActive,
  menuOpen,
  onToggle,
  onNavigate,
  onAction,
}) {
  const hasChildren = Boolean(item.children?.length);
  const className = [
    'sidebar-nav-link',
    'franchise-nav-link',
    isActive ? 'is-active' : '',
    item.accent ? 'is-accent' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      <FranchiseNavIcon iconId={item.icon || item.id} />
      <span className="sidebar-nav-label">{item.label}</span>
      {typeof item.badge === 'number' && (
        <span className={`franchise-nav-badge franchise-nav-badge--${item.badgeTone || 'danger'}`}>
          {item.badge}
        </span>
      )}
      {hasChildren && (
        <span className={`submenu-caret${menuOpen ? ' open' : ''}`} aria-hidden>
          ▾
        </span>
      )}
      {!hasChildren && !item.badge && item.icon !== 'settings' && item.icon !== 'logout' && item.icon !== 'payment' && (
        <span className="franchise-nav-chevron" aria-hidden>›</span>
      )}
    </>
  );

  if (item.action === 'logout') {
    return (
      <button type="button" className={className} onClick={() => onAction?.('logout')}>
        {content}
      </button>
    );
  }

  if (hasChildren) {
    return (
      <button
        type="button"
        className={className}
        aria-expanded={menuOpen}
        onClick={onToggle}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={item.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

export default function FranchiseSidebar({
  activePage,
  openMenu,
  setOpenMenu,
  closeNav,
  onLogout,
  user,
  roleLabel,
}) {
  const location = useLocation();

  // Auto-expand parent when entering a child route; user toggle still opens/closes freely.
  useEffect(() => {
    const menuId = menuIdForPath(location.pathname);
    if (menuId) setOpenMenu(menuId);
  }, [location.pathname, setOpenMenu]);

  const isItemActive = (item) => {
    // Parent menus: only highlight from the current route (not from open/expanded state).
    if (item.id === 'manage-booking') {
      return location.pathname.startsWith('/franchise/manage-booking');
    }
    if (item.id === 'manage-reports') {
      return location.pathname.startsWith('/franchise/manage-reports');
    }
    if (item.id === 'all-tests' && location.pathname === '/portfolio/test-list') return true;
    if (item.id === 'package-list' && location.pathname === '/portfolio/test-profile') return true;
    if (item.id === 'reports-format' && location.pathname === '/portfolio/sample-report') return true;
    if (item.children?.some((child) => location.pathname === child.href.split('#')[0])) return true;
    if (item.href && item.href !== '#logout' && location.pathname === item.href) return true;
    if (!item.children && item.id === activePage) return true;
    return false;
  };

  return (
    <>
      <div className="franchise-sidebar-user">
        <strong>{(user?.display_name || user?.username || 'User').toUpperCase()}</strong>
        <span>({roleLabel})</span>
      </div>

      <ul className="sidebar-menu franchise-sidebar-menu">
        {FRANCHISE_NAV.map((entry) => {
          if (entry.section) {
            const visibleItems = (entry.items || []).filter((item) => canSeeNavItem(item, user?.role));
            if (!visibleItems.length) return null;
            return (
              <li key={entry.section} className="franchise-nav-section">
                <div className="franchise-nav-section-title">{entry.section}</div>
                <ul>
                  {visibleItems.map((item) => {
                    const active = isItemActive(item);
                    const hasChildren = Boolean(item.children?.length);
                    const menuOpen = openMenu === item.id;

                    if (hasChildren) {
                      return (
                        <li
                          key={item.id}
                          className={`has-submenu${active ? ' active' : ''}${menuOpen ? ' open' : ''}`}
                        >
                          <NavRow
                            item={item}
                            isActive={active}
                            menuOpen={menuOpen}
                            onToggle={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                            onNavigate={closeNav}
                          />
                          <ul className="submenu">
                            {item.children.map((child) => {
                              const childActive = location.pathname === child.href.split('#')[0];
                              return (
                                <li key={child.label}>
                                  <Link
                                    to={child.href}
                                    className={childActive ? 'active' : ''}
                                    onClick={closeNav}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    }

                    return (
                      <li key={item.id} className={active ? 'active' : ''}>
                        <NavRow
                          item={item}
                          isActive={active}
                          onNavigate={closeNav}
                          onAction={(action) => {
                            if (action === 'logout') onLogout?.();
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          }

          if (!canSeeNavItem(entry, user?.role)) return null;

          const active = isItemActive(entry);
          return (
            <li key={entry.id} className={active ? 'active' : ''}>
              <NavRow item={entry} isActive={active} onNavigate={closeNav} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

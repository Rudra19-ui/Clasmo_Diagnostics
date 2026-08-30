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
  if (pathname.startsWith('/reception/')) {
    const segment = pathname.split('/')[2];
    if (segment) return segment;
  }
  if (pathname.startsWith('/franchise/manage-reports')) return 'manage-reports';
  if (pathname.startsWith('/reports-section')) return 'registration-report';
  if (pathname.startsWith('/franchise/manage-booking')) return 'manage-booking';
  if (pathname.startsWith('/entry') || pathname.startsWith('/registration') || pathname.startsWith('/barcode-link')) {
    return 'registration-entry';
  }
  if (pathname.startsWith('/test-result')) return 'registration-report';
  if (pathname.startsWith('/notifications/find-barcode') || pathname.startsWith('/franchise/find-barcode')) {
    return 'find-barcode';
  }
  if (pathname.startsWith('/notifications/clinical-history') || pathname.startsWith('/franchise/clinical-history')) {
    return 'clinical-history';
  }
  if (pathname.startsWith('/notifications/test-cancellation') || pathname.startsWith('/franchise/test-cancellation')) {
    return 'test-cancellation';
  }
  if (pathname.startsWith('/notifications/extra-sample') || pathname.startsWith('/franchise/extra-sample')
    || pathname.startsWith('/reception/extra-sample')
    || pathname.startsWith('/notifications/scan') || pathname.startsWith('/franchise/scan')) {
    return 'extra-sample';
  }
  if (pathname.startsWith('/sample-scan')) return 'sample-scan';
  if (pathname.startsWith('/hold-tests') || pathname.startsWith('/franchise/hold')) return 'hold-tests';
  if (pathname.startsWith('/sample-rejection') || pathname.startsWith('/franchise/rejection')) {
    return 'sample-rejection';
  }
  if (pathname.startsWith('/portfolio/')) return 'test-portfolio';
  if (pathname === '/reports' || pathname.startsWith('/reports#')) return 'reports';
  if (pathname.startsWith('/device/')) return 'device-request';
  return null;
}

function hrefMatchesLocation(href, location) {
  if (!href || href === '#logout') return false;
  const pathOnly = href.split('#')[0];
  if (href.includes('#')) {
    return `${location.pathname}${location.hash}` === href;
  }
  if (location.pathname === pathOnly) return true;
  return pathOnly !== '/' && location.pathname.startsWith(`${pathOnly}/`);
}

function isItemActive(item, location, activePage) {
  if (item.id === 'barcode-scan' || item.id === 'extra-sample') {
    return location.pathname.startsWith('/notifications/scan')
      || location.pathname.startsWith('/franchise/scan')
      || location.pathname.startsWith('/reception/extra-sample')
      || location.pathname.startsWith('/notifications/extra-sample')
      || location.pathname.startsWith('/franchise/extra-sample');
  }
  if (item.id === 'manage-booking') {
    return location.pathname.startsWith('/franchise/manage-booking');
  }
  if (item.id === 'manage-reports') {
    return location.pathname.startsWith('/franchise/manage-reports');
  }
  if (item.id === 'registration-entry') {
    return location.pathname.startsWith('/entry')
      || location.pathname.startsWith('/registration')
      || location.pathname.startsWith('/barcode-link');
  }
  if (item.id === 'registration-report') {
    return location.pathname.startsWith('/reports-section')
      || location.pathname.startsWith('/test-result');
  }
  if (item.id === 'administration') {
    const franchiseMainPaths = [
      '/admin/list-franchisee',
      '/admin/add-franchisee',
      '/admin/franchise-bulk-pricing',
      '/admin/franchise-transfer-pricing',
    ];
    if (franchiseMainPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
      return false;
    }
    return location.pathname.startsWith('/administration') || location.pathname.startsWith('/admin/');
  }
  if (item.id === 'list-franchisee') {
    return location.pathname.startsWith('/admin/list-franchisee');
  }
  if (item.id === 'add-franchisee') {
    return location.pathname.startsWith('/admin/add-franchisee');
  }
  if (item.id === 'franchise-bulk-pricing') {
    return location.pathname.startsWith('/admin/franchise-bulk-pricing');
  }
  if (item.id === 'franchise-transfer-pricing') {
    return location.pathname.startsWith('/admin/franchise-transfer-pricing');
  }
  if (item.id === 'test-portfolio') {
    return location.pathname.startsWith('/portfolio/');
  }
  if (item.id === 'all-tests' && location.pathname === '/portfolio/test-list') return true;
  if (item.id === 'package-list' && location.pathname === '/portfolio/test-profile') return true;
  if (item.id === 'reports-format' && location.pathname === '/portfolio/sample-report') return true;
  if (item.id === 'reports') {
    return location.pathname === '/reports' || location.pathname.startsWith('/reports#');
  }
  if (item.id === 'device-request') {
    return location.pathname.startsWith('/device/');
  }
  if (item.children?.some((child) => hrefMatchesLocation(child.href, location))) return true;
  if (item.href && hrefMatchesLocation(item.href, location)) return true;
  if (!item.children && item.id === activePage) return true;
  return false;
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
    item.action === 'logout' || item.icon === 'logout' ? 'is-logout' : '',
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
  navConfig = FRANCHISE_NAV,
  activePage,
  openMenu,
  setOpenMenu,
  closeNav,
  onLogout,
  user,
  roleLabel,
}) {
  const location = useLocation();

  useEffect(() => {
    const menuId = menuIdForPath(location.pathname);
    if (menuId) setOpenMenu(menuId);
  }, [location.pathname, setOpenMenu]);

  return (
    <>
      <div className="franchise-sidebar-user">
        <strong>{(user?.display_name || user?.username || 'User').toUpperCase()}</strong>
        <span>({roleLabel})</span>
        {user?.zone_name ? (
          <span className="franchise-sidebar-zone">Zone: {user.zone_name}</span>
        ) : null}
      </div>

      <ul className="sidebar-menu franchise-sidebar-menu">
        {navConfig.map((entry) => {
          if (entry.section) {
            const visibleItems = (entry.items || []).filter((item) => canSeeNavItem(item, user?.role));
            if (!visibleItems.length) return null;
            return (
              <li key={entry.section} className="franchise-nav-section">
                <div className="franchise-nav-section-title">{entry.section}</div>
                <ul>
                  {visibleItems.map((item) => {
                    const active = isItemActive(item, location, activePage);
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
                              const childActive = hrefMatchesLocation(child.href, location);
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

          const active = isItemActive(entry, location, activePage);
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

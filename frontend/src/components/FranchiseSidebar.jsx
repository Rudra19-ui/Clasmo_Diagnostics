import { Link, useLocation } from 'react-router-dom';
import NavIcon from './NavIcon';
import { FRANCHISE_NAV } from '../utils/franchiseNav';

function FranchiseNavIcon({ iconId }) {
  return <NavIcon id={iconId} />;
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
      <button type="button" className={className} onClick={onToggle}>
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

  const isItemActive = (item) => {
    if (item.id === activePage) return true;
    if (item.id === 'test-portfolio' && location.pathname.startsWith('/portfolio/')) return true;
    if (item.children?.some((child) => location.pathname === child.href.split('#')[0])) return true;
    if (item.href && item.href !== '#logout' && location.pathname === item.href) return true;
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
            return (
              <li key={entry.section} className="franchise-nav-section">
                <div className="franchise-nav-section-title">{entry.section}</div>
                <ul>
                  {entry.items.map((item) => {
                    const active = isItemActive(item);
                    const hasChildren = Boolean(item.children?.length);
                    const menuOpen = openMenu === item.id || (item.id === 'test-portfolio' && location.pathname.startsWith('/portfolio/'));

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

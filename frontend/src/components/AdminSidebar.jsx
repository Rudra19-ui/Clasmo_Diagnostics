import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_COLUMNS } from '../utils/adminModules';
import { useAuth } from '../context/AuthContext';
import NavIcon from './NavIcon';

function linkPath(link) {
  return link.href || `/admin/${link.slug}`;
}

function canSeeColumn(column, role) {
  if (column.roles?.length && !column.roles.includes(role)) return false;
  if (column.excludeRoles?.includes(role)) return false;
  return true;
}

function isLinkActive(path, pathname) {
  if (!path) return false;
  if (pathname === path) return true;
  return path !== '/' && pathname.startsWith(`${path}/`);
}

export default function AdminSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;

  const columns = useMemo(
    () => ADMIN_COLUMNS.filter((column) => canSeeColumn(column, role)),
    [role],
  );

  const [openSections, setOpenSections] = useState(() => {
    const initial = Object.fromEntries(ADMIN_COLUMNS.map((column) => [column.id, false]));
    const activeColumn = ADMIN_COLUMNS.find((column) =>
      column.links.some((link) => isLinkActive(linkPath(link), location.pathname)),
    );
    if (activeColumn) initial[activeColumn.id] = true;
    return initial;
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="admin-sidebar franchise-admin-sidebar" aria-label="Administration modules">
      <div className="admin-sidebar-header">
        <Link to="/administration" className="admin-sidebar-title">Administration</Link>
        <p className="admin-sidebar-subtitle">Lab settings &amp; master data</p>
      </div>

      <nav className="admin-sidebar-nav">
        {columns.map((column) => {
          const isOpen = openSections[column.id];
          const sectionHasActive = column.links.some(
            (link) => isLinkActive(linkPath(link), location.pathname),
          );
          return (
            <section
              key={column.id}
              className={`admin-sidebar-section${sectionHasActive ? ' has-active' : ''}${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="admin-sidebar-section-toggle"
                onClick={() => toggleSection(column.id)}
                aria-expanded={isOpen}
              >
                <NavIcon id="layers" />
                <span className="admin-sidebar-section-label">{column.title}</span>
                <span className={`admin-sidebar-caret${isOpen ? ' open' : ''}`} aria-hidden>▾</span>
              </button>
              {isOpen && (
                <ul className="admin-sidebar-links">
                  {column.links.map((link) => {
                    const path = linkPath(link);
                    const isActive = isLinkActive(path, location.pathname);
                    return (
                      <li key={path}>
                        <Link
                          to={path}
                          className={`admin-sidebar-link${isActive ? ' is-active' : ''}`}
                        >
                          <span className="admin-sidebar-link-label">{link.label}</span>
                          <span className="franchise-nav-chevron" aria-hidden>›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}

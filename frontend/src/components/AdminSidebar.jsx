import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_COLUMNS } from '../utils/adminModules';
import NavIcon from './NavIcon';

export default function AdminSidebar() {
  const location = useLocation();
  const [openSections, setOpenSections] = useState(() => {
    const initial = Object.fromEntries(ADMIN_COLUMNS.map((column) => [column.id, false]));
    const activeSlug = location.pathname.replace(/^\/admin\//, '');
    const activeColumn = ADMIN_COLUMNS.find((column) =>
      column.links.some((link) => link.slug === activeSlug),
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
        {ADMIN_COLUMNS.map((column) => {
          const isOpen = openSections[column.id];
          const sectionHasActive = column.links.some(
            (link) => location.pathname === `/admin/${link.slug}`,
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
                    const path = `/admin/${link.slug}`;
                    const isActive = location.pathname === path;
                    return (
                      <li key={link.slug}>
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

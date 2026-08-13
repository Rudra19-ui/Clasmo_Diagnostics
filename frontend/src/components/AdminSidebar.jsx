import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_COLUMNS } from '../utils/adminModules';

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
    <aside className="admin-sidebar" aria-label="Administration modules">
      <div className="admin-sidebar-header">
        <Link to="/administration" className="admin-sidebar-title">Administration</Link>
        <p className="admin-sidebar-subtitle">Lab settings &amp; master data</p>
      </div>

      <nav className="admin-sidebar-nav">
        {ADMIN_COLUMNS.map((column) => {
          const isOpen = openSections[column.id];
          return (
            <section key={column.id} className="admin-sidebar-section">
              <button
                type="button"
                className="admin-sidebar-section-toggle"
                onClick={() => toggleSection(column.id)}
                aria-expanded={isOpen}
              >
                <span>{column.title}</span>
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
                          <span className="admin-mega-arrow" aria-hidden>→</span>
                          {link.label}
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

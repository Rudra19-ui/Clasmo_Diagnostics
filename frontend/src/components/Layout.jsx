import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAV } from '../utils/nav';

const PHONES = '+91-8975273383 / +91-9146188320';

function canSee(item, user) {
  if (item.adminOnly && user?.role !== 'admin') return false;
  if (item.roles?.length && !item.roles.includes(user?.role)) return false;
  return true;
}

export default function Layout({ activePage, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <div id="clasmo-shell">
        <div className="top-utility">
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
        <nav className="main-menu-bar" aria-label="Main navigation">
          <ul className="main-menu">
            {NAV.filter((item) => canSee(item, user)).map((item) => {
              const visibleChildren = item.children?.filter((c) => canSee(c, user)) || [];
              const isActive = item.id === activePage;

              if (visibleChildren.length) {
                return (
                  <li
                    key={item.id}
                    className={`has-submenu${isActive ? ' active' : ''}${openMenu === item.id ? ' open' : ''}`}
                  >
                    <a
                      href={item.href || '#'}
                      onClick={(e) => {
                        if (!item.href || item.href === '#') e.preventDefault();
                        setOpenMenu(openMenu === item.id ? null : item.id);
                      }}
                    >
                      {item.label} ▾
                    </a>
                    <ul className="submenu">
                      {visibleChildren.map((child) => (
                        <li key={child.label}>
                          <Link to={child.href} className={child.active ? 'active' : ''}>{child.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              return (
                <li key={item.id} className={isActive ? 'active' : ''}>
                  <Link to={item.href}>{item.label}</Link>
                </li>
              );
            })}
          </ul>
          <div className="nav-phones">{PHONES}</div>
        </nav>
      </div>
      {children}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { ROLE_LABELS, ROLES } from '../utils/roles';

const FRANCHISE_ROLES = [
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
  ROLES.SUB_FRANCHISE,
];

const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.USER,
];

const ROLE_ORDER = [
  ROLES.ADMIN,
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
  ROLES.SUB_FRANCHISE,
  ROLES.HR,
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.USER,
];

function roleBadgeClass(role) {
  switch (role) {
    case ROLES.ADMIN: return 'role-badge role-badge-admin';
    case ROLES.TECHNICIAN: return 'role-badge role-badge-tech';
    case ROLES.PATHOLOGIST: return 'role-badge role-badge-patho';
    case ROLES.SUPER_FRANCHISEE: return 'franchise-type-badge franchise-type-badge--super_franchisee';
    case ROLES.FRANCHISEE: return 'franchise-type-badge franchise-type-badge--franchisee';
    case ROLES.SUB_FRANCHISE: return 'franchise-type-badge franchise-type-badge--sub_franchise';
    default: return 'role-badge role-badge-user';
  }
}

function UserTable({ title, rows, showPassword, showPasswords, onTogglePassword }) {
  return (
    <section className="my-business-section">
      <h3 className="role-section-title">{title} ({rows.length})</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Role</th>
              <th>Username</th>
              {showPassword && <th>Password</th>}
              <th>Mobile</th>
              <th>Parent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={showPassword ? 8 : 7} className="empty-msg">No accounts in this group.</td>
              </tr>
            )}
            {rows.map((row, index) => {
              const password = row.login_password || '';
              const revealed = Boolean(showPasswords[row.id]);
              return (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td><strong>{row.display_name || row.username}</strong></td>
                  <td>
                    <span className={roleBadgeClass(row.role)}>
                      {ROLE_LABELS[row.role] || row.role}
                    </span>
                  </td>
                  <td><code>{row.username}</code></td>
                  {showPassword && (
                    <td>
                      <div className="franchise-login-password">
                        <span>
                          {password
                            ? (revealed ? password : '••••••••')
                            : '—'}
                        </span>
                        {password ? (
                          <button
                            type="button"
                            className="btn-outline btn-sm"
                            onClick={() => onTogglePassword(row.id)}
                          >
                            {revealed ? 'Hide' : 'Show'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  )}
                  <td>{row.mobile || '—'}</td>
                  <td>
                    {row.parent_franchisee_name
                      ? `${row.parent_franchisee_name}${row.parent_franchisee_role ? ` (${ROLE_LABELS[row.parent_franchisee_role] || row.parent_franchisee_role})` : ''}`
                      : '—'}
                  </td>
                  <td>{row.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MyBusiness() {
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  const selectedZone = useMemo(
    () => zones.find((zone) => String(zone.id) === String(zoneId)) || null,
    [zones, zoneId],
  );

  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    setError('');
    try {
      const data = await api.getZones();
      const list = Array.isArray(data) ? data : [];
      setZones(list);
      if (list.length && !zoneId) {
        setZoneId(String(list[0].id));
      }
    } catch (err) {
      setError(err.message || 'Unable to load zones.');
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  }, [zoneId]);

  const loadZoneUsers = useCallback(async (id) => {
    if (!id) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    setError('');
    setShowPasswords({});
    try {
      const data = await api.getUsers({ zone_id: id, is_active: true });
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const orderDiff = (ROLE_ORDER.indexOf(a.role) + 1 || 99) - (ROLE_ORDER.indexOf(b.role) + 1 || 99);
        if (orderDiff !== 0) return orderDiff;
        return String(a.display_name || a.username).localeCompare(String(b.display_name || b.username));
      });
      setUsers(list);
    } catch (err) {
      setError(err.message || 'Unable to load zone details.');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (zoneId) loadZoneUsers(zoneId);
  }, [zoneId, loadZoneUsers]);

  const roleCounts = useMemo(() => {
    const counts = Object.fromEntries(ROLE_ORDER.map((role) => [role, 0]));
    users.forEach((row) => {
      if (counts[row.role] != null) counts[row.role] += 1;
    });
    return counts;
  }, [users]);

  const franchiseUsers = useMemo(
    () => users.filter((row) => FRANCHISE_ROLES.includes(row.role)),
    [users],
  );
  const staffUsers = useMemo(
    () => users.filter((row) => STAFF_ROLES.includes(row.role)),
    [users],
  );

  const togglePassword = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Layout activePage="my-business">
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>My Business</li>
          </ul>
        </nav>

        <div className="franchise-list-header">
          <h2 className="page-heading">My Business</h2>
          <label className="franchise-list-search my-business-zone-select">
            <span>Select Zone:</span>
            <select
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              disabled={loadingZones || !zones.length}
            >
              {!zones.length && <option value="">No zones available</option>}
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.code})
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="portfolio-intro">
          Choose a zone to view all admins, staff, and franchise accounts for that zone.
          Franchise tools (List / Add / Pricing) are under Administration.
        </p>

        {error && <p className="login-error" role="alert">{error}</p>}

        {loadingZones && <p>Loading zones…</p>}

        {!loadingZones && selectedZone && (
          <section className="content-panel my-business-panel">
            <div className="my-business-zone-header">
              <div>
                <h3>{selectedZone.name}</h3>
                <p className="muted-text">
                  Zone code:
                  {' '}
                  <code>{selectedZone.code}</code>
                  {' · '}
                  {users.length} active account{users.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="my-business-quick-links">
                <Link className="btn-outline btn-sm" to="/admin/list-franchisee">List Franchisee</Link>
                <Link className="btn-outline btn-sm" to="/admin/add-franchisee">Add Franchisee</Link>
                <Link className="btn-blue btn-sm" to="/administration">Administration</Link>
              </div>
            </div>

            <div className="my-business-counts">
              {ROLE_ORDER.map((role) => (
                <div key={role} className="my-business-count-card">
                  <span className={roleBadgeClass(role)}>{ROLE_LABELS[role] || role}</span>
                  <strong>{roleCounts[role] || 0}</strong>
                  <span className="muted-text">users</span>
                </div>
              ))}
            </div>

            {loadingUsers ? (
              <p>Loading zone details…</p>
            ) : (
              <>
                <UserTable
                  title="Franchise Accounts"
                  rows={franchiseUsers}
                  showPassword
                  showPasswords={showPasswords}
                  onTogglePassword={togglePassword}
                />
                <UserTable
                  title="Zone Admin & Staff"
                  rows={staffUsers}
                  showPassword
                  showPasswords={showPasswords}
                  onTogglePassword={togglePassword}
                />
              </>
            )}
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

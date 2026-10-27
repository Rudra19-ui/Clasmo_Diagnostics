import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

const FRANCHISE_LIST_ROLES = [
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
  ROLES.SUB_FRANCHISE,
];

const ROLE_SORT_ORDER = {
  [ROLES.SUPER_FRANCHISEE]: 0,
  [ROLES.FRANCHISEE]: 1,
  [ROLES.SUB_FRANCHISE]: 2,
};

export default function FranchiseSupremeList() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const batches = await Promise.all(
        FRANCHISE_LIST_ROLES.map((role) => api.getUsers({ role, is_active: true })),
      );
      const merged = batches.flatMap((data) => (Array.isArray(data) ? data : []));
      merged.sort((a, b) => {
        const roleDiff = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99);
        if (roleDiff !== 0) return roleDiff;
        const nameA = (a.display_name || a.username || '').toLowerCase();
        const nameB = (b.display_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setRows(merged);
    } catch (err) {
      setError(err.message || 'Unable to load franchise list.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (!q) return true;
      const hay = [
        row.display_name,
        row.username,
        row.mobile,
        row.email,
        row.zone_name,
        ROLE_LABELS[row.role],
        row.parent_franchisee_name,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, roleFilter]);

  const counts = useMemo(() => ({
    all: rows.length,
    [ROLES.SUPER_FRANCHISEE]: rows.filter((r) => r.role === ROLES.SUPER_FRANCHISEE).length,
    [ROLES.FRANCHISEE]: rows.filter((r) => r.role === ROLES.FRANCHISEE).length,
    [ROLES.SUB_FRANCHISE]: rows.filter((r) => r.role === ROLES.SUB_FRANCHISE).length,
  }), [rows]);

  return (
    <Layout activePage="list-franchisee">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>Franchise</li>
            <li>List Franchisee</li>
          </ul>
        </nav>

        <div className="franchise-list-header">
          <h2 className="page-heading">Franchise List</h2>
          <label className="franchise-list-search">
            <span>Search:</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, username, mobile, zone"
            />
          </label>
        </div>

        <p className="portfolio-intro">
          All Supreme, Prime, and Sub-Franchise accounts in your scope.
          {' '}
          <Link to="/admin/add-franchisee">Add Franchisee</Link>
          {' · '}
          <Link to="/admin/franchise-bulk-pricing">Franchise Pricing</Link>
        </p>

        <div className="franchise-list-filters" role="tablist" aria-label="Franchise type">
          {[
            { value: 'all', label: `All (${counts.all})` },
            { value: ROLES.SUPER_FRANCHISEE, label: `Supreme (${counts[ROLES.SUPER_FRANCHISEE]})` },
            { value: ROLES.FRANCHISEE, label: `Prime (${counts[ROLES.FRANCHISEE]})` },
            { value: ROLES.SUB_FRANCHISE, label: `Sub (${counts[ROLES.SUB_FRANCHISE]})` },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={roleFilter === tab.value}
              className={`franchise-list-filter${roleFilter === tab.value ? ' is-active' : ''}`}
              onClick={() => setRoleFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="login-error" role="alert">{error}</p>}

        <section className="content-panel">
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table franchise-list-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Franchisee Name</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Zone / City</th>
                    <th>Parent</th>
                    <th>Login Details</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty-msg">No franchise accounts found.</td>
                    </tr>
                  )}
                  {filtered.map((row, index) => {
                    const password = row.login_password || '';
                    const revealed = Boolean(showPasswords[row.id]);
                    return (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{row.display_name || row.username}</strong>
                        </td>
                        <td>
                          <span className={`franchise-type-badge franchise-type-badge--${row.role}`}>
                            {ROLE_LABELS[row.role] || row.role}
                          </span>
                        </td>
                        <td>
                          <div>{row.mobile || '—'}</div>
                          <div className="muted-text">{row.email || '—'}</div>
                        </td>
                        <td>{row.zone_name || '—'}</td>
                        <td>
                          {row.parent_franchisee_name
                            ? (
                              <>
                                <div>{row.parent_franchisee_name}</div>
                                <div className="muted-text">
                                  {ROLE_LABELS[row.parent_franchisee_role] || row.parent_franchisee_role || ''}
                                </div>
                              </>
                            )
                            : '—'}
                        </td>
                        <td>
                          <div>
                            Username:
                            {' '}
                            <code>{row.username}</code>
                          </div>
                          {isAdmin ? (
                            <div className="franchise-login-password">
                              <span>
                                Password:
                                {' '}
                                {password
                                  ? (revealed ? password : '••••••••')
                                  : 'Not stored — set in Role Management'}
                              </span>
                              {password ? (
                                <button
                                  type="button"
                                  className="btn-outline btn-sm"
                                  onClick={() => setShowPasswords((prev) => ({
                                    ...prev,
                                    [row.id]: !prev[row.id],
                                  }))}
                                >
                                  {revealed ? 'Hide' : 'Show'}
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <div className="muted-text">Password set at signup</div>
                          )}
                        </td>
                        <td>{row.is_active ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Link
                            className="btn-blue btn-sm"
                            to={`/admin/franchise-bulk-pricing?franchise_user_id=${row.id}`}
                            title="Set bulk pricing"
                          >
                            Pricing
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="portfolio-intro" style={{ marginTop: '0.75rem' }}>
            Showing {filtered.length} of {rows.length} entries.
          </p>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

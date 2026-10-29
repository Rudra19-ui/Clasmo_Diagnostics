import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

export default function FranchiseSubList() {
  const { user } = useAuth();
  const isSupreme = user?.role === ROLES.SUPER_FRANCHISEE;
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers({ role: ROLES.SUB_FRANCHISE, is_active: true });
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const nameA = (a.display_name || a.username || '').toLowerCase();
        const nameB = (b.display_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setRows(list);
    } catch (err) {
      setError(err.message || 'Unable to load Sub-Franchise list.');
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
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.display_name,
        row.username,
        row.mobile,
        row.email,
        row.zone_name,
        row.parent_franchisee_name,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  return (
    <Layout activePage="sub-franchisee">
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>Sub</li>
            <li>Sub List</li>
          </ul>
        </nav>

        <div className="franchise-list-header">
          <h2 className="page-heading">Sub List</h2>
          <label className="franchise-list-search">
            <span>Search:</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, username, mobile"
            />
          </label>
        </div>

        <p className="portfolio-intro">
          {isSupreme
            ? 'All Sub-Franchise accounts under your Supreme network.'
            : 'All Sub-Franchise accounts under your Prime login.'}
          {' '}
          {!isSupreme && (
            <>
              <Link to="/franchise/create-sub">Create Sub</Link>
              {' · '}
            </>
          )}
          <Link to="/franchise/sub-franchisee-credits">Sub Credits</Link>
        </p>

        {error && <p className="login-error" role="alert">{error}</p>}

        <section className="franchise-module-panel">
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table franchise-list-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sub name</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Zone</th>
                    {isSupreme ? <th>Parent Prime</th> : null}
                    <th>Login details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={isSupreme ? 8 : 7} className="empty-msg">
                        No Sub-Franchise accounts found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((row, index) => {
                    const password = row.login_password || '';
                    const revealed = Boolean(showPasswords[row.id]);
                    return (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{row.display_name || row.username}</td>
                        <td>{ROLE_LABELS[row.role] || row.role}</td>
                        <td>
                          {row.mobile || '—'}
                          {row.email ? <div className="muted-text">{row.email}</div> : null}
                        </td>
                        <td>{row.zone_name || '—'}</td>
                        {isSupreme ? (
                          <td>{row.parent_franchisee_name || '—'}</td>
                        ) : null}
                        <td>
                          <div>
                            Username:
                            {' '}
                            <code>{row.username}</code>
                          </div>
                          <div className="franchise-login-password">
                            <span>
                              Password:
                              {' '}
                              {password
                                ? (revealed ? password : '••••••••')
                                : 'Not stored'}
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
                        </td>
                        <td>{row.is_active ? 'Active' : 'Inactive'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

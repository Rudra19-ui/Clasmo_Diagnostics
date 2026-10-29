import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

export default function FranchisePrimeList() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers({ role: ROLES.FRANCHISEE, is_active: true });
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const nameA = (a.display_name || a.username || '').toLowerCase();
        const nameB = (b.display_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setRows(list);
    } catch (err) {
      setError(err.message || 'Unable to load Prime list.');
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
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  return (
    <Layout activePage="prime-list">
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>Prime</li>
            <li>Prime List</li>
          </ul>
        </nav>

        <div className="franchise-list-header">
          <h2 className="page-heading">Prime List</h2>
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
          All Prime accounts under your Supreme login.
          {' '}
          <Link to="/franchise/create-prime">Create Prime</Link>
          {' · '}
          <Link to="/franchise/prime-credits">Prime Credits</Link>
        </p>

        {error && <p className="login-error" role="alert">{error}</p>}

        <section className="franchise-module-panel">
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table franchise-list-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Prime name</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Zone</th>
                    <th>Login details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-msg">No Prime accounts under this Supreme.</td>
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

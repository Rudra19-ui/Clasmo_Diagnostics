import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

export default function FranchiseSupremeList() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers({ role: ROLES.SUPER_FRANCHISEE, is_active: true });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load Supreme franchise list.');
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
          <h2 className="page-heading">Supreme Franchise List</h2>
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
          All Supreme franchise accounts in your scope.
          {' '}
          <Link to="/admin/add-franchisee">Add Franchisee</Link>
          {' · '}
          <Link to="/admin/franchise-bulk-pricing">Franchise Pricing</Link>
        </p>

        {error && <p className="login-error" role="alert">{error}</p>}

        <section className="content-panel">
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table franchise-list-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Franchisee Name</th>
                    <th>Contact</th>
                    <th>Zone / City</th>
                    <th>Login Details</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-msg">No Supreme franchise accounts found.</td>
                    </tr>
                  )}
                  {filtered.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{row.display_name || row.username}</strong>
                        <div className="muted-text">{ROLE_LABELS[row.role] || row.role}</div>
                      </td>
                      <td>
                        <div>{row.mobile || '—'}</div>
                        <div className="muted-text">{row.email || '—'}</div>
                      </td>
                      <td>{row.zone_name || '—'}</td>
                      <td>
                        <div><code>{row.username}</code></div>
                        <div className="muted-text">Password set at signup</div>
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
                  ))}
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

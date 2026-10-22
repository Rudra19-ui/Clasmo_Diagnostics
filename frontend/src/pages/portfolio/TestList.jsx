import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { isFranchiseRole } from '../../utils/franchiseNav';
import { useAuth } from '../../context/AuthContext';
import { filterPorCatalogPdfs } from '../../utils/porCatalog';
import { ADMIN_ROLES } from '../../utils/roles';
import { canViewMrp, canViewPrice } from '../../utils/rolePermissions';

function moneyInput(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '';
}

export default function TestList() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const canRename = ADMIN_ROLES.includes(user?.role);
  const showPrice = canViewPrice(user);
  const showMrp = canViewMrp(user);
  const [tests, setTests] = useState([]);
  const [porPdfs, setPorPdfs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: '', price: '', mrp: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getTests(),
      api.getReportFormats().catch(() => []),
    ])
      .then(([rows, formats]) => {
        setTests(Array.isArray(rows) ? rows : []);
        setPorPdfs(filterPorCatalogPdfs(formats, { hidePriceCatalog: !showPrice && !showMrp }));
      })
      .catch((err) => setError(err.message || 'Could not load tests.'))
      .finally(() => setLoading(false));
  }, [showPrice, showMrp]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) => (
      test.name?.toLowerCase().includes(q)
      || test.sample_type?.toLowerCase().includes(q)
      || test.test_code?.toLowerCase().includes(q)
      || test.category_name?.toLowerCase().includes(q)
      || test.tat?.toLowerCase().includes(q)
    ));
  }, [tests, search]);

  const columnCount = 5 + (showPrice ? 1 : 0) + (showMrp ? 1 : 0) + (canRename ? 1 : 0);

  function startRename(test) {
    setEditError('');
    setEditingId(test.id);
    setDraft({
      name: test.name || '',
      price: moneyInput(test.price),
      mrp: moneyInput(test.mrp),
    });
  }

  function cancelRename() {
    setEditingId(null);
    setEditError('');
  }

  async function saveRename(event) {
    event.preventDefault();
    const name = draft.name.trim();
    const price = Number(draft.price);
    const mrp = Number(draft.mrp);
    if (!name) {
      setEditError('Enter a test name.');
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(mrp) || mrp < 0) {
      setEditError('Enter a price and MRP of 0 or more.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const updated = await api.updateTest(editingId, {
        name,
        price: price.toFixed(2),
        mrp: mrp.toFixed(2),
      });
      setTests((current) => current.map((test) => (
        test.id === updated.id ? { ...test, ...updated } : test
      )));
      setEditingId(null);
    } catch (err) {
      setEditError(err.message || 'Could not rename this test.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout activePage={franchise ? 'all-tests' : 'test-portfolio'}>
      <main className={`dash-main portfolio-page${franchise ? ' franchise-module-page' : ''}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            {franchise ? <li>Test Section</li> : <li><Link to="/portfolio/test-list">Test Portfolio</Link></li>}
            <li>All Tests</li>
          </ul>
        </nav>

        <h2 className="page-heading">All Tests</h2>
        <p className="portfolio-intro">
          {(() => {
            const parts = ['Test Name', 'Sample Type', 'TAT (release time)', 'Volume (ml)'];
            if (showPrice) parts.push('Price (B2B)');
            if (showMrp) parts.push('MRP (patient)');
            return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}.`;
          })()}
        </p>
        {porPdfs.length > 0 && (
          <div className="all-tests-por-links">
            {porPdfs.map((pdf) => (
              <a
                key={pdf.id}
                href={pdf.file_url || pdf.external_url}
                target="_blank"
                rel="noreferrer"
              >
                {pdf.title}
              </a>
            ))}
          </div>
        )}

        <section className={`content-panel portfolio-panel${franchise ? ' franchise-module-panel' : ''}`}>
          <div className="portfolio-toolbar">
            <label className="portfolio-search">
              <span>Search tests</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type test name, sample type, TAT, or code…"
              />
            </label>
            <strong className="portfolio-count">{filtered.length} tests</strong>
          </div>

          {loading && <p>Loading tests…</p>}
          {error && <p className="change-password-message error">{error}</p>}

          {!loading && !error && (
            <div className="portfolio-table-wrap">
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Test Name</th>
                    <th>Sample Type</th>
                    <th>TAT</th>
                    <th>Volume</th>
                    {showPrice && <th>Price</th>}
                    {showMrp && <th>MRP</th>}
                    {canRename && <th>Rename</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={columnCount} className="portfolio-empty">No tests found.</td>
                    </tr>
                  ) : (
                    filtered.map((test, index) => {
                      const editing = canRename && editingId === test.id;
                      return (
                        <tr key={test.id}>
                          <td>{index + 1}</td>
                          <td>
                            {editing ? (
                              <input
                                className="test-rename-input"
                                value={draft.name}
                                onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                                aria-label="Test name"
                              />
                            ) : test.name}
                          </td>
                          <td>{test.sample_type || '—'}</td>
                          <td title="Time for that test to release">{test.tat || '—'}</td>
                          <td>{Number(test.volume_ml || 0) > 0 ? `${Number(test.volume_ml).toFixed(1)} ml` : '—'}</td>
                          {showPrice && (
                            <td title="B2B rate">
                              {editing ? (
                                <input
                                  className="test-rename-input test-rename-input--money"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(e) => setDraft((current) => ({ ...current, price: e.target.value }))}
                                  aria-label="Price"
                                />
                              ) : `₹${Number(test.price || 0).toFixed(2)}`}
                            </td>
                          )}
                          {showMrp && (
                            <td title="Patient MRP">
                              {editing ? (
                                <input
                                  className="test-rename-input test-rename-input--money"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.mrp}
                                  onChange={(e) => setDraft((current) => ({ ...current, mrp: e.target.value }))}
                                  aria-label="MRP"
                                />
                              ) : `₹${Number(test.mrp || 0).toFixed(2)}`}
                            </td>
                          )}
                          {canRename && (
                            <td>
                              {editing ? (
                                <form className="test-rename-actions" onSubmit={saveRename}>
                                  <button type="submit" className="btn-blue btn-sm" disabled={saving}>
                                    {saving ? 'Saving…' : 'Save'}
                                  </button>
                                  <button type="button" className="btn-outline btn-sm" onClick={cancelRename} disabled={saving}>
                                    Cancel
                                  </button>
                                  {editError && <span className="test-rename-error">{editError}</span>}
                                </form>
                              ) : (
                                <button type="button" className="btn-outline btn-sm" onClick={() => startRename(test)}>
                                  Rename
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
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

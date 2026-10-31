import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isFranchiseRole } from '../../utils/franchiseNav';
import { filterPorCatalogPdfs } from '../../utils/porCatalog';
import { ADMIN_ROLES } from '../../utils/roles';
import { canViewMrp, canViewPrice } from '../../utils/rolePermissions';

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CreateProfileForm({ onCreated, onClose }) {
  const [heading, setHeading] = useState('');
  const [mrp, setMrp] = useState('');
  const [rate, setRate] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setMatches([]);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      api.getTests({ search: q })
        .then((rows) => {
          if (!cancelled) setMatches(Array.isArray(rows) ? rows.slice(0, 12) : []);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function addTest(test) {
    setSelected((current) => (
      current.some((item) => item.id === test.id)
        ? current
        : [...current, { id: test.id, name: test.name }]
    ));
    setQuery('');
    setMatches([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const name = heading.trim();
    if (!name) {
      setFormError('Enter a profile heading.');
      return;
    }
    if (!selected.length) {
      setFormError('Add at least one test.');
      return;
    }
    const mrpAmount = Number(mrp);
    const rateAmount = Number(rate);
    if (!Number.isFinite(mrpAmount) || mrpAmount < 0) {
      setFormError('Enter a PROFILE MRP of 0 or more.');
      return;
    }
    if (!Number.isFinite(rateAmount) || rateAmount < 0) {
      setFormError('Enter a profile rate of 0 or more.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createTestPackage({
        name,
        mrp: mrpAmount.toFixed(2),
        rate: rateAmount.toFixed(2),
        test_ids: selected.map((item) => item.id),
      });
      onCreated(created);
    } catch (err) {
      setFormError(err.message || 'Could not create the profile.');
      setSaving(false);
    }
  }

  const visibleMatches = matches.filter((test) => !selected.some((item) => item.id === test.id));

  return (
    <form className="profile-create" onSubmit={handleSubmit}>
      <h3>Create profile</h3>
      <label>
        Profile heading
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="Profile name"
          required
        />
      </label>
      <label className="profile-create-tests">
        Add test
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a test name, then choose it"
        />
        {query.trim().length >= 2 && (
          <ul className="profile-create-matches">
            {searching && <li>Searching…</li>}
            {!searching && visibleMatches.length === 0 && <li>No matching tests.</li>}
            {!searching && visibleMatches.map((test) => (
              <li key={test.id}>
                <button type="button" onClick={() => addTest(test)}>
                  {test.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>
      {selected.length > 0 && (
        <ul className="profile-create-selected">
          {selected.map((test) => (
            <li key={test.id}>
              <span>{test.name}</span>
              <button type="button" onClick={() => setSelected((current) => current.filter((item) => item.id !== test.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="profile-create-prices">
        <label>
          PROFILE MRP
          <input
            type="number"
            min="0"
            step="0.01"
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>
        <label>
          Profile rate
          <input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>
      </div>
      {formError && <p className="change-password-message error">{formError}</p>}
      <div className="profile-create-actions">
        <button type="submit" className="btn-blue" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function TestProfile() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const canCreate = ADMIN_ROLES.includes(user?.role);
  const showPrice = canViewPrice(user);
  const showMrp = canViewMrp(user);
  const [creating, setCreating] = useState(false);
  const [packages, setPackages] = useState([]);
  const [porPdfs, setPorPdfs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.getTestPackages()
      .then((rows) => {
        if (!cancelled) setPackages(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load packages.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    api.getReportFormats()
      .then((formats) => {
        if (!cancelled) {
          setPorPdfs(filterPorCatalogPdfs(formats, { hidePriceCatalog: !showPrice && !showMrp }));
        }
      })
      .catch(() => {
        if (!cancelled) setPorPdfs([]);
      });
    return () => { cancelled = true; };
  }, [franchise, showPrice, showMrp]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) => pkg.name?.toLowerCase().includes(q));
  }, [packages, search]);

  return (
    <Layout activePage={franchise ? 'package-list' : 'test-profile'}>
      <main className={`dash-main portfolio-page${franchise ? ' franchise-module-page' : ''}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            {franchise ? <li>Test Section</li> : <li><Link to="/portfolio/test-list">Test Portfolio</Link></li>}
            <li>Test Profile</li>
          </ul>
        </nav>

        <h2 className="page-heading">Test Profile</h2>
        <p className="portfolio-intro">
          Test profiles are combinations of tests (packages). Search by profile name, or create a new profile.
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
              <span>Search profiles</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Profile name…"
              />
            </label>
            <div className="portfolio-toolbar-actions">
              {canCreate && !creating && (
                <button type="button" className="btn-blue" onClick={() => setCreating(true)}>
                  Create profile
                </button>
              )}
              <strong className="portfolio-count">{filtered.length} profiles</strong>
            </div>
          </div>

          {creating && (
            <CreateProfileForm
              onClose={() => setCreating(false)}
              onCreated={(created) => {
                setPackages((current) => [created, ...current.filter((pkg) => pkg.id !== created.id)]);
                setCreating(false);
                setSearch('');
              }}
            />
          )}

          {loading && <p>Loading packages…</p>}
          {error && <p className="change-password-message error">{error}</p>}

          {!loading && !error && (
            <div className="portfolio-profile-grid">
              {filtered.length === 0 && <p className="portfolio-empty">No packages found.</p>}
              {filtered.map((pkg) => (
                <article key={pkg.id} className="portfolio-profile-card">
                  <h3>{pkg.name}</h3>
                  <p className="package-count-line">
                    <strong>{pkg.test_count}</strong> test{pkg.test_count === 1 ? '' : 's'} in this package
                  </p>
                  {showMrp && <p><strong>PROFILE MRP:</strong> {money(pkg.mrp)}</p>}
                  {showPrice && <p><strong>Profile rate:</strong> {money(pkg.rate)}</p>}
                  {pkg.description && <p>{pkg.description}</p>}
                  <div className="package-includes">
                    <strong>Includes:</strong>
                    {(pkg.test_names || []).length ? (
                      <ol className="package-includes-list">
                        {(pkg.test_names || []).map((testName, index) => (
                          <li key={`${pkg.id}-${index}`}>{testName}</li>
                        ))}
                      </ol>
                    ) : (
                      <span> —</span>
                    )}
                  </div>
                  <Link
                    to={`/portfolio/sample-report?package=${pkg.id}`}
                    className="portfolio-profile-link"
                  >
                    View Reports Format →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

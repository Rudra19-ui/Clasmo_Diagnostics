import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isFranchiseRole } from '../../utils/franchiseNav';
import { filterPorCatalogPdfs } from '../../utils/porCatalog';

export default function TestProfile() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const [packages, setPackages] = useState([]);
  const [porPdfs, setPorPdfs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getTestPackages(),
      api.getReportFormats().catch(() => []),
    ])
      .then(([rows, formats]) => {
        setPackages(Array.isArray(rows) ? rows : []);
        setPorPdfs(filterPorCatalogPdfs(formats, { hidePriceCatalog: franchise }));
      })
      .catch((err) => setError(err.message || 'Could not load packages.'))
      .finally(() => setLoading(false));
  }, [franchise]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) => pkg.name?.toLowerCase().includes(q));
  }, [packages, search]);

  return (
    <Layout activePage={franchise ? 'package-list' : 'test-portfolio'}>
      <main className={`dash-main portfolio-page${franchise ? ' franchise-module-page' : ''}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            {franchise ? <li>Test Section</li> : <li><Link to="/portfolio/test-list">Test Portfolio</Link></li>}
            <li>Package Lists</li>
          </ul>
        </nav>

        <h2 className="page-heading">Package Lists</h2>
        <p className="portfolio-intro">
          Combo / package test names and how many tests each package includes.
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
              <span>Search packages</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Package name…"
              />
            </label>
            <strong className="portfolio-count">{filtered.length} packages</strong>
          </div>

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
                  {pkg.description && <p>{pkg.description}</p>}
                  <p><strong>Includes:</strong> {(pkg.test_names || []).join(', ') || '—'}</p>
                  <Link to="/portfolio/sample-report" className="portfolio-profile-link">
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

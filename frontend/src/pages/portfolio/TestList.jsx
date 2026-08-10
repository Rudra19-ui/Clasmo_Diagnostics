import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { isFranchiseRole } from '../../utils/franchiseNav';
import { useAuth } from '../../context/AuthContext';
import { filterPorCatalogPdfs } from '../../utils/porCatalog';

export default function TestList() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const [tests, setTests] = useState([]);
  const [porPdfs, setPorPdfs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getTests(),
      api.getReportFormats().catch(() => []),
    ])
      .then(([rows, formats]) => {
        setTests(Array.isArray(rows) ? rows : []);
        setPorPdfs(filterPorCatalogPdfs(formats, { hidePriceCatalog: franchise }));
      })
      .catch((err) => setError(err.message || 'Could not load tests.'))
      .finally(() => setLoading(false));
  }, [franchise]);

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
          {franchise
            ? 'Test Name, Sample Type, TAT (release time), and Volume (ml). Price and MRP appear only during New Entry and Billing.'
            : 'Test Name, Sample Type, TAT (release time), Volume (ml), Price (B2B), and MRP (patient). Loaded from POR catalog PDFs.'}
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
                    {!franchise && <th>Price</th>}
                    {!franchise && <th>MRP</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={franchise ? 5 : 7} className="portfolio-empty">No tests found.</td>
                    </tr>
                  ) : (
                    filtered.map((test, index) => (
                      <tr key={test.id}>
                        <td>{index + 1}</td>
                        <td>{test.name}</td>
                        <td>{test.sample_type || '—'}</td>
                        <td title="Time for that test to release">{test.tat || '—'}</td>
                        <td>{Number(test.volume_ml || 0) > 0 ? `${Number(test.volume_ml).toFixed(1)} ml` : '—'}</td>
                        {!franchise && (
                          <td title="B2B rate">₹{Number(test.price || 0).toFixed(2)}</td>
                        )}
                        {!franchise && (
                          <td title="Patient MRP">₹{Number(test.mrp || 0).toFixed(2)}</td>
                        )}
                      </tr>
                    ))
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

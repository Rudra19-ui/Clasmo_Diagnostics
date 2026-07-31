import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

export default function TestList() {
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTests()
      .then((rows) => setTests(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(err.message || 'Could not load tests.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) => (
      test.name?.toLowerCase().includes(q)
      || test.sample_type?.toLowerCase().includes(q)
      || test.test_code?.toLowerCase().includes(q)
      || test.category_name?.toLowerCase().includes(q)
    ));
  }, [tests, search]);

  return (
    <Layout activePage="test-portfolio">
      <main className="dash-main portfolio-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/portfolio/test-list">Test Portfolio</Link></li>
            <li>Test List</li>
          </ul>
        </nav>

        <h2 className="page-heading">Test List</h2>
        <p className="portfolio-intro">Browse the complete diagnostic test catalogue with sample type and pricing.</p>

        <section className="content-panel portfolio-panel">
          <div className="portfolio-toolbar">
            <label className="portfolio-search">
              <span>Search tests</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type test name, sample type, or code…"
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
                    <th>Category</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="portfolio-empty">No tests found.</td>
                    </tr>
                  ) : (
                    filtered.map((test, index) => (
                      <tr key={test.id}>
                        <td>{index + 1}</td>
                        <td>{test.name}</td>
                        <td>{test.sample_type || '—'}</td>
                        <td>{test.category_name || '—'}</td>
                        <td>{test.test_code || '—'}</td>
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

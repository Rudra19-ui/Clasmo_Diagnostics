import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

export default function ClinicalHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.searchRegistrations({});
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load clinical history.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout activePage="clinical-history">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Notifications</li>
              <li>Clinical History</li>
            </ul>
          </nav>
          <h2 className="page-heading">Clinical History</h2>
          <p className="portfolio-intro">
            Comments and uploaded PDFs from New Entry for all bookings in your scope.
          </p>
        </header>

        {error && <p className="login-error" role="alert">{error}</p>}

        <section className="franchise-module-panel">
          <div className="franchise-search-reports-actions" style={{ marginBottom: 12 }}>
            <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading && !rows.length ? (
            <p>Loading clinical history…</p>
          ) : rows.length === 0 ? (
            <p>No bookings found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Book ID</th>
                    <th>Patient</th>
                    <th>Mobile</th>
                    <th>Comment</th>
                    <th>PDF</th>
                    <th>Tests</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const patient = row.patient || {};
                    const isOpen = expandedId === row.id;
                    const comment = (row.comment || '').trim();
                    const tests = row.tests_list || row.test_names || '';
                    return (
                      <Fragment key={row.id}>
                        <tr>
                          <td>{row.lab_code}</td>
                          <td>{row.patient_name || patient.patient_name || '—'}</td>
                          <td>{patient.mobile || '—'}</td>
                          <td className="clinical-history-comment-cell">
                            {comment || '—'}
                          </td>
                          <td>
                            {row.clinical_pdf_url ? (
                              <a
                                href={row.clinical_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View PDF
                                {row.clinical_pdf_name ? ` (${row.clinical_pdf_name})` : ''}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{Array.isArray(tests) ? tests.join(', ') : tests || '—'}</td>
                          <td>{row.status || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setExpandedId(isOpen ? null : row.id)}
                            >
                              {isOpen ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="clinical-history-detail-row">
                            <td colSpan={8}>
                              <div className="clinical-history-detail">
                                <div>
                                  <strong>Doctor:</strong> {patient.doctor_name || '—'}
                                </div>
                                <div>
                                  <strong>Age / Gender:</strong>{' '}
                                  {patient.age_years ?? '—'} / {patient.gender || '—'}
                                </div>
                                <div>
                                  <strong>Full comment:</strong>
                                  <p className="clinical-history-comment">
                                    {comment || 'No comment entered.'}
                                  </p>
                                </div>
                                {row.clinical_pdf_url && (
                                  <div>
                                    <a
                                      className="btn-primary"
                                      href={row.clinical_pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open PDF
                                    </a>
                                  </div>
                                )}
                                <div>
                                  <Link to={`/clinical/report-preview?id=${row.id}`}>
                                    Open clinical report →
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

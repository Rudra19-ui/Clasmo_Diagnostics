import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import LandingBrandTitle from '../../components/landing/LandingBrandTitle';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isFranchiseRole } from '../../utils/franchiseNav';
import { filterPorCatalogPdfs } from '../../utils/porCatalog';

function splitSampleTypes(sampleType) {
  const raw = (sampleType || '').trim();
  if (!raw) return ['General'];
  const parts = raw.split(/[,/|]/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ['General'];
}

function pickDefaultTestId(list) {
  const cbc = list.find((test) => /complete blood count|\bcbc\b/i.test(test.name || ''));
  return String((cbc || list[0]).id);
}

function referenceInterval(param) {
  const male = (param.reference_range_male || '').trim();
  const female = (param.reference_range_female || '').trim();
  if (male && female && male !== female) {
    return `M: ${male} · F: ${female}`;
  }
  return male || female || param.reference_range_child || 'As per method / kit insert';
}

export default function SampleReport() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tests, setTests] = useState([]);
  const [formats, setFormats] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [error, setError] = useState('');
  const [barcodeInput, setBarcodeInput] = useState(searchParams.get('barcode') || '');
  const [patientReport, setPatientReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getTests(),
      api.getReportFormats().catch(() => []),
    ])
      .then(([rows, formatRows]) => {
        const list = Array.isArray(rows) ? rows : [];
        setTests(list);
        setFormats(Array.isArray(formatRows) ? formatRows : []);
        if (list.length) setSelectedId(pickDefaultTestId(list));
      })
      .catch((err) => setError(err.message || 'Could not load tests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId || patientReport) {
      if (!selectedId) setParameters([]);
      return undefined;
    }
    let cancelled = false;
    setParamsLoading(true);
    api.getTestParameters({ test_id: selectedId, active_only: 'true' })
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.parameter_name).localeCompare(String(b.parameter_name)));
        setParameters(list);
      })
      .catch(() => {
        if (!cancelled) setParameters([]);
      })
      .finally(() => {
        if (!cancelled) setParamsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId, patientReport]);

  useEffect(() => {
    const fromUrl = (searchParams.get('barcode') || '').trim();
    if (!fromUrl) return;
    setBarcodeInput(fromUrl);
    loadPatientReport(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) => test.name?.toLowerCase().includes(q));
  }, [tests, search]);

  const selectedTest = useMemo(
    () => tests.find((test) => String(test.id) === String(selectedId)) || null,
    [tests, selectedId],
  );

  const sampleTypes = patientReport?.sample_types?.length
    ? patientReport.sample_types
    : (selectedTest ? splitSampleTypes(selectedTest.sample_type) : []);

  async function loadPatientReport(barcode) {
    const value = (barcode || '').trim();
    if (!value) {
      setReportError('Enter or scan a sample barcode.');
      return;
    }
    setReportLoading(true);
    setReportError('');
    try {
      const data = await api.getPatientReportByBarcode(value, { test: 'cbc' });
      setPatientReport(data);
      setSearchParams({ barcode: value });
      if (data.test_name) {
        const match = tests.find((t) => t.name === data.test_name);
        if (match) setSelectedId(String(match.id));
      }
    } catch (err) {
      setPatientReport(null);
      setReportError(err.message || 'Could not load patient report for this barcode.');
    } finally {
      setReportLoading(false);
    }
  }

  function clearPatientReport() {
    setPatientReport(null);
    setReportError('');
    setBarcodeInput('');
    setSearchParams({});
  }

  function handleBarcodeSubmit(e) {
    e.preventDefault();
    loadPatientReport(barcodeInput);
  }

  const demo = {
    patient_name: 'Sample Patient',
    age_gender: '35 Y / Male',
    lab_code: 'SAMPLE-001',
    registration_date: '31-07-2026 19:30',
    doctor_name: 'Dr. Reference',
    barcode: 'SAMPLE-BC-1001',
  };

  const demographics = patientReport?.demographics || demo;
  const title = patientReport?.test_name || selectedTest?.name || 'CBC (COMPLETE BLOOD COUNT)';
  const rows = patientReport?.rows;
  const isLive = Boolean(patientReport?.found);
  const porPdfs = useMemo(
    () => filterPorCatalogPdfs(formats, { hidePriceCatalog: franchise }),
    [formats, franchise],
  );

  return (
    <Layout activePage={franchise ? 'reports-format' : 'test-portfolio'}>
      <main className={`dash-main portfolio-page${franchise ? ' franchise-module-page' : ''}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            {franchise ? <li>Test Section</li> : <li><Link to="/portfolio/test-list">Test Portfolio</Link></li>}
            <li>Reports Format</li>
          </ul>
        </nav>

        <h2 className="page-heading">Reports Format</h2>
        <p className="portfolio-intro">
          Demo / sample report PDFs and images, plus interactive sample report preview.
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
          <h3 className="test-addition-subtitle">Demo report files</h3>
          <div className="report-format-grid">
            {formats.length === 0 && !loading && (
              <p className="portfolio-empty">No demo report files uploaded yet.</p>
            )}
            {formats.map((asset) => {
              const href = asset.file_url || asset.external_url;
              return (
                <article key={asset.id} className="report-format-card">
                  <div className={`report-format-badge report-format-badge--${asset.file_type}`}>
                    {asset.file_type === 'pdf' ? 'PDF' : 'Image'}
                    {asset.is_demo ? ' · Demo' : ''}
                  </div>
                  <h3>{asset.title}</h3>
                  <p>{asset.description || 'Sample report format'}</p>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="portfolio-profile-link">
                      Open {asset.file_type === 'pdf' ? 'PDF' : 'image'} →
                    </a>
                  ) : (
                    <span className="report-format-placeholder">File placeholder — upload via admin media later</span>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className={`content-panel portfolio-panel${franchise ? ' franchise-module-panel' : ''}`}>
          <h3 className="test-addition-subtitle">Interactive sample preview</h3>
          <form className="sample-report-barcode-bar" onSubmit={handleBarcodeSubmit}>
            <label>
              <span>Sample barcode</span>
              <input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode to load patient CBC report"
                autoComplete="off"
              />
            </label>
            <button type="submit" className="sample-report-btn" disabled={reportLoading}>
              {reportLoading ? 'Loading…' : 'Load patient report'}
            </button>
            {isLive && (
              <button type="button" className="sample-report-btn sample-report-btn--secondary" onClick={clearPatientReport}>
                Clear / format preview
              </button>
            )}
            <Link to="/device/test-result-batch" className="sample-report-btn sample-report-btn--secondary">
              Capture machine results
            </Link>
          </form>
          {reportError && <p className="change-password-message error">{reportError}</p>}
          {isLive && patientReport.message && (
            <p className="change-password-message">{patientReport.message}</p>
          )}

          <div className="portfolio-sample-layout">
            <aside className="portfolio-sample-picker">
              <label className="portfolio-search">
                <span>Find test</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search…"
                  disabled={isLive}
                />
              </label>

              {loading && <p>Loading tests…</p>}
              {error && <p className="change-password-message error">{error}</p>}

              {!loading && !error && (
                <ul className="portfolio-test-picker-list" role="listbox" aria-label="Tests">
                  {filtered.map((test) => (
                    <li key={test.id}>
                      <button
                        type="button"
                        className={`portfolio-test-picker-item${String(test.id) === String(selectedId) ? ' is-active' : ''}`}
                        onClick={() => {
                          if (isLive) return;
                          setSelectedId(String(test.id));
                        }}
                        disabled={isLive}
                      >
                        {test.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="portfolio-sample-preview">
              {!selectedTest && !isLive ? (
                <p className="portfolio-empty">Select a test to view its sample report.</p>
              ) : (
                <article className="sample-report-sheet">
                  <header className="sample-report-header">
                    <LandingBrandTitle showLogo compact />
                    <div className="sample-report-meta">
                      <strong>{isLive ? 'PATIENT REPORT' : 'SAMPLE REPORT'}</strong>
                      <span>
                        {isLive
                          ? `Status: ${patientReport.report_status || 'pending'}`
                          : 'For reference / format preview only'}
                      </span>
                    </div>
                  </header>

                  <div className="sample-report-patient-grid">
                    <div><span>Patient Name</span><strong>{demographics.patient_name}</strong></div>
                    <div><span>Age / Gender</span><strong>{demographics.age_gender || demographics.age_display}</strong></div>
                    <div><span>Lab Code</span><strong>{demographics.lab_code || '—'}</strong></div>
                    <div><span>Register Date</span><strong>{demographics.registration_date || '—'}</strong></div>
                    <div><span>Doctor</span><strong>{demographics.doctor_name || '—'}</strong></div>
                    <div><span>Barcode</span><strong>{demographics.barcode || '—'}</strong></div>
                  </div>

                  <h3 className="sample-report-test-title">{title}</h3>
                  <p className="sample-report-sample-type">
                    <strong>Test Type / Sample:</strong> {sampleTypes.join(', ')}
                  </p>

                  <table className="sample-report-table">
                    <thead>
                      <tr>
                        <th>Investigation</th>
                        <th>Result</th>
                        <th>Unit</th>
                        <th>Biological Ref. Interval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLive && rows?.map((row) => (
                        <tr key={row.parameter_id}>
                          <td>
                            {row.parameter_name}
                            {row.method ? (
                              <div className="sample-report-method">Method: {row.method}</div>
                            ) : null}
                          </td>
                          <td>
                            {row.result || '—'}
                            {row.flag && row.result ? (
                              <div className="sample-report-method">{row.flag}{row.source === 'machine' ? ' · Machine' : ''}</div>
                            ) : null}
                          </td>
                          <td>{row.unit || '—'}</td>
                          <td>{row.reference_range || referenceInterval(row)}</td>
                        </tr>
                      ))}

                      {!isLive && paramsLoading && (
                        <tr>
                          <td colSpan={4}>Loading parameters…</td>
                        </tr>
                      )}
                      {!isLive && !paramsLoading && parameters.length === 0 && (
                        <tr>
                          <td>{title}</td>
                          <td>—</td>
                          <td>—</td>
                          <td>As per method / kit insert</td>
                        </tr>
                      )}
                      {!isLive && !paramsLoading && parameters.map((param) => (
                        <tr key={param.id}>
                          <td>
                            {param.parameter_name}
                            {param.method ? (
                              <div className="sample-report-method">Method: {param.method}</div>
                            ) : null}
                          </td>
                          <td>—</td>
                          <td>{param.unit || '—'}</td>
                          <td>{referenceInterval(param)}</td>
                        </tr>
                      ))}
                      {sampleTypes.map((sampleType) => (
                        <tr key={sampleType}>
                          <td colSpan={4} className="sample-report-sample-row">
                            Sample required: <strong>{sampleType}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <footer className="sample-report-footer">
                    <p>
                      {isLive
                        ? 'Patient demographics and results loaded via sample barcode. Machine values appear after analyzer ingest or result entry.'
                        : 'This is a sample report format from Test Portfolio. Scan a barcode above to load a live patient CBC report.'}
                    </p>
                    <div className="sample-report-actions">
                      <Link to="/clinical/report-preview" className="sample-report-btn">
                        Open Live Report Preview
                      </Link>
                      <Link to="/portfolio/test-list" className="sample-report-btn sample-report-btn--secondary">
                        Back to Test List
                      </Link>
                    </div>
                  </footer>
                </article>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

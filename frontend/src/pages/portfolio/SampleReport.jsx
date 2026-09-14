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

function isOhProgesteroneTest(name = '') {
  return /17\s*-?\s*oh\s*progesterone/i.test(name);
}

function pickDefaultTestId(list, preferredName = '') {
  if (preferredName) {
    const preferred = list.find((test) => (test.name || '').toLowerCase() === preferredName.toLowerCase());
    if (preferred) return String(preferred.id);
  }
  const oh = list.find((test) => isOhProgesteroneTest(test.name));
  if (oh) return String(oh.id);
  const cbc = list.find((test) => /complete blood count|\bcbc\b/i.test(test.name || ''));
  return String((cbc || list[0]).id);
}

function referenceInterval(param) {
  const male = (param.reference_range_male || '').trim();
  const female = (param.reference_range_female || '').trim();
  const child = (param.reference_range_child || '').trim();
  const parts = [];
  if (male) parts.push(`M: ${male}`);
  if (female) parts.push(`F: ${female}`);
  if (child) parts.push(`Child: ${child}`);
  if (parts.length) return parts.join(' · ');
  return 'As per method / kit insert';
}

const PLACEHOLDER_DEMOGRAPHICS = {
  patient_name: '____________________',
  age_gender: '____ Y / ________',
  lab_code: '____________________',
  registration_date: '____/____/________',
  doctor_name: '____________________',
  barcode: '____________________',
  sample_collected_at: '____/____/________',
  reported_on: '____/____/________',
};

export default function SampleReport() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tests, setTests] = useState([]);
  const [formats, setFormats] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
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
        if (list.length) {
          setSelectedId(pickDefaultTestId(list, searchParams.get('test') || ''));
        }
      })
      .catch((err) => setError(err.message || 'Could not load tests.'))
      .finally(() => setLoading(false));
    // Intentionally run once on mount; URL test/barcode handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const linkedFormats = useMemo(() => {
    if (!selectedId) return [];
    return formats.filter((asset) => String(asset.test) === String(selectedId));
  }, [formats, selectedId]);

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

  function selectLinkedFormat(asset) {
    if (asset.test) {
      setSelectedId(String(asset.test));
      clearPatientReport();
      const linkedTest = tests.find((test) => String(test.id) === String(asset.test));
      if (linkedTest?.name) setSearch(linkedTest.name);
    }
  }

  const isLive = Boolean(patientReport?.found);
  const demographics = isLive
    ? (patientReport?.demographics || PLACEHOLDER_DEMOGRAPHICS)
    : PLACEHOLDER_DEMOGRAPHICS;
  const title = patientReport?.test_name || selectedTest?.name || '17 OH Progesterone';
  const rows = patientReport?.rows;
  const porPdfs = useMemo(
    () => filterPorCatalogPdfs(formats, { hidePriceCatalog: franchise }),
    [formats, franchise],
  );
  const showOhLayout = isOhProgesteroneTest(title);

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
          Sample report formats by test. Patient and result fields are placeholders until booking and result entry.
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
          <h3 className="test-addition-subtitle">Sample report files</h3>
          <div className="report-format-grid">
            {formats.length === 0 && !loading && (
              <p className="portfolio-empty">No sample report files uploaded yet.</p>
            )}
            {formats.map((asset) => {
              const href = asset.file_url || asset.external_url;
              const isActive = selectedId && String(asset.test) === String(selectedId);
              return (
                <article
                  key={asset.id}
                  className={`report-format-card${isActive ? ' is-active' : ''}`}
                >
                  <div className={`report-format-badge report-format-badge--${asset.file_type}`}>
                    {asset.file_type === 'pdf' ? 'PDF' : 'Image'}
                    {asset.test_name ? ` · ${asset.test_name}` : (asset.is_demo ? ' · Demo' : '')}
                  </div>
                  <h3>{asset.title}</h3>
                  <p>{asset.description || 'Sample report format'}</p>
                  <div className="report-format-card-actions">
                    {asset.test ? (
                      <button
                        type="button"
                        className="portfolio-profile-link"
                        onClick={() => selectLinkedFormat(asset)}
                      >
                        Open format preview →
                      </button>
                    ) : null}
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="portfolio-profile-link">
                        Open {asset.file_type === 'pdf' ? 'PDF' : 'image'} →
                      </a>
                    ) : (
                      <span className="report-format-placeholder">File placeholder — upload via admin media later</span>
                    )}
                  </div>
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
                placeholder="Scan barcode to load live patient report"
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
                  placeholder="Type to search… e.g. 17 OH"
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
                <article className={`sample-report-sheet${showOhLayout ? ' sample-report-sheet--ohpg' : ''}`}>
                  <header className="sample-report-header">
                    <LandingBrandTitle showLogo compact />
                    <div className="sample-report-meta">
                      <strong>{isLive ? 'PATIENT REPORT' : 'SAMPLE REPORT'}</strong>
                      <span>
                        {isLive
                          ? `Status: ${patientReport.report_status || 'pending'}`
                          : 'Placeholders — filled after patient booking / result entry'}
                      </span>
                    </div>
                  </header>

                  {linkedFormats.length > 0 && (
                    <div className="sample-report-linked-files">
                      {linkedFormats.map((asset) => {
                        const href = asset.file_url || asset.external_url;
                        if (!href) return null;
                        return (
                          <a
                            key={asset.id}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="sample-report-btn sample-report-btn--secondary"
                          >
                            Open {asset.title} PDF
                          </a>
                        );
                      })}
                    </div>
                  )}

                  <div className="sample-report-patient-grid">
                    <div><span>PT Name</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.patient_name}</strong></div>
                    <div><span>Age / Sex</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.age_gender || demographics.age_display}</strong></div>
                    <div><span>Sample Collected At</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.sample_collected_at || '—'}</strong></div>
                    <div><span>Ref By</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.doctor_name || '—'}</strong></div>
                    <div><span>Registered On</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.registration_date || '—'}</strong></div>
                    <div><span>Barcode</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.barcode || '—'}</strong></div>
                    <div><span>Lab Code / INV</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.lab_code || '—'}</strong></div>
                    <div><span>Reported On</span><strong className={!isLive ? 'is-placeholder' : ''}>{demographics.reported_on || '—'}</strong></div>
                  </div>

                  <h3 className="sample-report-test-title">{title}</h3>
                  <p className="sample-report-sample-type">
                    <strong>INV:</strong> {title}
                    {' · '}
                    <strong>SAMPLE:</strong> {sampleTypes.join(', ')}
                  </p>

                  <table className="sample-report-table">
                    <thead>
                      <tr>
                        <th>Test Description</th>
                        <th>Result</th>
                        <th>Units</th>
                        <th>Biological Reference Range</th>
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
                          <td><span className="report-result-placeholder">________</span></td>
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
                          <td>
                            <span className="report-result-placeholder" title="Technician enters machine reading here">
                              ________
                            </span>
                          </td>
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

                  {showOhLayout && !isLive && (
                    <div className="sample-report-notes">
                      <h4>Reference Range</h4>
                      <ul>
                        <li>&lt;1 yr: &lt;3.00 ng/mL</li>
                        <li>&gt;1 yr: &lt;2.00 ng/mL</li>
                        <li>Adult Males: 0.63 – 2.15 ng/mL</li>
                        <li>Premenopausal females — Follicular: 0.32–1.47; Luteal: 0.25–2.91; Contraception: 0.20–1.90</li>
                        <li>Postmenopausal Females: 0.19–0.71 ng/mL</li>
                      </ul>
                      <p>
                        Clinical significance: The adrenal glands, ovaries, testes, and placenta produce 17-OHPG.
                        Please correlate with clinical conditions. ~~End of report~~
                      </p>
                    </div>
                  )}

                  <footer className="sample-report-footer">
                    <p>
                      {isLive
                        ? 'Patient demographics and results loaded via sample barcode. Machine values appear after analyzer ingest or result entry.'
                        : 'Blank fields are placeholders. Patient details come from booking; result is entered by the technician and verified by the pathologist.'}
                    </p>
                    <div className="sample-report-actions">
                      <Link to="/clinical/result-entry" className="sample-report-btn">
                        Open Result Entry
                      </Link>
                      <Link to="/clinical/report-preview" className="sample-report-btn sample-report-btn--secondary">
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

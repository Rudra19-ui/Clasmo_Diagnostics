import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ClasmoReportSheet, { isOhProgesteroneTest, printClasmoReport } from '../../components/reports/ClasmoReportSheet';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isFranchiseRole } from '../../utils/franchiseNav';
import { filterPorCatalogPdfs } from '../../utils/porCatalog';
import { ADMIN_ROLES } from '../../utils/roles';
import '../../styles/clinical.css';

function splitSampleTypes(sampleType) {
  const raw = (sampleType || '').trim();
  if (!raw) return ['General'];
  const parts = raw.split(/[,/|]/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ['General'];
}

function pickDefaultTestId(list, preferredName = '') {
  if (preferredName) {
    const preferred = list.find((test) => (test.name || '').toLowerCase() === preferredName.toLowerCase());
    if (preferred) return String(preferred.id);
  }
  const oh = list.find((test) => isOhProgesteroneTest(test.name));
  if (oh) return String(oh.id);
  const cbc = list.find((test) => /complete blood count|\bcbc\b/i.test(test.name || ''));
  return String((cbc || list[0])?.id || '');
}

const PLACEHOLDER_DEMOGRAPHICS = {
  patient_name: '',
  age_gender: '',
  lab_code: '',
  registration_date: '',
  doctor_name: '',
  barcode: '',
  sample_collected_at: '',
  reported_on: '',
};

export default function SampleReport() {
  const { user } = useAuth();
  const franchise = isFranchiseRole(user?.role);
  const isAdmin = ADMIN_ROLES.includes(user?.role);
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
  const [coverage, setCoverage] = useState(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [packageInfo, setPackageInfo] = useState(null);
  const [packageReports, setPackageReports] = useState([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageError, setPackageError] = useState('');

  const packageId = (searchParams.get('package') || '').trim();
  const packageMode = Boolean(packageId);

  const refreshCoverage = useCallback(() => {
    if (!isAdmin) return;
    api.getSampleReportCoverage()
      .then(setCoverage)
      .catch(() => setCoverage(null));
  }, [isAdmin]);

  useEffect(() => {
    Promise.all([
      api.getTests(),
      api.getReportFormats().catch(() => []),
    ])
      .then(([rows, formatRows]) => {
        const list = Array.isArray(rows) ? rows : [];
        setTests(list);
        setFormats(Array.isArray(formatRows) ? formatRows : []);
        if (list.length && !searchParams.get('package')) {
          setSelectedId(pickDefaultTestId(list, searchParams.get('test') || ''));
        }
      })
      .catch((err) => setError(err.message || 'Could not load tests.'))
      .finally(() => setLoading(false));
    refreshCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!packageId) {
      setPackageInfo(null);
      setPackageReports([]);
      setPackageError('');
      return undefined;
    }
    let cancelled = false;
    setPackageLoading(true);
    setPackageError('');
    setPatientReport(null);
    (async () => {
      try {
        const packages = await api.getTestPackages({ id: packageId });
        const pkg = Array.isArray(packages) ? packages[0] : null;
        if (!pkg) {
          throw new Error('Profile not found.');
        }
        const ids = Array.isArray(pkg.included_test_ids) ? pkg.included_test_ids : [];
        if (!ids.length) {
          throw new Error('This profile has no tests yet.');
        }
        const data = await api.generateSampleReports({
          test_ids: ids.join(','),
          limit: String(Math.max(ids.length, 1)),
        });
        if (cancelled) return;
        setPackageInfo(pkg);
        setPackageReports(Array.isArray(data?.reports) ? data.reports : []);
      } catch (err) {
        if (!cancelled) {
          setPackageInfo(null);
          setPackageReports([]);
          setPackageError(err.message || 'Could not load profile report formats.');
        }
      } finally {
        if (!cancelled) setPackageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [packageId]);

  useEffect(() => {
    if (!packageMode || packageLoading || packageError || !packageReports.length) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      printClasmoReport();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [packageMode, packageLoading, packageError, packageReports]);

  const handleAutoGenerateMissing = async () => {
    if (!window.confirm('Create default parameters for all tests missing a sample report?')) return;
    setAutoBusy(true);
    setError('');
    try {
      await api.autoGenerateSampleParameters({ only_missing: true });
      refreshCoverage();
      if (selectedId) {
        const rows = await api.getTestParameters({ test_id: selectedId, active_only: 'true' });
        const list = Array.isArray(rows) ? rows : [];
        list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.parameter_name).localeCompare(String(b.parameter_name)));
        setParameters(list);
      }
    } catch (err) {
      setError(err.message || 'Auto-generate failed.');
    } finally {
      setAutoBusy(false);
    }
  };

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

  const masterFormats = useMemo(
    () => formats.filter((asset) => !asset.test && /master|letterhead|clasmo/i.test(asset.title || '')),
    [formats],
  );

  const sampleTypes = patientReport?.sample_types?.length
    ? patientReport.sample_types
    : (selectedTest ? splitSampleTypes(selectedTest.sample_type) : ['General']);

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
  const liveRows = (patientReport?.rows || []).map((row) => ({
    ...row,
    id: row.parameter_id,
    result: row.result,
  }));
  const sampleRows = parameters.map((param) => ({
    ...param,
    result: '',
    sample_value: '',
  }));
  const sheetRows = isLive ? liveRows : sampleRows;
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

        <h2 className="page-heading">
          {packageMode && packageInfo
            ? `Reports Format — ${packageInfo.name}`
            : 'Reports Format'}
        </h2>
        <p className="portfolio-intro">
          {packageMode
            ? `Blank sample formats for all ${packageInfo?.test_count || packageReports.length || ''} tests in this profile. Print / PDF opens every sheet.`
            : 'One Clasmo letterhead format for the whole catalog. Choose any test — only the test name, sample type, and parameters change. You can refine parameters later via CSV Import.'}
        </p>
        {isAdmin && coverage && (
          <div className="sample-report-coverage-banner no-print">
            <p>
              Parameter coverage: <strong>{coverage.tests_with_parameters}</strong> / {coverage.total_tests}
              {' '}({coverage.coverage_pct}%)
              {coverage.tests_missing_parameters > 0
                ? ` · ${coverage.tests_missing_parameters} tests still need parameters`
                : ' · all tests ready'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {coverage.tests_missing_parameters > 0 && (
                <button
                  type="button"
                  className="btn-blue"
                  disabled={autoBusy}
                  onClick={handleAutoGenerateMissing}
                >
                  {autoBusy ? 'Generating…' : 'Auto-generate missing'}
                </button>
              )}
              <Link to="/clinical/parameter-import" className="btn-outline">CSV Import</Link>
            </div>
          </div>
        )}
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
                    {asset.test_name ? ` · ${asset.test_name}` : (asset.is_demo ? ' · Demo' : ' · Master')}
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
          <h3 className="test-addition-subtitle">
            {packageMode ? 'Profile report formats' : 'Interactive sample preview'}
          </h3>
          {packageMode ? (
            <div className="sample-report-barcode-bar no-print">
              <Link to="/portfolio/test-profile" className="sample-report-btn sample-report-btn--secondary">
                ← Back to Test Profile
              </Link>
              <button
                type="button"
                className="sample-report-btn"
                onClick={() => { printClasmoReport(); }}
                disabled={packageLoading || !packageReports.length}
              >
                Print / PDF ({packageReports.length || 0} sheets)
              </button>
            </div>
          ) : (
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
              <button
                type="button"
                className="sample-report-btn sample-report-btn--secondary"
                onClick={() => { printClasmoReport(); }}
              >
                Print / PDF
              </button>
              <Link to="/device/test-result-batch" className="sample-report-btn sample-report-btn--secondary">
                Capture machine results
              </Link>
            </form>
          )}
          {reportError && <p className="change-password-message error">{reportError}</p>}
          {packageError && <p className="change-password-message error">{packageError}</p>}
          {isLive && patientReport.message && (
            <p className="change-password-message">{patientReport.message}</p>
          )}

          {packageMode ? (
            <div className="portfolio-sample-preview print-clasmo-reports-root">
              {packageLoading && <p>Loading profile report formats…</p>}
              {!packageLoading && !packageError && packageReports.length === 0 && (
                <p className="portfolio-empty">No report formats found for this profile.</p>
              )}
              {!packageLoading && packageReports.map((report, index) => (
                <ClasmoReportSheet
                  key={report.test_id || index}
                  title={report.test_name}
                  sampleType={splitSampleTypes(report.sample_type)}
                  demographics={PLACEHOLDER_DEMOGRAPHICS}
                  rows={(report.parameters || []).map((param) => ({
                    ...param,
                    result: '',
                    sample_value: '',
                  }))}
                  isLive={false}
                  isSample
                  showReferenceColumn
                  reportNote={report.report_note || ''}
                  reportComments={report.report_comments || ''}
                  clinicalSignificance={report.clinical_significance || ''}
                  reportExtraSections={report.report_extra_sections || null}
                  emptyMessage="No parameters for this test yet."
                  footerNote={
                    index === packageReports.length - 1
                      ? `Blank formats for ${packageInfo?.name || 'this profile'} — use Print / PDF to save all sheets.`
                      : ''
                  }
                />
              ))}
            </div>
          ) : (
            <div className="portfolio-sample-layout">
              <aside className="portfolio-sample-picker no-print">
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

              <div className="portfolio-sample-preview print-clasmo-reports-root">
                {!selectedTest && !isLive ? (
                  <p className="portfolio-empty">Select a test to view its sample report.</p>
                ) : (
                  <ClasmoReportSheet
                    title={title}
                    sampleType={sampleTypes}
                    demographics={demographics}
                    rows={sheetRows}
                    isLive={isLive}
                    isSample={!isLive}
                    loading={!isLive && paramsLoading}
                    showReferenceColumn
                    reportNote={selectedTest?.report_note || ''}
                    reportComments={selectedTest?.report_comments || ''}
                    clinicalSignificance={selectedTest?.clinical_significance || ''}
                    reportExtraSections={selectedTest?.report_extra_sections || null}
                    emptyMessage={
                      isAdmin
                        ? 'No parameters for this test yet. Use Auto-generate missing or CSV Import.'
                        : 'No parameters for this test yet. Ask an admin to import parameters.'
                    }
                    linkedFiles={(
                      (linkedFormats.length > 0 || masterFormats.length > 0) ? (
                        <div className="sample-report-linked-files no-print">
                          {[...masterFormats, ...linkedFormats].map((asset) => {
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
                      ) : null
                    )}
                    footerNote={
                      isLive
                        ? 'Patient demographics and results loaded via sample barcode. Machine values appear after analyzer ingest or result entry.'
                        : 'This is the shared Clasmo letterhead. Change the selected test to swap parameters; refine units/ranges later anytime.'
                    }
                    actions={(
                      <>
                        <Link to="/clinical/result-entry" className="sample-report-btn">
                          Open Result Entry
                        </Link>
                        <Link to="/clinical/report-preview" className="sample-report-btn sample-report-btn--secondary">
                          Open Live Report Preview
                        </Link>
                        <Link to="/clinical/parameter-import" className="sample-report-btn sample-report-btn--secondary">
                          Edit Parameters Later
                        </Link>
                        <Link to="/portfolio/test-list" className="sample-report-btn sample-report-btn--secondary">
                          Back to Test List
                        </Link>
                      </>
                    )}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

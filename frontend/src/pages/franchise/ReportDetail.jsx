import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { getEntrySectionPaths } from '../../utils/entrySection';
import { getReportSectionPaths } from '../../utils/reportSection';

function getSampleTypes(sampleType) {
  const raw = (sampleType || 'General').trim();
  const parts = raw.split(/[,/|]/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ['General'];
}

function formatBookingDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function barcodeForTest(test, linkedBarcodes) {
  const sampleTypes = getSampleTypes(test?.sample_type);
  for (const sampleType of sampleTypes) {
    const match = linkedBarcodes.find(
      (row) => row.is_active !== false
        && String(row.sample_type || '').toLowerCase() === sampleType.toLowerCase(),
    );
    if (match?.barcode) return match.barcode;
  }
  return linkedBarcodes[0]?.barcode || '—';
}

function testHasReportValues(testId, report) {
  if (!report?.values?.length) return false;
  return report.values.some((value) => Number(value.test_id) === Number(testId));
}

function clinicalStatusForTest(testId, registration, report) {
  if (registration?.status === 'Result Ready' || registration?.status === 'Printed') {
    return 'Closed';
  }
  if (report?.status === 'verified') return 'Closed';
  if (testHasReportValues(testId, report)) return 'Closed';
  return 'Pending';
}

function testStatusLabel(testId, registration, report) {
  const clinical = clinicalStatusForTest(testId, registration, report);
  if (clinical === 'Closed') {
    if (report?.status === 'verified') return 'Report Uploaded';
    if (report?.status === 'entered') return 'Result Entered';
    return 'Report Uploaded';
  }
  return 'Pending';
}

export default function ReportDetail() {
  const { labCode } = useParams();
  const location = useLocation();
  const reportPaths = getReportSectionPaths(location.pathname);
  const entryPaths = getEntrySectionPaths(
    location.pathname.startsWith('/franchise')
      ? '/franchise/manage-booking'
      : '/entry',
  );
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const from = searchParams.get('from') || 'all';
  const [registration, setRegistration] = useState(null);
  const [linkedBarcodes, setLinkedBarcodes] = useState([]);
  const [report, setReport] = useState(null);
  const [testSearch, setTestSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backHref = from === 'search' ? reportPaths.search : reportPaths.all;
  const loadDetail = useCallback(async () => {
    if (!labCode) return;
    setLoading(true);
    setError('');
    try {
      const detail = await api.getRegistration(labCode);
      const [barcodes, clinical] = await Promise.all([
        api.getPatientBarcodes({ lab_code: labCode }).catch(() => []),
        api.getReport(detail.id).catch(() => null),
      ]);
      setRegistration(detail);
      setLinkedBarcodes(Array.isArray(barcodes) ? barcodes : []);
      setReport(clinical);
    } catch (err) {
      setError(err.message || 'Could not load report details.');
      setRegistration(null);
    } finally {
      setLoading(false);
    }
  }, [labCode]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const tests = useMemo(
    () => (registration?.tests || []).map((row) => ({
      id: row.id,
      testId: (typeof row.test === 'object' ? row.test?.id : row.test) || row.test_id,
      name: row.test_name || (typeof row.test === 'object' ? row.test?.name : null) || 'Test',
      sample_type: row.sample_type || (typeof row.test === 'object' ? row.test?.sample_type : ''),
    })),
    [registration],
  );

  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) => test.name.toLowerCase().includes(q));
  }, [tests, testSearch]);

  const patient = registration?.patient;
  const patientLabel = registration?.patient_display
    || `${patient?.title || ''} ${patient?.patient_name || ''}`.trim()
    || registration?.patient_name
    || 'Patient';
  const addedBy = registration?.created_by_username
    || registration?.created_by_name
    || 'Admin';
  const bookingDate = formatBookingDate(registration?.registration_date || registration?.created_at);

  return (
    <Layout activePage={reportPaths.activePage}>
      <main className="dash-main franchise-module-page report-detail-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to={backHref}>Report Section</Link></li>
              <li>Report Detail</li>
            </ul>
          </nav>
        </header>

        {error && <p className="login-error" role="alert">{error}</p>}

        {loading && <p className="portfolio-intro">Loading report details…</p>}

        {!loading && registration && (
          <>
            <section className="report-detail-panel">
              <div className="report-detail-panel-head">
                <h2>Clinical Information</h2>
                <Link to={backHref} className="btn-secondary report-detail-back-link">
                  ← Go To Clinical List
                </Link>
              </div>
              <div className="table-wrap">
                <table className="report-detail-table report-detail-table--clinical">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Added By</th>
                      <th>Test Name</th>
                      <th>Barcode</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.length === 0 && (
                      <tr><td colSpan={8} className="empty-msg">No tests on this booking.</td></tr>
                    )}
                    {tests.map((test, index) => {
                      const status = clinicalStatusForTest(test.testId, registration, report);
                      return (
                        <tr key={test.id || test.testId}>
                          <td>{index + 1}</td>
                          <td>{bookingDate}</td>
                          <td>{addedBy}</td>
                          <td>{test.name}</td>
                          <td>{barcodeForTest(test, linkedBarcodes)}</td>
                          <td>{registration.comment || '—'}</td>
                          <td>
                            <span className={`report-detail-status report-detail-status--${status.toLowerCase()}`}>
                              {status}
                            </span>
                          </td>
                          <td>—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-detail-panel">
              <div className="report-detail-toolbar">
                <button type="button" className="btn-secondary" onClick={() => navigate(backHref)}>
                  ← Go Back
                </button>
                <Link
                  to={`${entryPaths.list}?labCode=${encodeURIComponent(registration.lab_code)}`}
                  className="btn-primary report-detail-action report-detail-action--edit"
                >
                  Edit Booking Details
                </Link>
                <Link
                  to={`/franchise/find-barcode?labCode=${encodeURIComponent(registration.lab_code)}`}
                  className="btn-primary report-detail-action report-detail-action--barcode"
                >
                  Edit Barcode
                </Link>
                <Link
                  to={`/clinical/report-preview?id=${registration.id}`}
                  className="btn-primary report-detail-action report-detail-action--letter"
                >
                  With Letterpad
                </Link>
                <Link
                  to={`/clinical/report-preview?id=${registration.id}&letterhead=0`}
                  className="btn-primary report-detail-action report-detail-action--plain"
                >
                  Without Letterpad
                </Link>
                <span className="report-detail-user">{addedBy}</span>
              </div>

              <div className="report-detail-search-row">
                <label htmlFor="report-detail-test-search">Search:</label>
                <input
                  id="report-detail-test-search"
                  type="search"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Filter tests"
                />
              </div>

              <div className="table-wrap">
                <table className="report-detail-table report-detail-table--tests">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Booking Date</th>
                      <th>Test Name</th>
                      <th>Barcode</th>
                      <th>Test Status</th>
                      <th>Report Download</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.length === 0 && (
                      <tr><td colSpan={7} className="empty-msg">No matching tests.</td></tr>
                    )}
                    {filteredTests.map((test, index) => {
                      const statusLabel = testStatusLabel(test.testId, registration, report);
                      const canDownload = statusLabel !== 'Pending';
                      return (
                        <tr key={test.id || test.testId}>
                          <td>{index + 1}</td>
                          <td>{index === 0 ? bookingDate : ''}</td>
                          <td>{test.name}</td>
                          <td>{barcodeForTest(test, linkedBarcodes)}</td>
                          <td>{statusLabel}</td>
                          <td className="report-detail-download-cell">
                            {canDownload ? (
                              <>
                                <Link
                                  to={`/clinical/report-preview?id=${registration.id}`}
                                  className="report-detail-download-btn"
                                >
                                  Download Report
                                </Link>
                                <Link
                                  to={`/clinical/report-preview?id=${registration.id}&letterhead=0`}
                                  className="report-detail-download-btn report-detail-download-btn--plain"
                                >
                                  Without Letterhead
                                </Link>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="report-section-footer">
                Showing 1 to {filteredTests.length} of {tests.length} entries
              </p>
              <p className="report-detail-patient-title">{patientLabel}</p>
            </section>
          </>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

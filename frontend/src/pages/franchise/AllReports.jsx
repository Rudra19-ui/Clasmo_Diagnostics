import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ReportSectionTable from '../../components/franchise/ReportSectionTable';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getReportSectionPaths } from '../../utils/reportSection';
import { matchesWorklist, summarizeWorklist, WORKLIST_FILTERS } from '../../utils/reportWorklist';
import { ROLES } from '../../utils/roles';

function toApiDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

function cellText(value) {
  if (Array.isArray(value)) return value.map((item) => item?.name || item).join('; ');
  if (value == null) return '';
  return String(value);
}

function exportReportValues(rows) {
  const headers = ['Lab Code', 'Patient', 'Tests', 'Status', 'Date', 'Amount'];
  const lines = rows.map((row) => [
    row.lab_code,
    row.patient_name,
    cellText(row.tests || row.test_names),
    row.status || row.workflow_status,
    row.registration_date || row.regn_date || row.created_at,
    row.amount || row.total_amount || row.net_amount,
  ].map((value) => `"${cellText(value).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'report-values.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function AllReports() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTechnician = user?.role === ROLES.TECHNICIAN;
  const [searchParams] = useSearchParams();
  const reportPaths = getReportSectionPaths(location.pathname);
  const exportView = searchParams.get('view') === 'export';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');
  const queryRef = useRef('');
  const abortRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [worklist, setWorklist] = useState('lis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const worklistCounts = useMemo(() => summarizeWorklist(rows), [rows]);
  const visibleRows = useMemo(
    () => rows.filter((row) => matchesWorklist(row, worklist)),
    [rows, worklist],
  );

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const params = {};
      const from = toApiDate(fromDate);
      const to = toApiDate(toDate);
      if (from) params.from_date = from;
      if (to) params.to_date = to;
      const term = queryRef.current.trim();
      if (term) params.q = term;
      const data = await api.searchRegistrations(params, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return;
      setError(err.message || 'Could not load reports.');
      setRows([]);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return (
    <Layout activePage={reportPaths.activePage}>
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to={reportPaths.all}>Report Section</Link></li>
              <li>All Reports</li>
            </ul>
          </nav>
          <h2 className="page-heading">All Reports</h2>
          <p className="portfolio-intro">
            {isTechnician
              ? 'Search by barcode or patient name. Click a patient name to open the result entry page.'
              : 'Browse bookings and reports filtered by date. Click a patient name to open the full report view.'}
          </p>
        </header>

        <section className="franchise-module-panel">
          <div className="report-worklist" role="toolbar" aria-label="Report status">
            {WORKLIST_FILTERS.map((item) => {
              const selected = worklist === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`report-worklist-chip report-worklist-chip--${item.tone}${selected ? ' is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => setWorklist(item.id)}
                >
                  <span className="report-worklist-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <circle cx="12" cy="8" r="3.2" fill="currentColor" />
                      <path d="M5.5 19.2c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5" fill="currentColor" />
                    </svg>
                  </span>
                  <span>{item.label}</span>
                  <span className="report-worklist-count">{worklistCounts[item.id] || 0}</span>
                </button>
              );
            })}
          </div>

          <div className="franchise-report-filters">
            {isTechnician && (
              <label>
                <span>Barcode or patient name</span>
                <input
                  type="search"
                  value={query}
                  placeholder="Scan barcode or type a name"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    queryRef.current = e.target.value;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') load();
                  }}
                />
              </label>
            )}
            <label>
              <span>From date</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              <span>To date</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
            {!isTechnician && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => exportReportValues(visibleRows)}
                disabled={!visibleRows.length}
              >
                {exportView ? 'Download report values' : 'Export report values'}
              </button>
            )}
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <ReportSectionTable
            rows={visibleRows}
            loading={loading}
            from="all"
            emptyMessage={query.trim()
              ? 'No patients matched that barcode or name.'
              : worklist
                ? 'No bookings in this status.'
                : 'No reports found for the selected dates.'}
            onSelectPatient={isTechnician ? (row) => {
              navigate(`/reports-section/all/enter/${encodeURIComponent(row.lab_code)}`, {
                state: { registration: row },
              });
            } : null}
          />
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

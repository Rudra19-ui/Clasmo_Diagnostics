import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import {
  BarChart,
  DonutChart,
  SummaryCard,
} from '../../components/dashboard/DashboardCharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

function toInputDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toApiDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toInputDate(from), to: toInputDate(to) };
}

export default function Analytics() {
  const { user } = useAuth();
  const defaults = useMemo(() => defaultRange(), []);
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [downline, setDownline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      const from = toApiDate(fromDate);
      const to = toApiDate(toDate);
      if (from) params.from_date = from;
      if (to) params.to_date = to;

      const [dash, ledgerData, users] = await Promise.all([
        api.getDashboardSummary(params),
        api.getFranchiseLedger(params).catch(() => null),
        api.getUsers({ is_active: true }).catch(() => []),
      ]);
      setSummary(dash);
      setLedger(ledgerData);
      setDownline(Array.isArray(users) ? users.filter((row) => row.id !== user?.id) : []);
    } catch (err) {
      setError(err.message || 'Could not load analytics.');
      setSummary(null);
      setLedger(null);
      setDownline([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusSegments = useMemo(() => {
    const breakdown = summary?.status_breakdown || {};
    const palette = {
      Registered: '#e67e22',
      Collection: '#5dade2',
      'Result Ready': '#27ae60',
      Printed: '#8e44ad',
    };
    return Object.entries(breakdown).map(([label, value]) => ({
      label,
      value: Number(value || 0),
      color: palette[label] || '#95a5a6',
    }));
  }, [summary]);

  const departmentRows = useMemo(() => (
    (summary?.department_summary || []).map((row) => ({
      label: row.department,
      value: row.count,
      color: '#1a73e8',
    }))
  ), [summary]);

  const tatRows = useMemo(() => (
    (summary?.tat_summary || []).slice(0, 10).map((row) => ({
      label: row.label,
      value: row.tat_hours,
      color: '#00897b',
    }))
  ), [summary]);

  const roleCounts = useMemo(() => {
    const counts = {};
    downline.forEach((row) => {
      counts[row.role] = (counts[row.role] || 0) + 1;
    });
    return Object.entries(counts).map(([role, count]) => ({
      label: ROLE_LABELS[role] || role,
      value: count,
      color: role === ROLES.FRANCHISEE ? '#1565c0' : role === ROLES.SUB_FRANCHISE ? '#00838f' : '#546e7a',
    }));
  }, [downline]);

  const cards = summary?.summary_cards || {};
  const investments = ledger?.investments;

  return (
    <Layout activePage="analytics">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Analytics</li>
            </ul>
          </nav>
          <h2 className="page-heading">Analytics</h2>
          <p className="portfolio-intro">
            Franchise performance for your scoped bookings — registrations, status, TAT, and network size.
          </p>
        </header>

        <section className="franchise-module-panel">
          <div className="franchise-report-filters">
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
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          {!error && (
            <>
              <div className="analytics-kpi-row">
                <article className="analytics-kpi-card">
                  <span>Registrations</span>
                  <strong>{summary?.total_registrations ?? 0}</strong>
                </article>
                <article className="analytics-kpi-card">
                  <span>Net amount</span>
                  <strong>₹{Number(summary?.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </article>
                <article className="analytics-kpi-card">
                  <span>Network accounts</span>
                  <strong>{downline.length}</strong>
                </article>
                <article className="analytics-kpi-card">
                  <span>Ledger total</span>
                  <strong>₹{Number(investments?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </article>
              </div>

              <div className="elab-summary-row analytics-summary-row">
                <SummaryCard title="All" data={cards.all} />
                <SummaryCard title="OPD" data={cards.opd} />
                <SummaryCard title="IPD" data={cards.ipd} />
              </div>

              <div className="analytics-charts-grid">
                <section className="franchise-module-panel analytics-chart-panel">
                  <h3 className="test-addition-subtitle">Booking status</h3>
                  <DonutChart segments={statusSegments} />
                </section>

                <section className="franchise-module-panel analytics-chart-panel">
                  <h3 className="test-addition-subtitle">Department volume</h3>
                  <BarChart rows={departmentRows} />
                </section>

                <section className="franchise-module-panel analytics-chart-panel">
                  <h3 className="test-addition-subtitle">Avg TAT (hours)</h3>
                  <BarChart rows={tatRows} />
                </section>

                <section className="franchise-module-panel analytics-chart-panel">
                  <h3 className="test-addition-subtitle">Network by role</h3>
                  <BarChart rows={roleCounts} />
                </section>
              </div>

              {investments && (
                <section className="franchise-module-panel">
                  <h3 className="test-addition-subtitle">Investment snapshot</h3>
                  <div className="analytics-kpi-row">
                    <article className="analytics-kpi-card">
                      <span>Entries</span>
                      <strong>{investments.entries?.count || 0}</strong>
                      <em>₹{Number(investments.entries?.amount || 0).toFixed(2)}</em>
                    </article>
                    <article className="analytics-kpi-card">
                      <span>Test additions</span>
                      <strong>{investments.test_additions?.count || 0}</strong>
                      <em>₹{Number(investments.test_additions?.amount || 0).toFixed(2)}</em>
                    </article>
                    <article className="analytics-kpi-card">
                      <span>Refunds</span>
                      <strong>{investments.refund?.count || 0}</strong>
                      <em>₹{Number(investments.refund?.amount || 0).toFixed(2)}</em>
                    </article>
                  </div>
                  <p className="portfolio-intro" style={{ marginTop: 12 }}>
                    Open <Link to="/franchise/track-ledger">Track Ledger</Link> for full accounting detail.
                  </p>
                </section>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

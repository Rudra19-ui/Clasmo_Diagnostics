import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

function toApiDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

const EMPTY_SUMMARY = {
  investments: {
    entries: { count: 0, amount: 0 },
    test_additions: { count: 0, amount: 0 },
    refund: { count: 0, amount: 0 },
    total: 0,
  },
  rows: [],
};

export default function TrackLedger() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState(EMPTY_SUMMARY);
  const [sampleData, setSampleData] = useState(null);
  const [loading, setLoading] = useState(false);
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
      const [ledger, samples] = await Promise.all([
        api.getFranchiseLedger(params),
        api.getFranchiseSampleUsage(params),
      ]);
      setData(ledger || EMPTY_SUMMARY);
      setSampleData(samples);
    } catch (err) {
      setError(err.message || 'Could not load ledger.');
      setData(EMPTY_SUMMARY);
      setSampleData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const inv = data.investments || EMPTY_SUMMARY.investments;

  return (
    <Layout activePage="track-ledger">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Track Ledger / Accounting</li>
            </ul>
          </nav>
          <h2 className="page-heading">Track Ledger / Accounting</h2>
          <p className="portfolio-intro">
            Search by date. Investments include entries, test additions, refunds, and totals.
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
              {loading ? 'Loading…' : 'Search'}
            </button>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Investments</h3>
          <div className="ledger-investment-grid">
            <div className="ledger-investment-card">
              <span>Entries</span>
              <strong>{inv.entries?.count || 0}</strong>
              <em>₹{Number(inv.entries?.amount || 0).toFixed(2)}</em>
            </div>
            <div className="ledger-investment-card">
              <span>Test Additions</span>
              <strong>{inv.test_additions?.count || 0}</strong>
              <em>₹{Number(inv.test_additions?.amount || 0).toFixed(2)}</em>
            </div>
            <div className="ledger-investment-card">
              <span>Refund</span>
              <strong>{inv.refund?.count || 0}</strong>
              <em>₹{Number(inv.refund?.amount || 0).toFixed(2)}</em>
            </div>
            <div className="ledger-investment-card ledger-investment-card--total">
              <span>Total</span>
              <strong>₹{Number(inv.total || 0).toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Sample types &amp; counts / material usage</h3>
          <p className="portfolio-intro">Search by date periods — samples sent to lab, sample types, approx page usage.</p>
          {sampleData && (
            <>
              <div className="test-addition-summary">
                <div><span>Samples sent to Lab</span><strong>{sampleData.samples_sent_to_lab}</strong></div>
                <div><span>Registrations</span><strong>{sampleData.registration_count}</strong></div>
                <div><span>Tests</span><strong>{sampleData.test_count}</strong></div>
                <div><span>Approx page usage</span><strong>{sampleData.pages_usage_approx}</strong></div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sample type</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sampleData.sample_types || []).length === 0 && (
                      <tr><td colSpan={2} className="empty-msg">No sample types in this period.</td></tr>
                    )}
                    {(sampleData.sample_types || []).map((row) => (
                      <tr key={row.sample_type}>
                        <td>{row.sample_type}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Ledger rows</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Lab Code</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).length === 0 && (
                  <tr><td colSpan={6} className="empty-msg">No ledger events for this period.</td></tr>
                )}
                {(data.rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                    <td>{row.event_type}</td>
                    <td>{row.lab_code || '—'}</td>
                    <td>{row.description || '—'}</td>
                    <td>{row.quantity}</td>
                    <td>₹{Number(row.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

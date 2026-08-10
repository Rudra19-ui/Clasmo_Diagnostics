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

export default function BillingList() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState([]);
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
      const data = await api.searchRegistrations(params);
      const billed = (Array.isArray(data) ? data : []).filter(
        (row) => (row.bill_receipt_no || '').trim() || Number(row.net_amount || 0) > 0,
      );
      setRows(billed);
    } catch (err) {
      setError(err.message || 'Could not load billing list.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout activePage="billing-list">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Bill Section</li>
              <li>Billing List</li>
            </ul>
          </nav>
          <h2 className="page-heading">Billing List</h2>
          <p className="portfolio-intro">Search generated bills by date.</p>
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

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Lab Code</th>
                  <th>Patient</th>
                  <th>Receipt No</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={8} className="empty-msg">No bills found for the selected dates.</td></tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date || '—'}</td>
                    <td>{row.lab_code}</td>
                    <td>{row.patient_name}</td>
                    <td>{row.bill_receipt_no || '—'}</td>
                    <td>{row.net_amount ?? row.amount ?? '—'}</td>
                    <td>{row.paid ?? '—'}</td>
                    <td>{row.balance ?? '—'}</td>
                    <td>
                      <Link to={`/bill-receipt?registrationId=${row.id}`}>Open</Link>
                    </td>
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

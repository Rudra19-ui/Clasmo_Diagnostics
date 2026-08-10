import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { resolveFranchiseBooking } from './resolveBooking';

function mrpForRow(row) {
  const mrp = Number(row.mrp ?? (typeof row.test === 'object' ? row.test?.mrp : 0) ?? 0);
  if (mrp > 0) return mrp;
  return Number(row.price || 0);
}

export default function MakeBill() {
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState(null);

  const lineItems = useMemo(() => (
    (registration?.tests || []).map((row) => ({
      id: row.id,
      name: row.test_name || (typeof row.test === 'object' ? row.test?.name : null) || 'Test',
      mrp: mrpForRow(row),
    }))
  ), [registration]);

  const mrpTotal = useMemo(
    () => lineItems.reduce((sum, row) => sum + row.mrp, 0),
    [lineItems],
  );

  const runSearch = useCallback(async (raw = barcode) => {
    setSearching(true);
    setError('');
    setMessage('');
    setRegistration(null);
    try {
      const detail = await resolveFranchiseBooking({ barcode: raw });
      setRegistration(detail);
    } catch (err) {
      setError(err.message || 'Barcode search failed.');
    } finally {
      setSearching(false);
    }
  }, [barcode]);

  const generateBill = async () => {
    if (!registration?.lab_code) {
      setError('Search a barcode first.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.generateMrpBill(registration.lab_code, { paid: mrpTotal });
      setRegistration(updated);
      setMessage(`MRP bill generated for ${updated.lab_code} (receipt ${updated.bill_receipt_no || '—'}).`);
    } catch (err) {
      setError(err.message || 'Could not generate MRP bill.');
    } finally {
      setSaving(false);
    }
  };

  const patient = registration?.patient;

  return (
    <Layout activePage="make-bill">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Bill Section</li>
              <li>Make Bill</li>
            </ul>
          </nav>
          <h2 className="page-heading">Make Bill</h2>
          <p className="portfolio-intro">Search by barcode. Bills are generated using MRP only.</p>
        </header>

        <section className="franchise-module-panel test-addition-search">
          <label className="test-addition-search-label" htmlFor="make-bill-barcode">Search by Barcode</label>
          <div className="test-addition-search-row">
            <input
              id="make-bill-barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch(e.currentTarget.value);
                }
              }}
              placeholder="Scan or type barcode"
            />
            <button type="button" className="btn-primary test-addition-search-btn" onClick={() => runSearch()} disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        {registration && (
          <section className="franchise-module-panel">
            <div className="test-addition-summary">
              <div><span>Lab Code</span><strong>{registration.lab_code}</strong></div>
              <div><span>Patient</span><strong>{patient?.patient_name || registration.patient_name}</strong></div>
              <div><span>Receipt No</span><strong>{registration.bill_receipt_no || 'Not generated'}</strong></div>
              <div><span>MRP Total</span><strong>₹{mrpTotal.toFixed(2)}</strong></div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>MRP</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>₹{row.mrp.toFixed(2)}</td>
                    </tr>
                  ))}
                  {!lineItems.length && (
                    <tr><td colSpan={2} className="empty-msg">No tests on this booking.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="test-addition-actions">
              <button type="button" className="btn-primary" onClick={generateBill} disabled={saving || !lineItems.length}>
                {saving ? 'Generating…' : 'Generate MRP Bill'}
              </button>
              {registration.id && (
                <Link className="btn-secondary" to={`/bill-receipt?registrationId=${registration.id}`}>
                  Open Bill Receipt
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

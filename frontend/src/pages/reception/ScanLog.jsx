import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ADMIN_ROLES } from '../../utils/roles';

function toApiDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ScanLog() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showAllZones = ADMIN_ROLES.includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      const from = toApiDate(fromDate);
      const to = toApiDate(toDate);
      if (from) params.from_date = from;
      if (to) params.to_date = to;
      const data = await api.listScanLogs(params);
      setZones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load scan logs.');
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const totalEntries = zones.reduce((sum, zone) => sum + (zone.entries?.length || 0), 0);

  return (
    <Layout activePage="scan-log">
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>Scan Log</li>
          </ul>
        </nav>
        <h2 className="page-heading">Scan Log</h2>
        <p className="portfolio-intro">
          {showAllZones
            ? 'QR / barcode scan history for every zone, shown in separate sections.'
            : `QR / barcode scan history for ${user?.zone_name || 'your zone'}.`}
        </p>

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

          {!loading && totalEntries === 0 && (
            <p className="scan-log-empty">No QR scans recorded yet for the selected filters.</p>
          )}

          {zones.map((zone) => (
            <section key={zone.zone_id || zone.zone_code} className="scan-log-zone-section">
              <header className="scan-log-zone-header">
                <h3>{zone.zone_name || zone.zone_code}</h3>
                <span>{zone.entries?.length || 0} scan(s)</span>
              </header>

              {(zone.entries?.length || 0) === 0 ? (
                <p className="scan-log-zone-empty">No scans in this zone for the selected dates.</p>
              ) : (
                <div className="scan-log-table-wrap">
                  <table className="scan-log-table">
                    <thead>
                      <tr>
                        <th>Scanned At</th>
                        <th>Barcode</th>
                        <th>Booking ID</th>
                        <th>Patient</th>
                        <th>Sample Type</th>
                        <th>Scanned By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zone.entries.map((row) => (
                        <tr key={row.id}>
                          <td>{formatWhen(row.scanned_at)}</td>
                          <td>{row.barcode}</td>
                          <td>{row.lab_code || '—'}</td>
                          <td>{row.patient_name || '—'}</td>
                          <td>{row.sample_type || '—'}</td>
                          <td>
                            {row.scanned_by_name || row.scanned_by_username || '—'}
                            {row.scanned_by_username && row.scanned_by_name
                              ? ` (${row.scanned_by_username})`
                              : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

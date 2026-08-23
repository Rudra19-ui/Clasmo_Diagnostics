import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ReportSectionTable from '../../components/franchise/ReportSectionTable';
import { api } from '../../services/api';
import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';
import { getReportSectionPaths } from '../../utils/reportSection';

const EMPTY = {
  doctor: '',
  lab: '',
  patientName: '',
  test: '',
  barcode: '',
};

export default function SearchReports() {
  const location = useLocation();
  const reportPaths = getReportSectionPaths(location.pathname);
  const [filters, setFilters] = useState(EMPTY);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const setField = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const params = {};
      if (filters.doctor.trim()) params.doctor_name = filters.doctor.trim();
      if (filters.lab.trim()) params.from_labcode = filters.lab.trim();
      if (filters.patientName.trim()) params.patient_name = filters.patientName.trim();
      if (filters.test.trim()) params.test_name = filters.test.trim();
      const barcode = sanitizeBarcodeScannedValue(filters.barcode);
      if (barcode) params.barcode = barcode;

      const data = await api.searchRegistrations(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Search failed.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout activePage={reportPaths.activePage}>
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to={reportPaths.all}>Report Section</Link></li>
              <li>Search Reports</li>
            </ul>
          </nav>
          <h2 className="page-heading">Search Reports</h2>
          <p className="portfolio-intro">
            Search by doctor, lab, patient name, test, or barcode. Click a patient name to open details.
          </p>
        </header>

        <section className="franchise-module-panel">
          <form className="franchise-search-reports-form" onSubmit={handleSearch}>
            <label>
              <span>Doctor</span>
              <input
                type="text"
                value={filters.doctor}
                onChange={(e) => setField('doctor', e.target.value)}
                placeholder="Doctor name"
              />
            </label>
            <label>
              <span>Lab</span>
              <input
                type="text"
                value={filters.lab}
                onChange={(e) => setField('lab', e.target.value)}
                placeholder="Lab code"
              />
            </label>
            <label>
              <span>Name of patient</span>
              <input
                type="text"
                value={filters.patientName}
                onChange={(e) => setField('patientName', e.target.value)}
                placeholder="Patient name"
              />
            </label>
            <label>
              <span>Test</span>
              <input
                type="text"
                value={filters.test}
                onChange={(e) => setField('test', e.target.value)}
                placeholder="Test name"
              />
            </label>
            <label>
              <span>Barcode</span>
              <input
                type="text"
                value={filters.barcode}
                onChange={(e) => setField('barcode', e.target.value)}
                placeholder="Sample / registration barcode"
              />
            </label>
            <div className="franchise-search-reports-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setFilters(EMPTY);
                  setRows([]);
                  setSearched(false);
                  setError('');
                }}
              >
                Clear
              </button>
            </div>
          </form>

          {error && <p className="login-error" role="alert">{error}</p>}

          {searched && (
            <ReportSectionTable
              rows={rows}
              loading={loading}
              from="search"
              emptyMessage="No matching reports."
            />
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

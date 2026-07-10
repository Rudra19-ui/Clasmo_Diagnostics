import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const emptyFilters = () => ({
  lab_code: '',
  patient_name: '',
  mobile_no: '',
  referred_by: '',
  user: '',
  status: '',
});

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function WhatsAppLogger() {
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() => formatDateDDMMYYYY(startOfMonth()));
  const [endDate, setEndDate] = useState(() => formatDateDDMMYYYY(today));
  const [appliedDates, setAppliedDates] = useState(() => ({
    start_date: formatDateDDMMYYYY(startOfMonth()),
    end_date: formatDateDDMMYYYY(today),
  }));
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getWhatsAppLogs({
        ...appliedDates,
        ...filters,
        page,
        page_size: pageSize,
      });
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.message || 'Unable to load WhatsApp logs.');
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [appliedDates, filters, page, pageSize]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedDates({ start_date: startDate, end_date: endDate });
  };

  const goToPage = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    setPage(clamped);
  };

  const handlePageInput = (event) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      goToPage(value);
    }
  };

  return (
    <Layout>
      <div className="page-content">
        <div className="page-title-bar">
          <h2>WhatsApp Logger</h2>
          <Link to="/administration" className="btn-outline btn-sm">Back to Administration</Link>
        </div>

        <div className="master-panel logger-panel">
          <div className="logger-date-filters">
            <div className="master-field">
              <label htmlFor="logger-start-date">Start Date</label>
              <input
                id="logger-start-date"
                type="text"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div className="master-field">
              <label htmlFor="logger-end-date">End Date</label>
              <input
                id="logger-end-date"
                type="text"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <button type="button" className="btn-outline btn-sm logger-search-btn" onClick={handleSearch}>
              Search
            </button>
          </div>

          {error && <p className="change-password-message error" role="alert">{error}</p>}

          <div className="data-table-wrap master-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table master-table logger-table">
                <thead>
                  <tr>
                    <th>Message Date</th>
                    <th>Labcode</th>
                    <th>Patient Name</th>
                    <th>Mobile No</th>
                    <th>Referred By</th>
                    <th>User</th>
                    <th>Status</th>
                  </tr>
                  <tr className="master-filter-row">
                    <th />
                    <th>
                      <input
                        type="text"
                        value={filters.lab_code}
                        onChange={(event) => setFilter('lab_code', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.patient_name}
                        onChange={(event) => setFilter('patient_name', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.mobile_no}
                        onChange={(event) => setFilter('mobile_no', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.referred_by}
                        onChange={(event) => setFilter('referred_by', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.user}
                        onChange={(event) => setFilter('user', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.status}
                        onChange={(event) => setFilter('status', event.target.value)}
                        placeholder="Filter"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="empty-msg">Loading...</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={7} className="empty-msg">No records found.</td></tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.message_date}</td>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name}</td>
                      <td>{row.mobile_no}</td>
                      <td>{row.referred_by}</td>
                      <td>{row.user}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="logger-pagination">
            <span className="logger-total">Total Items: {count}</span>
            <div className="logger-page-controls">
              <button type="button" className="btn-outline btn-sm" onClick={() => goToPage(1)} disabled={page <= 1 || loading}>
                «
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}>
                ‹
              </button>
              <input
                type="number"
                className="logger-page-input"
                min={1}
                max={totalPages}
                value={page}
                onChange={handlePageInput}
                disabled={loading}
              />
              <button type="button" className="btn-outline btn-sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading}>
                ›
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={() => goToPage(totalPages)} disabled={page >= totalPages || loading}>
                »
              </button>
            </div>
            <label className="logger-page-size">
              <span>items per page</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
                disabled={loading}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
      <Footer />
    </Layout>
  );
}

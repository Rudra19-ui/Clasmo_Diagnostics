import { useCallback, useEffect, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

const STATUS_TABS = [
  { id: 'All', label: 'All' },
  { id: 'Registered', label: 'Registrations & Collection' },
  { id: 'Result Ready', label: 'Results & Authorization' },
  { id: 'Printed', label: 'Print & Release' },
  { id: 'Collection', label: 'Pending TAT' },
];

const ACTION_BTNS_ROW1 = [
  'Print WorkSheet', 'Print', 'Job Sheet', 'Payment History',
  'Work Flow History', 'Print Barcode', 'Pending Test', 'Send SMS',
  'Bulk Release', 'Dispatch Sheet', 'Summary Sheet',
];
const ACTION_BTNS_ROW2 = [
  'TAT Pending', 'Transfer Rec', 'CC Daily Report',
  'PC-PNDT Report', 'Pay Online', 'Zip Download',
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function Search() {
  const today = formatDate();
  const [patientName, setPatientName] = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [fromLabcode, setFromLabcode] = useState('');
  const [toLabcode, setToLabcode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [selectState, setSelectState] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [advOpen, setAdvOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const loadData = useCallback(async () => {
    const params = {
      patient_name: patientName,
      from_date: fromDate,
      to_date: toDate,
      from_labcode: fromLabcode,
      to_labcode: toLabcode,
      status: activeStatus,
    };
    const data = await api.searchRegistrations(params).catch(() => []);
    setRows(data);
    setSelectedRows(new Set());
  }, [patientName, fromDate, toDate, fromLabcode, toLabcode, activeStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleRow = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((r) => r.lab_code || r.id)));
    }
  };

  return (
    <Layout activePage="search">
      <main className="dash-main search-page">
        {/* ── Search heading ── */}
        <h2 className="search-page-title">Search</h2>

        {/* ── Filter bar ── */}
        <section className="search-filter-bar">
          <div className="sfb-grid">
            <div className="sfb-field">
              <label>Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
              />
            </div>
            <div className="sfb-field">
              <label>From Date</label>
              <input type="text" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="sfb-field">
              <label>To Date</label>
              <input type="text" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="sfb-field">
              <label>Lab Code</label>
              <div className="sfb-labcode">
                <input type="text" placeholder="From" value={fromLabcode} onChange={(e) => setFromLabcode(e.target.value)} />
                <span>To</span>
                <input type="text" placeholder="To" value={toLabcode} onChange={(e) => setToLabcode(e.target.value)} />
              </div>
            </div>
            <div className="sfb-field">
              <label>Test/Sample Barcode</label>
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
            <div className="sfb-field">
              <label>Select State</label>
              <select value={selectState} onChange={(e) => setSelectState(e.target.value)}>
                <option value="">Select</option>
                <option>Maharashtra</option>
                <option>Gujarat</option>
                <option>Karnataka</option>
                <option>Delhi</option>
              </select>
            </div>

            <div className="sfb-actions">
              <button type="button" className="sfb-btn-search" onClick={loadData}>Search</button>
              <button type="button" className="sfb-btn">Tally</button>
              <button type="button" className="sfb-btn">ExcelAll</button>
              <button type="button" className="sfb-btn">Excel</button>
            </div>
          </div>
        </section>

        {/* ── Advance Search ── */}
        <div className="search-collapsible">
          <button type="button" className="search-collapsible-toggle" onClick={() => setAdvOpen((o) => !o)}>
            <span className="sc-arrow">{advOpen ? '▼' : '▶'}</span> Advance Search
          </button>
          {advOpen && (
            <div className="search-collapsible-body">
              <div className="adv-grid">
                <div className="sfb-field"><label>Doctor Name</label><input type="text" /></div>
                <div className="sfb-field"><label>Mobile Number</label><input type="text" /></div>
                <div className="sfb-field"><label>Affiliation</label><input type="text" /></div>
                <div className="sfb-field"><label>Collection Center</label><input type="text" /></div>
                <div className="sfb-field"><label>Test Name</label><input type="text" /></div>
                <div className="sfb-field"><label>Gender</label>
                  <select><option value="">All</option><option>Male</option><option>Female</option></select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── View Summary ── */}
        <div className="search-collapsible">
          <button type="button" className="search-collapsible-toggle" onClick={() => setSummaryOpen((o) => !o)}>
            <span className="sc-arrow">{summaryOpen ? '▼' : '▶'}</span> View Summary
          </button>
          {summaryOpen && (
            <div className="search-collapsible-body">
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Summary data will appear here.</p>
            </div>
          )}
        </div>

        {/* ── Action toolbar row 1 ── */}
        <div className="search-action-toolbar">
          {ACTION_BTNS_ROW1.map((label) => (
            <button key={label} type="button" className="action-btn">{label}</button>
          ))}
        </div>

        {/* ── Action toolbar row 2 ── */}
        <div className="search-action-toolbar search-action-toolbar--row2">
          {ACTION_BTNS_ROW2.map((label) => (
            <button key={label} type="button" className="action-btn">{label}</button>
          ))}
        </div>

        {/* ── Status tabs ── */}
        <ul className="search-status-tabs">
          {STATUS_TABS.map((tab) => (
            <li
              key={tab.id}
              className={activeStatus === tab.id ? 'active' : ''}
              onClick={() => setActiveStatus(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        {/* ── Results table ── */}
        <div className="search-results-wrap">
          {/* table sub-header */}
          <div className="srt-header">
            <div className="srt-header-links">
              {['Result', 'Registration', 'Show TRF', 'Bill Receipt', 'Multiple Bill Receipt', 'Print Report', 'Re-Order to Machine'].map((lbl) => (
                <button key={lbl} type="button" className="srt-header-link">{lbl}</button>
              ))}
            </div>
            <div className="srt-header-right">
              <span>Set Dispatched</span>
              <span>Direct Print</span>
              <span className="srt-rows-label">Select number of rows:</span>
              <select
                className="srt-rows-select"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="srt-table-wrap">
            <table className="srt-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={rows.length > 0 && selectedRows.size === rows.length} onChange={toggleAll} /></th>
                  <th>Lab Code</th>
                  <th>IPD/O…</th>
                  <th>Patient Name</th>
                  <th>Affiliation</th>
                  <th>Test Name</th>
                  <th>Regn Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Collection Center</th>
                  <th>Patient Age</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="srt-empty">No records found. Use the filters above and click Search.</td>
                  </tr>
                ) : (
                  rows.slice(0, rowsPerPage).map((row) => {
                    const id = row.lab_code || row.id;
                    return (
                      <tr key={id} className={selectedRows.has(id) ? 'row-selected' : ''}>
                        <td><input type="checkbox" checked={selectedRows.has(id)} onChange={() => toggleRow(id)} /></td>
                        <td className="srt-labcode">
                          <a href="#" onClick={(e) => e.preventDefault()}>{row.lab_code}</a>
                        </td>
                        <td>{row.patient?.patient_type || 'OPD'}</td>
                        <td>{row.patient?.patient_name || row.patient_name}</td>
                        <td>{row.patient?.affiliation || 'OPD'}</td>
                        <td className="srt-tests">
                          {(row.tests || []).map((t) => t.test_name || t.name).join(', ') || '—'}
                        </td>
                        <td>{row.created_at ? row.created_at.replace('T', ' ').substring(0, 16) : '—'}</td>
                        <td><span className={`srt-badge srt-badge--${(row.status || '').toLowerCase().replace(/\s/g, '-')}`}>{row.status || '—'}</span></td>
                        <td>{row.total_amount ?? '—'}</td>
                        <td>{row.balance ?? '—'}</td>
                        <td>{row.patient?.collection_center || '—'}</td>
                        <td>{row.patient?.age_years != null ? `${row.patient.age_years}Yrs` : '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </Layout>
  );
}

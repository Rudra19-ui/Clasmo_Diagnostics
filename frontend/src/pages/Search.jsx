import { useCallback, useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { formatDate } from '../utils/date';
import { openWorksheetLoadingWindow, printWorksheet } from '../utils/printWorksheet';
import { printSearchResult } from '../utils/printSearchResult';

const STATUS_TABS = [
  { id: 'All', label: 'All' },
  { id: 'Registered', label: 'Registrations & Collection' },
  { id: 'Result Ready', label: 'Results & Authorization' },
  { id: 'Printed', label: 'Print & Release' },
  { id: 'Collection', label: 'Pending TAT' },
];

const TEST_LEVEL_STATUSES = [
  'Select',
  'Registered',
  'Collection',
  'Result Ready',
  'Printed',
  'Partially Authorized',
  'Accession',
  'Tech Complete Auth',
];

const PATIENT_TYPES = ['None', 'O.P.D.', 'I.P.D.', 'Corporate'];
const NAME_MODES = [
  { value: 'short_name', label: 'Short Name' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'test_code', label: 'Test Code' },
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

const emptyAdvance = () => ({
  testCategory: '',
  testName: '',
  testNameMode: 'short_name',
  testProfileName: '',
  testProfileMode: 'short_name',
  testLevelStatus: 'Select',
  collectionCenter: '',
  affiliation: '',
  doctorName: '',
  externalBarcode: '',
  mobile: '',
  patientType: 'None',
  sampleFromDate: '',
  sampleToDate: '',
  printParams: true,
  slotNumber: '',
  areaLocation: '',
  collectionBoy: '',
  amountPendingStatus: 'All',
  department: '',
  user: '',
  sampleCollectionAt: 'All',
  icmr: 'All',
});

function buildParams(basic, advance, activeStatus) {
  const params = {};
  const set = (key, value) => {
    if (value != null && String(value).trim() !== '') params[key] = String(value).trim();
  };

  set('patient_name', basic.patientName);
  set('from_date', basic.fromDate);
  set('to_date', basic.toDate);
  set('from_labcode', basic.fromLabcode);
  set('to_labcode', basic.toLabcode);
  set('barcode', basic.barcode);
  set('select_state', basic.selectState);
  if (activeStatus && activeStatus !== 'All') set('status', activeStatus);

  set('test_category', advance.testCategory);
  set('test_name', advance.testName);
  set('test_name_mode', advance.testNameMode);
  set('test_profile_name', advance.testProfileName);
  set('test_profile_mode', advance.testProfileMode);
  if (advance.testLevelStatus && advance.testLevelStatus !== 'Select') {
    set('test_level_status', advance.testLevelStatus);
  }
  set('collection_center', advance.collectionCenter);
  set('affiliation', advance.affiliation);
  set('doctor_name', advance.doctorName);
  set('external_barcode', advance.externalBarcode);
  set('mobile', advance.mobile);
  if (advance.patientType && advance.patientType !== 'None') set('patient_type', advance.patientType);
  set('sample_from_date', advance.sampleFromDate);
  set('sample_to_date', advance.sampleToDate);
  if (advance.areaLocation && advance.areaLocation !== 'Select All') set('area_location', advance.areaLocation);
  set('collection_boy', advance.collectionBoy);
  if (advance.amountPendingStatus === 'Pending') set('amount_pending_status', 'pending');
  if (advance.amountPendingStatus === 'Paid') set('amount_pending_status', 'paid');
  set('department', advance.department);
  set('user', advance.user);
  if (advance.sampleCollectionAt && advance.sampleCollectionAt !== 'All') {
    set('sample_collection_at', advance.sampleCollectionAt);
  }

  return params;
}

export default function Search() {
  const today = formatDate();
  const [basic, setBasic] = useState({
    patientName: '',
    fromDate: today,
    toDate: today,
    fromLabcode: '',
    toLabcode: '',
    barcode: '',
    selectState: '',
  });
  const [advance, setAdvance] = useState(emptyAdvance);
  const [activeStatus, setActiveStatus] = useState('All');
  const [advOpen, setAdvOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    api.getTestCategories().then(setCategories).catch(console.error);
    api.getUsers().then(setUsers).catch(console.error);
  }, []);

  const setAdv = (key, value) => setAdvance((prev) => ({ ...prev, [key]: value }));
  const setBasicField = (key, value) => setBasic((prev) => ({ ...prev, [key]: value }));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(basic, advance, activeStatus);
      const data = await api.searchRegistrations(params);
      setRows(data);
      setSelectedRows(new Set());
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [basic, advance, activeStatus]);

  useEffect(() => { loadData(); }, [activeStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.net_amount ?? r.total_amount ?? r.amount ?? 0), 0);
    const amountPaid = rows.reduce((sum, r) => sum + Number(r.paid ?? 0), 0);
    const discount = rows.reduce(
      (sum, r) => sum + Number(r.discount_test ?? 0) + Number(r.discount_regn ?? 0),
      0,
    );
    const refundAmount = rows.reduce((sum, r) => sum + Number(r.refund_amount ?? 0), 0);
    const balanceAmount = rows.reduce((sum, r) => sum + Number(r.balance ?? 0), 0);
    return {
      totalAmount,
      amountPaid,
      balanceAmount,
      discount,
      commission: 0,
      refundAmount,
    };
  }, [rows]);

  const toggleRow = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === rows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(rows.map((r) => r.lab_code || r.id)));
  };

  const formatAge = (patient) => {
    if (!patient) return '—';
    const parts = [];
    if (patient.age_years) parts.push(`${patient.age_years}Yrs`);
    if (patient.age_months) parts.push(`${patient.age_months}M`);
    if (patient.age_days) parts.push(`${patient.age_days}D`);
    return parts.join(' ') || '—';
  };

  const formatRegnDate = (row) => {
    if (row.created_at) return row.created_at.replace('T', ' ').substring(0, 19);
    if (row.registration_date) return String(row.registration_date).replace('T', ' ').substring(0, 19);
    return row.date || '—';
  };

  const getTargetRows = () => (
    selectedRows.size > 0
      ? rows.filter((row) => selectedRows.has(row.lab_code || row.id))
      : rows
  );

  const handlePrintWorksheet = async () => {
    const targetRows = getTargetRows();

    if (!targetRows.length) {
      alert('No records to print. Run a search first or select rows using the checkboxes.');
      return;
    }

    const ids = targetRows.map((row) => row.id).filter(Boolean);
    if (!ids.length) {
      alert('Selected records are missing registration ids.');
      return;
    }

    const loadingWindow = openWorksheetLoadingWindow();
    if (!loadingWindow) {
      alert('Please allow pop-ups to print the worksheet.');
      return;
    }

    setPrinting(true);
    try {
      const data = await api.getWorksheet(ids.join(','));
      printWorksheet(data.patients || [], loadingWindow);
    } catch (err) {
      if (!loadingWindow.closed) loadingWindow.close();
      alert(err.message || 'Failed to generate worksheet.');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintSearchResult = () => {
    printSearchResult(getTargetRows());
  };

  const handleActionClick = (label) => {
    if (label === 'Print WorkSheet') {
      handlePrintWorksheet();
    } else if (label === 'Print') {
      handlePrintSearchResult();
    }
  };

  return (
    <Layout activePage="search">
      <main className="dash-main search-page">
        <h2 className="search-page-title">Search</h2>

        {/* Basic search */}
        <section className="search-filter-bar">
          <div className="sfb-grid">
            <div className="sfb-field">
              <label>Patient Name</label>
              <input
                type="text"
                value={basic.patientName}
                onChange={(e) => setBasicField('patientName', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
              />
            </div>
            <div className="sfb-field">
              <label>From Date</label>
              <input type="text" value={basic.fromDate} onChange={(e) => setBasicField('fromDate', e.target.value)} />
            </div>
            <div className="sfb-field">
              <label>To Date</label>
              <input type="text" value={basic.toDate} onChange={(e) => setBasicField('toDate', e.target.value)} />
            </div>
            <div className="sfb-field">
              <label>Lab Code</label>
              <div className="sfb-labcode">
                <input type="text" placeholder="From" value={basic.fromLabcode} onChange={(e) => setBasicField('fromLabcode', e.target.value)} />
                <span>To</span>
                <input type="text" placeholder="To" value={basic.toLabcode} onChange={(e) => setBasicField('toLabcode', e.target.value)} />
              </div>
            </div>
            <div className="sfb-field">
              <label>Test/Sample Barcode</label>
              <input type="text" value={basic.barcode} onChange={(e) => setBasicField('barcode', e.target.value)} />
            </div>
            <div className="sfb-field">
              <label>Select State</label>
              <select value={basic.selectState} onChange={(e) => setBasicField('selectState', e.target.value)}>
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

        {/* Advance Search */}
        <div className="search-collapsible search-collapsible--advance">
          <button type="button" className="search-collapsible-toggle search-collapsible-toggle--pink" onClick={() => setAdvOpen((o) => !o)}>
            <span className="sc-arrow">{advOpen ? '▼' : '▶'}</span> Advance Search
          </button>
          {advOpen && (
            <div className="search-collapsible-body advance-search-body">
              <div className="adv-grid adv-grid--4">
                {/* Column 1 */}
                <div className="adv-col">
                  <div className="sfb-field">
                    <label>Test Category</label>
                    <select value={advance.testCategory} onChange={(e) => setAdv('testCategory', e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="sfb-field">
                    <label>Collection Center</label>
                    <input type="text" value={advance.collectionCenter} onChange={(e) => setAdv('collectionCenter', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>External Barcode</label>
                    <input type="text" value={advance.externalBarcode} onChange={(e) => setAdv('externalBarcode', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>Sample Collection From Date</label>
                    <input type="text" placeholder="DD-MM-YYYY" value={advance.sampleFromDate} onChange={(e) => setAdv('sampleFromDate', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>Area / Location</label>
                    <select value={advance.areaLocation} onChange={(e) => setAdv('areaLocation', e.target.value)}>
                      <option value="">Select All</option>
                      <option>Igatpuri</option>
                      <option>Mumbai</option>
                      <option>Nashik</option>
                      <option>Pune</option>
                    </select>
                  </div>
                  <div className="sfb-field">
                    <label>Department</label>
                    <select value={advance.department} onChange={(e) => setAdv('department', e.target.value)}>
                      <option value="">Select Department</option>
                      {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="sfb-field">
                    <label>ICMR</label>
                    <select value={advance.icmr} onChange={(e) => setAdv('icmr', e.target.value)}>
                      <option>All</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="adv-col">
                  <div className="sfb-field">
                    <label>Test Name</label>
                    <div className="adv-name-row">
                      <select value={advance.testNameMode} onChange={(e) => setAdv('testNameMode', e.target.value)}>
                        {NAME_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <input type="text" value={advance.testName} onChange={(e) => setAdv('testName', e.target.value)} />
                    </div>
                  </div>
                  <div className="sfb-field">
                    <label>Affiliation Name</label>
                    <input type="text" value={advance.affiliation} onChange={(e) => setAdv('affiliation', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>Mobile Number</label>
                    <input type="text" value={advance.mobile} onChange={(e) => setAdv('mobile', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>Sample Collection To Date</label>
                    <input type="text" placeholder="DD-MM-YYYY" value={advance.sampleToDate} onChange={(e) => setAdv('sampleToDate', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>Collection Boy Name</label>
                    <input type="text" value={advance.collectionBoy} onChange={(e) => setAdv('collectionBoy', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>User</label>
                    <select value={advance.user} onChange={(e) => setAdv('user', e.target.value)}>
                      <option value="">Select User</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="adv-col">
                  <div className="sfb-field">
                    <label>TestProfile Name</label>
                    <div className="adv-name-row">
                      <select value={advance.testProfileMode} onChange={(e) => setAdv('testProfileMode', e.target.value)}>
                        {NAME_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <input type="text" value={advance.testProfileName} onChange={(e) => setAdv('testProfileName', e.target.value)} />
                    </div>
                  </div>
                  <div className="sfb-field">
                    <label>Doctor Name</label>
                    <input type="text" value={advance.doctorName} onChange={(e) => setAdv('doctorName', e.target.value)} />
                  </div>
                  <div className="sfb-field">
                    <label>Patient Type</label>
                    <select value={advance.patientType} onChange={(e) => setAdv('patientType', e.target.value)}>
                      {PATIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="sfb-field">
                    <label>Print Params on WkSheet</label>
                    <div className="adv-checkbox-row">
                      <label className="adv-check-label">
                        <input type="checkbox" checked={advance.printParams} onChange={(e) => setAdv('printParams', e.target.checked)} />
                      </label>
                      <select value={advance.slotNumber} onChange={(e) => setAdv('slotNumber', e.target.value)}>
                        <option value="">Select Slot Number</option>
                        <option>Slot 1</option>
                        <option>Slot 2</option>
                        <option>Slot 3</option>
                      </select>
                    </div>
                  </div>
                  <div className="sfb-field">
                    <label>Amount Pending Status</label>
                    <select value={advance.amountPendingStatus} onChange={(e) => setAdv('amountPendingStatus', e.target.value)}>
                      <option>All</option>
                      <option>Pending</option>
                      <option>Paid</option>
                    </select>
                  </div>
                  <div className="sfb-field">
                    <label>Sample Collection At</label>
                    <select value={advance.sampleCollectionAt} onChange={(e) => setAdv('sampleCollectionAt', e.target.value)}>
                      <option>All</option>
                      <option>Lab</option>
                      <option>Home</option>
                      <option>Collection Center</option>
                    </select>
                  </div>
                  <div className="adv-search-btn-wrap">
                    <button type="button" className="adv-search-btn" onClick={loadData}>Advance Search</button>
                  </div>
                </div>

                {/* Column 4 */}
                <div className="adv-col">
                  <div className="sfb-field">
                    <label>Test Level Status</label>
                    <select value={advance.testLevelStatus} onChange={(e) => setAdv('testLevelStatus', e.target.value)}>
                      {TEST_LEVEL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Summary */}
        <div className="search-collapsible search-collapsible--summary">
          <button type="button" className="search-collapsible-toggle search-collapsible-toggle--magenta" onClick={() => setSummaryOpen((o) => !o)}>
            <span className="sc-arrow">{summaryOpen ? '▼' : '▶'}</span> View Summary
          </button>
          {summaryOpen && (
            <div className="search-collapsible-body view-summary-body">
              <div className="view-summary-row">
                <div className="view-summary-item">
                  <span>Total Amount</span>
                  <strong>{summary.totalAmount.toFixed(0)}</strong>
                </div>
                <div className="view-summary-item">
                  <span>Amount Paid</span>
                  <strong>{summary.amountPaid.toFixed(0)}</strong>
                </div>
                <div className="view-summary-item">
                  <span>Balance Amount</span>
                  <strong>{summary.balanceAmount.toFixed(0)}</strong>
                </div>
                <div className="view-summary-item">
                  <span>Discount</span>
                  <strong>{summary.discount.toFixed(0)}</strong>
                </div>
                <div className="view-summary-item">
                  <span>Commission</span>
                  <strong>{summary.commission.toFixed(0)}</strong>
                </div>
                <div className="view-summary-item">
                  <span>Refund Amount</span>
                  <strong>{summary.refundAmount.toFixed(0)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action toolbars */}
        <div className="search-action-toolbar">
          {ACTION_BTNS_ROW1.map((label) => (
            <button
              key={label}
              type="button"
              className="action-btn"
              onClick={() => handleActionClick(label)}
              disabled={label === 'Print WorkSheet' && printing}
            >
              {label === 'Print WorkSheet' && printing ? 'Printing…' : label}
            </button>
          ))}
        </div>
        <div className="search-action-toolbar search-action-toolbar--row2">
          {ACTION_BTNS_ROW2.map((label) => (
            <button key={label} type="button" className="action-btn">{label}</button>
          ))}
        </div>

        {/* Status tabs */}
        <ul className="search-status-tabs">
          {STATUS_TABS.map((tab) => (
            <li key={tab.id} className={activeStatus === tab.id ? 'active' : ''} onClick={() => setActiveStatus(tab.id)}>
              {tab.label}
            </li>
          ))}
        </ul>

        {/* Results table */}
        <div className="search-results-wrap">
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
              <select className="srt-rows-select" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {loading && <span className="srt-loading">Loading…</span>}
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
                    <td colSpan={12} className="srt-empty">
                      {loading ? 'Searching…' : 'No records found. Use the filters above and click Search or Advance Search.'}
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, rowsPerPage).map((row) => {
                    const id = row.lab_code || row.id;
                    const testNames = (row.tests || []).map((t) => t.test_name || t.name).join(', ') || row.test || '—';
                    return (
                      <tr key={id} className={selectedRows.has(id) ? 'row-selected' : ''}>
                        <td><input type="checkbox" checked={selectedRows.has(id)} onChange={() => toggleRow(id)} /></td>
                        <td className="srt-labcode"><a href="#" onClick={(e) => e.preventDefault()}>{row.lab_code}</a></td>
                        <td>{row.patient?.patient_type || 'OPD'}</td>
                        <td>{row.patient?.patient_name || row.patient_name}</td>
                        <td>{row.patient?.affiliation || 'OPD'}</td>
                        <td className="srt-tests">{testNames}</td>
                        <td>{formatRegnDate(row)}</td>
                        <td><span className={`srt-badge srt-badge--${(row.status || '').toLowerCase().replace(/\s/g, '-')}`}>{row.status || '—'}</span></td>
                        <td>{row.total_amount ?? row.amount ?? '—'}</td>
                        <td>{row.balance ?? '—'}</td>
                        <td>{row.patient?.collection_center || '—'}</td>
                        <td>{formatAge(row.patient)}</td>
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

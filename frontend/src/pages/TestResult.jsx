import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { formatDate } from '../utils/date';
import { printSearchResult } from '../utils/printSearchResult';
import '../styles/test-result.css';

const STATUS_TABS = [
  { id: 'All', icon: '📋', label: 'All' },
  { id: 'Registered', icon: '✏', label: 'Registrations & Collection' },
  { id: 'Result Ready', icon: '📄', label: 'Results & Authorization' },
  { id: 'Printed', icon: '🖨', label: 'Print & Release' },
  { id: 'Collection', icon: '⏱', label: 'Pending TAT' },
];

const STATUS_BADGES = [
  { id: 'all', label: 'All', color: '#1a3d5c', match: () => true },
  { id: 'registration', label: 'Registration', color: '#c62828', match: (s) => s === 'Registered' },
  { id: 'sample_coll', label: 'Sample Coll', color: '#ef6c00', match: (s) => s === 'Collection' },
  { id: 'accen', label: 'Accen', color: '#bf360c', match: (s) => s === 'Accession' },
  { id: 'pending', label: 'Pending', color: '#0288d1', match: (s) => s === 'Result Ready' },
  { id: 'part_auth', label: 'Part Auth', color: '#f9a825', match: (s) => (s || '').includes('Partially') },
  { id: 'auth', label: 'Auth', color: '#ef6c00', match: (s) => (s || '').includes('Tech Complete') },
  { id: 'part_print', label: 'Part Print', color: '#7cb342', match: () => false },
  { id: 'printed', label: 'Printed', color: '#2e7d32', match: (s) => s === 'Printed' },
  { id: 'part_disp', label: 'Part Disp', color: '#ec407a', match: () => false },
  { id: 'dispatched', label: 'Dispatched', color: '#7b1fa2', match: (s) => s === 'Dispatched' },
  { id: 'part_real', label: 'Part Real', color: '#ad1457', match: () => false },
  { id: 'release', label: 'Release', color: '#880e4f', match: () => false },
  { id: 'discard', label: 'Discard', color: '#b71c1c', match: () => false },
];

const TABLE_COLUMNS = [
  { key: 'lab_code', label: 'Lab Code', sortable: true },
  { key: 'patient_name', label: 'Patient Name', sortable: true },
  { key: 'tests', label: 'Selected Test', sortable: false },
  { key: 'regn_date', label: 'Regn Date', sortable: true },
  { key: 'age', label: 'AGE', sortable: true },
  { key: 'gender', label: 'Gen', sortable: true },
  { key: 'referred_by', label: 'Referred By', sortable: true },
  { key: 'doctor_name', label: 'Doctor Name', sortable: true },
  { key: 'collection_center', label: 'Collection Center', sortable: true },
  { key: 'total', label: 'Total', sortable: true },
  { key: 'balance', label: 'Balance', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 60, 100];

function buildParams(filters, activeStatus) {
  const params = {};
  const set = (key, value) => {
    if (value != null && String(value).trim() !== '') params[key] = String(value).trim();
  };

  set('patient_name', filters.patientName);
  set('from_date', filters.fromDate);
  set('to_date', filters.toDate);
  set('from_labcode', filters.fromLabcode);
  set('to_labcode', filters.toLabcode);
  set('test_name', filters.selectTest);
  set('test_category', filters.testCategory);
  set('collection_center', filters.collectionCenter);
  if (filters.slotNumber) set('slot_number', filters.slotNumber);
  if (activeStatus && activeStatus !== 'All') set('status', activeStatus);

  return params;
}

function formatAgeCompact(patient) {
  if (!patient) return '—';
  const y = patient.age_years ?? 0;
  const m = patient.age_months ?? 0;
  const d = patient.age_days ?? 0;
  return `${y}Y/${m}M/${d}D`;
}

function formatGenderShort(patient) {
  const gender = (patient?.gender || '').toLowerCase();
  if (gender === 'male') return 'M';
  if (gender === 'female') return 'F';
  return '—';
}

function formatRegnDate(row) {
  if (row.created_at) return row.created_at.replace('T', ' ').substring(0, 19);
  if (row.registration_date) return String(row.registration_date).replace('T', ' ').substring(0, 19);
  return row.date || '—';
}

function getPatientName(row) {
  const patient = row.patient || {};
  return patient.patient_name || row.patient_name || '—';
}

function getTestList(row) {
  return row.tests || [];
}

function getRowValue(row, key) {
  const patient = row.patient || {};
  switch (key) {
    case 'lab_code': return row.lab_code || '';
    case 'patient_name': return getPatientName(row);
    case 'tests': return getTestList(row).map((t) => t.test_name || t.name).join(', ');
    case 'regn_date': return formatRegnDate(row);
    case 'age': return formatAgeCompact(patient);
    case 'gender': return formatGenderShort(patient);
    case 'referred_by': return patient.affiliation || patient.patient_type || '—';
    case 'doctor_name': return patient.doctor_name || '—';
    case 'collection_center': return patient.collection_center || '—';
    case 'total': return String(row.total ?? row.net_amount ?? row.amount ?? '');
    case 'balance': return String(row.balance ?? '');
    case 'status': return row.status || '';
    default: return '';
  }
}

function compareValues(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && a !== '' && b !== '') {
    return numA - numB;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export default function TestResult() {
  const navigate = useNavigate();
  const today = formatDate();

  const [filters, setFilters] = useState({
    patientName: '',
    fromDate: today,
    toDate: today,
    selectTest: '',
    fromLabcode: '',
    toLabcode: '',
    slotNumber: '',
    testCategory: '',
    collectionCenter: '',
    statusLevel: 'Default',
  });
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeBadge, setActiveBadge] = useState('all');
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [sortKey, setSortKey] = useState('regn_date');
  const [sortDir, setSortDir] = useState('desc');
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    api.getTestCategories().then(setCategories).catch(console.error);
    api.getTests().then(setTests).catch(console.error);
  }, []);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(filters, activeStatus);
      const data = await api.searchRegistrations(params);
      setRows(data);
      setSelectedRows(new Set());
      setActiveBadge('all');
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, activeStatus]);

  useEffect(() => {
    loadData();
  }, [activeStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusCounts = useMemo(() => {
    const counts = { All: rows.length };
    STATUS_TABS.forEach((tab) => {
      if (tab.id === 'All') return;
      counts[tab.id] = rows.filter((row) => row.status === tab.id).length;
    });
    return counts;
  }, [rows]);

  const badgeCounts = useMemo(() => {
    const counts = {};
    STATUS_BADGES.forEach((badge) => {
      counts[badge.id] = rows.filter((row) => badge.match(row.status || '')).length;
    });
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (activeBadge !== 'all') {
      const badge = STATUS_BADGES.find((b) => b.id === activeBadge);
      if (badge) result = result.filter((row) => badge.match(row.status || ''));
    }

    result = result.filter((row) => (
      TABLE_COLUMNS.every((column) => {
        const filterValue = (columnFilters[column.key] || '').trim().toLowerCase();
        if (!filterValue) return true;
        return getRowValue(row, column.key).toLowerCase().includes(filterValue);
      })
    ));

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = compareValues(getRowValue(a, sortKey), getRowValue(b, sortKey));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, activeBadge, columnFilters, sortKey, sortDir]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, rowsPerPage),
    [filteredRows, rowsPerPage],
  );

  const toggleRow = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === visibleRows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(visibleRows.map((r) => r.lab_code || r.id)));
  };

  const getTargetRows = () => (
    selectedRows.size > 0
      ? filteredRows.filter((row) => selectedRows.has(row.lab_code || row.id))
      : filteredRows
  );

  const openResultEntry = (row) => {
    if (!row?.id) return;
    navigate(`/test-result-entry?registrationId=${row.id}`, {
      state: { registrationIds: filteredRows.map((r) => r.id).filter(Boolean) },
    });
  };

  const handleDirectPrint = () => {
    const targetRows = getTargetRows();
    if (!targetRows.length) {
      alert('No records to print. Run a search first or select rows using the checkboxes.');
      return;
    }
    printSearchResult(targetRows);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const setColumnFilter = (key, value) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  return (
    <Layout activePage="test-result">
      <main className="dash-main test-result-page">
        <section className="trt-filter-bar">
          <div className="trt-filter-grid">
            <div className="trt-field trt-field--status-level">
              <label>Status Level</label>
              <select value={filters.statusLevel} onChange={(e) => setFilter('statusLevel', e.target.value)}>
                <option>Default</option>
                <option>Detailed</option>
              </select>
            </div>
            <div className="trt-field">
              <label>Patient Name</label>
              <input
                type="text"
                value={filters.patientName}
                onChange={(e) => setFilter('patientName', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
              />
            </div>
            <div className="trt-field">
              <label>From Date</label>
              <input type="text" value={filters.fromDate} onChange={(e) => setFilter('fromDate', e.target.value)} />
            </div>
            <div className="trt-field">
              <label>To Date</label>
              <input type="text" value={filters.toDate} onChange={(e) => setFilter('toDate', e.target.value)} />
            </div>
            <div className="trt-field">
              <label>Select Test</label>
              <select value={filters.selectTest} onChange={(e) => setFilter('selectTest', e.target.value)}>
                <option value="">Select Test</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.name}>{test.name}</option>
                ))}
              </select>
            </div>
            <div className="trt-field">
              <label>Labcode</label>
              <div className="trt-labcode">
                <input type="text" placeholder="From" value={filters.fromLabcode} onChange={(e) => setFilter('fromLabcode', e.target.value)} />
                <span>To</span>
                <input type="text" placeholder="To" value={filters.toLabcode} onChange={(e) => setFilter('toLabcode', e.target.value)} />
              </div>
            </div>
            <div className="trt-field">
              <label>Select Slot Number</label>
              <select value={filters.slotNumber} onChange={(e) => setFilter('slotNumber', e.target.value)}>
                <option value="">Select Slot Number</option>
                <option>Slot 1</option>
                <option>Slot 2</option>
                <option>Slot 3</option>
              </select>
            </div>
            <div className="trt-field">
              <label>Test Category</label>
              <select value={filters.testCategory} onChange={(e) => setFilter('testCategory', e.target.value)}>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="trt-field">
              <label>Collection Center</label>
              <input type="text" value={filters.collectionCenter} onChange={(e) => setFilter('collectionCenter', e.target.value)} />
            </div>
            <div className="trt-actions">
              <button type="button" className="trt-btn trt-btn--print" onClick={handleDirectPrint}>Direct Print</button>
              <button type="button" className="trt-btn trt-btn--search" onClick={loadData}>Search</button>
            </div>
          </div>
        </section>

        <ul className="trt-status-tabs">
          {STATUS_TABS.map((tab) => (
            <li
              key={tab.id}
              className={activeStatus === tab.id ? 'active' : ''}
              onClick={() => setActiveStatus(tab.id)}
            >
              <span className="trt-tab-icon">{tab.icon}</span>
              {tab.label} ({statusCounts[tab.id] ?? 0})
            </li>
          ))}
        </ul>

        <div className="trt-status-badges">
          {STATUS_BADGES.map((badge) => (
            <button
              key={badge.id}
              type="button"
              className={`trt-badge ${activeBadge === badge.id ? 'active' : ''}`}
              style={{ '--badge-color': badge.color }}
              onClick={() => setActiveBadge(badge.id)}
            >
              {badge.label} ({badgeCounts[badge.id] ?? 0})
            </button>
          ))}
        </div>

        <div className="trt-results-wrap">
          <div className="trt-table-toolbar">
            <span className="trt-rows-label">Select number of rows:</span>
            <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
              {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {loading && <span className="trt-loading">Loading…</span>}
            <button type="button" className="trt-menu-btn" title="Table options">☰</button>
          </div>

          <div className="trt-table-wrap">
            <table className="trt-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={visibleRows.length > 0 && selectedRows.size === visibleRows.length}
                      onChange={toggleAll}
                    />
                  </th>
                  {TABLE_COLUMNS.map((column) => (
                    <th key={column.key}>
                      {column.sortable ? (
                        <button type="button" className="trt-sort-btn" onClick={() => handleSort(column.key)}>
                          {column.label} <span className="trt-sort-icon">{renderSortIcon(column.key)}</span>
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                </tr>
                <tr className="trt-filter-row">
                  <th />
                  {TABLE_COLUMNS.map((column) => (
                    <th key={`filter-${column.key}`}>
                      <input
                        type="text"
                        className="trt-col-filter"
                        value={columnFilters[column.key] || ''}
                        onChange={(e) => setColumnFilter(column.key, e.target.value)}
                        placeholder=""
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length + 1} className="trt-empty">
                      {loading ? 'Searching…' : 'No records found. Use the filters above and click Search.'}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const id = row.lab_code || row.id;
                    const patient = row.patient || {};
                    const testList = getTestList(row);
                    return (
                      <tr key={id} className={selectedRows.has(id) ? 'row-selected' : ''}>
                        <td>
                          <input type="checkbox" checked={selectedRows.has(id)} onChange={() => toggleRow(id)} />
                        </td>
                        <td className="trt-labcode">
                          <button type="button" className="trt-link" onClick={() => openResultEntry(row)}>
                            {row.lab_code}
                          </button>
                        </td>
                        <td className="trt-patient">
                          <button type="button" className="trt-link" onClick={() => openResultEntry(row)}>
                            {getPatientName(row)}
                          </button>
                        </td>
                        <td className="trt-tests">
                          {testList.length ? testList.map((test, idx) => (
                            <span
                              key={test.id || `${test.test_name}-${idx}`}
                              className={`trt-test-tag trt-test-tag--${idx % 2 === 0 ? 'orange' : 'red'}`}
                            >
                              {test.test_name || test.name}
                            </span>
                          )) : '—'}
                        </td>
                        <td>{formatRegnDate(row)}</td>
                        <td>{formatAgeCompact(patient)}</td>
                        <td>{formatGenderShort(patient)}</td>
                        <td>{patient.affiliation || patient.patient_type || '—'}</td>
                        <td>{patient.doctor_name || '—'}</td>
                        <td className="trt-center">{patient.collection_center || '—'}</td>
                        <td>{row.total ?? row.net_amount ?? row.amount ?? '—'}</td>
                        <td>{row.balance ?? '—'}</td>
                        <td className="trt-status">
                          <span className={`trt-status-pill trt-status-pill--${(row.status || '').toLowerCase().replace(/\s/g, '-')}`}>
                            {row.status || '—'}
                          </span>
                        </td>
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

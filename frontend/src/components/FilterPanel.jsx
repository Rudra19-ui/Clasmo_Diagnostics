import { useState } from 'react';
import { formatDate } from '../utils/date';

export default function FilterPanel({ filters, onChange, onSearch }) {
  const today = formatDate();
  const [advOpen, setAdvOpen] = useState(false);
  const [sumOpen, setSumOpen] = useState(false);

  const set = (name, value) => onChange({ ...filters, [name]: value });

  return (
    <section className="search-panel" aria-label="Search filters">
      {/* ── main filter row ── */}
      <div className="search-filter-row">
        <div className="search-filter-group">
          <label>Patient Name</label>
          <input
            type="text"
            value={filters.patientName || ''}
            onChange={(e) => set('patientName', e.target.value)}
          />
        </div>

        <div className="search-filter-group">
          <label>From Date</label>
          <input
            type="text"
            value={filters.fromDate || today}
            onChange={(e) => set('fromDate', e.target.value)}
          />
        </div>

        <div className="search-filter-group">
          <label>To Date</label>
          <input
            type="text"
            value={filters.toDate || today}
            onChange={(e) => set('toDate', e.target.value)}
          />
        </div>

        <div className="search-filter-group labcode-group">
          <label>Lab Code</label>
          <div className="labcode-inputs">
            <input
              type="text"
              placeholder="From"
              value={filters.fromLabcode || ''}
              onChange={(e) => set('fromLabcode', e.target.value)}
            />
            <span>To</span>
            <input
              type="text"
              placeholder="To"
              value={filters.toLabcode || ''}
              onChange={(e) => set('toLabcode', e.target.value)}
            />
          </div>
        </div>

        <div className="search-filter-group">
          <label>Test/Sample Barcode</label>
          <input
            type="text"
            value={filters.barcode || ''}
            onChange={(e) => set('barcode', e.target.value)}
          />
        </div>

        <div className="search-filter-group">
          <label>Select State</label>
          <select value={filters.state || ''} onChange={(e) => set('state', e.target.value)}>
            <option value="">Select</option>
            <option>Maharashtra</option>
            <option>Gujarat</option>
            <option>Madhya Pradesh</option>
            <option>Karnataka</option>
            <option>Goa</option>
          </select>
        </div>

        <div className="search-btn-group">
          <button type="button" className="btn-search" onClick={onSearch}>Search</button>
          <button type="button" className="btn-search-secondary">Tally</button>
          <button type="button" className="btn-search-secondary">ExcelAll</button>
          <button type="button" className="btn-search-secondary">Excel</button>
        </div>
      </div>

      {/* ── advance search ── */}
      <div className="search-accordion">
        <button type="button" className="search-accordion-hd" onClick={() => setAdvOpen((v) => !v)}>
          <span className="search-accordion-arrow">{advOpen ? '▼' : '▶'}</span>
          Advance Search
        </button>
        {advOpen && (
          <div className="search-accordion-body">
            <div className="adv-filter-grid">
              <div className="form-row">
                <label>Doctor Name</label>
                <input type="text" value={filters.doctorName || ''} onChange={(e) => set('doctorName', e.target.value)} />
              </div>
              <div className="form-row">
                <label>Collection Center</label>
                <input type="text" value={filters.collectionCenter || ''} onChange={(e) => set('collectionCenter', e.target.value)} />
              </div>
              <div className="form-row">
                <label>Test Name</label>
                <input type="text" value={filters.selectTest || ''} onChange={(e) => set('selectTest', e.target.value)} />
              </div>
              <div className="form-row">
                <label>Test Category</label>
                <select>
                  <option value="">-- All --</option>
                  <option>Biochemistry</option>
                  <option>Hematology</option>
                  <option>Serology</option>
                  <option>Microbiology</option>
                </select>
              </div>
              <div className="form-row">
                <label>Mobile Number</label>
                <input type="text" value={filters.mobile || ''} onChange={(e) => set('mobile', e.target.value)} />
              </div>
              <div className="form-row">
                <label>Aadhar Number</label>
                <input type="text" value={filters.aadhar || ''} onChange={(e) => set('aadhar', e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── view summary ── */}
      <div className="search-accordion">
        <button type="button" className="search-accordion-hd" onClick={() => setSumOpen((v) => !v)}>
          <span className="search-accordion-arrow">{sumOpen ? '▼' : '▶'}</span>
          View Summary
        </button>
        {sumOpen && (
          <div className="search-accordion-body">
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Summary data will appear here after search.</p>
          </div>
        )}
      </div>
    </section>
  );
}

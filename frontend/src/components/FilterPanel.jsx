import { formatDate } from '../utils/date';

export default function FilterPanel({ filters, onChange, onSearch }) {
  const today = formatDate();

  const set = (name, value) => onChange({ ...filters, [name]: value });

  return (
    <section className="filter-panel" aria-label="Search filters">
      <div className="filter-grid">
        <div className="form-row">
          <label>Patient Name</label>
          <input type="text" name="patientName" value={filters.patientName || ''} onChange={(e) => set('patientName', e.target.value)} />
        </div>
        <div className="form-row">
          <label>From Date</label>
          <input type="text" name="fromDate" value={filters.fromDate || today} onChange={(e) => set('fromDate', e.target.value)} />
        </div>
        <div className="form-row">
          <label>To Date</label>
          <input type="text" name="toDate" value={filters.toDate || today} onChange={(e) => set('toDate', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Select Test</label>
          <input type="text" name="selectTest" value={filters.selectTest || ''} onChange={(e) => set('selectTest', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Labcode</label>
          <input type="text" placeholder="From Labcode" name="fromLabcode" value={filters.fromLabcode || ''} onChange={(e) => set('fromLabcode', e.target.value)} />
        </div>
        <div className="form-row">
          <label>&nbsp;</label>
          <input type="text" placeholder="To Labcode" name="toLabcode" value={filters.toLabcode || ''} onChange={(e) => set('toLabcode', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Test Category</label>
          <select multiple size="4" name="testCategory" className="multi-select">
            <option>Biochemistry</option>
            <option>Hematology</option>
            <option>Serology</option>
            <option>Microbiology</option>
          </select>
        </div>
        <div className="form-row">
          <label>Collection Center</label>
          <input type="text" name="collectionCenter" value={filters.collectionCenter || ''} onChange={(e) => set('collectionCenter', e.target.value)} />
        </div>
        <div className="filter-actions">
          <button type="button" className="btn-blue">Direct Print</button>
          <button type="button" className="btn-link" onClick={onSearch}>Search</button>
        </div>
      </div>
    </section>
  );
}

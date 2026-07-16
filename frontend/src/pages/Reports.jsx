import { useEffect, useState } from 'react';
import FilterPanel from '../components/FilterPanel';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

const REPORTS = [
  { id: 'daily', label: 'Daily Summary', desc: 'registrations and revenue for the day' },
  { id: 'collection', label: 'Collection Report', desc: 'home collection and phlebotomy' },
  { id: 'outstanding', label: 'Outstanding Report', desc: 'pending payments' },
  { id: 'tat', label: 'TAT Report', desc: 'turnaround time analysis' },
];

export default function Reports() {
  const [filters, setFilters] = useState({ fromDate: formatDate(), toDate: formatDate() });
  const [report, setReport] = useState(null);
  const [activeType, setActiveType] = useState('daily');

  const generate = async (type = activeType) => {
    const data = await api.getReportSummary(type);
    setReport(data);
    setActiveType(type);
  };

  useEffect(() => {
    const hashType = window.location.hash.replace('#', '');
    if (hashType && REPORTS.some((item) => item.id === hashType)) {
      generate(hashType);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout activePage="reports">
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul><li><a href="/search">Home</a></li><li>Reports</li></ul>
        </nav>
        <h2 className="page-heading">Reports</h2>
        <ul className="report-links">
          {REPORTS.map((r) => (
            <li key={r.id} id={r.id}>
              <a href={`#${r.id}`} onClick={(e) => { e.preventDefault(); generate(r.id); }}>{r.label}</a> — {r.desc}
            </li>
          ))}
        </ul>
        <section className="content-panel">
          <p>Select a report from the list above. Use filters and click Generate.</p>
          <FilterPanel filters={filters} onChange={setFilters} onSearch={() => generate()} />
          <button type="button" className="btn-blue" onClick={() => generate()}>Generate Report</button>
          <div className="card-placeholder tall" style={{ marginTop: 12 }}>
            {report ? (
              <div>
                <p><strong>{report.type}</strong> — {report.count} records, total revenue ₹{report.total_revenue}</p>
                <ul>
                  {report.rows?.slice(0, 10).map((row) => (
                    <li key={row.lab_code}>{row.lab_code} — {row.patient_name} — ₹{row.amount}</li>
                  ))}
                </ul>
              </div>
            ) : 'Report preview area'}
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

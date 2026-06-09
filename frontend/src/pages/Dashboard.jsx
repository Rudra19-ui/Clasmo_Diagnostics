import { useEffect, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const today = formatDate();

  useEffect(() => {
    api.getDashboardSummary().then(setSummary).catch(console.error);
  }, []);

  return (
    <Layout activePage="dashboard">
      <main className="dash-main">
        <div className="page-title-bar">
          <h2>eLab Dashboard</h2>
          <div className="dash-filters-inline">
            <label>From Date <input type="text" defaultValue={today} /></label>
            <label>To Date <input type="text" defaultValue={today} /></label>
            <select><option>MRP/Net Amount</option><option>Count</option></select>
            <button type="button" className="btn-blue">UPDATE</button>
          </div>
        </div>
        <div className="dashboard-grid">
          <section className="dash-card span-2">
            <h3>TAT Summary</h3>
            <div className="card-controls">
              <label>Select Test:</label>
              <select><option>Display Name</option></select>
              <input type="text" placeholder="Search test" />
            </div>
            <div className="card-placeholder chart-placeholder">
              {summary ? `${summary.total_registrations} registrations | Revenue ₹${summary.total_revenue}` : 'Chart / summary data'}
            </div>
          </section>
          <section className="dash-card">
            <h3>Test Level Status Summary</h3>
            <div className="card-placeholder">
              {summary ? (
                <ul>
                  {Object.entries(summary.status_breakdown || {}).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
                </ul>
              ) : 'Status breakdown'}
            </div>
          </section>
          <section className="dash-card span-2">
            <h3>Department wise Dashboard Summary</h3>
            <div className="card-controls two-col">
              <div><label>Department</label><select multiple size="5"><option>Biochemistry</option><option>Hematology</option></select></div>
              <div><label>Test Category</label><select multiple size="5"><option>Routine</option><option>Special</option></select></div>
            </div>
            <button type="button" className="btn-blue">Search</button>
            <div className="card-placeholder">
              {summary?.department_summary?.map((d) => <div key={d.department}>{d.department}: {d.count}</div>) || 'Department summary'}
            </div>
          </section>
          <section className="dash-card">
            <h3>Collection Center wise Summary</h3>
            <div className="card-placeholder">Center summary</div>
          </section>
          <section className="dash-card full-width">
            <h3>Affiliation wise Summary</h3>
            <div className="card-controls wrap">
              <select><option>Registration wise</option></select>
              <select><option>Department</option></select>
              <select><option>Test Category</option></select>
              <button type="button" className="btn-blue">Get Summary</button>
              <button type="button" className="btn-outline">Aff. Summary Export To Excel</button>
              <label><input type="radio" name="aff" defaultChecked /> All Affiliation</label>
              <label><input type="radio" name="aff" /> Default Top 10 Affiliation</label>
              <select><option>Sales Rep: Select</option></select>
            </div>
            <div className="card-placeholder tall">Affiliation summary table</div>
          </section>
        </div>
      </main>
      <Footer />
    </Layout>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import {
  BarChart,
  ComboChart,
  DonutChart,
  HistoryChart,
  StackedBarChart,
  SummaryCard,
} from '../components/dashboard/DashboardCharts';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

const METRIC_OPTIONS = [
  { value: 'mrp_net_amount', label: 'MRP(Net Amount)' },
  { value: 'count', label: 'Count' },
];

const AFFILIATION_MODES = [
  { value: 'registration', label: 'Registration wise' },
  { value: 'amount', label: 'Amount wise' },
];

const HISTORY_PERIODS = [
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '6m', label: '6 Month' },
  { value: '1y', label: '1 Year' },
];

function todayRange() {
  const today = formatDate();
  return { from_date: today, to_date: today };
}

export default function Dashboard() {
  const initial = useMemo(() => todayRange(), []);
  const [draftFilters, setDraftFilters] = useState({
    ...initial,
    metric: 'mrp_net_amount',
    test_id: '',
    departments: [],
    categories: [],
    affiliation_mode: 'registration',
    affiliation: '',
    sales_rep: '',
    affiliation_scope: 'top10',
    history_period: '1m',
  });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        from_date: appliedFilters.from_date,
        to_date: appliedFilters.to_date,
        metric: appliedFilters.metric,
        affiliation_mode: appliedFilters.affiliation_mode,
        affiliation: appliedFilters.affiliation,
        history_period: appliedFilters.history_period,
      };
      if (appliedFilters.test_id) params.test_id = appliedFilters.test_id;
      appliedFilters.departments.forEach((id) => {
        params.department = params.department || [];
        if (Array.isArray(params.department)) params.department.push(id);
      });
      appliedFilters.categories.forEach((id) => {
        params.category = params.category || [];
        if (Array.isArray(params.category)) params.category.push(id);
      });
      const response = await api.getDashboardSummary(params);
      setData(response);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const setDraft = (key, value) => setDraftFilters((prev) => ({ ...prev, [key]: value }));

  const handleUpdate = () => setAppliedFilters({ ...draftFilters });

  const handleDepartmentSearch = () => setAppliedFilters({ ...draftFilters });

  const handleAffiliationSummary = () => setAppliedFilters({ ...draftFilters });

  const handleHistory = (period) => {
    const next = { ...appliedFilters, history_period: period };
    setDraftFilters((prev) => ({ ...prev, history_period: period }));
    setAppliedFilters(next);
  };

  const collectionRows = (data?.collection_center_wise || []).map((row) => ({
    label: row.center,
    value: row.net_amount,
    registration_count: row.registration_count,
  }));

  const tatRows = (data?.tat_summary || []).map((row) => ({
    label: row.label,
    value: row.tat_hours,
  }));

  return (
    <Layout activePage="dashboard">
      <main className="dash-main elab-dashboard-main">
        <div className="page-title-bar elab-dashboard-header">
          <h2>eLab Dashboard</h2>
          <div className="dash-filters-inline">
            <label>
              From Date
              <input
                type="text"
                value={draftFilters.from_date}
                onChange={(event) => setDraft('from_date', event.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </label>
            <label>
              To Date
              <input
                type="text"
                value={draftFilters.to_date}
                onChange={(event) => setDraft('to_date', event.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </label>
            <select
              value={draftFilters.metric}
              onChange={(event) => setDraft('metric', event.target.value)}
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button type="button" className="btn-blue" onClick={handleUpdate} disabled={loading}>
              UPDATE
            </button>
          </div>
        </div>

        {error && (
          <p className="change-password-message error" role="alert">
            {error}
            {error.toLowerCase().includes('token') && (
              <> Please <a href="/login">log in again</a> after switching to PostgreSQL.</>
            )}
          </p>
        )}
        {loading && <p className="elab-dashboard-loading">Loading dashboard...</p>}

        {!loading && data && (
          <>
            <section className="elab-summary-row">
              <SummaryCard title="All" data={data.summary_cards?.all} />
              <SummaryCard title="IPD" data={data.summary_cards?.ipd} />
              <SummaryCard title="OPD" data={data.summary_cards?.opd} />
            </section>

            <div className="dashboard-grid elab-dashboard-grid">
              <section className="dash-card span-2">
                <h3>TAT Summary</h3>
                <div className="card-controls">
                  <label htmlFor="dash-test-select">Select Test:</label>
                  <select
                    id="dash-test-select"
                    value={draftFilters.test_id}
                    onChange={(event) => setDraft('test_id', event.target.value)}
                  >
                    <option value="">Display Name</option>
                    {(data.filter_options?.tests || []).map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.short_name || test.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-outline btn-sm" onClick={handleUpdate}>Apply</button>
                </div>
                <BarChart rows={tatRows} valueKey="value" labelKey="label" color="#1a5276" height={260} />
              </section>

              <section className="dash-card">
                <h3>Test Level Status Summary</h3>
                <DonutChart segments={data.test_status_summary || []} />
              </section>

              <section className="dash-card span-2">
                <h3>Department wise Dashboard Summary</h3>
                <div className="card-controls two-col">
                  <div>
                    <label>Department</label>
                    <select
                      multiple
                      size={6}
                      value={draftFilters.departments}
                      onChange={(event) => {
                        const values = Array.from(event.target.selectedOptions, (option) => option.value);
                        setDraft('departments', values);
                      }}
                    >
                      <option value="">Select Department</option>
                      {(data.filter_options?.departments || []).map((item) => (
                        <option key={item.id} value={String(item.id)}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Test Category</label>
                    <select
                      multiple
                      size={6}
                      value={draftFilters.categories}
                      onChange={(event) => {
                        const values = Array.from(event.target.selectedOptions, (option) => option.value);
                        setDraft('categories', values);
                      }}
                    >
                      <option value="">Select Category</option>
                      {(data.filter_options?.categories || []).map((item) => (
                        <option key={item.id} value={String(item.id)}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" className="btn-blue btn-sm" onClick={handleDepartmentSearch}>Search</button>
                <StackedBarChart
                  segments={data.department_wise?.segments || []}
                  monthLabel={data.department_wise?.month_label}
                  totalLabel={`${Math.round((data.department_wise?.total_net_amount || 0) / 1000)}k`}
                />
              </section>

              <section className="dash-card">
                <h3>Collection Center wise Summary</h3>
                <BarChart rows={collectionRows} valueKey="value" labelKey="label" color="#922b21" height={260} />
                <div className="elab-collection-meta">
                  {(data.collection_center_wise || []).map((row) => (
                    <div key={row.center} className="elab-collection-row">
                      <span>{row.center}</span>
                      <strong>₹{Number(row.net_amount).toLocaleString('en-IN')}</strong>
                      <em>{row.registration_count} registrations</em>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dash-card full-width">
                <h3>Affiliation wise Summary</h3>
                <div className="card-controls wrap elab-aff-controls">
                  <select
                    value={draftFilters.affiliation_mode}
                    onChange={(event) => setDraft('affiliation_mode', event.target.value)}
                  >
                    {AFFILIATION_MODES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select
                    value={draftFilters.departments[0] || ''}
                    onChange={(event) => setDraft('departments', event.target.value ? [event.target.value] : [])}
                  >
                    <option value="">Department</option>
                    {(data.filter_options?.departments || []).map((item) => (
                      <option key={item.id} value={String(item.id)}>{item.name}</option>
                    ))}
                  </select>
                  <select
                    value={draftFilters.categories[0] || ''}
                    onChange={(event) => setDraft('categories', event.target.value ? [event.target.value] : [])}
                  >
                    <option value="">Test Category</option>
                    {(data.filter_options?.categories || []).map((item) => (
                      <option key={item.id} value={String(item.id)}>{item.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-blue btn-sm" onClick={handleAffiliationSummary}>Get Summary</button>
                  <button type="button" className="btn-outline btn-sm">Aff. Summary Export To Excel</button>
                  <label><input type="radio" name="aff-scope" checked={draftFilters.affiliation_scope === 'all'} onChange={() => setDraft('affiliation_scope', 'all')} /> All Affiliation</label>
                  <label><input type="radio" name="aff-scope" checked={draftFilters.affiliation_scope === 'top10'} onChange={() => setDraft('affiliation_scope', 'top10')} /> Default Top 10 Affiliation</label>
                  <input
                    type="text"
                    placeholder="Affiliation"
                    value={draftFilters.affiliation}
                    onChange={(event) => setDraft('affiliation', event.target.value)}
                  />
                  <select
                    value={draftFilters.sales_rep}
                    onChange={(event) => setDraft('sales_rep', event.target.value)}
                  >
                    <option value="">Sales Rep: Select</option>
                    {(data.filter_options?.sales_reps || []).map((item) => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <ComboChart
                  rows={data.affiliation_wise || []}
                  barKey="registration_wise_count"
                  lineKey="registration_count"
                  labelKey="affiliation"
                />
              </section>

              <section className="dash-card full-width elab-history-card">
                <div className="elab-history-toolbar">
                  <span className="elab-history-label">History :</span>
                  {HISTORY_PERIODS.map((period) => (
                    <button
                      key={period.value}
                      type="button"
                      className={appliedFilters.history_period === period.value ? 'btn-blue btn-sm' : 'btn-outline btn-sm'}
                      onClick={() => handleHistory(period.value)}
                    >
                      {period.label}
                    </button>
                  ))}
                  <button type="button" className="btn-outline btn-sm">Aff. History Export To Excel</button>
                </div>
                <HistoryChart rows={data.affiliation_history || []} />
              </section>
            </div>
          </>
        )}
      </main>
      <Footer />
    </Layout>
  );
}

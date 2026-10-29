import { useCallback, useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import WalletBalanceBadge from '../components/WalletBalanceBadge';
import {
  BarChart,
  ComboChart,
  DonutChart,
  StackedBarChart,
  SummaryCard,
  formatMoney,
} from '../components/dashboard/DashboardCharts';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { canScanSampleBarcode, FRANCHISE_ROLES, ROLES } from '../utils/roles';

const DASHBOARD_ACTIONS = [
  { label: 'Enquire Box', href: '/enquire-box' },
  { label: 'Our Partner', href: '/#join-form' },
  { label: 'Query Complaint', href: '/device/message-to-lab' },
  { label: 'Self Patient Query', href: '/self-patient-query' },
];

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const FRANCHISE_COLORS = {
  super_franchisee: '#c0392b',
  franchisee: '#e67e22',
  sub_franchise: '#5dade2',
};

const FRANCHISE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'super_franchisee', label: 'Supreme' },
  { value: 'franchisee', label: 'Prime' },
  { value: 'sub_franchise', label: 'Sub-Franchise' },
];

const ZONE_PALETTE = ['#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#2ecc71', '#34495e', '#16a085'];

function todayIsoLocal() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatInr(value) {
  return `₹ ${formatMoney(value)}`;
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const { user, isSuperAdmin } = useAuth();
  const isFranchise = FRANCHISE_ROLES.includes(user?.role);
  const [wallet, setWallet] = useState(null);
  const [zones, setZones] = useState([]);
  const [period, setPeriod] = useState('month');
  const [incomeDate, setIncomeDate] = useState(todayIsoLocal);
  const [incomeMonth, setIncomeMonth] = useState(() => new Date().getMonth() + 1);
  const [incomeYear, setIncomeYear] = useState(() => new Date().getFullYear());
  const [zoneFilter, setZoneFilter] = useState('all');
  const [zoneIncome, setZoneIncome] = useState(null);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState('1m');
  const [franchiseTypeFilter, setFranchiseTypeFilter] = useState('all');
  const [franchiseIdFilter, setFranchiseIdFilter] = useState('all');

  useEffect(() => {
    if (!isFranchise) return undefined;
    let cancelled = false;
    api.getMyWallet()
      .then((data) => {
        if (!cancelled) setWallet(data);
      })
      .catch(() => {
        if (!cancelled) setWallet(null);
      });
    return () => { cancelled = true; };
  }, [isFranchise, user?.id]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let cancelled = false;
    api.getZones()
      .then((data) => {
        if (!cancelled) setZones(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setZones([]);
      });
    return () => { cancelled = true; };
  }, [isSuperAdmin]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => current - index);
  }, []);

  const loadZoneIncome = useCallback(async () => {
    if (!isSuperAdmin) return;
    setIncomeLoading(true);
    setIncomeError('');
    try {
      const params = { period };
      if (zoneFilter && zoneFilter !== 'all') params.zone_id = zoneFilter;
      if (period === 'day') params.date = incomeDate;
      if (period === 'month') {
        params.year = incomeYear;
        params.month = incomeMonth;
      }
      if (period === 'year') params.year = incomeYear;
      const data = await api.getZoneDailyIncome(params);
      setZoneIncome(data);
    } catch (err) {
      setZoneIncome(null);
      setIncomeError(err.message || 'Unable to load zone business.');
    } finally {
      setIncomeLoading(false);
    }
  }, [isSuperAdmin, period, zoneFilter, incomeDate, incomeMonth, incomeYear]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    loadZoneIncome();
    return undefined;
  }, [isSuperAdmin, loadZoneIncome]);

  useEffect(() => {
    if (historyPeriod === '1w') setPeriod('day');
    if (historyPeriod === '1m') setPeriod('month');
    if (historyPeriod === '1y') setPeriod('year');
  }, [historyPeriod]);

  const showWelcomeActions = !isFranchise && (
    isSuperAdmin
    || user?.role === ROLES.ADMIN
    || user?.role === ROLES.HR
    || !canScanSampleBarcode(user)
  );

  const balance = Number(wallet?.balance ?? 0);
  const negative = isFranchise && balance < 0;
  const zoneRows = zoneIncome?.zones || [];
  const cards = zoneIncome?.summary_cards || null;

  const rangeLabel = useMemo(() => {
    if (!zoneIncome) return '';
    if (period === 'day') return formatDisplayDate(zoneIncome.date || incomeDate);
    if (period === 'month') {
      const monthName = MONTH_OPTIONS.find((item) => item.value === Number(incomeMonth))?.label || '';
      return `${monthName} ${incomeYear}`;
    }
    return `Year ${incomeYear}`;
  }, [zoneIncome, period, incomeDate, incomeMonth, incomeYear]);

  const franchiseDonut = useMemo(() => (
    (zoneIncome?.franchise_totals || []).map((row) => ({
      label: `${row.role_label} ${row.registrations}`,
      value: Number(row.net_amount || 0),
      color: FRANCHISE_COLORS[row.role] || '#95a5a6',
    }))
  ), [zoneIncome]);

  const zoneStackedSegments = useMemo(() => (
    zoneRows.map((row, index) => ({
      department: row.zone_name,
      net_amount: Number(row.net_amount || 0),
      color: ZONE_PALETTE[index % ZONE_PALETTE.length],
    }))
  ), [zoneRows]);

  const zoneComboRows = useMemo(() => (
    zoneRows.map((row) => ({
      label: row.zone_name,
      net_amount: Number(row.net_amount || 0),
      registrations: Number(row.registrations || 0),
    }))
  ), [zoneRows]);

  const franchiseBarRows = useMemo(() => {
    if (zoneFilter !== 'all' && zoneRows[0]?.franchises?.length) {
      return zoneRows[0].franchises.map((row) => ({
        label: row.role_label,
        value: Number(row.net_amount || 0),
        color: FRANCHISE_COLORS[row.role] || '#3498db',
      }));
    }
    return (zoneIncome?.franchise_totals || []).map((row) => ({
      label: row.role_label,
      value: Number(row.net_amount || 0),
      color: FRANCHISE_COLORS[row.role] || '#3498db',
    }));
  }, [zoneFilter, zoneRows, zoneIncome]);

  const selectedZoneName = useMemo(() => {
    if (zoneFilter === 'all') return 'All Zones';
    return zones.find((zone) => String(zone.id) === String(zoneFilter))?.name || 'Selected Zone';
  }, [zoneFilter, zones]);

  const franchiseAccountOptions = useMemo(() => {
    const byId = new Map();
    zoneRows.forEach((zoneRow) => {
      (zoneRow.franchises || []).forEach((franchise) => {
        if (!franchise.user_id) return;
        if (franchiseTypeFilter !== 'all' && franchise.role !== franchiseTypeFilter) return;
        const key = String(franchise.user_id);
        if (byId.has(key)) return;
        byId.set(key, {
          value: key,
          label: `${franchise.display_name || franchise.username || key}${franchise.username ? ` (${franchise.username})` : ''}`,
          role: franchise.role,
          role_label: franchise.role_label,
        });
      });
    });
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [zoneRows, franchiseTypeFilter]);

  useEffect(() => {
    if (franchiseIdFilter === 'all') return;
    const stillValid = franchiseAccountOptions.some((opt) => opt.value === franchiseIdFilter);
    if (!stillValid) setFranchiseIdFilter('all');
  }, [franchiseAccountOptions, franchiseIdFilter]);

  const filteredZoneFranchiseRows = useMemo(() => (
    zoneRows
      .map((zoneRow) => {
        const franchises = (zoneRow.franchises || []).filter((franchise) => {
          if (franchiseTypeFilter !== 'all' && franchise.role !== franchiseTypeFilter) return false;
          if (franchiseIdFilter !== 'all' && String(franchise.user_id) !== String(franchiseIdFilter)) return false;
          return true;
        });
        return { ...zoneRow, franchises };
      })
      .filter((zoneRow) => zoneRow.franchises.length > 0)
  ), [zoneRows, franchiseTypeFilter, franchiseIdFilter]);

  return (
    <Layout activePage="dashboard">
      <main className={`dash-main dashboard-home-main${isSuperAdmin ? ' elab-dashboard-main' : ''}`}>
        {isFranchise && (
          <section className={`dashboard-wallet-banner${negative ? ' dashboard-wallet-banner-negative' : ''}`}>
            <div>
              <p className="dashboard-wallet-label">Wallet credits</p>
              <p className="dashboard-wallet-balance">₹{balance.toFixed(2)}</p>
              {negative && (
                <p className="dashboard-wallet-warning">
                  Balance is negative. Report release is blocked until you add credits.
                </p>
              )}
            </div>
            <div className="dashboard-wallet-actions">
              <WalletBalanceBadge user={user} />
              <Link to="/franchise/online-payment" className="btn-orange">Add credits</Link>
              <Link to="/franchise/pricing-credits" className="btn-secondary">Wallet history</Link>
            </div>
          </section>
        )}

        <div className="dashboard-home-shell">
          <h1 className="dashboard-welcome-heading">
            Welcome to <span>Clasmo</span>
          </h1>

          {showWelcomeActions && (
            <section className="dashboard-welcome-hero">
              <div className="dashboard-welcome-actions">
                {DASHBOARD_ACTIONS.map((action) => (
                  <Link key={action.label} to={action.href} className="dashboard-welcome-btn">
                    {action.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {isSuperAdmin && (
            <section className="elab-superadmin-dashboard">
              <div className="elab-dashboard-header">
                <div>
                  <h2 className="page-heading" style={{ marginBottom: 4 }}>Business Dashboard</h2>
                  <p className="zone-income-subtitle">
                    Daily / monthly / yearly income across zones and Supreme · Prime · Sub franchises.
                  </p>
                </div>
                <div className="elab-history-links" aria-label="Quick period">
                  <button type="button" className={historyPeriod === '1w' ? 'is-active' : ''} onClick={() => setHistoryPeriod('1w')}>1 Week</button>
                  <button type="button" className={historyPeriod === '1m' ? 'is-active' : ''} onClick={() => setHistoryPeriod('1m')}>1 Month</button>
                  <button type="button" className={historyPeriod === '6m' ? 'is-active' : ''} onClick={() => { setHistoryPeriod('6m'); setPeriod('month'); }}>6 Month</button>
                  <button type="button" className={historyPeriod === '1y' ? 'is-active' : ''} onClick={() => setHistoryPeriod('1y')}>1 Year</button>
                </div>
              </div>

              <form
                className="elab-filter-bar"
                onSubmit={(event) => {
                  event.preventDefault();
                  loadZoneIncome();
                }}
              >
                <label>
                  <span>Period</span>
                  <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                    <option value="day">Daily</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </label>

                {period === 'day' && (
                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      value={incomeDate}
                      max={todayIsoLocal()}
                      onChange={(event) => setIncomeDate(event.target.value || todayIsoLocal())}
                    />
                  </label>
                )}

                {period === 'month' && (
                  <label>
                    <span>Month</span>
                    <select value={incomeMonth} onChange={(event) => setIncomeMonth(Number(event.target.value))}>
                      {MONTH_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {(period === 'month' || period === 'year') && (
                  <label>
                    <span>Year</span>
                    <select value={incomeYear} onChange={(event) => setIncomeYear(Number(event.target.value))}>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  <span>Zone</span>
                  <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
                    <option value="all">All Zones</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} ({zone.code})
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" className="btn-blue btn-sm" disabled={incomeLoading}>
                  {incomeLoading ? 'Loading…' : 'Get Summary'}
                </button>
              </form>

              {incomeError && <p className="login-error" role="alert">{incomeError}</p>}
              {incomeLoading && <p className="elab-dashboard-loading">Loading dashboard summary…</p>}

              {!incomeLoading && cards && (
                <>
                  <div className="elab-summary-row">
                    <SummaryCard title="All" data={cards.all} />
                    <SummaryCard title="IPD" data={cards.ipd} />
                    <SummaryCard title="OPD" data={cards.opd} />
                  </div>

                  <div className="elab-dashboard-grid dashboard-grid">
                    <section className="dash-card">
                      <h3>Franchise Income Share</h3>
                      <p className="elab-card-caption">{rangeLabel} · {selectedZoneName}</p>
                      <DonutChart segments={franchiseDonut} />
                    </section>

                    <section className="dash-card">
                      <h3>Zone wise Dashboard Summary</h3>
                      <p className="elab-card-caption">Net amount by zone</p>
                      <StackedBarChart
                        segments={zoneStackedSegments}
                        monthLabel={rangeLabel}
                        totalLabel={zoneIncome?.totals?.net_amount
                          ? `${Math.round(Number(zoneIncome.totals.net_amount) / 1000)}k`
                          : '0'}
                      />
                    </section>

                    <section className="dash-card">
                      <h3>Zone wise Collection Summary</h3>
                      <p className="elab-card-caption">Net amount vs registrations</p>
                      <ComboChart
                        rows={zoneComboRows}
                        barKey="net_amount"
                        lineKey="registrations"
                        labelKey="label"
                      />
                      <div className="elab-collection-meta">
                        {zoneComboRows.map((row) => (
                          <div key={row.label} className="elab-collection-row">
                            <strong>{row.label}</strong>
                            <em>{row.registrations} regs</em>
                            <span>{formatInr(row.net_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="dash-card">
                      <h3>Franchise wise Summary</h3>
                      <p className="elab-card-caption">
                        Supreme · Prime · Sub
                        {zoneFilter !== 'all' ? ` · ${selectedZoneName}` : ' · All Zones'}
                      </p>
                      <BarChart rows={franchiseBarRows} valueKey="value" labelKey="label" height={240} money />
                    </section>
                  </div>

                  <section className="dash-card zone-franchise-detail-card">
                    <h3>Franchise Income Details</h3>
                    <p className="elab-card-caption">
                      Supreme, Prime, and Sub-Franchise income for each zone (by booking creator).
                    </p>

                    <div className="elab-franchise-detail-filters">
                      <label>
                        <span>Franchise Type</span>
                        <select
                          value={franchiseTypeFilter}
                          onChange={(event) => {
                            setFranchiseTypeFilter(event.target.value);
                            setFranchiseIdFilter('all');
                          }}
                        >
                          {FRANCHISE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          {franchiseTypeFilter === 'super_franchisee' && 'Supreme ID'}
                          {franchiseTypeFilter === 'franchisee' && 'Prime ID'}
                          {franchiseTypeFilter === 'sub_franchise' && 'Sub-Franchise ID'}
                          {franchiseTypeFilter === 'all' && 'Franchise ID'}
                        </span>
                        <select
                          value={franchiseIdFilter}
                          onChange={(event) => setFranchiseIdFilter(event.target.value)}
                          disabled={franchiseTypeFilter === 'all'}
                        >
                          <option value="all">
                            {franchiseTypeFilter === 'all'
                              ? 'Select type first'
                              : `All ${FRANCHISE_TYPE_OPTIONS.find((o) => o.value === franchiseTypeFilter)?.label || ''} IDs`}
                          </option>
                          {franchiseTypeFilter !== 'all' && franchiseAccountOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      {(franchiseTypeFilter !== 'all' || franchiseIdFilter !== 'all') && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setFranchiseTypeFilter('all');
                            setFranchiseIdFilter('all');
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    <div className="zone-franchise-income-list">
                      {filteredZoneFranchiseRows.length === 0 && (
                        <p className="elab-chart-empty-text">No franchise accounts match the selected filters.</p>
                      )}
                      {filteredZoneFranchiseRows.map((zoneRow) => {
                        const filteredRegs = zoneRow.franchises.reduce((sum, row) => sum + Number(row.registrations || 0), 0);
                        const filteredNet = zoneRow.franchises.reduce((sum, row) => sum + Number(row.net_amount || 0), 0);
                        return (
                          <div
                            key={`franchise-${zoneRow.zone_id ?? zoneRow.zone_code}`}
                            className="zone-franchise-income-block"
                          >
                            <div className="zone-franchise-income-heading">
                              <strong>{zoneRow.zone_name}</strong>
                              <span className="muted-text">
                                Filtered total {formatInr(filteredNet)} · {filteredRegs} registrations
                              </span>
                            </div>
                            <div className="table-wrap">
                              <table className="data-table zone-income-table">
                                <thead>
                                  <tr>
                                    <th>Franchise</th>
                                    <th>Account</th>
                                    <th>Registrations</th>
                                    <th>Gross</th>
                                    <th>Net Income</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {zoneRow.franchises.map((franchise) => (
                                    <tr key={`${zoneRow.zone_id}-${franchise.role}-${franchise.user_id || 'missing'}`}>
                                      <td>
                                        <span className={`franchise-type-badge franchise-type-badge--${franchise.role}`}>
                                          {franchise.role_label}
                                        </span>
                                      </td>
                                      <td>
                                        <strong>{franchise.display_name}</strong>
                                        {franchise.username ? (
                                          <div className="muted-text"><code>{franchise.username}</code></div>
                                        ) : null}
                                      </td>
                                      <td>{franchise.registrations}</td>
                                      <td>{formatInr(franchise.total_amount)}</td>
                                      <td><strong>{formatInr(franchise.net_amount)}</strong></td>
                                      <td>{formatInr(franchise.paid_amount)}</td>
                                      <td>{formatInr(franchise.balance_amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </Layout>
  );
}

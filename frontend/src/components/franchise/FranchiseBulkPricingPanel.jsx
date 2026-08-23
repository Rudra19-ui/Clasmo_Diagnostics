import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../Footer';
import Layout from '../Layout';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

const PAGE_SIZE = 50;

export const BULK_PRICING_MODES = {
  admin_supreme: {
    targetRole: ROLES.SUPER_FRANCHISEE,
    selectLabel: 'Select Supreme',
    emptySelectMsg: 'Select a Supreme franchise to load tests.',
    selectFirstMsg: 'Select a Supreme franchise first.',
    pageTitle: 'Rate List — Supreme Bulk Pricing',
    breadcrumbs: [{ label: 'Home', to: '/search' }, { label: 'Franchise' }, { label: 'Franchise Pricing' }],
    activePage: 'franchise-bulk-pricing',
    transferPath: '/admin/franchise-transfer-pricing',
    entryLabel: 'Supreme',
    previewSaveHint: 'Supreme New Entry',
    adminMain: true,
  },
  supreme_prime: {
    targetRole: ROLES.FRANCHISEE,
    selectLabel: 'Select Prime',
    emptySelectMsg: 'Select a Prime franchise to load tests.',
    selectFirstMsg: 'Select a Prime franchise first.',
    pageTitle: 'Rate List — Prime Bulk Pricing',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Accounting' }, { label: 'Prime Pricing' }],
    activePage: 'franchisee-pricing',
    transferPath: '/franchise/franchisee-transfer-pricing',
    entryLabel: 'Prime',
    previewSaveHint: 'Prime New Entry',
    adminMain: false,
  },
  prime_sub: {
    targetRole: ROLES.SUB_FRANCHISE,
    selectLabel: 'Select Sub-Franchise',
    emptySelectMsg: 'Select a Sub-Franchise to load tests.',
    selectFirstMsg: 'Select a Sub-Franchise first.',
    pageTitle: 'Rate List — Sub-Franchise Bulk Pricing',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Sub Franchisee' }, { label: 'SubFranchisee Pricing' }],
    activePage: 'sub-franchisee-pricing',
    transferPath: '/franchise/sub-franchisee-transfer-pricing',
    entryLabel: 'Sub-Franchise',
    previewSaveHint: 'Sub-Franchise New Entry',
    adminMain: false,
  },
};

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function finalFromFranchiseePrice(franchiseePrice, ratePct) {
  const base = Number(franchiseePrice || 0);
  const rate = Number(ratePct || 0);
  if (!Number.isFinite(base) || base <= 0) return '0.00';
  return (base * (1 + rate / 100)).toFixed(2);
}

function resolveRate(testId, savedRate, globalRate, overrides) {
  if (Object.prototype.hasOwnProperty.call(overrides, testId)) {
    return overrides[testId];
  }
  if (globalRate != null && globalRate !== '') {
    return globalRate;
  }
  return savedRate ?? '0';
}

const RateRow = memo(function RateRow({
  index,
  testId,
  testCode,
  testName,
  mrp,
  franchiseePrice,
  ratePct,
  onRateChange,
}) {
  const finalPrice = finalFromFranchiseePrice(franchiseePrice, ratePct);
  return (
    <tr className={index % 2 === 0 ? 'rate-row-a' : 'rate-row-b'}>
      <td>{index + 1}</td>
      <td>{testCode}</td>
      <td>{testName}</td>
      <td>₹{money(mrp)}</td>
      <td>₹{money(franchiseePrice)}</td>
      <td>
        <input
          type="number"
          min="0"
          max="999"
          step="0.01"
          value={ratePct}
          onChange={(e) => onRateChange(testId, e.target.value)}
          className="franchise-rate-input"
        />
      </td>
      <td>₹{finalPrice}</td>
      <td>Rs. {finalPrice}</td>
    </tr>
  );
});

export default function FranchiseBulkPricingPanel({ mode = 'admin_supreme' }) {
  const config = BULK_PRICING_MODES[mode] || BULK_PRICING_MODES.admin_supreme;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('franchise_user_id') || '';

  const [franchisees, setFranchisees] = useState([]);
  const [franchiseUserId, setFranchiseUserId] = useState(initialId);
  const [overallPct, setOverallPct] = useState('20');
  const [catalog, setCatalog] = useState([]);
  const [globalRate, setGlobalRate] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const loadSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api.getUsers({ role: config.targetRole, is_active: true })
      .then((data) => {
        if (!cancelled) setFranchisees(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFranchisees([]);
      });
    return () => { cancelled = true; };
  }, [config.targetRole]);

  const loadRates = useCallback(async (userId) => {
    if (!userId) {
      setCatalog([]);
      setMeta(null);
      setGlobalRate(null);
      setOverrides({});
      setError('');
      return false;
    }
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.getFranchiseTestRates({ franchise_user_id: userId });
      if (seq !== loadSeqRef.current) return false;
      setMeta(data.franchise_user || null);
      setCatalog(data.rows || []);
      setGlobalRate(null);
      setOverrides({});
      setPage(1);
      setError('');
      return true;
    } catch (err) {
      if (seq !== loadSeqRef.current) return false;
      setError(err.message || 'Unable to load rate list.');
      setCatalog([]);
      setMeta(null);
      return false;
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

  // Resolve a valid franchise target first, then load rates.
  // Prevents stale ?franchise_user_id= requests from racing and leaving "Not found."
  useEffect(() => {
    if (franchisees.length === 0) return;

    const isValid = franchisees.some((row) => String(row.id) === String(franchiseUserId));
    if (!isValid) {
      if (franchisees.length === 1) {
        const onlyId = String(franchisees[0].id);
        setFranchiseUserId(onlyId);
        setSearchParams({ franchise_user_id: onlyId });
        return;
      }
      if (franchiseUserId) {
        loadSeqRef.current += 1;
        setFranchiseUserId('');
        setSearchParams({});
        setError('');
        setCatalog([]);
        setMeta(null);
        setLoading(false);
      }
      return;
    }

    loadRates(franchiseUserId);
  }, [franchisees, franchiseUserId, loadRates, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((row) => {
      const hay = `${row.test_name || ''} ${row.test_code || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [catalog, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredCatalog.slice(start, start + PAGE_SIZE).map((row) => {
      const ratePct = resolveRate(row.test_id, row.rate_pct, globalRate, overrides);
      return { row, ratePct };
    });
  }, [filteredCatalog, safePage, globalRate, overrides]);

  const selectedLabel = useMemo(() => {
    if (meta) {
      return `${meta.display_name} (${ROLE_LABELS[meta.role] || meta.role}${meta.zone_name ? ` · ${meta.zone_name}` : ''})`;
    }
    const found = franchisees.find((s) => String(s.id) === String(franchiseUserId));
    return found ? (found.display_name || found.username) : '';
  }, [meta, franchisees, franchiseUserId]);

  const onSelectFranchise = (value) => {
    setFranchiseUserId(value);
    setSuccess('');
    setError('');
    if (value) setSearchParams({ franchise_user_id: value });
    else setSearchParams({});
  };

  const onOverallPctChange = (value) => {
    setOverallPct(value);
    if (!franchiseUserId || catalog.length === 0) return;
    startTransition(() => {
      setGlobalRate(value);
      setOverrides({});
    });
    setSuccess(`Preview +${value || 0}% — click Change Price or Change All to save for ${config.previewSaveHint}.`);
  };

  const updateRowRate = useCallback((testId, value) => {
    startTransition(() => {
      setOverrides((prev) => ({ ...prev, [testId]: value }));
    });
  }, []);

  const applyOverallToVisible = async () => {
    if (!franchiseUserId) {
      setError(config.selectFirstMsg);
      return;
    }
    const q = search.trim();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!q) {
        startTransition(() => {
          setGlobalRate(overallPct);
          setOverrides({});
        });
        await api.saveFranchiseTestRates({
          franchise_user_id: Number(franchiseUserId),
          apply_all_pct: overallPct,
          rates: [],
        });
        setCatalog((prev) => prev.map((row) => ({
          ...row,
          rate_pct: String(overallPct),
          is_custom: true,
        })));
        setGlobalRate(null);
        setOverrides({});
        setSuccess(`Saved +${overallPct}% on Franchisee Price for all tests. ${config.previewSaveHint} will use these prices.`);
        return;
      }

      const visibleIds = filteredCatalog.map((row) => row.test_id);
      const nextOverrides = { ...overrides };
      visibleIds.forEach((id) => {
        nextOverrides[id] = overallPct;
      });
      startTransition(() => setOverrides(nextOverrides));

      await api.saveFranchiseTestRates({
        franchise_user_id: Number(franchiseUserId),
        rates: visibleIds.map((testId) => ({
          test_id: testId,
          rate_pct: overallPct,
        })),
      });
      setCatalog((prev) => prev.map((row) => (
        visibleIds.includes(row.test_id)
          ? { ...row, rate_pct: String(overallPct), is_custom: true }
          : row
      )));
      setOverrides({});
      setSuccess(`Saved +${overallPct}% for ${visibleIds.length} filtered test(s).`);
    } catch (err) {
      setError(err.message || 'Unable to save rates.');
    } finally {
      setSaving(false);
    }
  };

  const changeAllAndSave = async () => {
    if (!franchiseUserId) {
      setError(config.selectFirstMsg);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.saveFranchiseTestRates({
        franchise_user_id: Number(franchiseUserId),
        apply_all_pct: overallPct,
        rates: [],
      });
      setCatalog((prev) => prev.map((row) => ({
        ...row,
        rate_pct: String(overallPct),
        is_custom: true,
      })));
      setGlobalRate(null);
      setOverrides({});
      setSuccess(`All test rates set to +${overallPct}% and saved. ${config.previewSaveHint} will show Final Price.`);
    } catch (err) {
      setError(err.message || 'Unable to change all rates.');
    } finally {
      setSaving(false);
    }
  };

  const savePricing = async () => {
    if (!franchiseUserId) {
      setError(config.selectFirstMsg);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (globalRate != null && Object.keys(overrides).length === 0) {
        await api.saveFranchiseTestRates({
          franchise_user_id: Number(franchiseUserId),
          apply_all_pct: globalRate,
          rates: [],
        });
        setCatalog((prev) => prev.map((row) => ({
          ...row,
          rate_pct: String(globalRate),
          is_custom: true,
        })));
        setGlobalRate(null);
      } else {
        const rates = catalog.map((row) => ({
          test_id: row.test_id,
          rate_pct: resolveRate(row.test_id, row.rate_pct, globalRate, overrides),
        }));
        await api.saveFranchiseTestRates({
          franchise_user_id: Number(franchiseUserId),
          rates,
        });
        setCatalog((prev) => prev.map((row) => ({
          ...row,
          rate_pct: String(resolveRate(row.test_id, row.rate_pct, globalRate, overrides)),
          is_custom: true,
        })));
        setGlobalRate(null);
        setOverrides({});
      }
      setSuccess('Pricing updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update pricing.');
    } finally {
      setSaving(false);
    }
  };

  const pageStart = filteredCatalog.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredCatalog.length);
  const mainClass = config.adminMain ? 'dash-main admin-content-main' : 'dash-main franchise-module-page';

  return (
    <Layout activePage={config.activePage}>
      <main className={mainClass}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            {config.breadcrumbs.map((crumb, idx) => (
              <li key={crumb.label}>
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
              </li>
            ))}
          </ul>
        </nav>

        <h2 className="page-heading">{config.pageTitle}</h2>
        <p className="portfolio-intro">
          Rate % increases the upstream Franchisee Price (parent tier&apos;s Assigned Price, or catalog for Supreme).
          Final Price = Franchisee Price × (1 + Rate%).
          {' '}
          <Link to={config.transferPath}>Transfer Price</Link>
          {' '}to copy rates between {config.entryLabel} accounts.
        </p>

        <section className="content-panel franchise-rate-toolbar">
          <label>
            <span>Current Franchisee</span>
            <select
              value={franchiseUserId}
              onChange={(e) => onSelectFranchise(e.target.value)}
            >
              <option value="">{config.selectLabel}</option>
              {franchisees.map((row) => (
                <option key={row.id} value={row.id}>
                  {(row.display_name || row.username)}
                  {row.zone_name ? ` · ${row.zone_name}` : ''}
                  {` (${row.username})`}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Trigger Overall Price %</span>
            <input
              type="number"
              min="0"
              max="999"
              step="0.01"
              value={overallPct}
              onChange={(e) => onOverallPctChange(e.target.value)}
            />
          </label>

          <div className="franchise-rate-actions">
            <button type="button" className="btn-primary" onClick={applyOverallToVisible} disabled={!franchiseUserId || loading || saving}>
              {saving ? 'Saving…' : 'Change Price'}
            </button>
            <button type="button" className="btn-orange" onClick={changeAllAndSave} disabled={!franchiseUserId || saving}>
              {saving ? 'Saving…' : 'Change All'}
            </button>
          </div>

          <label className="franchise-list-search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Test name / code"
            />
          </label>
        </section>

        {selectedLabel && (
          <p className="portfolio-intro">Editing rates for: <strong>{selectedLabel}</strong></p>
        )}
        {error && <p className="login-error" role="alert">{error}</p>}
        {success && <p className="success-msg" role="status">{success}</p>}

        <section className="content-panel">
          {loading ? <p>Loading rate list…</p> : (
            <div className="table-wrap">
              <table className="data-table franchise-rate-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Test ID</th>
                    <th>Test Name</th>
                    <th>Test MRP</th>
                    <th>Franchisee Price</th>
                    <th>Rate (%)</th>
                    <th>Assigned Price</th>
                    <th>Final Price</th>
                  </tr>
                </thead>
                <tbody>
                  {!franchiseUserId && (
                    <tr><td colSpan={8} className="empty-msg">{config.emptySelectMsg}</td></tr>
                  )}
                  {franchiseUserId && pageRows.length === 0 && (
                    <tr><td colSpan={8} className="empty-msg">No tests found.</td></tr>
                  )}
                  {pageRows.map(({ row, ratePct }, index) => (
                    <RateRow
                      key={row.test_id}
                      index={(safePage - 1) * PAGE_SIZE + index}
                      testId={row.test_id}
                      testCode={row.test_code}
                      testName={row.test_name}
                      mrp={row.mrp}
                      franchiseePrice={row.franchisee_price}
                      ratePct={ratePct}
                      onRateChange={updateRowRate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="franchise-rate-pagination">
            <p className="portfolio-intro" style={{ margin: 0 }}>
              Showing {pageStart} to {pageEnd} of {filteredCatalog.length} entries
              {catalog.length !== filteredCatalog.length ? ` (filtered from ${catalog.length})` : ''}.
            </p>
            <div className="franchise-rate-page-btns">
              <button
                type="button"
                className="btn-sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>Page {safePage} / {totalPages}</span>
              <button
                type="button"
                className="btn-sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-orange"
              onClick={savePricing}
              disabled={!franchiseUserId || saving || catalog.length === 0}
            >
              {saving ? 'Updating…' : 'Update Pricing'}
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

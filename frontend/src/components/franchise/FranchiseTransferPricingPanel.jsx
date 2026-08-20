import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../Footer';
import Layout from '../Layout';
import { api } from '../../services/api';
import { ROLES } from '../../utils/roles';

export const TRANSFER_PRICING_MODES = {
  admin_supreme: {
    targetRole: ROLES.SUPER_FRANCHISEE,
    roleLabel: 'Supreme',
    pageTitle: 'Transfer Price — Supreme',
    breadcrumbs: [{ label: 'Home', to: '/search' }, { label: 'Franchise' }, { label: 'Transfer Price' }],
    activePage: 'franchise-transfer-pricing',
    bulkPricingPath: '/admin/franchise-bulk-pricing',
    adminMain: true,
  },
  supreme_prime: {
    targetRole: ROLES.FRANCHISEE,
    roleLabel: 'Prime',
    pageTitle: 'Transfer Price — Prime',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Accounting' }, { label: 'Transfer Price' }],
    activePage: 'franchisee-transfer-pricing',
    bulkPricingPath: '/franchise/franchisee-pricing',
    adminMain: false,
  },
  prime_sub: {
    targetRole: ROLES.SUB_FRANCHISE,
    roleLabel: 'Sub-Franchise',
    pageTitle: 'Transfer Price — Sub-Franchise',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Sub Franchisee' }, { label: 'Transfer Price' }],
    activePage: 'sub-franchisee-transfer-pricing',
    bulkPricingPath: '/franchise/sub-franchisee-pricing',
    adminMain: false,
  },
};

function franchiseLabel(row) {
  if (!row) return '';
  const name = row.display_name || row.username;
  const zone = row.zone_name ? ` · ${row.zone_name}` : '';
  return `${name}${zone} (${row.username})`;
}

export default function FranchiseTransferPricingPanel({ mode = 'admin_supreme' }) {
  const config = TRANSFER_PRICING_MODES[mode] || TRANSFER_PRICING_MODES.admin_supreme;

  const [franchisees, setFranchisees] = useState([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [copyAll, setCopyAll] = useState(true);
  const [sourceCount, setSourceCount] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getUsers({ role: config.targetRole, is_active: true })
      .then((data) => setFranchisees(Array.isArray(data) ? data : []))
      .catch(() => setFranchisees([]));
  }, [config.targetRole]);

  useEffect(() => {
    if (!fromId) {
      setSourceCount(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingPreview(true);
    api.getFranchiseTestRates({ franchise_user_id: fromId })
      .then((data) => {
        if (cancelled) return;
        const custom = (data.rows || []).filter((row) => row.is_custom).length;
        setSourceCount({ total: data.count || 0, custom });
      })
      .catch(() => {
        if (!cancelled) setSourceCount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => { cancelled = true; };
  }, [fromId]);

  const targetOptions = useMemo(
    () => franchisees.filter((row) => String(row.id) !== String(fromId)),
    [franchisees, fromId],
  );

  const handleTransfer = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!fromId || !toId) {
      setError(`Select both source and target ${config.roleLabel} franchisees.`);
      return;
    }
    if (String(fromId) === String(toId)) {
      setError('Source and target must be different.');
      return;
    }
    if (!copyAll) {
      setError('Select "All test price" to copy the full rate list.');
      return;
    }

    const source = franchisees.find((row) => String(row.id) === String(fromId));
    const target = franchisees.find((row) => String(row.id) === String(toId));
    const confirmed = window.confirm(
      `Copy all saved test rates from ${franchiseLabel(source)} to ${franchiseLabel(target)}?\n\n`
      + 'Existing rates on the target will be overwritten for matching tests.',
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const result = await api.transferFranchiseTestRates({
        from_franchise_user_id: Number(fromId),
        to_franchise_user_id: Number(toId),
        copy_all: true,
      });
      setSuccess(result.detail || 'Rates transferred successfully.');
    } catch (err) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setSaving(false);
    }
  };

  const mainClass = config.adminMain ? 'dash-main admin-content-main' : 'dash-main franchise-module-page';

  return (
    <Layout activePage={config.activePage}>
      <main className={mainClass}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            {config.breadcrumbs.map((crumb) => (
              <li key={crumb.label}>
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
              </li>
            ))}
          </ul>
        </nav>

        <h2 className="page-heading">{config.pageTitle}</h2>
        <p className="portfolio-intro">
          Copy saved per-test rates from one {config.roleLabel} account to another.
          {' '}
          <Link to={config.bulkPricingPath}>Back to rate list</Link>
        </p>

        <section className="content-panel">
          <form className="franchise-transfer-form" onSubmit={handleTransfer}>
            <label>
              <span>From {config.roleLabel}</span>
              <select value={fromId} onChange={(e) => setFromId(e.target.value)} required>
                <option value="">Select source</option>
                {franchisees.map((row) => (
                  <option key={row.id} value={row.id}>{franchiseLabel(row)}</option>
                ))}
              </select>
            </label>

            <label>
              <span>To {config.roleLabel}</span>
              <select value={toId} onChange={(e) => setToId(e.target.value)} required>
                <option value="">Select target</option>
                {targetOptions.map((row) => (
                  <option key={row.id} value={row.id}>{franchiseLabel(row)}</option>
                ))}
              </select>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={copyAll}
                onChange={(e) => setCopyAll(e.target.checked)}
              />
              <span>All test price</span>
            </label>

            {fromId && (
              <p className="portfolio-intro">
                {loadingPreview
                  ? 'Loading source rate count…'
                  : sourceCount
                    ? `${sourceCount.custom} custom rate(s) of ${sourceCount.total} tests on source account.`
                    : 'Could not preview source rates.'}
              </p>
            )}

            {error && <p className="login-error" role="alert">{error}</p>}
            {success && <p className="success-msg" role="status">{success}</p>}

            <div className="form-actions">
              <button type="submit" className="btn-orange" disabled={saving || !fromId || !toId}>
                {saving ? 'Transferring…' : 'Transfer Rates'}
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLES } from '../../utils/roles';

const CONFIG = {
  [ROLES.SUPER_FRANCHISEE]: {
    title: 'Prime Pricing',
    description: 'Set the MRP price % and commission % charged to Prime (Franchise) accounts in your zone.',
    activePage: 'franchisee-pricing',
  },
  [ROLES.FRANCHISEE]: {
    title: 'SubFranchisee Pricing',
    description: 'Set the MRP price % and commission % charged to Sub-Franchise accounts in your zone.',
    activePage: 'sub-franchisee-pricing',
  },
};

export default function DownstreamPricing({ forcedRole }) {
  const { user } = useAuth();
  const role = forcedRole || user?.role;
  const meta = CONFIG[role];
  const [zoneRate, setZoneRate] = useState(null);
  const [form, setForm] = useState({ price_pct_of_mrp: '', commission_pct: '', is_active: true });
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const adminBaseLabel = useMemo(() => {
    if (!zoneRate) return '';
    if (role === ROLES.SUPER_FRANCHISEE) {
      return `Admin base for Prime: ${zoneRate.franchisee_price_pct}% price / ${zoneRate.franchisee_commission_pct}% commission`;
    }
    if (role === ROLES.FRANCHISEE) {
      return `Admin base for Sub: ${zoneRate.sub_franchise_price_pct}% price / ${zoneRate.sub_franchise_commission_pct}% commission`;
    }
    return '';
  }, [role, zoneRate]);

  const load = useCallback(async () => {
    if (!meta) return;
    setLoading(true);
    setError('');
    try {
      const [override, zone] = await Promise.all([
        api.getMyPricingOverride(),
        api.getMyZoneFranchiseRate(),
      ]);
      setZoneRate(zone);
      setIsDefault(Boolean(override.is_default));
      setForm({
        price_pct_of_mrp: override.price_pct_of_mrp ?? '',
        commission_pct: override.commission_pct ?? '',
        is_active: override.is_active !== false,
      });
    } catch (err) {
      setError(err.message || 'Unable to load pricing settings.');
    } finally {
      setLoading(false);
    }
  }, [meta]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.saveMyPricingOverride({
        price_pct_of_mrp: form.price_pct_of_mrp,
        commission_pct: form.commission_pct || null,
        is_active: form.is_active,
      });
      setSuccess('Downstream pricing saved.');
      setIsDefault(false);
      await load();
    } catch (err) {
      setError(err.message || 'Unable to save pricing.');
    } finally {
      setSaving(false);
    }
  };

  if (!meta) {
    return (
      <Layout activePage="sub-franchisee-pricing">
        <main className="dash-main franchise-module-page">
          <p className="login-error">This page is available to Supreme and Prime roles only.</p>
        </main>
        <Footer />
      </Layout>
    );
  }

  return (
    <Layout activePage={meta.activePage}>
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>{meta.title}</li>
            </ul>
          </nav>
          <h2 className="page-heading">{meta.title}</h2>
          <p className="portfolio-intro">{meta.description}</p>
          {adminBaseLabel && <p className="portfolio-intro">{adminBaseLabel}</p>}
          {isDefault && !loading && (
            <p className="portfolio-intro">Using admin defaults until you save an override.</p>
          )}
        </header>

        <section className="franchise-module-panel">
          {loading ? (
            <p>Loading…</p>
          ) : (
            <>
              {error && <p className="login-error" role="alert">{error}</p>}
              {success && <p className="success-msg" role="status">{success}</p>}
              <div className="franchise-report-filters">
                <label>
                  <span>Price % of MRP</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.price_pct_of_mrp}
                    onChange={(e) => setForm((prev) => ({ ...prev, price_pct_of_mrp: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Commission %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.commission_pct}
                    onChange={(e) => setForm((prev) => ({ ...prev, commission_pct: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Active</span>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                </label>
                <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save pricing'}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

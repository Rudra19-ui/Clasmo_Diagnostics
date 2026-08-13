import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { ROLES } from '../../utils/roles';

function franchiseLabel(row) {
  if (!row) return '';
  const name = row.display_name || row.username;
  const zone = row.zone_name ? ` · ${row.zone_name}` : '';
  return `${name}${zone} (${row.username})`;
}

export default function FranchiseTransferPricing() {
  const [supremes, setSupremes] = useState([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [copyAll, setCopyAll] = useState(true);
  const [sourceCount, setSourceCount] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getUsers({ role: ROLES.SUPER_FRANCHISEE, is_active: true })
      .then((data) => setSupremes(Array.isArray(data) ? data : []))
      .catch(() => setSupremes([]));
  }, []);

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
    () => supremes.filter((row) => String(row.id) !== String(fromId)),
    [supremes, fromId],
  );

  const handleTransfer = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!fromId || !toId) {
      setError('Select both source and target Supreme franchisees.');
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

    const source = supremes.find((row) => String(row.id) === String(fromId));
    const target = supremes.find((row) => String(row.id) === String(toId));
    const confirmed = window.confirm(
      `Copy all saved test rates from ${franchiseLabel(source)} to ${franchiseLabel(target)}?\n\n`
      + 'Existing rates on the target for the same tests will be overwritten.',
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const data = await api.transferFranchiseTestRates({
        from_franchise_user_id: Number(fromId),
        to_franchise_user_id: Number(toId),
        copy_all: true,
      });
      setSuccess(data.detail || `Copied ${data.copied || 0} rate(s).`);
    } catch (err) {
      setError(err.message || 'Unable to transfer pricing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="franchise-transfer-pricing">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>Franchise</li>
            <li>Transfer Price</li>
          </ul>
        </nav>

        <h2 className="page-heading">Transfer Price</h2>
        <p className="portfolio-intro">
          Copy all test rates from one Supreme franchisee to another
          (example: Harshad → Yash). Target rates for matching tests are replaced.
          {' '}
          <Link to="/admin/franchise-bulk-pricing">Open Franchise Pricing</Link>
        </p>

        <section className="content-panel change-password-panel">
          <form className="change-password-form" onSubmit={handleTransfer}>
            <div className="change-password-field">
              <label htmlFor="transfer-from">From Franchisee (source rates)</label>
              <select
                id="transfer-from"
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value);
                  if (String(e.target.value) === String(toId)) setToId('');
                  setSuccess('');
                }}
                required
                disabled={saving}
              >
                <option value="">Select source Supreme</option>
                {supremes.map((row) => (
                  <option key={row.id} value={row.id}>{franchiseLabel(row)}</option>
                ))}
              </select>
              {loadingPreview && <p className="user-signup-hint">Checking saved rates…</p>}
              {!loadingPreview && sourceCount && (
                <p className="user-signup-hint">
                  Source has <strong>{sourceCount.custom}</strong> saved custom rate(s)
                  across {sourceCount.total} tests.
                </p>
              )}
            </div>

            <div className="change-password-field">
              <label htmlFor="transfer-mode">What to copy</label>
              <select
                id="transfer-mode"
                value={copyAll ? 'all' : ''}
                onChange={(e) => setCopyAll(e.target.value === 'all')}
                required
                disabled={saving}
              >
                <option value="all">All test price</option>
              </select>
            </div>

            <div className="change-password-field">
              <label htmlFor="transfer-to">To Franchisee (receive rates)</label>
              <select
                id="transfer-to"
                value={toId}
                onChange={(e) => {
                  setToId(e.target.value);
                  setSuccess('');
                }}
                required
                disabled={saving || !fromId}
              >
                <option value="">Select target Supreme</option>
                {targetOptions.map((row) => (
                  <option key={row.id} value={row.id}>{franchiseLabel(row)}</option>
                ))}
              </select>
              <p className="user-signup-hint">
                After copy you can still open Franchise Pricing for the target and change rates again.
              </p>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            {success && <p className="success-msg" role="status">{success}</p>}

            <div className="form-actions" style={{ gap: '0.75rem' }}>
              <button type="submit" className="btn-orange" disabled={saving || !fromId || !toId}>
                {saving ? 'Transferring…' : 'Transfer All Rates'}
              </button>
              {toId && (
                <Link
                  className="btn-primary"
                  to={`/admin/franchise-bulk-pricing?franchise_user_id=${toId}`}
                >
                  Edit target pricing
                </Link>
              )}
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { notifyWalletUpdated } from '../../components/WalletBalanceBadge';
import { api } from '../../services/api';
import { FRANCHISE_ROLES, ROLE_LABELS, ROLES } from '../../utils/roles';

const RATE_FIELDS = [
  { key: 'super_franchisee_price_pct', label: 'Supreme price %' },
  { key: 'franchisee_price_pct', label: 'Prime price %' },
  { key: 'sub_franchise_price_pct', label: 'Sub price %' },
  { key: 'super_franchisee_commission_pct', label: 'Supreme commission %' },
  { key: 'franchisee_commission_pct', label: 'Prime commission %' },
  { key: 'sub_franchise_commission_pct', label: 'Sub commission %' },
];

const SCOPE_HINT = {
  [ROLES.SUPER_ADMIN]: 'You see all franchise wallets, transactions, and data across every zone.',
  [ROLES.ADMIN]: 'You see franchise wallets and transactions in your zone.',
  [ROLES.SUPER_FRANCHISEE]: 'You see your wallet plus all Prime and Sub-Franchise accounts in your branch.',
  [ROLES.FRANCHISEE]: 'You see your wallet plus Sub-Franchise accounts under you.',
  [ROLES.SUB_FRANCHISE]: 'You see only your own wallet and transactions.',
};

function emptyTopUp() {
  return { user_id: '', amount: '', note: '' };
}

function emptyAdjust() {
  return { user_id: '', mode: 'credit', amount: '', note: '' };
}

export default function FranchisePricingCredits({ franchiseMode = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN;
  const isFranchise = FRANCHISE_ROLES.includes(user?.role);
  const activePage = franchiseMode || isFranchise ? 'pricing-credits' : 'administration';

  const [rates, setRates] = useState([]);
  const [myZoneRate, setMyZoneRate] = useState(null);
  const [myWallet, setMyWallet] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [topUp, setTopUp] = useState(emptyTopUp());
  const [adjust, setAdjust] = useState(emptyAdjust());
  const [loading, setLoading] = useState(true);
  const [savingRates, setSavingRates] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const franchiseWallets = useMemo(
    () => wallets.filter((w) => w.role && w.role !== ROLES.ADMIN),
    [wallets],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const walletPromise = api.getWallets();
      const txnPromise = api.getWalletTransactions({ limit: 50 });
      const myWalletPromise = isFranchise ? api.getMyWallet().catch(() => null) : Promise.resolve(null);

      if (isAdmin) {
        const [rateRows, walletRows, txnRows, ownWallet] = await Promise.all([
          api.getZoneFranchiseRates(),
          walletPromise,
          txnPromise,
          myWalletPromise,
        ]);
        setRates(rateRows || []);
        setMyZoneRate(null);
        setWallets(walletRows || []);
        setTransactions(txnRows || []);
        setMyWallet(ownWallet);
      } else {
        const [zoneRate, walletRows, txnRows, ownWallet] = await Promise.all([
          api.getMyZoneFranchiseRate().catch(() => null),
          walletPromise,
          txnPromise,
          myWalletPromise,
        ]);
        setRates([]);
        setMyZoneRate(zoneRate);
        setWallets(walletRows || []);
        setTransactions(txnRows || []);
        setMyWallet(ownWallet);
      }
    } catch (err) {
      setError(err.message || 'Unable to load pricing and wallet data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isFranchise]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateRateField = (zoneId, field, value) => {
    setRates((prev) => prev.map((row) => (
      row.zone_id === zoneId ? { ...row, [field]: value } : row
    )));
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        rates: rates.map((row) => ({
          zone_id: row.zone_id,
          super_franchisee_price_pct: row.super_franchisee_price_pct,
          franchisee_price_pct: row.franchisee_price_pct,
          sub_franchise_price_pct: row.sub_franchise_price_pct,
          super_franchisee_commission_pct: row.super_franchisee_commission_pct,
          franchisee_commission_pct: row.franchisee_commission_pct,
          sub_franchise_commission_pct: row.sub_franchise_commission_pct,
          is_active: row.is_active !== false,
        })),
      };
      const result = await api.saveZoneFranchiseRates(payload);
      setRates(result.rates || rates);
      setSuccess('Zone pricing and commission rates saved.');
    } catch (err) {
      setError(err.message || 'Unable to save zone rates.');
    } finally {
      setSavingRates(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUp.user_id || !topUp.amount) {
      setError('Select a franchise wallet and enter an amount.');
      return;
    }
    setToppingUp(true);
    setError('');
    setSuccess('');
    try {
      await api.topUpWallet({
        user_id: Number(topUp.user_id),
        amount: topUp.amount,
        note: topUp.note,
      });
      setSuccess('Credits added successfully.');
      setTopUp(emptyTopUp());
      notifyWalletUpdated();
      await loadAll();
    } catch (err) {
      setError(err.message || 'Unable to add credits.');
    } finally {
      setToppingUp(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjust.user_id || adjust.amount === '') {
      setError('Select a franchise wallet and enter an amount.');
      return;
    }
    setAdjusting(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.adjustWallet({
        user_id: Number(adjust.user_id),
        mode: adjust.mode,
        amount: adjust.amount,
        note: adjust.note,
      });
      setSuccess(result.detail || 'Wallet adjusted successfully.');
      setAdjust(emptyAdjust());
      notifyWalletUpdated();
      await loadAll();
    } catch (err) {
      setError(err.message || 'Unable to adjust wallet.');
    } finally {
      setAdjusting(false);
    }
  };

  const homeHref = isFranchise ? '/dashboard' : '/search';
  const breadcrumbMiddle = isFranchise
    ? null
    : <li><Link to="/administration">Administration</Link></li>;

  return (
    <Layout activePage={activePage}>
      <main className={`dash-main ${isFranchise ? 'franchise-module-page' : 'admin-content-main'}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to={homeHref}>Home</Link></li>
            {breadcrumbMiddle}
            <li>Franchise Pricing &amp; Credits</li>
          </ul>
        </nav>

        <h2 className="page-heading">{isAdmin ? 'Franchise Credits & Pricing' : 'Franchise Pricing & Credits'}</h2>
        <p className="portfolio-intro">
          {SCOPE_HINT[user?.role] || 'Wallet balances and commission activity in your scope.'}
          {' '}
          Bookings debit the actor&apos;s wallet (may go negative). Parent wallets are credited
          with cascade margin (selling price − buying/assigned price):
          Sub entry → Prime + Supreme; Prime entry → Supreme only.
          Reports cannot be released while the booking actor&apos;s balance is negative.
        </p>

        {isFranchise && (
          <p className="portfolio-intro">
            <Link to="/franchise/online-payment">Add credits online →</Link>
          </p>
        )}

        {isFranchise && user?.role === ROLES.SUPER_FRANCHISEE && (
          <p className="portfolio-intro">
            <Link to="/franchise/franchisee-pricing">Set Prime downstream pricing →</Link>
          </p>
        )}
        {isFranchise && user?.role === ROLES.FRANCHISEE && (
          <p className="portfolio-intro">
            <Link to="/franchise/sub-franchisee-pricing">Set Sub-Franchise downstream pricing →</Link>
          </p>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        {success && <p className="success-msg" role="status">{success}</p>}

        {myWallet && (
          <section className="content-panel franchise-module-panel">
            <h3 className="test-addition-subtitle">My wallet</h3>
            <p>
              Balance: <strong className={Number(myWallet.balance) < 0 ? 'login-error' : ''}>
                ₹{Number(myWallet.balance).toFixed(2)}
              </strong>
            </p>
          </section>
        )}

        {isAdmin && (
          <section className="content-panel">
            <h3 className="test-addition-subtitle">Zone base pricing &amp; commission</h3>
            {loading ? (
              <p>Loading…</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Zone</th>
                        {RATE_FIELDS.map((field) => (
                          <th key={field.key}>{field.label}</th>
                        ))}
                        <th>Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.length === 0 && (
                        <tr><td colSpan={RATE_FIELDS.length + 2} className="empty-msg">No zone rates configured.</td></tr>
                      )}
                      {rates.map((row) => (
                        <tr key={row.zone_id}>
                          <td>{row.zone_name}</td>
                          {RATE_FIELDS.map((field) => (
                            <td key={field.key}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={row[field.key] ?? ''}
                                onChange={(e) => updateRateField(row.zone_id, field.key, e.target.value)}
                                style={{ width: '5.5rem' }}
                              />
                            </td>
                          ))}
                          <td>
                            <input
                              type="checkbox"
                              checked={row.is_active !== false}
                              onChange={(e) => updateRateField(row.zone_id, 'is_active', e.target.checked)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn-primary" onClick={handleSaveRates} disabled={savingRates}>
                    {savingRates ? 'Saving…' : 'Save zone rates'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {isFranchise && myZoneRate && (
          <section className="content-panel franchise-module-panel">
            <h3 className="test-addition-subtitle">Zone base rates (admin defaults)</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    {RATE_FIELDS.map((field) => (
                      <th key={field.key}>{field.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{myZoneRate.zone_name}</td>
                    {RATE_FIELDS.map((field) => (
                      <td key={field.key}>{myZoneRate[field.key]}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="content-panel">
            <h3 className="test-addition-subtitle">Manual credit top-up</h3>
            <div className="franchise-report-filters">
              <label>
                <span>Franchise wallet</span>
                <select
                  value={topUp.user_id}
                  onChange={(e) => setTopUp((prev) => ({ ...prev, user_id: e.target.value }))}
                >
                  <option value="">Select user</option>
                  {franchiseWallets.map((wallet) => (
                    <option key={wallet.user_id} value={wallet.user_id}>
                      {wallet.display_name || wallet.username}
                      {' '}
                      ({ROLE_LABELS[wallet.role] || wallet.role})
                      {' '}
                      — ₹{Number(wallet.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Amount (₹)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={topUp.amount}
                  onChange={(e) => setTopUp((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </label>
              <label>
                <span>Note</span>
                <input
                  type="text"
                  value={topUp.note}
                  onChange={(e) => setTopUp((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Optional note"
                />
              </label>
              <button type="button" className="btn-primary" onClick={handleTopUp} disabled={toppingUp}>
                {toppingUp ? 'Adding…' : 'Add credits'}
              </button>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="content-panel">
            <h3 className="test-addition-subtitle">Adjust or reset balance</h3>
            <p className="portfolio-intro">Use for offline settlements — credit, debit, or set an exact balance.</p>
            <div className="franchise-report-filters">
              <label>
                <span>Franchise wallet</span>
                <select
                  value={adjust.user_id}
                  onChange={(e) => setAdjust((prev) => ({ ...prev, user_id: e.target.value }))}
                >
                  <option value="">Select user</option>
                  {franchiseWallets.map((wallet) => (
                    <option key={wallet.user_id} value={wallet.user_id}>
                      {wallet.display_name || wallet.username}
                      {' '}
                      — ₹{Number(wallet.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Action</span>
                <select
                  value={adjust.mode}
                  onChange={(e) => setAdjust((prev) => ({ ...prev, mode: e.target.value }))}
                >
                  <option value="credit">Add credit</option>
                  <option value="debit">Deduct credit</option>
                  <option value="set_balance">Set exact balance</option>
                </select>
              </label>
              <label>
                <span>{adjust.mode === 'set_balance' ? 'Target balance (₹)' : 'Amount (₹)'}</span>
                <input
                  type="number"
                  min={adjust.mode === 'set_balance' ? '0' : '0.01'}
                  step="0.01"
                  value={adjust.amount}
                  onChange={(e) => setAdjust((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </label>
              <label>
                <span>Note</span>
                <input
                  type="text"
                  value={adjust.note}
                  onChange={(e) => setAdjust((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Settlement note"
                />
              </label>
              <button type="button" className="btn-orange" onClick={handleAdjust} disabled={adjusting}>
                {adjusting ? 'Saving…' : 'Apply adjustment'}
              </button>
            </div>
          </section>
        )}

        <section className={`content-panel ${isFranchise ? 'franchise-module-panel' : ''}`}>
          <h3 className="test-addition-subtitle">Franchise wallet balances</h3>
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {isAdmin && <th>Zone</th>}
                    <th>User</th>
                    <th>Role</th>
                    <th>Balance</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {franchiseWallets.length === 0 && (
                    <tr><td colSpan={isAdmin ? 5 : 4} className="empty-msg">No franchise wallets in your scope.</td></tr>
                  )}
                  {franchiseWallets.map((wallet) => (
                    <tr key={wallet.id} className={Number(wallet.balance) < 0 ? 'ledger-row-negative' : ''}>
                      {isAdmin && <td>{wallet.zone_name || '—'}</td>}
                      <td>{wallet.display_name || wallet.username}</td>
                      <td>{ROLE_LABELS[wallet.role] || wallet.role}</td>
                      <td>₹{Number(wallet.balance).toFixed(2)}</td>
                      <td>{wallet.updated_at ? new Date(wallet.updated_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`content-panel ${isFranchise ? 'franchise-module-panel' : ''}`}>
          <h3 className="test-addition-subtitle">Recent wallet transactions</h3>
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Direction</th>
                    <th>Amount</th>
                    <th>Balance after</th>
                    <th>Lab code</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 && (
                    <tr><td colSpan={8} className="empty-msg">No transactions in your scope.</td></tr>
                  )}
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>{txn.created_at ? new Date(txn.created_at).toLocaleString() : '—'}</td>
                      <td>{txn.wallet_username}</td>
                      <td>{txn.txn_type}</td>
                      <td>{txn.direction}</td>
                      <td>₹{Number(txn.amount).toFixed(2)}</td>
                      <td>₹{Number(txn.balance_after).toFixed(2)}</td>
                      <td>{txn.lab_code || '—'}</td>
                      <td>{txn.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

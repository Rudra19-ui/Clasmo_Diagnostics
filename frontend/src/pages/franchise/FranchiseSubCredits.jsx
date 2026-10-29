import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { notifyWalletUpdated } from '../../components/WalletBalanceBadge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLES } from '../../utils/roles';

function emptyForm() {
  return { user_id: '', mode: 'credit', amount: '', note: '' };
}

export default function FranchiseSubCredits() {
  const { user } = useAuth();
  const isSupreme = user?.role === ROLES.SUPER_FRANCHISEE;
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [users, walletRows] = await Promise.all([
        api.getUsers({ role: ROLES.SUB_FRANCHISE, is_active: true }),
        api.getWallets({ role: ROLES.SUB_FRANCHISE }).catch(() => []),
      ]);
      const walletByUser = new Map(
        (Array.isArray(walletRows) ? walletRows : [])
          .filter((row) => row.role === ROLES.SUB_FRANCHISE)
          .map((row) => [row.user_id, row]),
      );
      const merged = (Array.isArray(users) ? users : []).map((row) => {
        const wallet = walletByUser.get(row.id);
        return {
          id: wallet?.id || `user-${row.id}`,
          user_id: row.id,
          username: row.username,
          display_name: row.display_name || row.username,
          role: row.role,
          parent_name: row.parent_franchisee_name || '',
          balance: wallet ? Number(wallet.balance) : 0,
          updated_at: wallet?.updated_at || null,
        };
      });
      merged.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
      setWallets(merged);
    } catch (err) {
      setError(err.message || 'Unable to load Sub-Franchise wallets.');
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdjust = async (event) => {
    event.preventDefault();
    if (!form.user_id || form.amount === '') {
      setError('Select a Sub-Franchise account and enter an amount.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.adjustWallet({
        user_id: Number(form.user_id),
        mode: form.mode,
        amount: form.amount,
        note: form.note,
      });
      setSuccess(
        result.detail
        || `Sub-Franchise wallet ${form.mode === 'debit' ? 'debited' : 'credited'} successfully.`,
      );
      setForm(emptyForm());
      notifyWalletUpdated();
      await load();
    } catch (err) {
      setError(err.message || 'Unable to update Sub-Franchise wallet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="sub-franchisee-credits">
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>Sub</li>
            <li>Sub Credits</li>
          </ul>
        </nav>

        <h2 className="page-heading">Sub Credits</h2>
        <p className="portfolio-intro">
          {isSupreme
            ? 'Credit or debit wallet balances for Sub accounts in your network.'
            : 'Credit or debit wallet balances for Sub accounts under your Prime login.'}
          {' '}
          <Link to="/franchise/sub-franchisee">Sub List</Link>
        </p>

        {error && <p className="login-error" role="alert">{error}</p>}
        {success && <p className="success-msg" role="status">{success}</p>}

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Credit / Debit Sub-Franchise</h3>
          <form className="franchise-report-filters" onSubmit={handleAdjust}>
            <label>
              <span>Sub-Franchise account</span>
              <select
                value={form.user_id}
                onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                required
              >
                <option value="">Select Sub-Franchise</option>
                {wallets.map((wallet) => (
                  <option key={wallet.user_id} value={wallet.user_id}>
                    {wallet.display_name || wallet.username}
                    {wallet.parent_name ? ` (under ${wallet.parent_name})` : ''}
                    {' — ₹'}
                    {Number(wallet.balance).toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Action</span>
              <select
                value={form.mode}
                onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value }))}
              >
                <option value="credit">Credit amount</option>
                <option value="debit">Debit amount</option>
              </select>
            </label>
            <label>
              <span>Amount (₹)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Note</span>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Optional note"
              />
            </label>
            <button type="submit" className="btn-orange" disabled={saving || !form.user_id}>
              {saving ? 'Saving…' : form.mode === 'debit' ? 'Debit' : 'Credit'}
            </button>
          </form>
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Sub-Franchise wallet balances</h3>
          {loading ? <p>Loading…</p> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sub-Franchise</th>
                    {isSupreme ? <th>Parent Prime</th> : null}
                    <th>Role</th>
                    <th>Balance</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.length === 0 && (
                    <tr>
                      <td colSpan={isSupreme ? 5 : 4} className="empty-msg">
                        No Sub-Franchise wallets found.
                      </td>
                    </tr>
                  )}
                  {wallets.map((wallet) => (
                    <tr key={wallet.id} className={Number(wallet.balance) < 0 ? 'ledger-row-negative' : ''}>
                      <td>{wallet.display_name || wallet.username}</td>
                      {isSupreme ? <td>{wallet.parent_name || '—'}</td> : null}
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
      </main>
      <Footer />
    </Layout>
  );
}

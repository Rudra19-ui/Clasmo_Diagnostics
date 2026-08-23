import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { FRANCHISE_ROLES } from '../utils/roles';

export default function WalletBalanceBadge({ user, compact = false }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !FRANCHISE_ROLES.includes(user.role)) {
      setBalance(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getMyWallet();
      setBalance(Number(data?.balance ?? 0));
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('clasmo-wallet-updated', onRefresh);
    return () => window.removeEventListener('clasmo-wallet-updated', onRefresh);
  }, [load]);

  if (!user || !FRANCHISE_ROLES.includes(user.role)) return null;

  const negative = balance != null && balance < 0;
  const label = loading && balance == null
    ? '…'
    : `₹${(balance ?? 0).toFixed(2)}`;

  return (
    <Link
      to="/franchise/pricing-credits"
      className={`wallet-balance-badge${negative ? ' wallet-balance-negative' : ''}${compact ? ' wallet-balance-compact' : ''}`}
      title={negative ? 'Negative balance — add credits to release reports' : 'Wallet credit balance'}
    >
      <span className="wallet-balance-label">Credits</span>
      <strong>{label}</strong>
    </Link>
  );
}

export function notifyWalletUpdated() {
  window.dispatchEvent(new Event('clasmo-wallet-updated'));
}

import { useEffect, useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import WalletBalanceBadge from '../components/WalletBalanceBadge';
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

export default function Dashboard() {
  const { user } = useAuth();
  const isFranchise = FRANCHISE_ROLES.includes(user?.role);
  const [wallet, setWallet] = useState(null);

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

  const showWelcomeActions = (
    user?.role === ROLES.ADMIN
    || user?.role === ROLES.HR
    || !canScanSampleBarcode(user)
  );

  const balance = Number(wallet?.balance ?? 0);
  const negative = isFranchise && balance < 0;

  return (
    <Layout activePage="dashboard">
      <main className="dash-main dashboard-home-main">
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
        </div>
      </main>
      <Footer />
    </Layout>
  );
}

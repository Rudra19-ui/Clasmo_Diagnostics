import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import WalletBalanceBadge, { notifyWalletUpdated } from '../../components/WalletBalanceBadge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const PRESETS = ['500', '1000', '2000', '5000'];

export default function OnlinePayment() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('1000');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setReference(`PAY-${Date.now().toString(36).toUpperCase()}`);
  }, []);

  const handleTopUp = async (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.onlineTopUpWallet({
        amount: value,
        payment_reference: reference,
      });
      const bal = Number(result?.wallet?.balance ?? 0);
      setSuccess(`Payment successful. New balance: ₹${bal.toFixed(2)}`);
      notifyWalletUpdated();
    } catch (err) {
      setError(err.message || 'Payment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="online-payment">
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>Online Payment</li>
          </ul>
        </nav>

        <h2 className="page-heading">Online Wallet Top-up</h2>
        <p className="portfolio-intro">
          Add credits to your franchise wallet. Negative balances block report release until cleared.
        </p>

        <div style={{ marginBottom: 16 }}>
          <WalletBalanceBadge user={user} />
        </div>

        <section className="franchise-module-panel content-panel">
          <form className="change-password-form" onSubmit={handleTopUp}>
            <div className="change-password-field">
              <span>Quick amounts</span>
              <div className="franchise-rate-actions" style={{ marginTop: 8 }}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn-secondary"
                    onClick={() => setAmount(preset)}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            <label className="change-password-field">
              <span>Amount (₹)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>

            <label className="change-password-field">
              <span>Payment reference</span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Gateway reference"
              />
            </label>

            <p className="portfolio-intro">
              Simulated online payment — credits are applied immediately to your wallet.
            </p>

            {error && <p className="login-error" role="alert">{error}</p>}
            {success && <p className="form-success-msg">{success}</p>}

            <div className="form-actions">
              <button type="submit" className="btn-orange" disabled={saving}>
                {saving ? 'Processing…' : 'Pay & Add Credits'}
              </button>
              <Link to="/franchise/pricing-credits" className="btn-secondary">View wallet history</Link>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

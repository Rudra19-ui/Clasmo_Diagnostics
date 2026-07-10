import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function ChangePassword() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword) {
      setError('Please enter both old and new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.changePassword(oldPassword, newPassword);
      localStorage.setItem('clasmo_token', data.token);
      setOldPassword('');
      setNewPassword('');
      setSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.message || 'Unable to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>User Management</li>
            <li>Change Password</li>
          </ul>
        </nav>

        <section className="change-password-panel">
          <h2 className="change-password-title">Change Password</h2>

          <form className="change-password-form" onSubmit={handleSubmit}>
            <div className="change-password-field">
              <label htmlFor="old-password">Old Password</label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                placeholder="Old Password"
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New Password"
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>

            {error && <p className="change-password-message error" role="alert">{error}</p>}
            {success && <p className="change-password-message success" role="status">{success}</p>}

            <button type="submit" className="change-password-submit" disabled={submitting}>
              {submitting ? 'Changing...' : 'Change Password'}
            </button>
          </form>

          {user?.username && (
            <p className="change-password-user">Signed in as <strong>{user.display_name || user.username}</strong></p>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

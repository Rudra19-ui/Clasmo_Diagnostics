import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/search" replace />;

  const fillCredentials = (userName, pass, userRole) => {
    setUsername(userName);
    setPassword(pass);
    setRole(userRole);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(username, password);
      const roleOk =
        (role === 'admin' && loggedIn.role === 'admin')
        || (role === 'user' && loggedIn.role !== 'admin');
      if (!roleOk) {
        await logout();
        setError(`This account is not a ${role}. Switch tab or use correct trial login.`);
        return;
      }
      navigate('/search');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-logo">
          <div className="logo-mark">C</div>
          <div>
            <h1>Clasmo Diagnostics</h1>
            <p>Laboratory Information Management System</p>
          </div>
        </div>
        <p className="login-contact">+91-8975273383 / +91-9146188320</p>
      </header>

      <main className="login-main">
        <section className="login-card">
          <ul className="login-tabs" role="tablist">
            <li>
              <button type="button" className={role === 'user' ? 'active' : ''} onClick={() => setRole('user')}>User Login</button>
            </li>
            <li>
              <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin Login</button>
            </li>
          </ul>

          <form className="login-form-card" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Username *</label>
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" placeholder="Enter username" />
            </div>
            <div className="field">
              <label htmlFor="password">Password *</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter password" />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn-login-full" disabled={submitting}>{submitting ? 'Logging in...' : 'Login'}</button>
            <label className="remember"><input type="checkbox" /> Remember Me</label>
          </form>

          <aside className="trial-box">
            <h2>Trial login (for testing)</h2>
            <ul className="trial-credentials">
              <li>
                <strong>User</strong>
                <ul>
                  <li>Username: <code>user_test</code></li>
                  <li>Password: <code>password123</code></li>
                </ul>
                <button type="button" className="btn-fill" onClick={() => fillCredentials('user_test', 'password123', 'user')}>Use User credentials</button>
              </li>
          <li>
            <strong>Admin</strong>
            <ul>
              <li>Username: <code>admin_test</code></li>
              <li>Password: <code>admin123</code></li>
            </ul>
            <button type="button" className="btn-fill" onClick={() => fillCredentials('admin_test', 'admin123', 'admin')}>Use Admin credentials</button>
          </li>
          <li>
            <strong>Technician</strong>
            <ul>
              <li>Username: <code>technician_test</code></li>
              <li>Password: <code>tech123</code></li>
            </ul>
            <button type="button" className="btn-fill" onClick={() => fillCredentials('technician_test', 'tech123', 'user')}>Use Technician credentials</button>
          </li>
          <li>
            <strong>Pathologist</strong>
            <ul>
              <li>Username: <code>pathologist_test</code></li>
              <li>Password: <code>patho123</code></li>
            </ul>
            <button type="button" className="btn-fill" onClick={() => fillCredentials('pathologist_test', 'patho123', 'user')}>Use Pathologist credentials</button>
          </li>
        </ul>
          </aside>
        </section>

        <section className="login-features">
          <h2>Modules</h2>
          <ul className="module-list">
            <li>Search &amp; patient lookup</li>
            <li>Test Registration &amp; billing</li>
            <li>Test Result &amp; authorization</li>
            <li>Administration <em>(Admin only)</em></li>
            <li>Reports &amp; Dashboard</li>
            <li>Device Request &amp; home collection</li>
          </ul>
        </section>
      </main>

      <footer className="dash-footer login-footer">
        © 2026 Clasmo Diagnostics · Empowering labs with smarter, faster operations.
      </footer>
    </div>
  );
}

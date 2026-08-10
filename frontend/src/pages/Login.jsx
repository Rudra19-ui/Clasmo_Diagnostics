import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingBrandTitle from '../components/landing/LandingBrandTitle';
import { ROLES, FRANCHISE_ROLES } from '../utils/roles';
import '../styles/landing.css';
import '../styles/login.css';

const SAVE_INFO_KEY = 'clasmo_save_info';

function defaultHomeForRole(role) {
  if (
    role === ROLES.ADMIN
    || role === ROLES.PATHOLOGIST
    || FRANCHISE_ROLES.includes(role)
  ) {
    return '/dashboard';
  }
  return '/search';
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveInfo, setSaveInfo] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetMobile, setResetMobile] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const shouldSaveInfo = localStorage.getItem(SAVE_INFO_KEY) === 'true';
    setSaveInfo(shouldSaveInfo);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (forgotPassword) return;

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(username, password, { saveInfo });

      localStorage.setItem(SAVE_INFO_KEY, saveInfo ? 'true' : 'false');

      const fallback = defaultHomeForRole(loggedInUser?.role);
      // Franchise roles should not land on Search even if an old bookmark/next points there
      const wantsSearch = nextPath === '/search' || nextPath?.startsWith('/search?');
      const destination = nextPath && nextPath.startsWith('/') && !(FRANCHISE_ROLES.includes(loggedInUser?.role) && wantsSearch)
        ? nextPath
        : fallback;
      navigate(destination);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page landing-sketch signin-page">
      <div className="landing-sketch-topbar">
        <Link to="/" className="landing-nav-link signin-back-link">← Back to Home</Link>
      </div>
      <header className="landing-sketch-header landing-sketch-header--toolbar">
        <LandingBrandTitle showLogo />
        <span className="landing-iso-badge" title="ISO Certified">ISO<br />logo</span>
      </header>

      <p className="landing-sketch-tagline">Where Accuracy Saves Lives</p>
      <hr className="landing-sketch-rule" />

      <section className="signin-section">
        <div className="landing-join-form-card signin-card">
          <h2 className="landing-plain-heading">LOGIN</h2>

          <form className="signin-form" onSubmit={handleLoginSubmit}>
            <div className="signin-form-box">
              <div className="signin-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your username"
                  disabled={forgotPassword}
                />
              </div>

              <div className="signin-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!forgotPassword}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={forgotPassword}
                />
              </div>

              <label className="signin-checkbox">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  disabled={forgotPassword}
                />
                <span>show password</span>
              </label>
            </div>

            <div className="signin-options">
              <label className="signin-checkbox">
                <input
                  type="checkbox"
                  checked={saveInfo}
                  onChange={(e) => setSaveInfo(e.target.checked)}
                  disabled={forgotPassword}
                />
                <span>save info</span>
              </label>

              <div className="signin-forgot">
                <label className="signin-checkbox">
                  <input
                    type="checkbox"
                    checked={forgotPassword}
                    onChange={(e) => setForgotPassword(e.target.checked)}
                  />
                  <span>forgot password</span>
                </label>
                <p className="signin-forgot-hint">(with mobile number OTP)</p>

                {forgotPassword && (
                  <div className="signin-otp-panel">
                    <label htmlFor="reset-mobile">Mobile number</label>
                    <input
                      id="reset-mobile"
                      type="tel"
                      value={resetMobile}
                      onChange={(e) => setResetMobile(e.target.value)}
                      placeholder="Enter registered mobile number"
                      autoComplete="tel"
                    />
                    <p className="signin-otp-note">
                      OTP password recovery will be sent to this number once the service is enabled.
                    </p>
                    <button type="button" className="btn-test-quorum signin-otp-btn" disabled>
                      Send OTP
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && <p className="landing-join-error signin-error">{error}</p>}
            {success && <p className="signin-success">{success}</p>}

            {!forgotPassword && (
              <div className="signin-form-actions">
                <button type="submit" className="btn-landing-login landing-login-big" disabled={submitting}>
                  {submitting ? 'LOGGING IN…' : 'LOGIN'}
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      <footer className="landing-footer landing-footer-simple signin-footer">
        <div className="landing-footer-simple-inner signin-footer-inner">
          <div className="signin-footer-links">
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

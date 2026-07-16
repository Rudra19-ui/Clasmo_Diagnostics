import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clasmoLogo from '../assets/clasmo-logo.png';
import '../styles/landing.css';
import '../styles/login.css';

const SAVE_INFO_KEY = 'clasmo_save_info';

const EMPTY_REGISTER = {
  fullName: '',
  mobile: '',
  username: '',
  password: '',
};

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
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

  if (user) return <Navigate to="/search" replace />;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setForgotPassword(false);
  };

  const setRegisterField = (field) => (event) => {
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (forgotPassword) return;

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await login(username, password, { saveInfo });

      localStorage.setItem(SAVE_INFO_KEY, saveInfo ? 'true' : 'false');

      navigate('/search');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    const newUsername = registerForm.username.trim();
    try {
      const data = await register({
        full_name: registerForm.fullName.trim(),
        mobile: registerForm.mobile.trim(),
        username: newUsername,
        password: registerForm.password,
      });
      setRegisterForm(EMPTY_REGISTER);
      setShowRegisterPassword(false);
      setUsername(newUsername);
      setPassword('');
      setMode('login');
      setSuccess(data.detail || 'Account created successfully. Please login with your credentials.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page landing-sketch signin-page">
      <header className="landing-sketch-header">
        <Link to="/">
          <img src={clasmoLogo} alt="Clasmo Diagnostics logo" className="landing-sketch-logo" />
        </Link>
        <h1 className="landing-sketch-brand">CLASMO DIAGNOSTICS PVT LTD</h1>
        <Link to="/" className="landing-nav-link signin-back-link">← Back to Home</Link>
      </header>

      <p className="landing-sketch-tagline">Where Accuracy Saves Lives</p>
      <hr className="landing-sketch-rule" />

      <section className="signin-section">
        <div className="landing-join-form-card signin-card">
          <div className="signin-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'signin-mode-btn is-active' : 'signin-mode-btn'}
              onClick={() => switchMode('login')}
            >
              LOGIN
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'signin-mode-btn is-active' : 'signin-mode-btn'}
              onClick={() => switchMode('register')}
            >
              NEW USER SIGN UP
            </button>
          </div>

          {mode === 'login' ? (
            <>
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
            </>
          ) : (
            <>
              <h2 className="landing-plain-heading">NEW USER SIGN UP</h2>

              <form className="signin-form" onSubmit={handleRegisterSubmit}>
                <div className="signin-form-box">
                  <div className="signin-field">
                    <label htmlFor="full-name">Full Name</label>
                    <input
                      id="full-name"
                      value={registerForm.fullName}
                      onChange={setRegisterField('fullName')}
                      required
                      autoComplete="name"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="signin-field">
                    <label htmlFor="register-mobile">Mobile Number</label>
                    <input
                      id="register-mobile"
                      type="tel"
                      value={registerForm.mobile}
                      onChange={setRegisterField('mobile')}
                      required
                      autoComplete="tel"
                      placeholder="Enter your mobile number"
                    />
                  </div>

                  <div className="signin-field">
                    <label htmlFor="register-username">Username</label>
                    <input
                      id="register-username"
                      value={registerForm.username}
                      onChange={setRegisterField('username')}
                      required
                      autoComplete="username"
                      placeholder="Choose a username"
                    />
                  </div>

                  <div className="signin-field signin-field-last">
                    <label htmlFor="register-password">Password</label>
                    <input
                      id="register-password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={setRegisterField('password')}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Create a password (min. 8 characters)"
                    />
                  </div>

                  <label className="signin-checkbox">
                    <input
                      type="checkbox"
                      checked={showRegisterPassword}
                      onChange={(e) => setShowRegisterPassword(e.target.checked)}
                    />
                    <span>show password</span>
                  </label>
                </div>

                {error && <p className="landing-join-error signin-error">{error}</p>}
                {success && <p className="signin-success">{success}</p>}

                <div className="signin-form-actions">
                  <button type="submit" className="btn-landing-login landing-login-big" disabled={submitting}>
                    {submitting ? 'CREATING ACCOUNT…' : 'SIGN UP'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      <footer className="landing-footer landing-footer-simple signin-footer">
        <div className="landing-footer-simple-inner signin-footer-inner">
          <div className="signin-footer-top">
            <div className="signin-footer-links">
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
            <img src={clasmoLogo} alt="" className="signin-footer-logo" aria-hidden="true" />
          </div>
          <p className="landing-footer-company">© CLASMO DIAGNOSTICS PVT LTD.</p>
        </div>
      </footer>
    </div>
  );
}

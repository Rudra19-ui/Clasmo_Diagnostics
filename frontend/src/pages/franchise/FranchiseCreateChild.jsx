import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';

const MODES = {
  supreme_prime: {
    childRole: ROLES.FRANCHISEE,
    activePage: 'create-prime',
    pageTitle: 'Create Prime Account',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Prime' },
      { label: 'Create Prime' },
    ],
    intro: 'Create a new Prime account under your Supreme login. Zone is inherited from your account.',
    listPath: '/franchise/prime-list',
    listLabel: 'Prime List',
    nameLabel: 'Prime name',
    submitLabel: 'Create Prime Account',
  },
  prime_sub: {
    childRole: ROLES.SUB_FRANCHISE,
    activePage: 'create-sub',
    pageTitle: 'Create Sub-Franchise Account',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Sub' },
      { label: 'Create Sub' },
    ],
    intro: 'Create a new Sub account under your Prime login. Zone is inherited from your account.',
    listPath: '/franchise/sub-franchisee',
    listLabel: 'Sub List',
    nameLabel: 'Sub-Franchise name',
    submitLabel: 'Create Sub Account',
  },
};

const EMPTY_FORM = {
  fullName: '',
  mobile: '',
  username: '',
  password: '',
};

export default function FranchiseCreateChild({ mode = 'supreme_prime' }) {
  const config = MODES[mode] || MODES.supreme_prime;
  const { register } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const data = await register({
        full_name: form.fullName.trim(),
        mobile: form.mobile.trim(),
        username: form.username.trim(),
        password: form.password,
        role: config.childRole,
        // Parent defaults to the logged-in Supreme/Prime on the API.
      });
      setForm(EMPTY_FORM);
      setShowPassword(false);
      setSuccess(data.detail || 'Account created successfully.');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout activePage={config.activePage}>
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            {config.breadcrumbs.map((crumb) => (
              <li key={crumb.label}>
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
              </li>
            ))}
          </ul>
        </nav>

        <section className="franchise-module-panel change-password-panel user-signup-panel">
          <h2 className="page-heading">{config.pageTitle}</h2>
          <p className="portfolio-intro">
            {config.intro}
            {' '}
            <Link to={config.listPath}>{config.listLabel}</Link>
          </p>

          <form className="change-password-form user-signup-form" onSubmit={handleSubmit}>
            <div className="change-password-field">
              <label htmlFor="child-full-name">{config.nameLabel}</label>
              <input
                id="child-full-name"
                value={form.fullName}
                onChange={setField('fullName')}
                required
                placeholder="Enter name"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="child-mobile">Mobile Number</label>
              <input
                id="child-mobile"
                type="tel"
                value={form.mobile}
                onChange={setField('mobile')}
                required
                placeholder="Enter mobile number"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="child-username">Login Username</label>
              <input
                id="child-username"
                value={form.username}
                onChange={setField('username')}
                required
                autoComplete="off"
                placeholder="Login ID"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="child-password">Password</label>
              <div className="password-field-row">
                <input
                  id="child-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={setField('password')}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  disabled={submitting}
                />
                <button type="button" className="btn-sm" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            {success && <p className="success-msg" role="status">{success}</p>}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : config.submitLabel}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

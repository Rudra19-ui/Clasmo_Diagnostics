import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { SIGNUP_ROLE_OPTIONS } from '../utils/roles';

const EMPTY_REGISTER = {
  fullName: '',
  mobile: '',
  username: '',
  password: '',
  role: 'user',
};

export default function UserSignUp() {
  const { register } = useAuth();
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setRegisterField = (field) => (event) => {
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = await register({
        full_name: registerForm.fullName.trim(),
        mobile: registerForm.mobile.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });
      setRegisterForm(EMPTY_REGISTER);
      setShowPassword(false);
      setSuccess(data.detail || 'Account created successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout activePage="user-signup">
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>New User Sign Up</li>
          </ul>
        </nav>

        <section className="change-password-panel user-signup-panel">
          <h2 className="change-password-title">New User Sign Up</h2>
          <p className="user-signup-intro">
            Create a new lab user account and assign their role.
          </p>

          <form className="change-password-form user-signup-form" onSubmit={handleSubmit}>
            <div className="change-password-field">
              <label htmlFor="signup-full-name">Full Name</label>
              <input
                id="signup-full-name"
                value={registerForm.fullName}
                onChange={setRegisterField('fullName')}
                required
                autoComplete="name"
                placeholder="Enter full name"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="signup-mobile">Mobile Number</label>
              <input
                id="signup-mobile"
                type="tel"
                value={registerForm.mobile}
                onChange={setRegisterField('mobile')}
                required
                autoComplete="tel"
                placeholder="Enter mobile number"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="signup-role">User Type</label>
              <select
                id="signup-role"
                value={registerForm.role}
                onChange={setRegisterField('role')}
                required
                disabled={submitting}
              >
                {SIGNUP_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="change-password-field">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                value={registerForm.username}
                onChange={setRegisterField('username')}
                required
                autoComplete="username"
                placeholder="Choose a username"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={registerForm.password}
                onChange={setRegisterField('password')}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Create a password (min. 8 characters)"
                disabled={submitting}
              />
            </div>

            <label className="user-signup-show-password">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                disabled={submitting}
              />
              <span>show password</span>
            </label>

            {error && <p className="change-password-message error">{error}</p>}
            {success && <p className="change-password-message success">{success}</p>}

            <button type="submit" className="change-password-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>
        </section>
      </main>
    </Layout>
  );
}

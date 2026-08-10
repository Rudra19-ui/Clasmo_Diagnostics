import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  getExpectedParentRole,
  getSignupRoleOptionsForUser,
  requiresParentFranchisee,
  ROLE_LABELS,
  ROLES,
} from '../utils/roles';

const EMPTY_REGISTER = {
  fullName: '',
  mobile: '',
  username: '',
  password: '',
  role: '',
  parentFranchiseeId: '',
};

export default function UserSignUp() {
  const { user, register } = useAuth();
  const roleOptions = useMemo(() => getSignupRoleOptionsForUser(user), [user]);
  const defaultRole = roleOptions[0]?.value || 'user';

  const [registerForm, setRegisterForm] = useState(() => ({
    ...EMPTY_REGISTER,
    role: defaultRole,
  }));
  const [parentOptions, setParentOptions] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const needsParent = requiresParentFranchisee(registerForm.role);
  const expectedParentRole = getExpectedParentRole(registerForm.role);
  const parentRoleLabel = expectedParentRole ? ROLE_LABELS[expectedParentRole] : '';
  const isAdminCreator = user?.role === ROLES.ADMIN;

  const parentHelpText = useMemo(() => {
    if (registerForm.role === ROLES.FRANCHISEE) {
      return 'Link this Prime to their Supreme supervisor.';
    }
    if (registerForm.role === ROLES.SUB_FRANCHISE) {
      return 'Link this Sub-Franchise to their parent Prime.';
    }
    return '';
  }, [registerForm.role]);

  useEffect(() => {
    if (!roleOptions.some((option) => option.value === registerForm.role)) {
      setRegisterForm((prev) => ({ ...prev, role: defaultRole, parentFranchiseeId: '' }));
    }
  }, [roleOptions, defaultRole, registerForm.role]);

  useEffect(() => {
    if (!needsParent || !expectedParentRole) {
      setParentOptions([]);
      setRegisterForm((prev) => (
        prev.parentFranchiseeId ? { ...prev, parentFranchiseeId: '' } : prev
      ));
      return undefined;
    }

    let cancelled = false;
    setLoadingParents(true);
    api.getUsers({ role: expectedParentRole, is_active: true })
      .then((rows) => {
        if (cancelled) return;
        const options = Array.isArray(rows) ? rows : [];
        setParentOptions(options);

        // Auto-select current user when they are a valid parent supervisor.
        if (
          user
          && user.role === expectedParentRole
          && options.some((row) => Number(row.id) === Number(user.id))
        ) {
          setRegisterForm((prev) => (
            prev.parentFranchiseeId
              ? prev
              : { ...prev, parentFranchiseeId: String(user.id) }
          ));
        }
      })
      .catch(() => {
        if (!cancelled) setParentOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingParents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [needsParent, expectedParentRole, user]);

  const setRegisterField = (field) => (event) => {
    const value = event.target.value;
    setRegisterForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'role' ? { parentFranchiseeId: '' } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (needsParent && !registerForm.parentFranchiseeId) {
      setError(`Select a parent ${parentRoleLabel} for this account.`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        full_name: registerForm.fullName.trim(),
        mobile: registerForm.mobile.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password,
        role: registerForm.role,
      };
      if (needsParent) {
        payload.parent_franchisee_id = Number(registerForm.parentFranchiseeId);
      }

      const data = await register(payload);
      setRegisterForm({ ...EMPTY_REGISTER, role: defaultRole });
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
            {isAdminCreator
              ? 'Admin can create every account type, including Supreme, Prime, and Sub-Franchise.'
              : 'Create accounts for your franchise hierarchy and link them to the correct parent supervisor.'}
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
                disabled={submitting || roleOptions.length === 0}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {needsParent && (
              <div className="change-password-field">
                <label htmlFor="signup-parent">
                  Parent {parentRoleLabel}
                  <span className="req"> *</span>
                </label>
                <select
                  id="signup-parent"
                  value={registerForm.parentFranchiseeId}
                  onChange={setRegisterField('parentFranchiseeId')}
                  required
                  disabled={submitting || loadingParents}
                >
                  <option value="">
                    {loadingParents
                      ? `Loading ${parentRoleLabel} list…`
                      : `— Select ${parentRoleLabel} —`}
                  </option>
                  {parentOptions.map((parentUser) => (
                    <option key={parentUser.id} value={parentUser.id}>
                      {(parentUser.display_name || parentUser.username)}
                      {parentUser.username ? ` (@${parentUser.username})` : ''}
                    </option>
                  ))}
                </select>
                <p className="user-signup-parent-help">{parentHelpText}</p>
                {!loadingParents && parentOptions.length === 0 && (
                  <p className="change-password-message error">
                    No active {parentRoleLabel} accounts found. Create a {parentRoleLabel} first.
                  </p>
                )}
              </div>
            )}

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

            <button type="submit" className="change-password-submit" disabled={submitting || roleOptions.length === 0}>
              {submitting ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>
        </section>
      </main>
    </Layout>
  );
}

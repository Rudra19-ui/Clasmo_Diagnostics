import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  FRANCHISE_ROLES,
  getExpectedParentRole,
  requiresParentFranchisee,
  ROLE_LABELS,
  ROLES,
} from '../../utils/roles';

const FRANCHISE_SIGNUP_OPTIONS = [
  { value: ROLES.SUPER_FRANCHISEE, label: 'Supreme' },
  { value: ROLES.FRANCHISEE, label: 'Prime' },
  { value: ROLES.SUB_FRANCHISE, label: 'Sub-Franchise' },
];

const EMPTY_FORM = {
  fullName: '',
  mobile: '',
  username: '',
  password: '',
  role: ROLES.SUPER_FRANCHISEE,
  parentFranchiseeId: '',
  zoneId: '',
};

export default function FranchiseAddSignUp() {
  const { user, register } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [zones, setZones] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const needsParent = requiresParentFranchisee(form.role);
  const expectedParentRole = getExpectedParentRole(form.role);
  const parentRoleLabel = expectedParentRole ? ROLE_LABELS[expectedParentRole] : '';
  const needsZone = user?.role === ROLES.SUPER_ADMIN || Boolean(user?.is_superuser);

  useEffect(() => {
    api.getZones()
      .then((rows) => setZones(Array.isArray(rows) ? rows : []))
      .catch(() => setZones([]));
  }, []);

  useEffect(() => {
    if (!needsParent || !expectedParentRole) {
      setParentOptions([]);
      setForm((prev) => (prev.parentFranchiseeId ? { ...prev, parentFranchiseeId: '' } : prev));
      return undefined;
    }
    let cancelled = false;
    setLoadingParents(true);
    api.getUsers({ role: expectedParentRole, is_active: true })
      .then((rows) => {
        if (cancelled) return;
        let options = Array.isArray(rows) ? rows : [];
        if (form.zoneId) {
          options = options.filter((row) => String(row.zone_id) === String(form.zoneId));
        }
        setParentOptions(options);
      })
      .catch(() => {
        if (!cancelled) setParentOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingParents(false);
      });
    return () => { cancelled = true; };
  }, [needsParent, expectedParentRole, form.zoneId]);

  const setField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'role' || field === 'zoneId' ? { parentFranchiseeId: '' } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!FRANCHISE_ROLES.includes(form.role)) {
      setError('Only Supreme, Prime, or Sub-Franchise can be created here.');
      return;
    }
    if (needsParent && !form.parentFranchiseeId) {
      setError(`Select a parent ${parentRoleLabel} for this account.`);
      return;
    }
    if (needsZone && !form.zoneId && form.role === ROLES.SUPER_FRANCHISEE) {
      setError('Select a zone for this Supreme franchise.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: form.fullName.trim(),
        mobile: form.mobile.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      };
      if (needsParent) payload.parent_franchisee_id = Number(form.parentFranchiseeId);
      if (form.zoneId) payload.zone_id = Number(form.zoneId);

      const data = await register(payload);
      setForm(EMPTY_FORM);
      setShowPassword(false);
      setSuccess(data.detail || 'Franchise account created successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const parentHelp = useMemo(() => {
    if (form.role === ROLES.FRANCHISEE) return 'Link this Prime to their Supreme supervisor.';
    if (form.role === ROLES.SUB_FRANCHISE) return 'Link this Sub-Franchise to their parent Prime.';
    return '';
  }, [form.role]);

  return (
    <Layout activePage="add-franchisee">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>Franchise</li>
            <li>Add Franchisee</li>
          </ul>
        </nav>

        <section className="change-password-panel user-signup-panel">
          <h2 className="change-password-title">Add Franchisee</h2>
          <p className="user-signup-intro">
            Create Supreme, Prime, or Sub-Franchise accounts only.
            {' '}
            <Link to="/admin/list-franchisee">View Supreme list</Link>
          </p>

          <form className="change-password-form user-signup-form" onSubmit={handleSubmit}>
            <div className="change-password-field">
              <label htmlFor="fr-full-name">Franchisee Name</label>
              <input
                id="fr-full-name"
                value={form.fullName}
                onChange={setField('fullName')}
                required
                placeholder="Enter franchisee / contact name"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="fr-mobile">Mobile Number</label>
              <input
                id="fr-mobile"
                type="tel"
                value={form.mobile}
                onChange={setField('mobile')}
                required
                placeholder="Enter mobile number"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="fr-role">Franchise Type</label>
              <select id="fr-role" value={form.role} onChange={setField('role')} required disabled={submitting}>
                {FRANCHISE_SIGNUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {(needsZone || form.role === ROLES.SUPER_FRANCHISEE) && (
              <div className="change-password-field">
                <label htmlFor="fr-zone">Zone / City</label>
                <select
                  id="fr-zone"
                  value={form.zoneId}
                  onChange={setField('zoneId')}
                  required={form.role === ROLES.SUPER_FRANCHISEE && needsZone}
                  disabled={submitting}
                >
                  <option value="">Select zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </div>
            )}

            {needsParent && (
              <div className="change-password-field">
                <label htmlFor="fr-parent">Parent {parentRoleLabel}</label>
                <select
                  id="fr-parent"
                  value={form.parentFranchiseeId}
                  onChange={setField('parentFranchiseeId')}
                  required
                  disabled={submitting || loadingParents}
                >
                  <option value="">{loadingParents ? 'Loading…' : `Select ${parentRoleLabel}`}</option>
                  {parentOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {(row.display_name || row.username)}
                      {row.zone_name ? ` · ${row.zone_name}` : ''}
                    </option>
                  ))}
                </select>
                {parentHelp && <p className="user-signup-hint">{parentHelp}</p>}
              </div>
            )}

            <div className="change-password-field">
              <label htmlFor="fr-username">Login Username</label>
              <input
                id="fr-username"
                value={form.username}
                onChange={setField('username')}
                required
                autoComplete="off"
                placeholder="Login ID"
                disabled={submitting}
              />
            </div>

            <div className="change-password-field">
              <label htmlFor="fr-password">Password</label>
              <div className="password-field-row">
                <input
                  id="fr-password"
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
              {submitting ? 'Creating…' : 'Create Franchise Account'}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

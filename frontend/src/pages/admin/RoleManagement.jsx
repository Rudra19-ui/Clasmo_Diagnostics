import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLE_OPTIONS, ROLES, getSignupRoleOptionsForUser } from '../../utils/roles';
import { PRICE_ALWAYS_VISIBLE_ROLES, ROLE_PERMISSION_SCHEMA } from '../../utils/rolePermissions';

const MODULE_PERMISSIONS = ROLE_PERMISSION_SCHEMA.filter(
  (item) => item.key !== 'show_price' && item.key !== 'show_mrp',
);

const LAB_ROLE_CODES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.PATHOLOGIST,
  ROLES.TECHNICIAN,
  ROLES.RECEPTIONIST,
  ROLES.USER,
];

const FRANCHISE_ROLE_CODES = [
  ROLES.SUPER_FRANCHISEE,
  ROLES.FRANCHISEE,
  ROLES.SUB_FRANCHISE,
];

function roleBadgeClass(role) {
  switch (role) {
    case ROLES.ADMIN: return 'role-badge role-badge-admin';
    case ROLES.TECHNICIAN: return 'role-badge role-badge-tech';
    case ROLES.PATHOLOGIST: return 'role-badge role-badge-patho';
    case ROLES.SUPER_FRANCHISEE:
    case ROLES.FRANCHISEE:
    case ROLES.SUB_FRANCHISE:
      return 'role-badge role-badge-franchise';
    default: return 'role-badge role-badge-user';
  }
}

function displayRoleName(role) {
  return ROLE_LABELS[role.code] || role.name;
}

function sortRolesByOrder(list, order) {
  const rank = new Map(order.map((code, index) => [code, index]));
  return [...list].sort((a, b) => {
    const ai = rank.has(a.code) ? rank.get(a.code) : 999;
    const bi = rank.has(b.code) ? rank.get(b.code) : 999;
    if (ai !== bi) return ai - bi;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export default function RoleManagement() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
  const [roleDraft, setRoleDraft] = useState({ name: '', description: '', permissions: {} });
  const [draftRoles, setDraftRoles] = useState({});
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [savingPasswordId, setSavingPasswordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [filterZoneId, setFilterZoneId] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canViewPasswords = Boolean(isAdmin);
  const assignableRoles = useMemo(
    () => getSignupRoleOptionsForUser(user).length
      ? getSignupRoleOptionsForUser(user)
      : ROLE_OPTIONS.filter((option) => option.value !== ROLES.SUPER_ADMIN),
    [user],
  );

  const visibleRoles = useMemo(() => {
    if (isSuperAdmin) return roles;
    // Admin login: hide Admin role card (and its user count).
    return roles.filter((role) => role.code !== ROLES.ADMIN);
  }, [roles, isSuperAdmin]);

  const labRoles = useMemo(
    () => sortRolesByOrder(
      visibleRoles.filter((role) => LAB_ROLE_CODES.includes(role.code)),
      LAB_ROLE_CODES,
    ),
    [visibleRoles],
  );

  const franchiseRoles = useMemo(
    () => sortRolesByOrder(
      visibleRoles.filter((role) => FRANCHISE_ROLE_CODES.includes(role.code)),
      FRANCHISE_ROLE_CODES,
    ),
    [visibleRoles],
  );

  const otherRoles = useMemo(
    () => visibleRoles.filter(
      (role) => !LAB_ROLE_CODES.includes(role.code) && !FRANCHISE_ROLE_CODES.includes(role.code),
    ),
    [visibleRoles],
  );

  const visibleUsers = useMemo(() => {
    let list = users;
    if (!isSuperAdmin) {
      list = list.filter((row) => row.role !== ROLES.ADMIN && row.role !== ROLES.SUPER_ADMIN);
    }
    const q = filterSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const hay = [
        row.username,
        row.display_name,
        row.mobile,
        row.email,
        ROLE_LABELS[row.role],
        row.zone_name,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [users, isSuperAdmin, filterSearch]);

  const selectedRole = useMemo(
    () => visibleRoles.find((role) => role.code === selectedRoleCode) || null,
    [visibleRoles, selectedRoleCode],
  );

  const roleHasChanges = selectedRole && (
    roleDraft.name !== selectedRole.name
    || roleDraft.description !== (selectedRole.description || '')
    || ROLE_PERMISSION_SCHEMA.some(
      (item) => Boolean(roleDraft.permissions?.[item.key]) !== Boolean(selectedRole.permissions?.[item.key]),
    )
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roleData, zoneData] = await Promise.all([api.getRoles(), api.getZones()]);
      setRoles(roleData);
      const zoneList = Array.isArray(zoneData) ? zoneData : [];
      setZones(zoneList);
      if (!isSuperAdmin && zoneList.length === 1 && !filterZoneId) {
        setFilterZoneId(String(zoneList[0].id));
      }
      const filteredRoles = isSuperAdmin
        ? roleData
        : roleData.filter((role) => role.code !== ROLES.ADMIN);
      if (!selectedRoleCode && filteredRoles.length) {
        setSelectedRoleCode(filteredRoles[0].code);
        setRoleDraft({
          name: filteredRoles[0].name,
          description: filteredRoles[0].description || '',
          permissions: { ...filteredRoles[0].permissions },
        });
      } else if (
        selectedRoleCode === ROLES.ADMIN
        && !isSuperAdmin
        && filteredRoles.length
      ) {
        setSelectedRoleCode(filteredRoles[0].code);
      }
    } catch (err) {
      setError(err.message || 'Unable to load role management data.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleCode, isSuperAdmin, filterZoneId]);

  const loadUsers = useCallback(async () => {
    if (!filterZoneId && isSuperAdmin) {
      setError('Select a zone first, then apply the filter.');
      return;
    }
    if (!filterZoneId && !isSuperAdmin) {
      setError('Select a zone first, then apply the filter.');
      return;
    }
    setLoadingUsers(true);
    setError('');
    setSuccess('');
    try {
      const params = { is_active: true };
      if (filterZoneId) params.zone_id = filterZoneId;
      if (filterRole) params.role = filterRole;
      const userData = await api.getUsers(params);
      const list = Array.isArray(userData) ? userData : [];
      setUsers(list);
      setDraftRoles(Object.fromEntries(list.map((row) => [row.id, row.role])));
      setPasswordDrafts(Object.fromEntries(
        list.map((row) => [row.id, row.login_password || '']),
      ));
      setShowPasswords({});
      setUsersLoaded(true);
    } catch (err) {
      setError(err.message || 'Unable to load users.');
      setUsers([]);
      setUsersLoaded(true);
    } finally {
      setLoadingUsers(false);
    }
  }, [filterZoneId, filterRole, isSuperAdmin]);

  const clearUserFilter = () => {
    setFilterRole('');
    setFilterSearch('');
    if (isSuperAdmin) setFilterZoneId('');
    setUsers([]);
    setUsersLoaded(false);
    setSuccess('');
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedRole) return;
    setRoleDraft({
      name: selectedRole.name,
      description: selectedRole.description || '',
      permissions: { ...selectedRole.permissions },
    });
  }, [selectedRole]);

  const selectRole = (role) => {
    setSelectedRoleCode(role.code);
    setRoleDraft({
      name: role.name,
      description: role.description || '',
      permissions: { ...role.permissions },
    });
    setSuccess('');
    setError('');
  };

  const permissionOn = (key) => Boolean(
    roleDraft.permissions?.[key] ?? roleDraft.permissions?.show_price_mrp,
  );

  const priceMrpOn = () => (
    PRICE_ALWAYS_VISIBLE_ROLES.includes(selectedRoleCode)
    || permissionOn('show_price')
    || permissionOn('show_mrp')
  );

  const togglePermission = (key) => {
    if (!isAdmin) return;
    setRoleDraft((prev) => {
      if (key === 'show_price_mrp') {
        const current = Boolean(
          prev.permissions?.show_price
          ?? prev.permissions?.show_mrp
          ?? prev.permissions?.show_price_mrp,
        );
        const next = !current;
        return {
          ...prev,
          permissions: {
            ...prev.permissions,
            show_price: next,
            show_mrp: next,
            show_price_mrp: next,
          },
        };
      }
      const current = Boolean(prev.permissions?.[key]);
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [key]: !current,
        },
      };
    });
  };

  const handleSaveRole = async () => {
    if (!selectedRole || !isAdmin) return;
    setSavingRole(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateRole(selectedRole.code, {
        name: roleDraft.name.trim(),
        description: roleDraft.description.trim(),
        permissions: roleDraft.permissions,
      });
      setRoles((prev) => prev.map((role) => (role.code === updated.code ? updated : role)));
      setSuccess(`Role "${updated.name}" updated successfully.`);
    } catch (err) {
      setError(err.message || 'Unable to update role.');
    } finally {
      setSavingRole(false);
    }
  };

  const handleUserRoleChange = (userId, role) => {
    setDraftRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const handleSaveUserRole = async (row) => {
    const nextRole = draftRoles[row.id];
    if (!nextRole || nextRole === row.role) return;
    setSavingUserId(row.id);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateUserRole(row.id, nextRole);
      setUsers((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      setDraftRoles((prev) => ({ ...prev, [row.id]: updated.role }));
      setSuccess(`User ${row.display_name || row.username} assigned to ${ROLE_LABELS[updated.role]}.`);
    } catch (err) {
      setError(err.message || 'Unable to update user role.');
      setDraftRoles((prev) => ({ ...prev, [row.id]: row.role }));
    } finally {
      setSavingUserId(null);
    }
  };

  const handlePasswordDraftChange = (userId, value) => {
    setPasswordDrafts((prev) => ({ ...prev, [userId]: value }));
  };

  const toggleShowPassword = (userId) => {
    setShowPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSavePassword = async (row) => {
    const nextPassword = (passwordDrafts[row.id] || '').trim();
    if (nextPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (nextPassword === (row.login_password || '')) {
      setSuccess('Password unchanged.');
      return;
    }
    setSavingPasswordId(row.id);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateUserPassword(row.id, nextPassword);
      setUsers((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      setPasswordDrafts((prev) => ({ ...prev, [row.id]: updated.login_password || nextPassword }));
      setSuccess(`Password updated for ${row.display_name || row.username}.`);
    } catch (err) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setSavingPasswordId(null);
    }
  };

  const tableColSpan = 3 + (canViewPasswords ? 1 : 0) + (isAdmin ? 2 : 0);

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>User Management</li>
            <li>Role Management</li>
          </ul>
        </nav>

        <section className="role-management-panel">
          <div className="role-management-header">
            <div>
              <h2 className="change-password-title">Role Management</h2>
              <p className="role-management-subtitle">
                Manage role permissions, Entry Section access, and which roles can see Price / MRP.
              </p>
            </div>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                loadData();
                if (usersLoaded) loadUsers();
              }}
              disabled={loading || loadingUsers}
            >
              Refresh
            </button>
          </div>

          {error && <p className="change-password-message error" role="alert">{error}</p>}
          {success && <p className="change-password-message success" role="status">{success}</p>}

          <div className="role-management-layout">
            <aside className="role-list-panel">
              <h3 className="role-section-title">Roles</h3>
              {loading && <p className="role-panel-empty">Loading roles...</p>}
              {!loading && (
                <>
                  <div className="role-group">
                    <h4 className="role-group-title">Users in Lab</h4>
                    {labRoles.length === 0 && (
                      <p className="role-panel-empty">No lab roles.</p>
                    )}
                    {labRoles.map((role) => (
                      <button
                        key={role.code}
                        type="button"
                        className={`role-list-item${selectedRoleCode === role.code ? ' is-active' : ''}`}
                        onClick={() => selectRole(role)}
                      >
                        <span className={roleBadgeClass(role.code)}>{displayRoleName(role)}</span>
                        <span className="role-list-meta">{role.user_count} user{role.user_count === 1 ? '' : 's'}</span>
                      </button>
                    ))}
                  </div>

                  <div className="role-group">
                    <h4 className="role-group-title">Users in Franchise</h4>
                    {franchiseRoles.length === 0 && (
                      <p className="role-panel-empty">No franchise roles.</p>
                    )}
                    {franchiseRoles.map((role) => (
                      <button
                        key={role.code}
                        type="button"
                        className={`role-list-item${selectedRoleCode === role.code ? ' is-active' : ''}`}
                        onClick={() => selectRole(role)}
                      >
                        <span className={roleBadgeClass(role.code)}>{displayRoleName(role)}</span>
                        <span className="role-list-meta">{role.user_count} user{role.user_count === 1 ? '' : 's'}</span>
                      </button>
                    ))}
                  </div>

                  {otherRoles.length > 0 && (
                    <div className="role-group">
                      <h4 className="role-group-title">Other</h4>
                      {otherRoles.map((role) => (
                        <button
                          key={role.code}
                          type="button"
                          className={`role-list-item${selectedRoleCode === role.code ? ' is-active' : ''}`}
                          onClick={() => selectRole(role)}
                        >
                          <span className={roleBadgeClass(role.code)}>{displayRoleName(role)}</span>
                          <span className="role-list-meta">{role.user_count} user{role.user_count === 1 ? '' : 's'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </aside>

            <div className="role-detail-panel">
              {selectedRole ? (
                <>
                  <div className="role-detail-header">
                    <h3 className="role-section-title">Manage Role: {displayRoleName(selectedRole)}</h3>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-blue btn-sm"
                        onClick={handleSaveRole}
                        disabled={!roleHasChanges || savingRole}
                      >
                        {savingRole ? 'Saving...' : 'Save Role'}
                      </button>
                    )}
                  </div>

                  <div className="role-form-grid">
                    <div className="change-password-field">
                      <label htmlFor="role-name">Role Name</label>
                      <input
                        id="role-name"
                        type="text"
                        value={roleDraft.name}
                        onChange={(event) => setRoleDraft((prev) => ({ ...prev, name: event.target.value }))}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="change-password-field role-description-field">
                      <label htmlFor="role-description">Description</label>
                      <textarea
                        id="role-description"
                        rows={2}
                        value={roleDraft.description}
                        onChange={(event) => setRoleDraft((prev) => ({ ...prev, description: event.target.value }))}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  <h4 className="role-permissions-title">Module Permissions</h4>
                  <p className="role-management-subtitle" style={{ marginTop: 0 }}>
                    Tick modules to grant access. <strong>Show Price &amp; MRP</strong> controls both amount columns together. Sidebar items update after the role logs in again.
                  </p>
                  <div className="role-permissions-grid">
                    <label className="role-permission-item role-permission-item--accent">
                      <input
                        type="checkbox"
                        checked={priceMrpOn()}
                        onChange={() => togglePermission('show_price_mrp')}
                        disabled={!isAdmin || PRICE_ALWAYS_VISIBLE_ROLES.includes(selectedRole.code)}
                      />
                      <span>Show Price &amp; MRP</span>
                    </label>
                    {MODULE_PERMISSIONS.map((item) => (
                      <label key={item.key} className={`role-permission-item${item.key === 'entry_section' ? ' role-permission-item--accent' : ''}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(roleDraft.permissions?.[item.key])}
                          onChange={() => togglePermission(item.key)}
                          disabled={!isAdmin}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  {PRICE_ALWAYS_VISIBLE_ROLES.includes(selectedRole.code) && (
                    <p className="role-readonly-note">Admin and Super Admin always see Price and MRP.</p>
                  )}
                </>
              ) : (
                <p className="role-panel-empty">Select a role to manage permissions.</p>
              )}
            </div>
          </div>

          <div className="role-users-section">
            <h3 className="role-section-title">Assign Roles to Users</h3>
            <p className="role-management-subtitle">
              Select a zone (and optional role), then apply the filter to load users.
            </p>

            <form
              className="role-user-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                loadUsers();
              }}
            >
              <label className="role-user-filter-field">
                <span>Zone</span>
                <select
                  value={filterZoneId}
                  onChange={(event) => {
                    setFilterZoneId(event.target.value);
                    setUsersLoaded(false);
                    setUsers([]);
                  }}
                  required
                >
                  <option value="">Select zone…</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} ({zone.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="role-user-filter-field">
                <span>Role</span>
                <select
                  value={filterRole}
                  onChange={(event) => {
                    setFilterRole(event.target.value);
                    setUsersLoaded(false);
                    setUsers([]);
                  }}
                >
                  <option value="">All roles</option>
                  {ROLE_OPTIONS.filter((option) => (
                    isSuperAdmin || (option.value !== ROLES.ADMIN && option.value !== ROLES.SUPER_ADMIN)
                  )).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="role-user-filter-field role-user-filter-search">
                <span>Search</span>
                <input
                  type="search"
                  value={filterSearch}
                  onChange={(event) => setFilterSearch(event.target.value)}
                  placeholder="Name, username, mobile"
                  disabled={!usersLoaded}
                />
              </label>
              <div className="role-user-filter-actions">
                <button type="submit" className="btn-blue btn-sm" disabled={loadingUsers || !filterZoneId}>
                  {loadingUsers ? 'Loading…' : 'Apply Filter'}
                </button>
                <button type="button" className="btn-outline btn-sm" onClick={clearUserFilter} disabled={loadingUsers}>
                  Clear
                </button>
              </div>
            </form>

            {!usersLoaded && !loadingUsers && (
              <p className="role-panel-empty">
                No users shown yet. Choose a zone and click Apply Filter.
              </p>
            )}

            {(usersLoaded || loadingUsers) && (
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table role-management-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        {canViewPasswords && <th>Password</th>}
                        <th>Display Name</th>
                        <th>Current Role</th>
                        {isAdmin && <th>Assign Role</th>}
                        {isAdmin && <th>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers && (
                        <tr>
                          <td colSpan={tableColSpan} className="empty-msg">Loading users...</td>
                        </tr>
                      )}
                      {!loadingUsers && visibleUsers.length === 0 && (
                        <tr>
                          <td colSpan={tableColSpan} className="empty-msg">No users match this filter.</td>
                        </tr>
                      )}
                      {!loadingUsers && visibleUsers.map((row) => {
                        const isSelf = row.id === user?.id;
                        const draftRole = draftRoles[row.id] || row.role;
                        const hasChanges = draftRole !== row.role;
                        const passwordValue = passwordDrafts[row.id] ?? row.login_password ?? '';
                        const passwordDirty = passwordValue !== (row.login_password || '');
                        return (
                          <tr key={row.id}>
                            <td>{row.username}</td>
                            {canViewPasswords && (
                              <td>
                                <div className="role-password-cell">
                                  <input
                                    type={showPasswords[row.id] ? 'text' : 'password'}
                                    value={passwordValue}
                                    onChange={(event) => handlePasswordDraftChange(row.id, event.target.value)}
                                    placeholder="Set password"
                                    autoComplete="new-password"
                                    disabled={savingPasswordId === row.id}
                                  />
                                  <label className="role-password-show">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(showPasswords[row.id])}
                                      onChange={() => toggleShowPassword(row.id)}
                                    />
                                    Show
                                  </label>
                                  <button
                                    type="button"
                                    className="btn-outline btn-sm"
                                    onClick={() => handleSavePassword(row)}
                                    disabled={
                                      savingPasswordId === row.id
                                      || !passwordDirty
                                      || passwordValue.trim().length < 8
                                    }
                                  >
                                    {savingPasswordId === row.id ? 'Saving...' : 'Set'}
                                  </button>
                                </div>
                              </td>
                            )}
                            <td>{row.display_name || '—'}</td>
                            <td>
                              <span className={roleBadgeClass(row.role)}>
                                {ROLE_LABELS[row.role] || row.role}
                              </span>
                            </td>
                            {isAdmin && (
                              <td>
                                <select
                                  value={draftRole}
                                  onChange={(event) => handleUserRoleChange(row.id, event.target.value)}
                                  disabled={isSelf || savingUserId === row.id}
                                >
                                  {assignableRoles.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                  {!assignableRoles.some((option) => option.value === draftRole) && (
                                    <option value={draftRole}>{ROLE_LABELS[draftRole] || draftRole}</option>
                                  )}
                                </select>
                                {isSelf && <span className="role-self-note">Your account</span>}
                              </td>
                            )}
                            {isAdmin && (
                              <td>
                                <button
                                  type="button"
                                  className="btn-blue btn-sm"
                                  onClick={() => handleSaveUserRole(row)}
                                  disabled={isSelf || !hasChanges || savingUserId === row.id}
                                >
                                  {savingUserId === row.id ? 'Saving...' : 'Update'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {usersLoaded && !loadingUsers && (
                  <p className="role-management-subtitle" style={{ marginTop: '0.75rem' }}>
                    Showing {visibleUsers.length} user{visibleUsers.length === 1 ? '' : 's'}.
                  </p>
                )}
              </div>
            )}
            {!isAdmin && (
              <p className="role-readonly-note">
                You can view roles and permissions. Only admins can edit roles or assign them to users.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}

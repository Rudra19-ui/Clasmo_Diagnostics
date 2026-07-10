import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLE_OPTIONS, ROLES } from '../../utils/roles';
import { ROLE_PERMISSION_SCHEMA } from '../../utils/rolePermissions';

function roleBadgeClass(role) {
  switch (role) {
    case ROLES.ADMIN: return 'role-badge role-badge-admin';
    case ROLES.TECHNICIAN: return 'role-badge role-badge-tech';
    case ROLES.PATHOLOGIST: return 'role-badge role-badge-patho';
    default: return 'role-badge role-badge-user';
  }
}

export default function RoleManagement() {
  const { user, isAdmin } = useAuth();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
  const [roleDraft, setRoleDraft] = useState({ name: '', description: '', permissions: {} });
  const [draftRoles, setDraftRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedRole = useMemo(
    () => roles.find((role) => role.code === selectedRoleCode) || null,
    [roles, selectedRoleCode],
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
      const [roleData, userData] = await Promise.all([api.getRoles(), api.getUsers()]);
      setRoles(roleData);
      setUsers(userData);
      setDraftRoles(Object.fromEntries(userData.map((row) => [row.id, row.role])));
      if (!selectedRoleCode && roleData.length) {
        setSelectedRoleCode(roleData[0].code);
        setRoleDraft({
          name: roleData[0].name,
          description: roleData[0].description || '',
          permissions: { ...roleData[0].permissions },
        });
      }
    } catch (err) {
      setError(err.message || 'Unable to load role management data.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleCode]);

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

  const togglePermission = (key) => {
    if (!isAdmin) return;
    setRoleDraft((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions?.[key],
      },
    }));
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
                Manage role permissions and assign roles to users.
              </p>
            </div>
            <button type="button" className="btn-outline" onClick={loadData} disabled={loading}>
              Refresh
            </button>
          </div>

          {error && <p className="change-password-message error" role="alert">{error}</p>}
          {success && <p className="change-password-message success" role="status">{success}</p>}

          <div className="role-management-layout">
            <aside className="role-list-panel">
              <h3 className="role-section-title">Roles</h3>
              {loading && <p className="role-panel-empty">Loading roles...</p>}
              {!loading && roles.map((role) => (
                <button
                  key={role.code}
                  type="button"
                  className={`role-list-item${selectedRoleCode === role.code ? ' is-active' : ''}`}
                  onClick={() => selectRole(role)}
                >
                  <span className={roleBadgeClass(role.code)}>{role.name}</span>
                  <span className="role-list-meta">{role.user_count} user{role.user_count === 1 ? '' : 's'}</span>
                </button>
              ))}
            </aside>

            <div className="role-detail-panel">
              {selectedRole ? (
                <>
                  <div className="role-detail-header">
                    <h3 className="role-section-title">Manage Role: {selectedRole.name}</h3>
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
                  <div className="role-permissions-grid">
                    {ROLE_PERMISSION_SCHEMA.map((item) => (
                      <label key={item.key} className="role-permission-item">
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
                </>
              ) : (
                <p className="role-panel-empty">Select a role to manage permissions.</p>
              )}
            </div>
          </div>

          <div className="role-users-section">
            <h3 className="role-section-title">Assign Roles to Users</h3>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table role-management-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Display Name</th>
                      <th>Current Role</th>
                      {isAdmin && <th>Assign Role</th>}
                      {isAdmin && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 3} className="empty-msg">Loading users...</td>
                      </tr>
                    )}
                    {!loading && users.map((row) => {
                      const isSelf = row.id === user?.id;
                      const draftRole = draftRoles[row.id] || row.role;
                      const hasChanges = draftRole !== row.role;
                      return (
                        <tr key={row.id}>
                          <td>{row.username}</td>
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
                                {ROLE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
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
            </div>
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

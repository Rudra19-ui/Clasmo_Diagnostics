/**
 * Clasmo Diagnostics — client-side auth (demo / trial)
 */
window.ClasmoAuth = (function () {
  const STORAGE_KEY = 'clasmo_session';

  const ACCOUNTS = {
    user: {
      password: 'user123',
      role: 'user',
      displayName: 'User',
      labCode: '202505017'
    },
    admin: {
      password: 'admin123',
      role: 'admin',
      displayName: 'Admin',
      labCode: '202505017'
    },
    technician: {
      password: 'tech123',
      role: 'technician',
      displayName: 'Technician',
      labCode: '202505017'
    },
    pathologist: {
      password: 'patho123',
      role: 'pathologist',
      displayName: 'Pathologist',
      labCode: '202505017'
    },
    hr: {
      password: 'hr123',
      role: 'hr',
      displayName: 'HR',
      labCode: '202505017'
    },
    receptionist: {
      password: 'reception123',
      role: 'receptionist',
      displayName: 'Receptionist',
      labCode: '202505017'
    },
    supreme: {
      password: 'supreme123',
      role: 'super_franchisee',
      displayName: 'Supreme',
      labCode: '202505017'
    },
    prime: {
      password: 'prime123',
      role: 'franchisee',
      displayName: 'Prime',
      labCode: '202505017'
    },
    sub: {
      password: 'sub123',
      role: 'sub_franchise',
      displayName: 'Sub-Franchise',
      labCode: '202505017'
    }
  };

  function login(username, password) {
    const key = (username || '').trim().toLowerCase();
    const account = ACCOUNTS[key];
    if (!account || account.password !== password) {
      return { ok: false, message: 'Invalid username or password.' };
    }
    const session = {
      username: key,
      role: account.role,
      displayName: account.displayName,
      labCode: account.labCode,
      loginAt: Date.now()
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true, session };
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    const base = window.location.pathname.indexOf('/device/') !== -1 ? '../' : '';
    window.location.href = base + 'index.html';
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function requireAuth(allowedRoles) {
    const session = getSession();
    if (!session) {
      const base = window.location.pathname.indexOf('/device/') !== -1 ? '../' : '';
      window.location.href = base + 'index.html';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      alert('Access denied. This section requires ' + allowedRoles.join(' or ') + ' login.');
      const base = window.location.pathname.indexOf('/device/') !== -1 ? '../' : '';
      window.location.href = base + 'search.html';
      return null;
    }
    return session;
  }

  function isAdmin() {
    const s = getSession();
    return s && s.role === 'admin';
  }

  return { login, logout, getSession, requireAuth, isAdmin, ACCOUNTS };
})();

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem('clasmo_token');
    if (!token) {
      setUser(null);
      if (!silent) setLoading(false);
      return null;
    }

    if (!silent) setLoading(true);
    try {
      const me = await api.me();
      setUser(me);
      return me;
    } catch {
      localStorage.removeItem('clasmo_token');
      setUser(null);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'clasmo_token') {
        refreshUser({ silent: true });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshUser]);

  const value = useMemo(() => ({
    user,
    loading,
    refreshUser,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    async login(username, password, options = {}) {
      const data = await api.login(username, password, options);
      localStorage.setItem('clasmo_token', data.token);
      setUser(data.user);
      return data.user;
    },
    async register(payload) {
      return api.register(payload);
    },
    logout() {
      void api.logout().catch(() => {});
      localStorage.removeItem('clasmo_token');
      setUser(null);
    },
  }), [user, loading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

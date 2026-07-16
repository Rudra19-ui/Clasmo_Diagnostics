import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clasmo_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('clasmo_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'admin',
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
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

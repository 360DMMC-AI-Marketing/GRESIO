import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, companies } from '../services/api';
import { useSocket } from '../hooks/useSocket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cios_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState(() => {
    const saved = localStorage.getItem('cios_company');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('cios_token');
  const { socket } = useSocket(token);

  const fetchCompany = useCallback(async (userData) => {
    try {
      const domain = userData?.domain || userData?.email;
      if (!domain) return;
      const res = await companies.getAll();
      const match = res.data.find(c => c.domain === domain);
      if (match) {
        setCompany(match);
        localStorage.setItem('cios_company', JSON.stringify(match));
      }
    } catch (e) {
      // company fetch is non-critical
    }
  }, []);

  useEffect(() => {
    if (token) {
      auth.getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('cios_user', JSON.stringify(res.data));
          fetchCompany(res.data);
        })
        .catch(() => {
          localStorage.removeItem('cios_token');
          localStorage.removeItem('cios_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await auth.login({ email, password });
    localStorage.setItem('cios_token', res.data.token);
    localStorage.setItem('cios_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    await fetchCompany(res.data.user);
    return res.data;
  }, [fetchCompany]);

  const logout = useCallback(() => {
    localStorage.removeItem('cios_token');
    localStorage.removeItem('cios_user');
    localStorage.removeItem('cios_company');
    setUser(null);
    setCompany(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    localStorage.setItem('cios_user', JSON.stringify(updated));
  }, []);

  const updateCompany = useCallback((updated) => {
    setCompany(updated);
    localStorage.setItem('cios_company', JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider value={{ user, company, login, logout, loading, socket, updateUser, updateCompany, fetchCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

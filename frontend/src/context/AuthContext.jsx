import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, companies } from '../services/api';
import { useSocket } from '../hooks/useSocket';

const getInitialTheme = () => {
  const saved = localStorage.getItem('gresio_theme');
  if (saved) return saved;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gresio_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState(() => {
    const saved = localStorage.getItem('gresio_company');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState(getInitialTheme);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('gresio_token');
  const { socket } = useSocket(token);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('gresio_theme', theme);
  }, [theme]);

  const fetchCompany = useCallback(async (userData) => {
    try {
      const domain = userData?.domain || userData?.email;
      if (!domain) return;
      const res = await companies.getAll();
      const match = res.data.find(c => c.domain === domain);
      if (match) {
        setCompany(match);
        localStorage.setItem('gresio_company', JSON.stringify(match));
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
          localStorage.setItem('gresio_user', JSON.stringify(res.data));
          fetchCompany(res.data);
        })
        .catch(() => {
          localStorage.removeItem('gresio_token');
          localStorage.removeItem('gresio_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await auth.login({ email, password });
    localStorage.setItem('gresio_token', res.data.token);
    localStorage.setItem('gresio_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    if (res.data.user?.theme) setTheme(res.data.user.theme);
    await fetchCompany(res.data.user);
    return res.data;
  }, [fetchCompany]);

  const logout = useCallback(() => {
    localStorage.removeItem('gresio_token');
    localStorage.removeItem('gresio_user');
    localStorage.removeItem('gresio_company');
    setUser(null);
    setCompany(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    localStorage.setItem('gresio_user', JSON.stringify(updated));
  }, []);

  const updateCompany = useCallback((updated) => {
    setCompany(updated);
    localStorage.setItem('gresio_company', JSON.stringify(updated));
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      await auth.updateProfile({ theme: next });
    } catch (e) {}
  }, [theme]);

  return (
    <AuthContext.Provider value={{ user, company, login, logout, loading, socket, updateUser, updateCompany, fetchCompany, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

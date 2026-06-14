import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Admins from './pages/Admins';
import Analytics from './pages/Analytics';
import Health from './pages/Health';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('sa_token', urlToken);
      const urlUser = params.get('user');
      if (urlUser) {
        try { localStorage.setItem('sa_user', urlUser); } catch (e) {}
      }
      window.history.replaceState({}, '', '/super-admin/');
    }
    return localStorage.getItem('sa_token');
  });
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('sa_user') || 'null'));

  const handleLogin = (t, u) => {
    localStorage.setItem('sa_token', t);
    localStorage.setItem('sa_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    window.location.href = 'http://localhost:3000';
  };

  useEffect(() => {
    const handler = () => {
      setToken(localStorage.getItem('sa_token'));
      setUser(JSON.parse(localStorage.getItem('sa_user') || 'null'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!token || !user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col ml-60">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/health" element={<Health />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

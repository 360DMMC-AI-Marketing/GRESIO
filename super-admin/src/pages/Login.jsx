import { useState, useCallback } from 'react';
import { api } from '../api';
import Flash from '../components/Flash';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('super@360dmmc.com');
  const [password, setPassword] = useState('Admin@360dmmc2026');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFlash(null);
    try {
      const data = await api.login(email, password);
      if (onLogin) onLogin(data.token, data.user);
    } catch (err) {
      setFlash({ message: err.message || 'Login failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const clearFlash = useCallback(() => setFlash(null), []);

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      {flash && <Flash message={flash.message} type={flash.type} onClose={clearFlash} />}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-surface-900">CIOS</h1>
          <p className="text-surface-500 text-sm mt-1">Super Admin Console</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#2347e8] text-white rounded-lg text-sm font-semibold hover:bg-[#1d3dcc] transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-xs text-surface-400 mt-6">
          360DMMC Administration
        </p>
        <div className="text-center mt-4 pt-4 border-t border-surface-100">
          <a href="http://localhost:3000" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

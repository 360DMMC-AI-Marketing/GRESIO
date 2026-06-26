import { useState, useCallback } from 'react';
import { api } from '../../services/api';
import Flash from '../../components/super-admin/Flash';
import Logo from '../../components/Logo';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-[var(--bg-primary)] flex items-center justify-center page-enter">
      {flash && <Flash message={flash.message} type={flash.type} onClose={clearFlash} />}
      <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-[var(--radius-xl)] shadow-[var(--elevation-low)] w-full max-w-sm mx-4 p-8">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center">
            <Logo size="md" showTagline tagline="Super Admin Console" />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-[var(--border-secondary)] dark:border-[var(--border-secondary)] rounded-[var(--radius-lg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2.5 border border-[var(--border-secondary)] dark:border-[var(--border-secondary)] rounded-[var(--radius-lg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]" />
          </div>
          <button type="submit" disabled={loading}
            className="btn-premium w-full py-2.5 bg-[var(--brand-primary)] dark:bg-[var(--brand-primary)] text-white rounded-[var(--radius-lg)] text-sm font-semibold hover:bg-[var(--brand-secondary)] dark:hover:bg-[var(--brand-secondary)] transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          360DMMC Administration
        </p>
        <div className="text-center mt-4 pt-4 border-t border-[var(--border-primary)] dark:border-t dark:border-[var(--border-primary)]">
          <a href={import.meta.env.VITE_MAIN_APP_URL || '/'} className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

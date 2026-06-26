import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await auth.resetPassword(token, { password });
      localStorage.setItem('gresio_token', data.token);
      localStorage.setItem('gresio_user', JSON.stringify(data.user));
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-white dark:bg-[var(--bg-primary)] flex items-center justify-center px-5 page-enter">
        <div className="glass-panel glow-card p-8 rounded-[var(--radius-xl)] bg-white dark:bg-[var(--bg-secondary)] w-full max-w-sm text-center animate-scale-in">
          <div className="w-14 h-14 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">\u2705</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Password reset successful!</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-2">Redirecting you to the dashboard\u2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--bg-primary)] page-enter">
      <nav className="border-b border-[var(--glass-border)] bg-white/90 dark:bg-[var(--bg-secondary)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
        </div>
      </nav>
      <div className="pt-24 pb-16 px-5">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set new password</h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1">Choose a strong password you haven&apos;t used before</p>
          </div>
          <div className="glass-panel glow-card p-6 rounded-[var(--radius-xl)] bg-white dark:bg-[var(--bg-secondary)]">
            {error && (
              <div className="mb-4 px-4 py-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-sm text-[var(--danger-text)]">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in animate-scale-in">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full px-3 py-2.5 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none bg-white dark:bg-[var(--bg-tertiary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full px-3 py-2.5 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none bg-white dark:bg-[var(--bg-tertiary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="btn-premium w-full py-2.5 mt-2 disabled:opacity-50">
                {loading ? 'Resetting\u2026' : 'Reset password'}
              </button>
            </form>
            <p className="text-center mt-4">
              <Link to="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

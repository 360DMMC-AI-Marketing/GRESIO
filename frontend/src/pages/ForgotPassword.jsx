import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/api';
import Logo from '../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white dark:bg-[var(--bg-primary)] flex items-center justify-center px-5 page-enter">
        <div className="glass-panel glow-card p-8 rounded-[var(--radius-xl)] bg-white dark:bg-[var(--bg-secondary)] w-full max-w-sm text-center animate-scale-in">
          <div className="w-14 h-14 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">\u2705</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Check your email</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-2 leading-relaxed">
            We&apos;ve sent a password reset link to <strong className="text-[var(--text-primary)]">{email}</strong>. It expires in 1 hour.
          </p>
          <Link to="/login" className="inline-block mt-6 text-sm text-[var(--brand-primary)] hover:text-[var(--brand-hover)] font-medium">
            Back to sign in
          </Link>
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Forgot password?</h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1">Enter your email and we&apos;ll send you a reset link</p>
          </div>
          <div className="glass-panel glow-card p-6 rounded-[var(--radius-xl)] bg-white dark:bg-[var(--bg-secondary)]">
            {error && (
              <div className="mb-4 px-4 py-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-sm text-[var(--danger-text)]">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in animate-scale-in">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@company.com"
                  className="w-full px-3 py-2.5 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none bg-white dark:bg-[var(--bg-tertiary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="btn-premium w-full py-2.5 mt-2 disabled:opacity-50">
                {loading ? 'Sending\u2026' : 'Send reset link'}
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

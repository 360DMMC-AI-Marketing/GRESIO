import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const { user, login, verify2fa } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
      if (res.requiresTwoFactor) {
        setTempToken(res.tempToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verify2fa(tempToken, code);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
      setLoading(false);
    }
  };

  if (tempToken) {
    return (
      <div className="min-h-screen bg-white dark:bg-[var(--bg-primary)] page-enter">
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-[var(--bg-secondary)]/90 backdrop-blur-md shadow-sm border-b border-[var(--glass-border)]' : 'bg-transparent'}`}>
          <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link to="/"><Logo size="sm" /></Link>
          </div>
        </nav>
        <div className="pt-24 pb-16 px-5">
          <div className="w-full max-w-sm mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="w-12 h-12 bg-[var(--info-bg)] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🔐</span>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Two-factor authentication</h1>
              <p className="text-[var(--text-tertiary)] text-sm mt-1">Enter the code from your authenticator app</p>
            </div>
            <div className="glass-panel glow-card p-6 rounded-[var(--radius-xl)] bg-white dark:bg-[var(--bg-secondary)]">
              {error && (
                <div className="mb-4 px-4 py-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-sm text-[var(--danger-text)]">{error}</div>
              )}
              <form onSubmit={handleCode} className="space-y-4 animate-fade-in animate-scale-in">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Authentication code</label>
                  <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} required
                    placeholder="000 000" maxLength={6}
                    className="w-full px-3 py-2.5 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none text-center text-lg tracking-widest bg-white dark:bg-[var(--bg-tertiary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors" />
                </div>
                <button type="submit" disabled={loading || code.length < 6}
                  className="btn-premium w-full py-2.5 mt-2 disabled:opacity-50">
                  {loading ? 'Verifying\u2026' : 'Verify'}
                </button>
              </form>
              <p className="text-center mt-4">
                <button type="button" onClick={() => { setTempToken(''); setCode(''); setError(''); }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors bg-transparent border-none cursor-pointer">
                  Back to sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--bg-primary)] page-enter">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-[var(--bg-secondary)]/90 backdrop-blur-md shadow-sm border-b border-[var(--glass-border)]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/"><Logo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[var(--brand-primary)] px-3 py-1.5 transition-colors">Sign In</Link>
            <Link to="/register" className="text-sm font-medium btn-premium px-4 py-2">Get Started</Link>
          </div>
        </div>
      </nav>
      <div className="pt-24 pb-16 px-5">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1">Sign in to your workspace</p>
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
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full px-3 py-2.5 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none bg-white dark:bg-[var(--bg-tertiary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="btn-premium w-full py-2.5 mt-2 disabled:opacity-50">
                {loading ? 'Signing in\u2026' : 'Sign in'}
              </button>
            </form>
            <p className="text-center mt-4 space-x-2">
              <Link to="/forgot-password" className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors">Forgot password?</Link>
              <span className="text-xs text-[var(--text-muted)]">\u00B7</span>
              <Link to="/register" className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-hover)] font-medium">Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

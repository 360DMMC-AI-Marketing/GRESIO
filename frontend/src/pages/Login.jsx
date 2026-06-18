import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      <div className="min-h-screen bg-white">
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-surface-200' : 'bg-transparent'}`}>
          <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2"><span className="text-xl font-bold text-surface-900 tracking-tight">GRESIO</span></Link>
          </div>
        </nav>
        <div className="pt-24 pb-16 px-5">
          <div className="w-full max-w-sm mx-auto">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🔐</span>
              </div>
              <h1 className="text-2xl font-bold text-surface-900">Two-factor authentication</h1>
              <p className="text-surface-500 text-sm mt-1">Enter the code from your authenticator app</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
              )}
              <form onSubmit={handleCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">Authentication code</label>
                  <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} required
                    placeholder="000 000" maxLength={6}
                    className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none text-center text-lg tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                </div>
                <button type="submit" disabled={loading || code.length < 6}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors mt-2">
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </form>
              <p className="text-center mt-4">
                <button type="button" onClick={() => { setTempToken(''); setCode(''); setError(''); }}
                  className="text-xs text-surface-400 hover:text-primary-600 transition-colors bg-transparent border-none cursor-pointer">
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
    <div className="min-h-screen bg-white">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-surface-200' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="text-xl font-bold text-surface-900 tracking-tight">GRESIO</span></Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-primary-600 px-3 py-1.5 transition-colors">Sign In</Link>
            <Link to="/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>
      <div className="pt-24 pb-16 px-5">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-surface-900">Welcome back</h1>
            <p className="text-surface-500 text-sm mt-1">Sign in to your workspace</p>
          </div>
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@company.com"
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors mt-2">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="text-center mt-4 space-x-2">
              <Link to="/forgot-password" className="text-xs text-surface-400 hover:text-primary-600 transition-colors">Forgot password?</Link>
              <span className="text-xs text-surface-300">·</span>
              <Link to="/register" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = API_URL ? API_URL.replace(/\/api\/?$/, '') : '';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [superAdminUrl, setSuperAdminUrl] = useState(API_BASE + '/super-admin/');
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    fetch(API_URL + '/config')
      .then(r => r.json())
      .then(c => { if (c.superAdminUrl) setSuperAdminUrl(c.superAdminUrl); })
      .catch(() => {});
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

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
              <a href={superAdminUrl} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200 transition-all shadow-sm text-[11px] font-semibold" title="Login as Super Admin">
                <Crown size={14} strokeWidth={2.5} />SU
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

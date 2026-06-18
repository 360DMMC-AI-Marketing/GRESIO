import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
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
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Password reset successful!</h1>
          <p className="text-surface-500 text-sm mt-2">Redirecting you to the dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-surface-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-surface-900 tracking-tight">GRESIO</span>
          </Link>
        </div>
      </nav>
      <div className="pt-24 pb-16 px-5">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-surface-900">Set new password</h1>
            <p className="text-surface-500 text-sm mt-1">Choose a strong password you haven&apos;t used before</p>
          </div>
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors mt-2">
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
            <p className="text-center mt-4">
              <Link to="/login" className="text-xs text-surface-400 hover:text-primary-600 transition-colors">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

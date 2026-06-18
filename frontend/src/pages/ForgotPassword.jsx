import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/api';

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
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Check your email</h1>
          <p className="text-surface-500 text-sm mt-2 leading-relaxed">
            We&apos;ve sent a password reset link to <strong className="text-surface-700">{email}</strong>. It expires in 1 hour.
          </p>
          <Link to="/login" className="inline-block mt-6 text-sm text-primary-600 hover:text-primary-700 font-medium">
            Back to sign in
          </Link>
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
            <h1 className="text-2xl font-bold text-surface-900">Forgot password?</h1>
            <p className="text-surface-500 text-sm mt-1">Enter your email and we&apos;ll send you a reset link</p>
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
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors mt-2">
                {loading ? 'Sending…' : 'Send reset link'}
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

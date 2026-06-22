import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../services/api';

const INDUSTRIES = [
  'Technology / Software', 'Healthcare / Medical', 'Finance / Banking',
  'Education / E-Learning', 'E-commerce / Retail', 'Marketing / Advertising',
  'Consulting / Professional Services', 'Real Estate / Construction',
  'Manufacturing / Industrial', 'Media / Entertainment', 'Telecommunications',
  'Transportation / Logistics', 'Energy / Utilities', 'Non-profit / NGO',
  'Government / Public Sector', 'Hospitality / Tourism', 'Food & Beverage',
  'Agriculture', 'Legal / Law', 'Other',
];

const COUNTRIES = [
  'France', 'United States', 'Canada', 'United Kingdom', 'Germany',
  'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Australia',
  'New Zealand', 'Japan', 'South Korea', 'Singapore', 'India',
  'Brazil', 'Mexico', 'Argentina', 'UAE', 'Saudi Arabia',
  'South Africa', 'Morocco', 'Algeria', 'Tunisia', 'Nigeria',
  'China', 'Portugal', 'Ireland', 'Austria', 'Poland',
  'Turkey', 'Russia', 'Israel', 'Egypt', 'Other',
];

const TIMEZONES = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00 (PST)',
  'UTC-07:00 (MST)', 'UTC-06:00 (CST)', 'UTC-05:00 (EST)', 'UTC-04:00',
  'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00 (GMT)', 'UTC+01:00 (CET)',
  'UTC+02:00 (EET)', 'UTC+03:00', 'UTC+04:00', 'UTC+05:00',
  'UTC+05:30 (IST)', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00 (CST)',
  'UTC+09:00 (JST)', 'UTC+10:00 (AEST)', 'UTC+11:00', 'UTC+12:00',
];

const inputClass = "w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
const selectClass = "w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none cursor-pointer";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'starter';
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', outlookEmail: '',
    companyName: '', industry: '', country: '', timezone: '',
    website: '', tagline: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await auth.register({
        name: form.name,
        email: form.email,
        password: form.password,
        outlookEmail: form.outlookEmail || undefined,
        plan: selectedPlan,
        companyName: form.companyName,
        industry: form.industry,
        country: form.country,
        timezone: form.timezone,
        website: form.website || undefined,
        tagline: form.tagline || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
            <Link to="/login" className="text-sm font-medium text-surface-600 hover:text-surface-900 px-3 py-1.5 transition-colors">Sign In</Link>
            <Link to="/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>
      <div className="pt-20 pb-16 px-5">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-surface-900">Create your workspace</h1>
            <p className="text-surface-500 text-sm mt-1">
              {selectedPlan !== 'starter'
                ? <>Starting the <span className="font-semibold text-primary-600 capitalize">{selectedPlan}</span> plan</>
                : 'Tell us about your company'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-green-600">✓</span>
                </div>
                <p className="text-green-700 font-medium">Account created successfully!</p>
                <p className="text-sm text-surface-500 mt-1">Redirecting to sign in...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>
                )}

                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Your account</p>

                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Full name</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    className={inputClass} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className={inputClass} placeholder="you@company.com" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Outlook email <span className="text-surface-400 font-normal">(optional)</span></label>
                  <input type="email" value={form.outlookEmail} onChange={e => set('outlookEmail', e.target.value)}
                    className={inputClass} placeholder="you@outlook.com" />
                </div>

                <hr className="border-surface-200" />
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Company details</p>

                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Company name</label>
                  <input value={form.companyName} onChange={e => set('companyName', e.target.value)}
                    className={inputClass} placeholder="Acme Inc." required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Industry</label>
                  <select value={form.industry} onChange={e => set('industry', e.target.value)}
                    className={selectClass} required>
                    <option value="">Select...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Country</label>
                    <select value={form.country} onChange={e => set('country', e.target.value)}
                      className={selectClass} required>
                      <option value="">Select...</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Timezone</label>
                    <select value={form.timezone} onChange={e => set('timezone', e.target.value)}
                      className={selectClass} required>
                      <option value="">Select...</option>
                      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Website <span className="text-surface-400 font-normal">(optional)</span></label>
                  <input type="url" value={form.website} onChange={e => set('website', e.target.value)}
                    className={inputClass} placeholder="https://acme.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Tagline <span className="text-surface-400 font-normal">(optional)</span></label>
                  <input value={form.tagline} onChange={e => set('tagline', e.target.value)}
                    className={inputClass} placeholder="What does your company do?" />
                </div>

                <hr className="border-surface-200" />
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Security</p>

                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                    className={inputClass} placeholder="•••••••• (min 6 chars)" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Confirm password</label>
                  <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                    className={inputClass} placeholder="••••••••" required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {loading ? 'Creating workspace...' : 'Create workspace'}
                </button>
                <p className="text-center text-sm text-surface-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

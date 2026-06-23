import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, companies } from '../services/api';
import toast from 'react-hot-toast';
import { AlertModal } from '../components/Modal';

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

export default function Profile() {
  const { user, company, updateCompany } = useAuth();
  const [form, setForm] = useState({ name: '', githubUsername: '', clickupId: '', teamsId: '', outlookEmail: '', figmaUsername: '', lovableUsername: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef(null);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [twoFactor, setTwoFactor] = useState({ loading: false, qrCode: null, secret: '', code: '', backupCodes: null, showBackup: false });
  const [companyForm, setCompanyForm] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        githubUsername: user.githubUsername || '',
        clickupId: user.clickupId || '',
        teamsId: user.teamsId || '',
        outlookEmail: user.outlookEmail || '',
        figmaUsername: user.figmaUsername || '',
        lovableUsername: user.lovableUsername || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (company && !companyForm) {
      setCompanyForm({
        name: company.name || '',
        industry: company.industry || '',
        country: company.country || '',
        timezone: company.timezone || '',
        website: company.website || '',
        tagline: company.tagline || '',
      });
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company || !companyForm) return;
    setSavingCompany(true);
    try {
      const res = await companies.update(company._id, companyForm);
      updateCompany(res.data);
      toast.success('Company profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update company');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('githubUsername', form.githubUsername);
      fd.append('clickupId', form.clickupId);
      fd.append('teamsId', form.teamsId);
      fd.append('outlookEmail', form.outlookEmail);
      fd.append('figmaUsername', form.figmaUsername);
      fd.append('lovableUsername', form.lovableUsername);
      if (avatarFile) fd.append('avatar', avatarFile);

      const res = await auth.updateProfile(fd);
      localStorage.setItem('gresio_user', JSON.stringify(res.data));
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await auth.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed successfully');
      setShowPassForm(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Profile</h1>
        <p className="text-surface-500 text-sm mt-1">Manage your account settings and integrations</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-100">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
              ) : user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-2xl">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <button data-voice="upload-avatar" type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 text-white rounded-full text-xs flex items-center justify-center border-2 border-white cursor-pointer hover:bg-primary-700">
                📷
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
                }} />
            </div>
            <div>
              <p className="text-lg font-semibold text-surface-900">{user?.name}</p>
              <p className="text-sm text-surface-500">{user?.email}</p>
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">GitHub Username</label>
              <input value={form.githubUsername} onChange={(e) => setForm({ ...form, githubUsername: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" placeholder="octocat" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">ClickUp ID</label>
              <input value={form.clickupId} onChange={(e) => setForm({ ...form, clickupId: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Teams ID</label>
              <input value={form.teamsId} onChange={(e) => setForm({ ...form, teamsId: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Outlook Email</label>
              <input type="email" value={form.outlookEmail} onChange={(e) => setForm({ ...form, outlookEmail: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" placeholder="you@outlook.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Figma Username</label>
              <input value={form.figmaUsername} onChange={(e) => setForm({ ...form, figmaUsername: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" placeholder="your-figma-handle" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Lovable Username</label>
              <input value={form.lovableUsername} onChange={(e) => setForm({ ...form, lovableUsername: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" placeholder="your-lovable-username" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button data-voice="save-profile" type="submit" disabled={saving}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button data-voice="change-password" type="button" onClick={() => setShowPassForm(!showPassForm)}
              className="px-5 py-2 border border-surface-300 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-50 transition-colors">
              Change password
            </button>
          </div>
        </form>
      </div>

      {showPassForm && (
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Current password</label>
              <input type="password" value={passForm.currentPassword} onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">New password</label>
              <input type="password" value={passForm.newPassword} onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Confirm new password</label>
              <input type="password" value={passForm.confirmPassword} onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Updating...' : 'Update password'}
              </button>
              <button type="button" onClick={() => setShowPassForm(false)}
                className="px-5 py-2 border border-surface-300 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Two-factor authentication</h2>
              <p className="text-sm text-surface-500 mt-0.5">Add an extra layer of security to your account</p>
            </div>
            {user?.twoFactorEnabled ? (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">Enabled</span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-surface-100 text-surface-500">Disabled</span>
            )}
          </div>

          {!user?.twoFactorEnabled && !twoFactor.qrCode && (
            <button data-voice="enable-2fa" type="button" onClick={async () => {
              setTwoFactor({ ...twoFactor, loading: true });
              try {
                const res = await auth.setup2fa();
                setTwoFactor({ ...twoFactor, loading: false, qrCode: res.data.qrCode, secret: res.data.secret });
              } catch (err) {
                setTwoFactor({ ...twoFactor, loading: false });
                toast.error('Failed to setup 2FA');
              }
            }} disabled={twoFactor.loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {twoFactor.loading ? 'Loading…' : 'Enable two-factor authentication'}
            </button>
          )}

          {twoFactor.qrCode && (
            <div className="space-y-4">
              <p className="text-sm text-surface-600">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
              <div className="bg-white border border-surface-200 rounded-xl p-4 inline-block">
                <img src={twoFactor.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-surface-400">Or enter this key manually: <code className="text-surface-700 font-mono bg-surface-100 px-2 py-0.5 rounded">{twoFactor.secret}</code></p>
              <div className="flex items-center gap-2 max-w-xs">
                <input type="text" value={twoFactor.code} onChange={e => setTwoFactor({ ...twoFactor, code: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })}
                  placeholder="000 000" maxLength={6}
                  className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm text-center tracking-widest outline-none focus:ring-2 focus:ring-primary-500" />
                <button type="button" onClick={async () => {
                  setTwoFactor({ ...twoFactor, loading: true });
                  try {
                    const res = await auth.enable2fa({ secret: twoFactor.secret, code: twoFactor.code });
                    setTwoFactor({ ...twoFactor, loading: false, backupCodes: res.data.backupCodes, showBackup: true });
                    localStorage.setItem('gresio_user', JSON.stringify(res.data.user));
                  } catch (err) {
                    setTwoFactor({ ...twoFactor, loading: false });
                    toast.error(err.response?.data?.message || 'Failed to verify code');
                  }
                }} disabled={twoFactor.loading || twoFactor.code.length < 6}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {twoFactor.loading ? 'Verifying…' : 'Verify & enable'}
                </button>
              </div>
              <button type="button" onClick={() => setTwoFactor({ ...twoFactor, qrCode: null, secret: '', code: '' })}
                className="text-xs text-surface-400 hover:text-primary-600 transition-colors bg-transparent border-none cursor-pointer">
                Cancel
              </button>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <button data-voice="disable-2fa" type="button" onClick={async () => {
              const pwd = prompt('Enter your password to disable two-factor authentication:');
              if (!pwd) return;
              try {
                const res = await auth.disable2fa({ password: pwd });
                localStorage.setItem('gresio_user', JSON.stringify(res.data.user));
                toast.success('Two-factor authentication disabled');
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to disable 2FA');
              }
            }}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              Disable two-factor authentication
            </button>
          )}
        </div>
      </div>

      {user?.role === 'admin' && company && companyForm && (
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Company</h2>
              <p className="text-sm text-surface-500 mt-0.5">Manage your company details visible to the workspace</p>
            </div>
            <button onClick={handleSaveCompany} disabled={savingCompany}
              className="px-4 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer border-none">
              {savingCompany ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Company name</label>
              <input value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Industry</label>
              <select value={companyForm.industry} onChange={e => setCompanyForm(p => ({ ...p, industry: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none cursor-pointer">
                <option value="">Not set</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Country</label>
              <select value={companyForm.country} onChange={e => setCompanyForm(p => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none cursor-pointer">
                <option value="">Not set</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Timezone</label>
              <select value={companyForm.timezone} onChange={e => setCompanyForm(p => ({ ...p, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none cursor-pointer">
                <option value="">Not set</option>
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Website</label>
              <input type="url" value={companyForm.website} onChange={e => setCompanyForm(p => ({ ...p, website: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Tagline</label>
              <input value={companyForm.tagline} onChange={e => setCompanyForm(p => ({ ...p, tagline: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 outline-none focus:ring-2 focus:ring-primary-500" placeholder="What does your company do?" />
            </div>
          </div>
        </div>
      )}

      <AlertModal open={twoFactor.showBackup} onClose={() => setTwoFactor({ ...twoFactor, showBackup: false })}
        title="Save your backup codes" message={
          <div>
            <p className="text-xs text-surface-500 mb-3">Each code can only be used once. Store these somewhere safe.</p>
            <div className="grid grid-cols-2 gap-2">
              {twoFactor.backupCodes?.map((code, i) => (
                <code key={i} className="text-xs font-mono bg-surface-100 px-2 py-1.5 rounded text-surface-700 text-center">{code}</code>
              ))}
            </div>
          </div>
        } type="success" />

      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Account info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-surface-400">Email</span>
            <p className="font-medium text-surface-700">{user?.email}</p>
          </div>
          <div>
            <span className="text-surface-400">Role</span>
            <p className="font-medium text-surface-700 capitalize">{user?.role}</p>
          </div>
          <div>
            <span className="text-surface-400">Status</span>
            <p className="font-medium text-surface-700 capitalize">{user?.status}</p>
          </div>
          <div>
            <span className="text-surface-400">Activity score</span>
            <p className="font-medium text-surface-700">{user?.activityScore}%</p>
          </div>
          <div>
            <span className="text-surface-400">Member since</span>
            <p className="font-medium text-surface-700">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <span className="text-surface-400">Last active</span>
            <p className="font-medium text-surface-700">{user?.lastActive ? new Date(user.lastActive).toLocaleDateString() : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

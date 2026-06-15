import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ name: '', githubUsername: '', clickupId: '', teamsId: '', outlookEmail: '', figmaUsername: '', lovableUsername: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef(null);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);

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
              <button type="button" onClick={() => fileRef.current?.click()}
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
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setShowPassForm(!showPassForm)}
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

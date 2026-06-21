import { useState } from 'react';
import { User, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const user = JSON.parse(localStorage.getItem('sa_user') || '{}');
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = () => {
    toast.success('Profile updated (demo)');
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <User size={20} className="text-surface-700" />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Profile</h1>
          <p className="text-xs text-surface-400 mt-0.5">Manage your personal information</p>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Avatar</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2347e8] flex items-center justify-center text-white text-xl font-bold">
            {form.name ? form.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'SA'}
          </div>
          <button data-voice="change-photo" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors border-none cursor-pointer">
            <Camera size={14} /> Change photo
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Personal Information</h2>
        <div className="settings-grid">
          <div className="s-field">
            <label className="s-label">Full Name</label>
            <input className="s-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="s-field">
            <label className="s-label">Email Address</label>
            <input className="s-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Change Password</h2>
        <div className="flex flex-col gap-3">
          <div className="s-field">
            <label className="s-label">Current Password</label>
            <input className="s-input" type="password" value={form.currentPassword} onChange={e => setForm({...form, currentPassword: e.target.value})} placeholder="Enter current password" />
          </div>
          <div className="settings-grid">
            <div className="s-field">
              <label className="s-label">New Password</label>
              <input className="s-input" type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} placeholder="Min 6 characters" />
            </div>
            <div className="s-field">
              <label className="s-label">Confirm New Password</label>
              <input className="s-input" type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} placeholder="Re-enter new password" />
            </div>
          </div>
        </div>
      </div>

      <button data-voice="save-profile" onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#2347e8] text-white rounded-lg text-sm font-semibold hover:bg-[#1d3dcc] transition-colors w-fit border-none cursor-pointer">
        <Save size={16} /> Save Changes
      </button>
    </div>
  );
}

import { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({
    companyName: '360DMMC',
    supportEmail: 'support@360dmmc.com',
    defaultPlan: 'trial',
    emailNotifications: true,
    systemAlerts: true,
    weeklyReport: false,
    twoFactor: true,
    sessionTimeout: '60',
    stripeKey: 'sk_live_xxxxxxxxxxxxxxxxxxxx',
  });

  const handleToggle = (key) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    alert('Settings saved (demo)');
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <SettingsIcon size={20} className="text-surface-700" />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
          <p className="text-xs text-surface-400 mt-0.5">Platform configuration and preferences</p>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">General Settings</h2>
        <div className="settings-grid">
          <div className="s-field">
            <label className="s-label">Company Name</label>
            <input
              className="s-input"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="s-field">
            <label className="s-label">Support Email</label>
            <input
              className="s-input"
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            />
          </div>
        </div>
        <div className="s-field">
          <label className="s-label">Default Plan for New Companies</label>
          <select
            className="s-input"
            value={form.defaultPlan}
            onChange={(e) => setForm({ ...form, defaultPlan: e.target.value })}
          >
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Notifications</h2>
        <div className="flex flex-col gap-3">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates for important events' },
            { key: 'systemAlerts', label: 'System Alerts', desc: 'Get notified when services go down or degrade' },
            { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive a weekly summary of platform activity' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-surface-900">{item.label}</p>
                <p className="text-xs text-surface-400">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(item.key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form[item.key] ? 'bg-[#2347e8]' : 'bg-surface-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form[item.key] ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Security</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-surface-900">Two-Factor Authentication</p>
              <p className="text-xs text-surface-400">Require 2FA for all admin accounts</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('twoFactor')}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.twoFactor ? 'bg-[#2347e8]' : 'bg-surface-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.twoFactor ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
          <div className="s-field">
            <label className="s-label">Session Timeout (minutes)</label>
            <select
              className="s-input"
              value={form.sessionTimeout}
              onChange={(e) => setForm({ ...form, sessionTimeout: e.target.value })}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Billing</h2>
        <div className="s-field">
          <label className="s-label">Stripe Secret Key</label>
          <input
            type="password"
            className="s-input"
            value={form.stripeKey}
            onChange={(e) => setForm({ ...form, stripeKey: e.target.value })}
            placeholder="sk_live_..."
          />
          <p className="text-[10px] text-surface-400 mt-1">
            Used to process payments and manage subscriptions
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#2347e8] text-white rounded-lg text-sm font-semibold hover:bg-[#1d3dcc] transition-colors w-fit"
      >
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import Dropdown from '../../components/Dropdown';
import { api } from '../../services/api';
import Skeleton from '../../components/Skeleton';

export default function SettingsPage() {
  const [form, setForm] = useState({
    companyName: '',
    supportEmail: '',
    defaultPlan: 'trial',
    emailNotifications: true,
    systemAlerts: true,
    weeklyReport: false,
    twoFactor: true,
    sessionTimeout: '60',
    stripeKey: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.getSettings().then(data => {
      if (data && Object.keys(data).length) {
        setForm(prev => ({ ...prev, ...data }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = (key) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveSettings(form);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || e.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton.PageHeader />
        <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
          {[1,2,3].map(i => <div key={i} className="space-y-2"><Skeleton.Box w="30%" h={14} /><Skeleton.Box w="80%" h={32} /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <SettingsIcon size={20} className="text-surface-700" />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
          <p className="text-xs text-surface-400 mt-0.5">Platform configuration and preferences</p>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <h2 className="settings-title">General Settings</h2>
        <div className="settings-grid">
          <div className="s-field">
            <label className="s-label">Company Name</label>
            <input
              className="select"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="s-field">
            <label className="s-label">Support Email</label>
            <input
              className="select"
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            />
          </div>
        </div>
        <div className="s-field">
          <label className="s-label">Default Plan for New Companies</label>
          <Dropdown value={form.defaultPlan} onChange={v => setForm({ ...form, defaultPlan:v })}
            options={[{value:'trial', label:'Trial'}, {value:'starter', label:'Starter'}, {value:'pro', label:'Pro'}, {value:'enterprise', label:'Enterprise'}]} />
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
            <Dropdown value={form.sessionTimeout} onChange={v => setForm({ ...form, sessionTimeout:v })}
              options={[{value:'15', label:'15 minutes'}, {value:'30', label:'30 minutes'}, {value:'60', label:'60 minutes'}, {value:'120', label:'2 hours'}, {value:'240', label:'4 hours'}]} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Billing</h2>
        <div className="s-field">
          <label className="s-label">Stripe Secret Key</label>
          <input
            type="password"
            className="select"
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
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#2347e8] text-white rounded-lg text-sm font-semibold hover:bg-[#1d3dcc] transition-colors w-fit disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader } from 'lucide-react';
import Dropdown from '../../components/Dropdown';
import { api } from '../../services/api';

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
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Loader size={20} className="text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl page-enter">
      <div className="flex items-center gap-3 glass-panel">
        <SettingsIcon size={20} className="text-[var(--text-secondary)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Platform configuration and preferences</p>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-2.5 rounded-[var(--radius-xl)] text-sm animate-scale-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      <div className="card-premium glow-card p-4">
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

      <div className="card-premium glow-card p-4">
        <h2 className="settings-title">Notifications</h2>
        <div className="flex flex-col gap-3">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates for important events' },
            { key: 'systemAlerts', label: 'System Alerts', desc: 'Get notified when services go down or degrade' },
            { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive a weekly summary of platform activity' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
              </div>
              <button
                type="button"
                data-voice={`toggle-${item.key}`}
                onClick={() => handleToggle(item.key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form[item.key] ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-tertiary)]'
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

      <div className="card-premium glow-card p-4">
        <h2 className="settings-title">Security</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Two-Factor Authentication</p>
              <p className="text-xs text-[var(--text-muted)]">Require 2FA for all admin accounts</p>
            </div>
            <button
              type="button"
              data-voice="toggle-two-factor"
              onClick={() => handleToggle('twoFactor')}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.twoFactor ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-tertiary)]'
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
              options={[{value:'15', label:<><span className="num-mono">15</span> minutes</>}, {value:'30', label:<><span className="num-mono">30</span> minutes</>}, {value:'60', label:<><span className="num-mono">60</span> minutes</>}, {value:'120', label:<><span className="num-mono">2</span> hours</>}, {value:'240', label:<><span className="num-mono">4</span> hours</>}]} />
          </div>
        </div>
      </div>

      <div className="card-premium glow-card p-4">
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
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Used to process payments and manage subscriptions
          </p>
        </div>
      </div>

      <button data-voice="save-settings"
        onClick={handleSave}
        disabled={saving}
        className="btn-premium flex items-center gap-2 w-fit disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { integrations, companies } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { InputModal, ConfirmModal, AlertModal } from '../components/Modal';

const PLAN_INFO = {
  starter: { label: 'Starter', price: '$0', color: 'bg-[var(--bg-tertiary)]', textColor: 'text-[var(--text-secondary)]', users: 10, projects: 3 },
  team: { label: 'Team', price: '$29/mo', color: 'bg-[var(--brand-primary)]', textColor: 'text-[var(--brand-secondary)]', users: 50, projects: Infinity },
  enterprise: { label: 'Enterprise', price: '$99/mo', color: 'bg-amber-500', textColor: 'text-amber-700', users: Infinity, projects: Infinity },
};

function fmtLimit(val) {
  if (val === Infinity || val === undefined || val === null) return 'Unlimited';
  return val;
}

export default function Admin() {
  const { user, company, updateCompany } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [teamIdInput, setTeamIdInput] = useState('');
  const [savingTeamId, setSavingTeamId] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeleteCompany = async () => {
    try {
      await companies.remove(deleteConfirm);
      setAlertModal({ title: 'Deleted', message: 'Company deleted successfully. Refreshing...', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      setAlertModal({ title: 'Delete Failed', message: e.response?.data?.message || e.message, type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  useEffect(() => {
    integrations.getAll()
      .then((intRes) => {
        const msft = intRes.data.find(i => i.name === 'microsoft_graph');
        if (msft?.config?.teamsTeamId) setTeamIdInput(msft.config.teamsTeamId);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan) => {
    if (!company) return;
    setUpgrading(plan);
    try {
      const res = await companies.updatePlan(company._id, plan);
      updateCompany(res.data);
    } catch (e) {
      setAlertModal({ title: 'Upgrade Failed', message: e.response?.data?.message || e.message, type: 'error' });
    } finally {
      setUpgrading(null);
    }
  };

  const handlePlatformSync = async (platform) => {
    setSyncingPlatform(platform);
    try {
      const name = platform === 'github' ? 'github' : 'microsoft_graph';
      const res = platform === 'github'
        ? await integrations.sync(name)
        : await integrations.syncPlatform(name, platform);
      setAlertModal({ title: 'Sync Result', message: res.data.message, type: 'success' });
    } catch (err) {
      setAlertModal({ title: 'Sync Failed', message: err.response?.data?.message || err.message, type: 'error' });
    } finally {
      setSyncingPlatform(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full"></div></div>;

  return (
    <div className="page-enter space-y-6">
      <div className="glass-panel p-4 rounded-xl mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Panel</h1>
        <p className="text-[var(--text-tertiary)] text-sm mt-1">Manage plan, integrations, users, and settings</p>
      </div>

      {/* Plan & Usage */}
      {company && (
        <div className="card-premium glow-card animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Plan & Usage</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {company.domain} — {company.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDeleteConfirm(company._id)} className="text-xs text-red-500 hover:text-red-700 underline">Delete</button>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${PLAN_INFO[company.usage?.plan || company.plan]?.textColor || 'text-[var(--text-secondary)]'} ${PLAN_INFO[company.usage?.plan || company.plan]?.color || 'bg-[var(--bg-tertiary)]'} bg-opacity-20`}>
                {PLAN_INFO[company.usage?.plan || company.plan]?.label || 'Starter'}
              </span>
            </div>
          </div>
          {(() => {
            const plan = company.usage?.plan || company.plan || 'starter';
            const limits = PLAN_INFO[plan] || PLAN_INFO.starter;
            const userCount = company.usage?.userCount ?? 0;
            const projectCount = company.usage?.projectCount ?? 0;
            const maxUsers = limits.users;
            const maxProjects = limits.projects;
            const userPct = maxUsers === Infinity ? 0 : Math.min((userCount / maxUsers) * 100, 100);
            const projPct = maxProjects === Infinity ? 0 : Math.min((projectCount / maxProjects) * 100, 100);
            return (
              <div className="grid grid-cols-2 gap-6 mb-5">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-[var(--text-secondary)] font-medium">Users</span>
                    <span className="text-[var(--text-muted)] text-xs"><span className="num-mono">{userCount}</span>{maxUsers !== Infinity ? ` / <span class="num-mono">${maxUsers}</span>` : ''}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand-primary)] rounded-full transition-all" style={{ width: `${userPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-[var(--text-secondary)] font-medium">Projects</span>
                    <span className="text-[var(--text-muted)] text-xs"><span className="num-mono">{projectCount}</span>{maxProjects !== Infinity ? ` / <span class="num-mono">${maxProjects}</span>` : ''}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand-primary)] rounded-full transition-all" style={{ width: `${projPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="border-t border-[var(--border-primary)] pt-4">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-3 uppercase tracking-wider">Upgrade Plan</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(PLAN_INFO).map(([key, info]) => {
                const isCurrent = (company.usage?.plan || company.plan || 'starter') === key;
                return (
                  <div key={key} className={`p-3 rounded-xl border text-center ${isCurrent ? 'border-[var(--brand-primary)] bg-[var(--bg-tertiary)]/30' : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)]'}`}>
                    <p className={`text-sm font-semibold ${isCurrent ? 'text-[var(--brand-secondary)]' : 'text-[var(--text-secondary)]'}`}>{info.label}</p>
                    {info.users === Infinity ? (
                      <p className="text-[10px] text-[var(--text-muted)]">Unlimited users</p>
                    ) : (
                      <p className="text-[10px] text-[var(--text-muted)]">Up to {info.users} users</p>
                    )}
                    {info.projects === Infinity ? (
                      <p className="text-[10px] text-[var(--text-muted)]">Unlimited projects</p>
                    ) : (
                      <p className="text-[10px] text-[var(--text-muted)]">Up to {info.projects} projects</p>
                    )}
                    {isCurrent ? (
                      <span className="inline-block mt-2 text-[10px] font-semibold text-[var(--brand-primary)] uppercase">Current</span>
                    ) : (
              <button data-voice="upgrade-plan" onClick={() => handleUpgrade(key)} disabled={upgrading === key}
                className="btn-premium mt-2 w-full py-1.5 text-[10px] font-semibold">
                        {upgrading === key ? '...' : 'Upgrade'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="card-premium glow-card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">🔑 API Keys</h2>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">Generate API keys for programmatic access to GRESIO (Zapier, custom integrations).</p>
            <div className="space-y-3">
              <ApiKeySection />
            </div>
          </div>

          <div className="card-premium glow-card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">🐙 GitHub Activity</h2>
            <div className="text-center">
              <p className="text-5xl mb-4">🐙</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-3">Track commits, pull requests, and issues</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Repositories</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Linked</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Commits</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Via API</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Pull Requests</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Auto-synced</p>
                </div>
              </div>
              <button data-voice="sync-github" onClick={() => handlePlatformSync('github')} disabled={syncingPlatform === 'github'}
                className="btn-premium mt-3 px-4 py-1.5 text-xs font-medium">
                {syncingPlatform === 'github' ? 'Syncing...' : 'Sync Now'}
              </button>
              <p className="text-xs text-[var(--text-muted)] mt-2">Configure GitHub token in .env file</p>
            </div>
          </div>

          {['admin', 'project_manager'].includes(user?.role) && (
          <div className="card-premium glow-card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">💬 Microsoft Teams</h2>
            <div className="text-center">
              <p className="text-5xl mb-4">💬</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-3">Messages, meetings, channel creation</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Messages</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Via Graph API</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Meetings</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Auto-detected</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Channels</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Auto-create</p>
                </div>
              </div>
              <div style={{textAlign:'left',marginTop:12}}>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Default Team ID (for project channels)</label>
                <div style={{display:'flex',gap:6}}>
                  <input className="s-input" style={{flex:1}} value={teamIdInput}
                    onChange={e => setTeamIdInput(e.target.value)}
                    placeholder="e.g. 48dfb6b8-..." />
                  <button onClick={async () => {
                    setSavingTeamId(true);
                    try {
                      await integrations.update('microsoft_graph', { config: { teamsTeamId: teamIdInput } });
                      setAlertModal({ title: 'Saved', message: 'Default Team ID saved', type: 'success' });
                    } catch (e) { setAlertModal({ title: 'Error', message: e.response?.data?.message || e.message, type: 'error' }); }
                    finally { setSavingTeamId(false); }
                  }} disabled={savingTeamId}
                    className="btn-premium px-3 py-1.5 text-xs font-medium">
                    {savingTeamId ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
              <button data-voice="sync-teams" onClick={() => handlePlatformSync('teams')} disabled={syncingPlatform === 'teams'}
                className="btn-premium mt-3 px-4 py-1.5 text-xs font-medium">
                {syncingPlatform === 'teams' ? 'Syncing...' : 'Sync Now'}
              </button>
              <p className="text-xs text-[var(--text-muted)] mt-2">Tracked via Microsoft Graph API integration</p>
            </div>
          </div>
          )}

          <div className="card-premium glow-card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">📧 Microsoft Outlook</h2>
            <div className="text-center">
              <p className="text-5xl mb-4">📧</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-3">Email and calendar tracking</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Emails</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Via Graph API</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Calendar</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Synced</p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-tertiary)]">Workload</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">Available</p>
                </div>
              </div>
              <button data-voice="sync-outlook-admin" onClick={() => handlePlatformSync('outlook')} disabled={syncingPlatform === 'outlook'}
                className="btn-premium mt-3 px-4 py-1.5 text-xs font-medium">
                {syncingPlatform === 'outlook' ? 'Syncing...' : 'Sync Now'}
              </button>
              <p className="text-xs text-[var(--text-muted)] mt-2">Configure Microsoft Graph credentials in .env</p>
            </div>
          </div>

        </div>

        <div className="card-premium glow-card">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">⚙️ System Settings</h2>
          <div className="space-y-4">
            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Status Engine</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Auto-updates user status every 15 minutes based on activity</p>
            </div>
            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Activity Scoring</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Weighted scoring from GitHub, ClickUp, Teams, Outlook activity</p>
            </div>
            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Real-time Updates</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">WebSocket connection active for live notifications</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-yellow-700">⚠️ API Keys Required</p>
              <p className="text-xs text-yellow-600 mt-1">Set GITHUB_TOKEN, CLICKUP_API_KEY, and Microsoft Graph credentials in .env</p>
            </div>
          </div>
        </div>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteCompany}
        title="Delete Company"
        message="This will permanently delete this company and ALL its data (users, projects, tasks, sprints). Are you sure?"
        confirmText="Delete Everything"
      />
      <AlertModal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title}
        message={alertModal?.message}
        type={alertModal?.type}
      />
    </div>
  );
}

function ApiKeySection() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/api-keys', {
      headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
    }).then(r => r.json())
      .then(d => setKeys(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createKey = async () => {
    const name = keyName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
        body: JSON.stringify({ name, scopes: ['projects:read', 'tasks:read', 'tasks:write', 'reports:read'] }),
      });
      const data = await res.json();
      if (!res.ok || !data.key) {
        setCreatedKey('Error: ' + (data.error || 'Unknown error'));
      } else {
        setCreatedKey(data.key);
        setKeys(prev => [...prev, data.data]);
      }
    } catch (e) { setCreatedKey('Error: ' + e.message); }
    finally { setShowCreate(false); setKeyName(''); }
  };

  const deleteKey = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/api-keys/${deleteTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      });
      setKeys(prev => prev.filter(k => k._id !== deleteTarget));
    } catch (e) { setCreatedKey('Error: ' + e.message); }
    finally { setDeleteTarget(null); }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (loading) return <div className="text-xs text-[var(--text-muted)]">Loading...</div>;

  return (
    <div>
      <button data-voice="generate-key" onClick={() => { setKeyName(''); setShowCreate(true); }}
        className="btn-premium mb-3 px-4 py-1.5 text-xs font-medium cursor-pointer border-none">
        + Generate New Key
      </button>

      <InputModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setKeyName(''); }}
        title="Generate API Key"
        icon="🔑"
        submitText="Generate"
        onSubmit={createKey}
        fields={[
          { key: 'name', label: 'Key name', type: 'text', placeholder: 'e.g. CI/CD Pipeline',
            value: keyName, onChange: e => setKeyName(e.target.value) },
        ]}
      />

      <Modal open={!!createdKey} onClose={() => setCreatedKey(null)}
        title={createdKey?.startsWith('Error') ? 'Error' : 'API Key Generated'}
        icon={createdKey?.startsWith('Error') ? '❌' : '🔑'}
        footer={
          createdKey?.startsWith('Error')
            ?         <button onClick={() => setCreatedKey(null)}
                className="btn-premium px-4 py-1.5 text-xs font-medium cursor-pointer border-none">OK</button>
            : <button onClick={() => setCreatedKey(null)}
                className="btn-premium px-4 py-1.5 text-xs font-medium cursor-pointer border-none">Done</button>
        }>
        {createdKey?.startsWith('Error') ? (
          <p className="m-0 text-xs text-red-500">{createdKey}</p>
        ) : (
          <>
            <p className="m-0 text-xs text-[var(--text-tertiary)] mb-3">Save this key — it will not be shown again.</p>
            <div className="flex gap-2">
              <input readOnly value={createdKey}
                className="flex-1 px-3 py-2 text-xs font-mono bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" />
              <button onClick={copyKey}
                className="px-3 py-2 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-none whitespace-nowrap">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteKey}
        title="Delete API Key"
        message="Are you sure you want to delete this API key? This action cannot be undone, and any services using this key will lose access."
        confirmText="Delete"
        confirmColor="#ef4444"
      />

      {keys.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No API keys yet. Generate one to get started.</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k._id} className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded-lg">
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{k.name}</span>
                <span className="text-[9px] text-[var(--text-muted)] ml-2">••••••{k.prefix?.slice(-4)}</span>
                <span className={`text-[9px] ml-2 px-1.5 py-0.5 rounded $                {k.active ? 'bg-[var(--bg-tertiary)] text-[var(--brand-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                  {k.active ? 'active' : 'inactive'}
                </span>
                {k.lastUsed && <span className="text-[9px] text-[var(--text-muted)] ml-2">Last used: {new Date(k.lastUsed).toLocaleDateString()}</span>}
              </div>
              <button onClick={() => setDeleteTarget(k._id)}
                className="text-[10px] text-red-500 hover:underline cursor-pointer bg-transparent border-none">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

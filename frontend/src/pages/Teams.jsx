import { useState, useEffect } from 'react';
import Skeleton from '../components/Skeleton';
import { integrations, users, projects as projectsApi } from '../services/api';

export default function Teams() {
  const [integration, setIntegration] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [domainGroups, setDomainGroups] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [intRes, usersRes, projRes] = await Promise.all([
        integrations.getAll().catch(() => ({ data: [] })),
        users.getAll().catch(() => ({ data: [] })),
        projectsApi.getAll().catch(() => ({ data: [] })),
      ]);
      const integrationsList = Array.isArray(intRes.data) ? intRes.data : [];
      const msGraph = integrationsList.find(i => i.name === 'microsoft_graph');
      setIntegration(msGraph || null);
      setLastSync(msGraph?.lastSync ? new Date(msGraph.lastSync) : null);
      setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setAllProjects(Array.isArray(projRes.data) ? projRes.data : []);
      try {
        const grpRes = await projectsApi.getAllDomainTeamGroups();
        setDomainGroups(Array.isArray(grpRes.data) ? grpRes.data : []);
      } catch { setDomainGroups([]); }
    } catch (e) {
      setError('Failed to load Teams data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      await integrations.syncPlatform('microsoft_graph', 'teams');
      setLastSync(new Date());
      await fetchData();
    } catch (e) {
      setError(e.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const usersWithTeams = allUsers.filter(u => u.teamsId).length;
  const projectsWithChannels = allProjects.filter(p => p.teamsChannelId).length;
  const totalMessages = integration?.stats?.messages || 0;
  const totalMeetings = integration?.stats?.meetings || 0;
  const isConfigured = !!(integration?.config?.tenantId || integration?.config?.clientId);
  const syncRelative = lastSync ? formatTimeAgo(lastSync) : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="bg-white rounded-xl border border-surface-200 p-6 space-y-4"><Skeleton.Avatar /><Skeleton.Text lines={4} /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Microsoft Teams</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">Messages, meetings, and collaboration</p>
        </div>
        <div className="flex items-center gap-3">
          {isConfigured && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {syncRelative ? `Synced ${syncRelative}` : 'Connected'}
            </span>
          )}
          <button onClick={handleSync} disabled={syncing || !isConfigured}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer border-none">
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-red-900/20 border border-danger-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-danger-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-surface-200 dark:border-neutral-700 p-5 text-center">
          <p className="text-3xl mb-2">{'\uD83D\uDCAC'}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400">Messages Tracked</p>
          <p className="text-xl font-bold text-surface-900 dark:text-white mt-1">
            {isConfigured ? totalMessages.toLocaleString() : '\u2014'}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-surface-200 dark:border-neutral-700 p-5 text-center">
          <p className="text-3xl mb-2">{'\uD83C\uDFA5'}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400">Meetings</p>
          <p className="text-xl font-bold text-surface-900 dark:text-white mt-1">
            {isConfigured ? totalMeetings.toLocaleString() : '\u2014'}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-surface-200 dark:border-neutral-700 p-5 text-center">
          <p className="text-3xl mb-2">{'\uD83D\uDC64'}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400">Users with Teams</p>
          <p className="text-xl font-bold text-surface-900 dark:text-white mt-1">{usersWithTeams}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-surface-200 dark:border-neutral-700 p-5 text-center">
          <p className="text-3xl mb-2">{'\uD83D\uDCCB'}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400">Projects Connected</p>
          <p className="text-xl font-bold text-surface-900 dark:text-white mt-1">{projectsWithChannels}</p>
        </div>
      </div>

      {domainGroups.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-surface-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100 dark:border-neutral-700">
            <h2 className="text-sm font-bold text-surface-900 dark:text-white">Team Groups \u2014 All Projects</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {domainGroups.slice(0, 12).map((group) => (
                <div key={group._id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-surface-50 dark:bg-neutral-700/30 border border-surface-100 dark:border-neutral-700">
                  <span className="text-lg">{group.icon || '\uD83D\uDC65'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{group.name}</p>
                    <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate">
                      {group.projectName || group.project || ''} \u00B7 {(group.members?.length || group.memberCount || 0)} members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-surface-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{isConfigured ? '\u2699\uFE0F' : '\uD83D\uDCAC'}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-surface-900 dark:text-white mb-1">
              {isConfigured ? 'Graph API Integration' : 'Microsoft Teams Integration'}
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 max-w-lg">
              {isConfigured
                ? 'Microsoft Graph API is connected. Teams messages and meetings are tracked for activity scoring.'
                : 'Microsoft Teams activity is automatically tracked through the Microsoft Graph API. Messages, meetings, and attendance are analyzed for activity scoring.'}
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {isConfigured && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  API v1.0
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-surface-400 dark:text-surface-500">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {isConfigured ? 'Active' : 'Not configured'}
              </span>
              {syncRelative && (
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  Last sync: {lastSync?.toLocaleString() || '\u2014'}
                </span>
              )}
            </div>
          </div>
          <a href="/admin"
            className="shrink-0 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline transition-colors">
            Admin \u2192 Integrations
          </a>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

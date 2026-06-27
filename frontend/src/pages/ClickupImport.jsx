import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clickupImport, integrations } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const STEPS = ['Browse', 'Select', 'Import'];
const STEP_ICONS = ['📋', '✅', '🚀'];

export default function ClickupImport() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [teams, setTeams] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedLists, setSelectedLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState('folder');
  const [importAllActive, setImportAllActive] = useState(false);
  const [importAllResult, setImportAllResult] = useState(null);
  const [importAllLoading, setImportAllLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [clickupConfig, setClickupConfig] = useState(null);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState([]);
  const [savingClickup, setSavingClickup] = useState(false);
  const [syncingClickup, setSyncingClickup] = useState(false);
  const [syncingWorkspace, setSyncingWorkspace] = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    if (!apiKey) setTeams([]);
  }, [apiKey]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await clickupImport.getConfig();
        setClickupConfig(data);
        if (data?.workspaceIds) setSelectedWorkspaceIds(data.workspaceIds);
      } catch (e) { /* no saved config yet */ }
      setConfigLoaded(true);
    })();
  }, []);

  const loadTeams = async (key) => {
    setLoading(true);
    try {
      const { data } = await clickupImport.getTeams(key);
      setTeams(data.teams || []);
      if (data.teams?.length === 1) {
        setSelectedTeam(data.teams[0]);
      }
    } catch (e) {
      toast.error('Connection failed: ' + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  };

  const loadSpaces = async (teamId) => {
    setLoading(true);
    try {
      const { data } = await clickupImport.getSpaces(teamId, apiKey);
      setSpaces(data.spaces || []);
    } catch (e) { toast.error('Failed to load spaces'); }
    setLoading(false);
  };

  const loadFolders = async (spaceId) => {
    setLoading(true);
    try {
      const { data } = await clickupImport.getFolders(spaceId, apiKey);
      setFolders(data.folders || []);
    } catch (e) { toast.error('Failed to load folders'); }
    setLoading(false);
  };

  const loadLists = async (spaceId, folderId) => {
    setLoading(true);
    try {
      const params = {};
      if (folderId) params.folderId = folderId;
      else params.spaceId = spaceId;
      const { data } = await clickupImport.getLists(params, apiKey);
      setLists(data.lists || []);
    } catch (e) { toast.error('Failed to load lists'); }
    setLoading(false);
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setSelectedSpace(null);
    setSelectedFolder(null);
    setSpaces([]);
    setFolders([]);
    setLists([]);
    setSelectedLists([]);
    loadSpaces(team.id);
    setStep(1);
  };

  const handleSelectSpace = (space) => {
    setSelectedSpace(space);
    setSelectedFolder(null);
    setFolders([]);
    setLists([]);
    setSelectedLists([]);
    loadFolders(space.id);
    setViewMode('folder');
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
    setLists([]);
    setSelectedLists([]);
    loadLists(selectedSpace.id, folder.id);
  };

  const handleViewSpaceLists = () => {
    setSelectedFolder(null);
    setViewMode('list');
    loadLists(selectedSpace.id, null);
  };

  const toggleList = (list) => {
    setSelectedLists(prev => {
      const exists = prev.find(l => l.id === list.id);
      if (exists) return prev.filter(l => l.id !== list.id);
      return [...prev, list];
    });
  };

  const toggleAllLists = () => {
    if (selectedLists.length === lists.length) {
      setSelectedLists([]);
    } else {
      setSelectedLists([...lists]);
    }
  };

  const handleImportSelected = async () => {
    if (!selectedLists.length) return toast.error('Select at least one list');
    setImporting(true);
    try {
      const plan = selectedLists.map(list => ({
        clickupListId: list.id,
        clickupListName: list.name,
        projectName: list.name,
        action: 'create_project',
        projectType: 'software',
        phase: 'development',
        description: `Imported from ClickUp list: ${list.name}`,
        statusMapping: {},
      }));
      const { data } = await clickupImport.execute(plan, apiKey);
      setImportResult(data);
      setStep(2);
      toast.success(`Imported ${data.totalTasks} tasks into ${data.projects.length} projects`);
    } catch (e) {
      toast.error('Import failed: ' + (e.response?.data?.error || e.message));
    }
    setImporting(false);
  };

  const handleImportAll = async (team) => {
    setImportAllLoading(true);
    try {
      await clickupImport.cleanupImport();
      const { data } = await clickupImport.importAll({ teamId: team.id, force: true }, apiKey);
      setImportAllResult(data);
    } catch (e) {
      toast.error('Import All failed: ' + (e.response?.data?.error || e.message));
    }
    setImportAllLoading(false);
  };

  const resetAll = () => {
    setStep(0);
    setSelectedTeam(null);
    setSelectedSpace(null);
    setSelectedFolder(null);
    setSelectedLists([]);
    setImportResult(null);
    setSpaces([]);
    setFolders([]);
    setLists([]);
    setImportAllActive(false);
    setImportAllResult(null);
    setImportAllLoading(false);
    setTeams([]);
  };

  return (
    <><div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">📋 ClickUp Import Wizard</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Browse your ClickUp workspace and import projects directly</p>
        </div>
        {selectedTeam && (
          <button onClick={resetAll} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline">
            Reset & Start Over
          </button>
        )}
      </div>

      {/* Steps Progress */}
      <div className="glass-panel flex items-center gap-2 p-3">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${i > 0 ? 'ml-2' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold num-mono ${
              step > i ? 'bg-[var(--brand-primary)] text-white' :
              step === i ? 'bg-[var(--brand-primary)] text-white' :
              'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}>
              {step > i ? '✓' : STEP_ICONS[i]}
            </div>
            <span className={`text-sm font-medium ${step >= i ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--border-primary)] ml-2" />}
          </div>
        ))}
      </div>

      {/* Step 0: Browse Teams */}
      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* API Key Input */}
          <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Enter your ClickUp API Key</h2>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              Paste your ClickUp API key below to connect to your workspace.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="s-input flex-1 text-sm font-mono"
              />
              <button onClick={() => loadTeams(apiKey)} disabled={loading || !apiKey.trim()}
                className="btn-premium px-5 py-2 text-sm font-medium flex items-center gap-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Connecting...</>
                ) : (
                  <><span>🔗</span> Connect</>
                )}
              </button>
            </div>
          </div>

          {/* Workspace list with integrated sync */}
          {teams.length > 0 && (
            <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Select a Workspace</h2>
                {clickupConfig?.lastSync && (
                  <span className="text-xs text-[var(--text-muted)]">Last global sync: {new Date(clickupConfig.lastSync).toLocaleString()}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map(team => {
                  const isChecked = selectedWorkspaceIds.includes(team.id);
                  const wsLastSync = clickupConfig?.workspaceSyncTimes?.[team.id];
                  return (
                    <div key={team.id} className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">🏢</span>
                          <label className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] cursor-pointer shrink-0">
                            <input type="checkbox" checked={isChecked}
                              onChange={async () => {
                                const newIds = isChecked
                                  ? selectedWorkspaceIds.filter(id => id !== team.id)
                                  : [...selectedWorkspaceIds, team.id];
                                setSelectedWorkspaceIds(newIds);
                                const key = apiKey || (clickupConfig?.apiKey ? 'USE_EXISTING' : '');
                                if (!key) return;
                                const realKey = key === 'USE_EXISTING' ? null : key;
                                const wsList = newIds.map(id => {
                                  const t = teams.find(t => t.id === id);
                                  return { id, name: t?.name || id };
                                });
                                try {
                                  await clickupImport.saveConfig({ apiKey: realKey, workspaceIds: newIds, workspaces: wsList });
                                  const updated = await clickupImport.getConfig();
                                  setClickupConfig(updated.data);
                                  if (updated.data?.workspaceIds) setSelectedWorkspaceIds(updated.data.workspaceIds);
                                } catch (e) { toast.error(e.response?.data?.error || e.message); }
                              }} className="rounded border-[var(--border-secondary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                            Auto-sync
                          </label>
                        </div>
                        <p className="font-semibold text-[var(--text-primary)]">{team.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">ID: {team.id}</p>
                        {wsLastSync ? (
                          <p className="text-xs text-[var(--brand-primary)] mt-1">✓ Synced {new Date(wsLastSync).toLocaleString()}</p>
                        ) : (
                          isChecked && <p className="text-xs text-[var(--brand-primary)] mt-1">⏳ Never synced</p>
                        )}
                      </div>
                      <div className="flex divide-x divide-[var(--border-primary)] border-t border-[var(--border-primary)]">
                        <button onClick={() => handleSelectTeam(team)}
                          className="flex-1 p-2.5 text-sm font-medium text-[var(--brand-primary)] hover:bg-[var(--bg-secondary)] transition-all">
                          📂 Browse
                        </button>
                        <button onClick={() => { setImportAllActive(true); setSelectedTeam(team); }}
                          className="flex-1 p-2.5 text-sm font-medium text-[var(--brand-primary)] hover:bg-[var(--bg-secondary)] transition-all">
                          🚀 Import All
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Save Config bar */}
              {selectedWorkspaceIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] flex items-center justify-between">
                  <p className="text-xs text-[var(--text-tertiary)]">
                    <strong className="num-mono">{selectedWorkspaceIds.length}</strong> workspace(s) selected for auto-sync &middot; runs at 7 AM & 6 PM daily
                  </p>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      setSavingClickup(true);
                      try {
                        const key = apiKey || (clickupConfig?.apiKey ? 'USE_EXISTING' : '');
                        if (!key) { toast.error('Connect with an API key first'); setSavingClickup(false); return; }
                        const realKey = key === 'USE_EXISTING' ? null : key;
                        const wsList = selectedWorkspaceIds.map(id => {
                          const t = teams.find(t => t.id === id);
                          return { id, name: t?.name || id };
                        });
                        await clickupImport.saveConfig({ apiKey: realKey, workspaceIds: selectedWorkspaceIds, workspaces: wsList });
                        const updated = await clickupImport.getConfig();
                        setClickupConfig(updated.data);
                        toast.success(`Config saved. ${selectedWorkspaceIds.length} workspace(s) will auto-sync.`);
                      } catch (e) { toast.error(e.response?.data?.error || e.message); }
                      finally { setSavingClickup(false); }
                    }} disabled={savingClickup}
                      className="btn-premium px-4 py-1.5 text-sm font-medium">
                      {savingClickup ? 'Saving…' : '💾 Save Config'}
                    </button>
                    <button onClick={async () => {
                      setSyncingClickup(true);
                      try {
                        const res = await integrations.syncPlatform('clickup');
                        const updated = await clickupImport.getConfig();
                        setClickupConfig(updated.data);
                        setSyncResult({ workspaceName: 'All workspaces', result: res.data.result || res.data });
                      } catch (e) { toast.error(e.response?.data?.message || e.message); }
                      finally { setSyncingClickup(false); }
                    }} disabled={syncingClickup || !clickupConfig?.apiKey} 
                      className="btn-premium px-4 py-1.5 text-sm font-medium">
                      {syncingClickup ? '🔄 Syncing...' : '🔄 Sync Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Synced Workspaces (always visible) */}
      {clickupConfig?.workspaceIds?.length > 0 && (
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">📋 Synced Workspaces</h2>
          <p className="text-xs text-[var(--text-tertiary)] mb-3">Workspaces checked for auto-sync (twice daily at 7 AM & 6 PM)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clickupConfig.workspaceIds.map(id => {
              const ws = clickupConfig.workspaces?.find(w => w.id === id);
              if (!ws) return null;
              const lastSync = clickupConfig.workspaceSyncTimes?.[id];
              const isSyncing = syncingWorkspace[id];
              return (
                <div key={id} className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">🏢</span>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] cursor-pointer shrink-0">
                        <input type="checkbox" checked={true}
                          onChange={async () => {
                            const newIds = (clickupConfig.workspaceIds || []).filter(wid => wid !== id);
                            const newWsList = (clickupConfig.workspaces || []).filter(w => newIds.includes(w.id));
                            setSelectedWorkspaceIds(newIds);
                            setClickupConfig(prev => ({ ...prev, workspaceIds: newIds, workspaces: newWsList }));
                            try {
                              await clickupImport.saveConfig({ workspaceIds: newIds, workspaces: newWsList });
                              const updated = await clickupImport.getConfig();
                              setClickupConfig(updated.data);
                              if (updated.data?.workspaceIds) setSelectedWorkspaceIds(updated.data.workspaceIds);
                            } catch (e) { toast.error(e.response?.data?.error || e.message); }
                          }} className="rounded border-[var(--border-secondary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                        Auto-sync
                      </label>
                    </div>
                    <p className="font-semibold text-[var(--text-primary)]">{ws.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {lastSync ? (
                        <span className="text-xs text-[var(--brand-primary)]">✓ {new Date(lastSync).toLocaleString()}</span>
                      ) : (
                        <span className="text-xs text-[var(--brand-primary)]">⏳ Never synced</span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">Auto-sync ON</span>
                    </div>
                  </div>
                  <div className="border-t border-[var(--border-primary)] p-2.5 flex justify-center">
                    <button onClick={async () => {
                      setSyncingWorkspace(prev => ({ ...prev, [id]: true }));
                      try {
                        const res = await clickupImport.syncWorkspace(id);
                        const now = new Date().toISOString();
                        setClickupConfig(prev => ({
                          ...prev,
                          workspaceSyncTimes: { ...prev.workspaceSyncTimes, [id]: now }
                        }));
                        const updated = await clickupImport.getConfig();
                        setClickupConfig(updated.data);
                        setSyncResult({ workspaceName: ws.name, result: res.data.result || res.data });
                      } catch (e) { toast.error(e.response?.data?.error || e.message); }
                      finally { setSyncingWorkspace(prev => ({ ...prev, [id]: false })); }
                    }} disabled={isSyncing}
                      className="text-xs font-medium text-[var(--brand-primary)] hover:bg-[var(--bg-secondary)] px-4 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
                      {isSyncing ? (
                        <><div className="w-3 h-3 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div> Syncing...</>
                      ) : '🔄 Sync Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import All: Confirmation Modal */}
      {step === 0 && importAllActive && !importAllLoading && !importAllResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 max-w-md w-full mx-4 shadow-elevation">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🚀 Import All</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              This will import <strong>all folders, lists, and tasks</strong> from
            </p>
            <p className="text-sm font-semibold text-[var(--brand-primary)] mb-4">{selectedTeam?.name}</p>
            <ul className="text-xs text-[var(--text-tertiary)] space-y-1 mb-4">
              <li>📁 Each ClickUp folder → Project</li>
              <li>📋 Each list → Sprint</li>
              <li>✅ Each task → Task (assignee mapped by email)</li>
              <li>⚠️ Previously imported items will be deleted and re-imported</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setImportAllActive(false); setSelectedTeam(null); }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--border-primary)]">
                Cancel
              </button>
              <button onClick={() => handleImportAll(selectedTeam)}
                className="btn-premium px-5 py-2 text-sm font-medium flex items-center gap-2">
                🚀 Start Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import All: Loading */}
      {importAllLoading && (
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-12 text-center animate-fade-in">
          <div className="w-12 h-12 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)] font-medium">🚀 Importing all data from ClickUp...</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Creating projects, sprints, and tasks</p>
        </div>
      )}

      {/* Import All: Results */}
      {importAllResult && (
        <div className="space-y-4 animate-fade-in">
          <div className={`card-premium glow-card rounded-[var(--radius-xl)] border p-8 text-center ${
            importAllResult.errors?.length ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
          }`}>
            <span className="text-5xl block mb-4">{importAllResult.errors?.length ? '⚠️' : '🎉'}</span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Import All Complete</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              <span className="num-mono">{importAllResult.tasks}</span> tasks imported across <span className="num-mono">{importAllResult.projects}</span> projects and <span className="num-mono">{importAllResult.sprints}</span> sprints
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{importAllResult.projects}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Projects</p>
              </div>
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold num-mono" style={{color:'var(--brand-primary)'}}>{importAllResult.sprints}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Sprints</p>
              </div>
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold num-mono" style={{color:'var(--brand-primary)'}}>{importAllResult.tasks}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Tasks</p>
              </div>
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold num-mono" style={{color:'var(--brand-primary)'}}>
                  {importAllResult.skipped?.projects + importAllResult.skipped?.sprints + importAllResult.skipped?.tasks || 0}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">Skipped</p>
              </div>
            </div>
            {importAllResult.errors?.length > 0 && (
              <details className="max-w-lg mx-auto text-left">
                <summary className="text-sm text-red-600 cursor-pointer font-medium">View <span className="num-mono">{importAllResult.errors.length}</span> error(s)</summary>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {importAllResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{err}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={resetAll}
              className="btn-premium px-5 py-2 text-sm font-medium">
              Import Another
            </button>
            <Link to="/projects"
              className="px-5 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--border-primary)]">
              Go to Project Lists →
            </Link>
          </div>
        </div>
      )}

      {/* Step 1: Browse & Select Lists */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          {/* Breadcrumb */}
          <div className="glass-panel p-3 flex items-center gap-2 text-sm flex-wrap">
            <button onClick={resetAll} className="text-[var(--brand-primary)] hover:underline font-medium">{selectedTeam.name}</button>
            <span className="text-[var(--text-muted)]">/</span>
            <button onClick={() => { setSelectedSpace(null); setFolders([]); setLists([]); }}
              className={selectedSpace ? 'text-[var(--brand-primary)] hover:underline font-medium' : 'text-[var(--text-primary)] font-semibold'}>
              {selectedSpace?.name || 'Select space'}
            </button>
            {selectedSpace && (
              <>
                <span className="text-[var(--text-muted)]">/</span>
                {viewMode === 'folder' ? (
                  selectedFolder ? (
                    <button onClick={() => { setSelectedFolder(null); loadFolders(selectedSpace.id); }}
                      className="text-[var(--brand-primary)] hover:underline font-medium">All folders</button>
                  ) : (
                    <span className="text-[var(--text-primary)] font-semibold">Browse folders</span>
                  )
                ) : (
                  <span className="text-[var(--text-primary)] font-semibold">All lists</span>
                )}
                {selectedFolder && (
                  <>
                    <span className="text-[var(--text-muted)]">/</span>
                    <span className="text-[var(--text-primary)] font-semibold">{selectedFolder.name}</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Space selection */}
          {!selectedSpace && (
            <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Select a Space</h2>
              {loading ? (
                <div className="text-center py-4 text-[var(--text-muted)]">Loading spaces...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {spaces.map(space => (
                    <button key={space.id} onClick={() => handleSelectSpace(space)}
                      className="p-4 border-2 border-[var(--border-secondary)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 text-left transition-all">
                      <span className="text-xl block mb-1">📁</span>
                      <p className="font-semibold text-[var(--text-primary)] text-sm">{space.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Folder list or direct lists */}
          {selectedSpace && !selectedFolder && viewMode === 'folder' && (
            <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Folders</h2>
                <button onClick={handleViewSpaceLists}
                  className="text-sm text-[var(--brand-primary)] hover:underline font-medium">
                  Or view all lists directly →
                </button>
              </div>
              {loading ? (
                <div className="text-center py-4 text-[var(--text-muted)]">Loading folders...</div>
              ) : folders.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[var(--text-muted)] mb-3">No folders in this space</p>
                  <button onClick={handleViewSpaceLists}
                    className="text-sm text-[var(--brand-primary)] hover:underline font-medium">
                    View lists directly in this space
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {folders.map(folder => (
                    <button key={folder.id} onClick={() => handleSelectFolder(folder)}
                      className="p-4 border-2 border-[var(--border-secondary)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 text-left transition-all">
                      <span className="text-xl block mb-1">📂</span>
                      <p className="font-semibold text-[var(--text-primary)] text-sm">{folder.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{folder.taskCount || '?'} tasks</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lists selection */}
          {(selectedFolder || viewMode === 'list') && (
            <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {selectedFolder ? `Lists in "${selectedFolder.name}"` : `Lists in "${selectedSpace.name}"`}
                </h2>
                {!viewMode && selectedFolder && (
                  <button onClick={handleViewSpaceLists}
                    className="text-sm text-[var(--brand-primary)] hover:underline font-medium">
                    View all lists in space
                  </button>
                )}
              </div>
              {loading ? (
                <div className="text-center py-4 text-[var(--text-muted)]">Loading lists...</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--border-primary)]">
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                      <input type="checkbox" checked={selectedLists.length === lists.length && lists.length > 0}
                        onChange={toggleAllLists} className="rounded border-[var(--border-secondary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                      Select all (<span className="num-mono">{lists.length}</span>)
                    </label>
                    <span className="text-xs text-[var(--text-muted)]"><span className="num-mono">{selectedLists.length}</span> selected</span>
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {lists.map(list => {
                      const isSelected = selectedLists.find(l => l.id === list.id);
                      return (
                        <label key={list.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/30' : 'hover:bg-[var(--bg-secondary)] border border-transparent'
                          }`}>
                          <input type="checkbox" checked={!!isSelected}
                            onChange={() => toggleList(list)}
                            className="rounded border-[var(--border-secondary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{list.name}</p>
                            <p className="text-xs text-[var(--text-muted)]"><span className="num-mono">{list.taskCount || 0}</span> tasks {list.folder?.name ? `· ${list.folder.name}` : ''}</p>
                          </div>
                          {list.taskCount > 0 && (
                            <span className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-full num-mono">{list.taskCount}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {selectedLists.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] flex items-center justify-between">
                      <p className="text-sm text-[var(--text-secondary)]">
                        <strong className="num-mono">{selectedLists.length}</strong> lists selected
                        (<span className="num-mono">{selectedLists.reduce((sum, l) => sum + (l.taskCount || 0), 0)}</span> total tasks)
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setStep(0)}
                          className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--border-primary)]">
                          Back
                        </button>
                        <button onClick={handleImportSelected} disabled={importing}
                          className="btn-premium px-5 py-2 text-sm font-medium flex items-center gap-2">
                          {importing ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Importing...</>
                          ) : (
                            <><span>🚀</span> Import Selected</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Import Results */}
      {step === 2 && importResult && (
        <div className="space-y-4 animate-fade-in">
          <div className={`card-premium glow-card rounded-[var(--radius-xl)] border p-8 text-center ${
            importResult.errors?.length ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
          }`}>
            <span className="text-5xl block mb-4">{importResult.errors?.length ? '⚠️' : '🎉'}</span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Import Complete</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              <span className="num-mono">{importResult.totalTasks}</span> tasks imported across <span className="num-mono">{importResult.projects.length}</span> projects
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{importResult.projects.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Projects created</p>
              </div>
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold num-mono" style={{color:'var(--brand-primary)'}}>{importResult.totalTasks}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Tasks imported</p>
              </div>
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
                <p className="text-2xl font-bold num-mono" style={{color:'var(--brand-primary)'}}>{importResult.errors?.length || 0}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Errors</p>
              </div>
            </div>
            {importResult.projects.length > 0 && (
              <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 text-left max-w-lg mx-auto mb-6">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Projects Created:</p>
                {importResult.projects.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-primary)] last:border-0">
                    <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                    <span className="text-xs text-[var(--text-muted)] num-mono">{p.taskCount} tasks</span>
                  </div>
                ))}
              </div>
            )}
            {importResult.errors?.length > 0 && (
              <details className="max-w-lg mx-auto text-left">
                <summary className="text-sm text-red-600 cursor-pointer font-medium">View <span className="num-mono">{importResult.errors.length}</span> error(s)</summary>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{err}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={resetAll}
              className="btn-premium px-5 py-2 text-sm font-medium">
              Import Another
            </button>
            <Link to="/projects"
              className="px-5 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--border-primary)]">
              Go to Project Lists →
            </Link>
          </div>
        </div>
      )}
    </div>

      {/* Sync Result Modal */}
      {syncResult && (
        <Modal open={true} onClose={() => setSyncResult(null)}
          title={`✅ Synced: ${syncResult.workspaceName}`} icon="📋"
          footer={<button onClick={() => setSyncResult(null)}
            className="btn-premium px-4 py-1.5 text-sm font-medium">OK</button>}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Projects Created', value: syncResult.result.projectsCreated, bg: 'rgba(16,185,129,0.1)' },
              { label: 'Projects Updated', value: syncResult.result.projectsUpdated, bg: 'rgba(59,130,246,0.1)' },
              { label: 'Sprints Created', value: syncResult.result.sprintsCreated, bg: 'rgba(99,102,241,0.1)' },
              { label: 'Sprints Updated', value: syncResult.result.sprintsUpdated, bg: 'rgba(168,85,247,0.1)' },
              { label: 'Tasks Created', value: syncResult.result.tasksCreated, bg: 'rgba(16,185,129,0.1)' },
              { label: 'Tasks Updated', value: syncResult.result.tasksUpdated, bg: 'rgba(59,130,246,0.1)' },
            ].map(stat => (
              <div key={stat.label} className="card-premium glow-card p-3 text-center rounded-[var(--radius-lg)]" style={{ background: stat.bg, border: '1px solid var(--border-secondary)' }}>
                <p className="text-lg font-bold text-[var(--text-primary)] num-mono">{stat.value ?? 0}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{stat.label}</p>
              </div>
            ))}
          </div>
          {syncResult.result.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer font-medium">View <span className="num-mono">{syncResult.result.errors.length}</span> error(s)</summary>
              <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                {syncResult.result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">{err}</p>
                ))}
              </div>
            </details>
          )}
        </Modal>
      )}
    </>
  );
}

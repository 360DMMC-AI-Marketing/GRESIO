import { useState } from 'react';
import { asanaImport } from '../services/api';
import toast from 'react-hot-toast';

const STEPS = ['Connect', 'Browse', 'Import'];

export default function AsanaImport() {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const connect = async () => {
    if (!token.trim()) return toast.error('Enter your Asana access token');
    setLoading(true);
    try {
      const { data } = await asanaImport.getWorkspaces(token.trim());
      setWorkspaces(data.workspaces || []);
      setStep(1);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const loadProjects = async (ws) => {
    setSelectedWorkspace(ws);
    setLoading(true);
    try {
      const { data } = await asanaImport.getProjects(ws.gid, token);
      setProjects(data.projects || []);
    } catch (e) {
      toast.error('Failed to load projects');
    }
    setLoading(false);
  };

  const toggleProject = (p) => {
    setSelectedProjects(prev =>
      prev.find(x => x.gid === p.gid) ? prev.filter(x => x.gid !== p.gid) : [...prev, p]
    );
  };

  const handleImport = async () => {
    if (!selectedProjects.length) return toast.error('Select at least one project');
    setImporting(true);
    try {
      const { data } = await asanaImport.execute(selectedProjects.map(p => p.gid), token);
      setImportResult(data);
      setStep(2);
      toast.success(`Imported ${data.totalTasks} tasks into ${data.projects.length} projects`);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setImporting(false);
  };

  const reset = () => {
    setStep(0);
    setWorkspaces([]);
    setSelectedWorkspace(null);
    setProjects([]);
    setSelectedProjects([]);
    setImportResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">📋 Asana Import Wizard</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Browse your Asana workspace and import projects</p>
        </div>
        {selectedWorkspace && (
          <button onClick={reset} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline">Reset & Start Over</button>
        )}
      </div>

      <div className="glass-panel flex items-center gap-2 p-3">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${i > 0 ? 'ml-2' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold num-mono ${step > i ? 'bg-[var(--brand-primary)] text-white' : step === i ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
              {step > i ? '✓' : i === 0 ? '🔑' : i === 1 ? '📂' : '🚀'}
            </div>
            <span className={`text-sm font-medium ${step >= i ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--border-primary)] ml-2" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card-premium glow-card p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Enter your Asana Access Token</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Generate a Personal Access Token in Asana (Developer Console → Personal Access Token).
          </p>
          <div className="flex gap-3">
            <input type="text" value={token} onChange={e => setToken(e.target.value)}
              placeholder="1/1234567890_abc..."
              className="s-input flex-1 text-sm font-mono" />
            <button onClick={connect} disabled={loading || !token.trim()}
              className="btn-premium px-5 py-2 text-sm font-medium">
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          {!selectedWorkspace ? (
            <div className="card-premium glow-card p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Select Workspace</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {workspaces.map(ws => (
                  <button key={ws.gid} onClick={() => loadProjects(ws)}
                    className="p-4 border-2 border-[var(--border-secondary)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 text-left transition-all">
                    <span className="text-xl block mb-1">🏢</span>
                    <p className="font-semibold text-[var(--text-primary)] text-sm">{ws.name}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-premium glow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Projects in <span className="text-[var(--brand-primary)]">{selectedWorkspace.name}</span>
                </h2>
                <button onClick={() => { setSelectedWorkspace(null); setProjects([]); setSelectedProjects([]); }}
                  className="text-sm text-[var(--text-muted)] hover:underline">Back to workspaces</button>
              </div>
              {loading ? (
                <div className="text-center py-4 text-[var(--text-muted)]">Loading projects...</div>
              ) : (
                <>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {projects.map(p => {
                      const checked = selectedProjects.find(x => x.gid === p.gid);
                      return (
                        <label key={p.gid} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/30' : 'hover:bg-[var(--bg-secondary)] border border-transparent'}`}>
                          <input type="checkbox" checked={!!checked} onChange={() => toggleProject(p)}
                            className="rounded border-[var(--border-secondary)] text-[var(--brand-primary)]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {selectedProjects.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] flex items-center justify-between">
                      <p className="text-sm text-[var(--text-secondary)]">
                        <strong>{selectedProjects.length}</strong> project(s) selected
                      </p>
                      <button onClick={handleImport} disabled={importing}
                        className="btn-premium px-5 py-2 text-sm font-medium">
                        {importing ? 'Importing...' : 'Import Selected'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && importResult && (
        <div className={`card-premium glow-card p-8 text-center border ${importResult.errors?.length ? 'border-amber-200' : 'border-emerald-200'}`}>
          <span className="text-5xl block mb-4">{importResult.errors?.length ? '⚠️' : '🎉'}</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Import Complete</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            <span className="num-mono">{importResult.totalTasks}</span> tasks across <span className="num-mono">{importResult.projects.length}</span> projects
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
            <div className="card-premium p-4 text-center">
              <p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{importResult.projects.length}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Projects</p>
            </div>
            <div className="card-premium p-4 text-center">
              <p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{importResult.totalTasks}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Tasks</p>
            </div>
          </div>
          {importResult.errors?.length > 0 && (
            <details className="max-w-lg mx-auto text-left mb-4">
              <summary className="text-sm text-red-600 cursor-pointer font-medium">{importResult.errors.length} error(s)</summary>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500 bg-red-50 p-2 rounded">{err}</p>
                ))}
              </div>
            </details>
          )}
          <button onClick={reset} className="btn-premium px-5 py-2 text-sm font-medium">Import Another</button>
        </div>
      )}
    </div>
  );
}

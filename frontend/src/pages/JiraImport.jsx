import { useState } from 'react';
import { jiraImport } from '../services/api';
import toast from 'react-hot-toast';

const STEPS = ['Connect', 'Browse', 'Import'];

export default function JiraImport() {
  const [step, setStep] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const connect = async () => {
    if (!baseUrl.trim() || !email.trim() || !apiToken.trim())
      return toast.error('Fill in all Jira credentials');
    setLoading(true);
    try {
      const { data } = await jiraImport.getProjects(baseUrl.trim(), email.trim(), apiToken.trim());
      setProjects(data.projects || []);
      setStep(1);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const toggleProject = (p) => {
    setSelectedKeys(prev =>
      prev.includes(p.key) ? prev.filter(k => k !== p.key) : [...prev, p.key]
    );
  };

  const handleImport = async () => {
    if (!selectedKeys.length) return toast.error('Select at least one project');
    setImporting(true);
    try {
      const { data } = await jiraImport.execute(selectedKeys, baseUrl, email, apiToken);
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
    setProjects([]);
    setSelectedKeys([]);
    setImportResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">🐞 Jira Import Wizard</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Connect to Jira and import projects, epics, and issues</p>
        </div>
        {projects.length > 0 && (
          <button onClick={reset} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline">Reset & Start Over</button>
        )}
      </div>

      <div className="glass-panel flex items-center gap-2 p-3">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${i > 0 ? 'ml-2' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold num-mono ${step > i ? 'bg-[var(--brand-primary)] text-white' : step === i ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
              {step > i ? '✓' : i === 0 ? '🔗' : i === 1 ? '📂' : '🚀'}
            </div>
            <span className={`text-sm font-medium ${step >= i ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--border-primary)] ml-2" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card-premium glow-card p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Jira Cloud Credentials</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Enter your Jira instance URL, email, and API token. Generate an API token from{' '}
            <a href="https://id.atlassian.com/manage/api-tokens" target="_blank" rel="noreferrer" className="text-[var(--brand-primary)]">Atlassian API Tokens</a>.
          </p>
          <div className="space-y-3">
            <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="s-input w-full text-sm" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="s-input w-full text-sm" />
            <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)}
              placeholder="API Token"
              className="s-input w-full text-sm font-mono" />
            <button onClick={connect} disabled={loading || !baseUrl || !email || !apiToken}
              className="btn-premium px-5 py-2 text-sm font-medium w-full">
              {loading ? 'Connecting...' : 'Connect to Jira'}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card-premium glow-card p-5 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Select Projects to Import</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Epics will become sprints. Tasks, bugs, stories become tasks. Tests become test cases.
          </p>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {projects.map(p => {
              const checked = selectedKeys.includes(p.key);
              return (
                <label key={p.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/30' : 'hover:bg-[var(--bg-secondary)] border border-transparent'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleProject(p)}
                    className="rounded border-[var(--border-secondary)] text-[var(--brand-primary)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{p.key} · {p.projectTypeKey || 'software'}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedKeys.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]"><strong>{selectedKeys.length}</strong> project(s) selected</p>
              <button onClick={handleImport} disabled={importing}
                className="btn-premium px-5 py-2 text-sm font-medium">
                {importing ? 'Importing...' : 'Import Selected'}
              </button>
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

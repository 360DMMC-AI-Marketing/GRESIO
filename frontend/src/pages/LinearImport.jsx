import { useState } from 'react';
import { linearImport } from '../services/api';
import toast from 'react-hot-toast';

const STEPS = ['Connect', 'Select', 'Import'];

export default function LinearImport() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const connect = async () => {
    if (!apiKey.trim()) return toast.error('Enter your Linear API key');
    setLoading(true);
    try {
      const { data } = await linearImport.getTeams(apiKey.trim());
      setTeams(data.teams || []);
      setStep(1);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const handleImport = async (team) => {
    setSelectedTeam(team);
    setImporting(true);
    try {
      const { data } = await linearImport.execute(team.id, apiKey);
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
    setTeams([]);
    setSelectedTeam(null);
    setImportResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">📐 Linear Import Wizard</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Import your Linear team's projects and issues directly</p>
        </div>
        {teams.length > 0 && (
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
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Enter your Linear API Key</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Generate an API key in Linear (Settings → API → Personal API Keys).
          </p>
          <div className="flex gap-3">
            <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="lin_api_xxxxxxxxxxxxxxxxxxxx"
              className="s-input flex-1 text-sm font-mono" />
            <button onClick={connect} disabled={loading || !apiKey.trim()}
              className="btn-premium px-5 py-2 text-sm font-medium">
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card-premium glow-card p-5 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Select a Team</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Each Linear project becomes a GRESIO project. Issues become tasks. Assignees matched by email.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map(team => (
              <button key={team.id} onClick={() => handleImport(team)} disabled={importing}
                className="p-4 border-2 border-[var(--border-secondary)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 text-left transition-all">
                <span className="text-xl block mb-1">📐</span>
                <p className="font-semibold text-[var(--text-primary)] text-sm">{team.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{team.key}</p>
                {importing && selectedTeam?.id === team.id && (
                  <span className="text-xs text-[var(--brand-primary)] mt-2 block">Importing...</span>
                )}
              </button>
            ))}
          </div>
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

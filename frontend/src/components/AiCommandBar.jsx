import { useState, useEffect, useCallback } from 'react';
import { workDna } from '../services/api';

const SUGGESTIONS = [
  { command: 'Create a project called Website Redesign for ACME Corp', label: 'Create project' },
  { command: 'Add task: Fix login button alignment', label: 'Add task' },
  { command: 'Generate a weekly report', label: 'Generate report' },
  { command: 'Launch the current project', label: 'Launch project' },
];

export default function AiCommandBar() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
    setCommand('');
    setResult(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  const handleSubmit = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai-agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
        body: JSON.stringify({ command: command.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, message: 'Error: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (s) => {
    setCommand(s);
    setResult(null);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9999]" onClick={toggle} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[540px] z-[10000] bg-white rounded-xl shadow-2xl border border-surface-200 overflow-hidden">
        <div className="p-3 border-b border-surface-100">
          <div className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400 shrink-0"><path d="M12 2a10 10 0 0 0-10 10c0 4.5 3 8.3 7 9.5V14H7l4-6v4h2v-4l4 6h-4v7.5c4-1.2 7-5 7-9.5A10 10 0 0 0 12 2z"/></svg>
            <input
              autoFocus
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') toggle(); }}
              placeholder="Ask AI to manage your project..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-surface-900 placeholder:text-surface-400"
            />
            <button onClick={handleSubmit} disabled={loading || !command.trim()}
              className="px-3 py-1 bg-[#2347e8] text-white rounded-md text-xs font-semibold hover:bg-[#1d3dcc] disabled:opacity-50 transition-colors cursor-pointer border-none">
              {loading ? '...' : 'Run'}
            </button>
          </div>
          {!command && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => applySuggestion(s.command)}
                  className="text-[10px] bg-surface-50 text-surface-600 px-2 py-1 rounded-md border border-surface-200 hover:bg-surface-100 transition-colors cursor-pointer">
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading && (
          <div className="p-4 text-center text-sm text-surface-500">
            <div className="animate-spin inline-block w-4 h-4 border-2 border-surface-300 border-t-[#2347e8] rounded-full mr-2" />
            Processing...
          </div>
        )}
        {result && (
          <div className={`p-4 text-sm ${result.success ? 'text-surface-900' : 'text-danger-600'}`}>
            <div className="flex items-start gap-2">
              <span className={result.success ? 'text-success-500' : 'text-danger-500'}>{result.success ? '✓' : '✕'}</span>
              <div>
                <p>{result.message || result.summary}</p>
                {result.entities?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.entities.map((e, i) => (
                      <div key={i} className="text-xs text-primary-600">
                        Created {e.type}: <strong>{e.name}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={toggle}
              className="mt-3 text-xs text-primary-600 font-semibold hover:underline cursor-pointer bg-transparent border-none">
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}

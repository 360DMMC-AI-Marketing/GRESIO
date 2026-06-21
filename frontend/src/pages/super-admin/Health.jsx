import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

const serviceNames = {
  api: 'API Server',
  db: 'Database',
  auth: 'Authentication',
  email: 'Email Service',
  storage: 'File Storage',
};

const statusConfig = {
  pass: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Operational' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Degraded' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Down' },
};

export default function Health() {
  const [services, setServices] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch('/super-api/health');
      const data = await res.json();
      const svcs = data.services || {};
      setServices(Object.entries(svcs).map(([id, s]) => ({
        id,
        name: serviceNames[id] || id,
        status: s.status,
        latency: s.latency || '—',
        detail: s.detail || '',
      })));
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setServices(Object.entries(serviceNames).map(([id, name]) => ({
        id, name, status: 'fail', latency: '—', detail: 'Unreachable',
      })));
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { runCheck(); }, []);

  const fails = services.filter(s => s.status === 'fail');
  const warns = services.filter(s => s.status === 'warn');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-surface-700" />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">System Health</h1>
            <p className="text-xs text-surface-400 mt-0.5">Real-time service status monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && <span className="text-xs text-surface-400">Checked: {lastChecked}</span>}
          <button data-voice="refresh-health" onClick={runCheck} disabled={checking}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50">
            <RefreshCw size={14} className={`${checking ? 'animate-spin' : ''}`} />
            {checking ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s, i) => {
          const cfg = statusConfig[s.status] || statusConfig.warn;
          return (
            <div key={s.id} className="bg-white rounded-xl border border-surface-200 p-4 hover:shadow-md hover:border-surface-300 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${s.status === 'pass' ? 'bg-green-600 text-white' : s.status === 'fail' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{i + 1}</span>
                <span className="text-sm font-semibold text-surface-900">{s.name}</span>
                <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">{s.detail} · Latency: {s.latency}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

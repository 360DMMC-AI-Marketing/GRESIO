import { useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { healthChecks } from '../data';

const statusConfig = {
  pass: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Operational' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Degraded' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Down' },
};

export default function Health() {
  const fails = healthChecks.filter((h) => h.status === 'fail');
  const warns = healthChecks.filter((h) => h.status === 'warn');
  const allOperational = fails.length === 0 && warns.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Activity size={20} className="text-surface-700" />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">System Health</h1>
          <p className="text-xs text-surface-400 mt-0.5">{healthChecks.length} services monitored</p>
        </div>
      </div>

      <div
        className={`rounded-xl border p-4 flex items-center gap-3 ${
          allOperational
            ? 'bg-green-50 border-green-200'
            : fails.length > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        {allOperational ? (
          <CheckCircle size={20} className="text-green-600 shrink-0" />
        ) : fails.length > 0 ? (
          <XCircle size={20} className="text-red-600 shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${
              allOperational ? 'text-green-800' : fails.length > 0 ? 'text-red-800' : 'text-amber-800'
            }`}
          >
            {allOperational
              ? 'All Systems Operational'
              : fails.length > 0
              ? `${fails.length} service${fails.length > 1 ? 's' : ''} down`
              : `${warns.length} service${warns.length > 1 ? 's' : ''} degraded`}
          </p>
          <p
            className={`text-xs ${
              allOperational ? 'text-green-600' : fails.length > 0 ? 'text-red-600' : 'text-amber-600'
            }`}
          >
            {fails.length > 0
              ? fails.map((f) => f.name).join(', ')
              : warns.length > 0
              ? warns.map((w) => w.name).join(', ')
              : 'All services are running normally'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthChecks.map((hc) => {
          const cfg = statusConfig[hc.status] || statusConfig.fail;
          const Icon = cfg.icon;
          return (
            <div
              key={hc.id}
              className={`bg-white rounded-xl border shadow-sm p-5 ${
                hc.status === 'fail'
                  ? 'border-red-200'
                  : hc.status === 'warn'
                  ? 'border-amber-200'
                  : 'border-surface-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-900">{hc.name}</h3>
                <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center`}>
                  <Icon size={16} className={cfg.color} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-400">Status</span>
                <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-surface-400">Latency</span>
                <span className="font-medium text-surface-700">{hc.latency}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-surface-400">Uptime</span>
                <span className="font-medium text-surface-700">{hc.uptime}</span>
              </div>
              <div className="mt-3 w-full h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: hc.status === 'pass' ? '100%' : hc.status === 'warn' ? '60%' : '30%',
                    backgroundColor: hc.status === 'pass' ? '#22c55e' : hc.status === 'warn' ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

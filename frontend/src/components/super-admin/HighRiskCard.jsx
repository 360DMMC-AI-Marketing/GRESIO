import { AlertTriangle } from 'lucide-react';

export default function HighRiskCard({ company }) {
  const {
    name = 'Unknown',
    type = '—',
    plan = '—',
    overdue = 0,
    progress = 0,
    deadline = '—',
  } = company;

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-red-50/60 to-pink-50/60 pointer-events-none" />

      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
          <AlertTriangle size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-surface-900">{name}</h4>
          <p className="text-xs text-surface-400 mt-0.5">
            {type} · {plan} plan
          </p>

          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Overdue</span>
              <span className="font-semibold text-red-600">{overdue} days</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Progress</span>
              <span className="font-semibold text-surface-700">{progress}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Deadline</span>
              <span className="font-semibold text-surface-700">{deadline}</span>
            </div>
          </div>

          <div className="mt-3 w-full bg-red-100 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

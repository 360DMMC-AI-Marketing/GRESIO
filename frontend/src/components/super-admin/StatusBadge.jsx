const statusStyles = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  archived: 'bg-slate-100 text-slate-500',
  complete: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-orange-100 text-orange-700',
};

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  const className = statusStyles[normalized] || 'bg-surface-100 text-surface-600';

  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

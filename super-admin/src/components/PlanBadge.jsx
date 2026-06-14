const planStyles = {
  trial: 'bg-yellow-100 text-yellow-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
  starter: 'bg-gray-100 text-gray-600',
  premium: 'bg-amber-100 text-amber-700',
};

export default function PlanBadge({ plan }) {
  const normalized = (plan || '').toLowerCase();
  const className = planStyles[normalized] || 'bg-surface-100 text-surface-600';

  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${className}`}>
      {plan}
    </span>
  );
}

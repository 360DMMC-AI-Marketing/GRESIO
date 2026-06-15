export default function DashboardCard({ icon: Icon, label, value, subtext, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary-100 text-primary-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const circleColor = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${circleColor}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-surface-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-surface-900 mt-0.5">{value}</p>
        {subtext && (
          <p className="text-xs text-surface-400 mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}

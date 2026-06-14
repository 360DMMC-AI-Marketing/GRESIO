export default function StatCard({ title, value, icon, color = 'brand', subtitle, trend }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-success-50 text-success-600',
    yellow: 'bg-warning-50 text-warning-600',
    red: 'bg-danger-50 text-danger-600',
    blue: 'bg-info-50 text-info-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-card border border-neutral-200 p-6 hover:shadow-hover-lift hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-neutral-900 mt-1 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colors[color] || colors.brand}`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-3 text-xs font-medium ${trend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
        </div>
      )}
    </div>
  );
}

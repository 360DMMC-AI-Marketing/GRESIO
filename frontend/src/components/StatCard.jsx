export default function StatCard({ title, value, icon, color = 'brand', subtitle, trend }) {
  const colors = {
    brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
    green: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400',
    yellow: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400',
    red: 'bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400',
    blue: 'bg-info-50 dark:bg-info-900/20 text-info-600 dark:text-info-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };
  const colorGlows = {
    brand: 'shadow-brand-glow',
    green: 'shadow-green-glow',
    yellow: 'shadow-yellow-glow',
    red: 'shadow-red-glow',
    blue: 'shadow-blue-glow',
    purple: 'shadow-purple-glow',
  };
  return (
    <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--border-primary)] p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-neutral-500 dark:text-[var(--text-tertiary)] uppercase tracking-wider">{title}</p>
          <p className={`num-mono text-[32px] font-bold mt-1.5 tracking-tight text-neutral-900 dark:text-[var(--text-primary)]`}>{value}</p>
          {subtitle && <p className="text-xs text-neutral-400 dark:text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center text-xl relative ${colors[color] || colors.brand}`}>
          <div className={`absolute inset-0 rounded-[var(--radius-lg)] opacity-20 ${colors[color] || colors.brand}`} style={{filter: 'blur(8px)'}} />
          <span className="relative">{icon}</span>
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-3 pt-3 border-t border-neutral-100 dark:border-[var(--border-secondary)] text-xs font-medium ${trend >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
          <span className="num-mono">{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span> from last week
        </div>
      )}
    </div>
  );
}

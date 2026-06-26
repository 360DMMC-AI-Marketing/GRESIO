export default function Outlook() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Microsoft Outlook</h1>
        <p className="text-[var(--text-tertiary)] text-sm mt-1">Email and calendar tracking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 text-center">
          <p className="text-3xl mb-2">📧</p>
          <p className="text-sm text-[var(--text-tertiary)]">Emails Tracked</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">Via Graph API</p>
        </div>
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 text-center">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm text-[var(--text-tertiary)]">Calendar Events</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">Synced</p>
        </div>
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-[var(--text-tertiary)]">Workload View</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">Available</p>
        </div>
      </div>

      <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 text-center animate-fade-in">
        <p className="text-5xl mb-4">📧</p>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Outlook Integration</h2>
        <p className="text-[var(--text-tertiary)] text-sm max-w-md mx-auto mb-4">
          Emails and calendar events are tracked via Microsoft Graph API.
          Activity is analyzed to determine user engagement and workload.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Configure Outlook integration in Admin → Integrations
        </p>
      </div>
    </div>
  );
}

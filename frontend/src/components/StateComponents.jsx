export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-neutral-500 dark:text-[var(--text-tertiary)]">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-14 h-14 bg-danger-50 dark:bg-danger-900/20 rounded-full flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-neutral-700 dark:text-[var(--text-primary)] mb-1">Error</p>
      <p className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] mb-4 max-w-sm text-center">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-sm btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📭', title = 'Nothing here yet', description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <span className="text-4xl mb-4">{icon}</span>
      <p className="text-sm font-medium text-neutral-700 dark:text-[var(--text-primary)] mb-1">{title}</p>
      {description && <p className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] max-w-sm text-center">{description}</p>}
    </div>
  );
}

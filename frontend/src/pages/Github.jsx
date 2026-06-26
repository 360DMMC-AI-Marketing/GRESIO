import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Github() {
  const { user } = useAuth();
  const [repo] = useState('');

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">GitHub Activity</h1>
        <p className="text-[var(--text-tertiary)] text-sm mt-1">Track commits, pull requests, and issues</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 text-center">
          <p className="text-3xl mb-2">🐙</p>
          <p className="text-sm text-[var(--text-tertiary)]">Connected Repositories</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">
            {user?.githubUsername ? 'Linked' : 'Not linked'}
          </p>
        </div>
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 text-center">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm text-[var(--text-tertiary)]">Commits Tracked</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">Via API sync</p>
        </div>
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 text-center">
          <p className="text-3xl mb-2">🔄</p>
          <p className="text-sm text-[var(--text-tertiary)]">Pull Requests</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">Auto-synced</p>
        </div>
      </div>

      <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 text-center animate-fade-in">
        <p className="text-5xl mb-4">🐙</p>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">GitHub Integration</h2>
        <p className="text-[var(--text-tertiary)] text-sm max-w-md mx-auto mb-4">
          Connect your GitHub repositories to automatically track commits, pull requests,
          and issues across your projects.
        </p>
        <p data-voice="github-configure" className="text-sm text-[var(--text-muted)]">
          {repo ? `Watching: ${repo}` : 'Configure in Admin → Integrations'}
        </p>
      </div>
    </div>
  );
}

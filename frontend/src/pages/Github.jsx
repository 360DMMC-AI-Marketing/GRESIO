import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Github() {
  const { user } = useAuth();
  const [repo] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">GitHub Activity</h1>
        <p className="text-surface-500 text-sm mt-1">Track commits, pull requests, and issues</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">🐙</p>
          <p className="text-sm text-surface-500">Connected Repositories</p>
          <p className="text-lg font-bold text-surface-900 mt-1">
            {user?.githubUsername ? 'Linked' : 'Not linked'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm text-surface-500">Commits Tracked</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Via API sync</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">🔄</p>
          <p className="text-sm text-surface-500">Pull Requests</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Auto-synced</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 text-center">
        <p className="text-5xl mb-4">🐙</p>
        <h2 className="text-lg font-semibold text-surface-900 mb-2">GitHub Integration</h2>
        <p className="text-surface-500 text-sm max-w-md mx-auto mb-4">
          Connect your GitHub repositories to automatically track commits, pull requests,
          and issues across your projects.
        </p>
        <p data-voice="github-configure" className="text-sm text-surface-400">
          {repo ? `Watching: ${repo}` : 'Configure in Admin → Integrations'}
        </p>
      </div>
    </div>
  );
}

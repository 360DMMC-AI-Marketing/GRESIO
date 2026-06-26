import { useState } from 'react';

const guides = [
  {
    id: 'account',
    icon: '👤',
    title: 'Getting Started',
    subtitle: 'Create your account, log in, and set up your profile.',
    primary: true,
    steps: [
      { title: 'Create an account', desc: 'Go to /register and sign up with your email.' },
      { title: 'Log in', desc: 'Use your credentials at /login (demo: admin@gresio.com / password123).' },
      { title: 'Complete your profile', desc: 'Go to Profile and fill in your name, role, and Outlook email.' },
    ],
    tips: [
      'Admins can create users from the Users page.',
      'Outlook email is the most important field — set it first.',
    ],
  },
  {
    id: 'outlook',
    icon: '⭐',
    title: 'Outlook / Microsoft 365',
    subtitle: 'Main connection — emails, calendar, Teams, and user management.',
    primary: true,
    steps: [
      { title: 'Register an app in Azure', desc: 'Azure AD → App registrations → New registration. Name "GRESIO", set redirect URI to http://localhost:5000/auth/callback.' },
      { title: 'Get credentials', desc: 'Copy the Client ID, Tenant ID, and create a Client Secret.' },
      { title: 'Set in .env', desc: 'Add MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID to backend/.env.' },
      { title: 'Set your Outlook email', desc: 'Go to Profile and add your work email.' },
      { title: 'Sync', desc: 'Admin → Integrations → Microsoft Graph → Sync Now.' },
    ],
    tips: [
      'Requires admin consent for Mail.Read, Calendar.Read, Chat.Read scopes.',
      'Emails and events from the last 24h are synced each time.',
      'Outlook email is used to identify users — everyone should set it.',
    ],
  },
  {
    id: 'tasks',
    icon: '✅',
    title: 'Tasks & Projects',
    subtitle: 'Create projects, assign tasks, and track progress.',
    steps: [
      { title: 'Create a project', desc: 'Projects → + New Project. Add a name, description, and deadline.' },
      { title: 'Add tasks', desc: 'Open a project → + Add Task. Assign by name or Outlook email.' },
      { title: 'Track progress', desc: 'todo → in_progress → review → done. All tasks done = project ready to test.' },
    ],
    tips: [
      'Done tasks auto-hide from the main list.',
      'Tasks can have subtasks — like a mini checklist.',
    ],
  },
  {
    id: 'calendar',
    icon: '📅',
    title: 'Calendar',
    subtitle: 'See tasks, sprints, deadlines, and events at a glance.',
    steps: [
      { title: 'Open the Calendar', desc: 'Click Calendar in the sidebar for a month view of everything scheduled.' },
      { title: 'Navigate', desc: 'Use ← and → to move between months.' },
      { title: 'Add events', desc: 'Click "Add Event" or "Add Reminder" for items not tied to a task.' },
    ],
    tips: [
      'Outlook events appear here after sync.',
      'Deadlines show in red when overdue.',
    ],
  },
  {
    id: 'github',
    icon: '🐙',
    title: 'GitHub',
    subtitle: 'Add-on — track commits, PRs, and issues.',
    steps: [
      { title: 'Generate a token', desc: 'GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic). Select repo and user scopes.' },
      { title: 'Set in .env', desc: 'Add GITHUB_TOKEN=your_token to backend/.env.' },
      { title: 'Link your username', desc: 'Go to Profile and set your GitHub username.' },
      { title: 'Sync', desc: 'Admin → GitHub → Sync Now.' },
    ],
    tips: [
      'Keep your token private — never commit it.',
      'Users need their GitHub username in Profile for activity to link.',
    ],
  },
  {
    id: 'clickup',
    icon: '📋',
    title: 'ClickUp',
    subtitle: 'Add-on — import and sync tasks, lists, and projects.',
    steps: [
      { title: 'Get your API key', desc: 'ClickUp → Settings → Apps → API Token. Generate and copy.' },
      { title: 'Set in .env', desc: 'Add CLICKUP_API_KEY=your-key to backend/.env.' },
      { title: 'Link your ID', desc: 'Go to Profile and set your ClickUp ID.' },
      { title: 'Import & Sync', desc: 'Go to ClickUp Import → Browse workspaces → check Auto-sync → Save Config.' },
    ],
    tips: [
      'Auto-sync runs at 7 AM & 6 PM daily.',
      'Per-workspace Sync Now buttons are in the Synced Workspaces list.',
    ],
  },
  {
    id: 'figma',
    icon: '🎨',
    title: 'Figma',
    subtitle: 'Add-on — link design files and track reviews.',
    steps: [
      { title: 'Get a token', desc: 'Figma → Settings → Account → Personal access tokens. Generate with file_read scope.' },
      { title: 'Set your handle', desc: 'Go to Profile and set your Figma handle.' },
      { title: 'Link files', desc: 'Add Figma file keys in the project configuration.' },
    ],
    tips: [
      'Tokens never expire unless revoked.',
      'Only file_read scope is needed.',
    ],
  },
  {
    id: 'lovable',
    icon: '🤖',
    title: 'Lovable AI',
    subtitle: 'Add-on — connect AI-generated code.',
    steps: [
      { title: 'Create an account', desc: 'Sign up at lovable.dev.' },
      { title: 'Set your username', desc: 'Go to Profile and set your Lovable username.' },
      { title: 'Connect to a project', desc: 'Add the GitHub repo where your Lovable code lives to a GRESIO project.' },
    ],
    tips: [
      'Activity from Lovable repos is tracked via GitHub sync.',
    ],
  },
];

export default function Guides() {
  const [active, setActive] = useState(guides[0].id);

  const current = guides.find((g) => g.id === active);

  return (
    <div className="max-w-6xl mx-auto page-enter">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Guides & Setup</h1>
        <p className="text-[var(--text-tertiary)] text-sm mt-1">Outlook is the main connection. Other tools are add-ons for extra help.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0 space-y-1">
          {guides.map((g) => (
            <button key={g.id} onClick={() => setActive(g.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                active === g.id
                  ? 'bg-[var(--bg-tertiary)] text-[var(--brand-primary)] border border-[var(--border-secondary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-transparent'
              }`}>
              <span className="text-lg">{g.icon}</span>
              <div className="min-w-0">
                <p className="truncate">
                  {g.title}
                  {g.primary && <span className="ml-1.5 text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Primary</span>}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">{g.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 animate-scale-in">
          {current && (
            <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{current.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{current.title}</h2>
                    {current.primary && <span className="text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-0.5 rounded-full font-medium">⭐ Primary</span>}
                    {!current.primary && <span className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-full font-medium">Add-on</span>}
                  </div>
                  <p className="text-[var(--text-tertiary)] text-sm">{current.subtitle}</p>
                </div>
              </div>

              <div className="space-y-6">
                {current.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 num-mono ${current.primary ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        {i + 1}
                      </div>
                      {i < current.steps.length - 1 && <div className={`w-0.5 flex-1 my-1 ${current.primary ? 'bg-[var(--brand-primary)]/20' : 'bg-[var(--border-primary)]'}`}></div>}
                    </div>
                    <div className="pb-6">
                      <h3 className="font-semibold text-[var(--text-primary)]">{step.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg border"
                style={{ backgroundColor: current.primary ? 'var(--brand-primary)' : 'var(--bg-tertiary)', borderColor: current.primary ? 'var(--brand-secondary)' : 'var(--border-secondary)', opacity: 0.15 }}
              />
              <div className="mt-6 card-premium glow-card p-4 rounded-[var(--radius-lg)]"
                style={{ background: current.primary ? 'rgba(99,102,241,0.06)' : 'var(--bg-tertiary)', border: current.primary ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border-secondary)' }}>
                <p className="text-sm font-medium" style={{ color: current.primary ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>💡 Tips</p>
                <ul className="space-y-1.5 mt-1">
                  {current.tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: current.primary ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                      <span className="mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

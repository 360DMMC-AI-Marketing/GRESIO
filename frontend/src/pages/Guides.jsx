import { useState } from 'react';

const guides = [
  {
    id: 'outlook',
    icon: '⭐',
    title: 'Outlook / Microsoft 365',
    subtitle: 'Primary connection — emails, calendar, Teams, and user management.',
    primary: true,
    steps: [
      { title: 'Register an app in Azure', desc: 'Go to portal.azure.com → Azure Active Directory → App registrations → New registration. Name it "GRESIO", set redirect URI to http://localhost:5000/auth/callback. Save.' },
      { title: 'Get client credentials', desc: 'In your app → Certificates & secrets → New client secret. Copy the secret. Also copy the Application (client) ID and Directory (tenant) ID.' },
      { title: 'Set credentials in .env', desc: 'Open backend/.env. Set MICROSOFT_CLIENT_ID=your-client-id, MICROSOFT_CLIENT_SECRET=your-secret, MICROSOFT_TENANT_ID=your-tenant-id. Save and restart backend.' },
      { title: 'Set your Outlook email', desc: 'Go to Profile → set your Outlook email (e.g., you@company.com). This links your identity to the Microsoft Graph.' },
      { title: 'Sync from Admin', desc: 'Go to Admin → Integrations → Microsoft Graph → Sync Now. This pulls your latest emails, calendar events, and Teams messages.' },
      { title: 'Assign tasks via Outlook email', desc: 'When creating a task, you can enter any user\'s Outlook email to assign it to them — no need to search for their name.' },
    ],
    tips: [
      'Requires admin consent in Azure AD for Mail.Read, Calendar.Read, and Chat.Read scopes.',
      'Emails and events from the last 24h are synced per sync.',
      'Outlook email is also used to identify users — make sure everyone sets it in their Profile.',
      'This is the main integration. All other tools are add-ons.',
    ],
  },
  {
    id: 'github',
    icon: '🐙',
    title: 'GitHub',
    subtitle: 'Add-on — track commits, PRs, and issues.',
    steps: [
      { title: 'Generate a GitHub token', desc: 'Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic). Click "Generate new token", select repo and user scopes, copy the token.' },
      { title: 'Set the token in GRESIO', desc: 'Open backend/.env. Set GITHUB_TOKEN=your_token_here. Save and restart the backend server.' },
      { title: 'Link your GitHub username', desc: 'Go to Profile → set your GitHub username (e.g., octocat). Click Save.' },
      { title: 'Add a repo to a project', desc: 'When creating/editing a project, enter the repo name (e.g., yourname/repo).' },
      { title: 'Sync', desc: 'Go to Admin → GitHub → Sync Now.' },
    ],
    tips: [
      'Keep your token private — never commit it to Git.',
      'Users must have their GitHub username set in Profile for activity to link.',
      'This is an add-on. Outlook is the main connection.',
    ],
  },
  {
    id: 'clickup',
    icon: '📋',
    title: 'ClickUp',
    subtitle: 'Add-on — sync tasks, lists, and activity.',
    steps: [
      { title: 'Get your ClickUp API key', desc: 'ClickUp → Settings → Apps → API Token. Generate and copy.' },
      { title: 'Set the API key', desc: 'Open backend/.env. Set CLICKUP_API_KEY=your-key. Save and restart.' },
      { title: 'Link your ClickUp ID', desc: 'Go to Profile → set your ClickUp ID.' },
      { title: 'Sync', desc: 'Go to Admin → ClickUp → Sync Now.' },
    ],
    tips: [
      'The ClickUp API key is per-workspace.',
      'Tasks are mapped by their ClickUp task ID.',
      'This is an add-on. Outlook is the main connection.',
    ],
  },
  {
    id: 'figma',
    icon: '🎨',
    title: 'Figma',
    subtitle: 'Add-on — link design files and track reviews.',
    steps: [
      { title: 'Get a Figma access token', desc: 'Figma → Settings → Account → Personal access tokens. Generate with file_read scope.' },
      { title: 'Set your Figma username', desc: 'Go to Profile → set your Figma handle.' },
      { title: 'Link files to projects', desc: 'Add Figma file keys in the project configuration.' },
      { title: 'View activity', desc: 'Figma comments and versions appear in your activity feed.' },
    ],
    tips: [
      'Figma tokens never expire unless revoked.',
      'Only file_read scope is needed.',
      'This is an add-on. Outlook is the main connection.',
    ],
  },
  {
    id: 'lovable',
    icon: '🤖',
    title: 'Lovable AI',
    subtitle: 'Add-on — connect AI-generated code and prototypes.',
    steps: [
      { title: 'Create a Lovable account', desc: 'Sign up at lovable.dev to build full-stack apps with AI.' },
      { title: 'Link your Lovable username', desc: 'Go to Profile → set your Lovable username.' },
      { title: 'Export code', desc: 'Export or clone the generated code to your local machine.' },
      { title: 'Connect to GRESIO', desc: 'Create a GRESIO project and add the GitHub repo where your Lovable code lives.' },
    ],
    tips: [
      'Lovable generates React/Node.js code.',
      'Activity from Lovable repos is tracked via GitHub sync.',
      'This is an add-on. Outlook is the main connection.',
    ],
  },
  {
    id: 'account',
    icon: '👤',
    title: 'Account & Profile',
    subtitle: 'Set up your account and integrations.',
    steps: [
      { title: 'Create an account', desc: 'Go to /register and sign up with your email. Add your Outlook email for the main integration.' },
      { title: 'Log in', desc: 'Use your credentials at /login. Demo: admin@gresio.com / password123.' },
      { title: 'Complete your profile', desc: 'Go to Profile and fill in your Outlook email first (main), then GitHub, ClickUp, Figma, Lovable as needed.' },
      { title: 'Set your role', desc: 'Admin, PM, Developer, or Intern — roles control what you can see and do.' },
    ],
    tips: [
      'Admins can create users from the Users page.',
      'Outlook email is the most important field — set it first.',
      'Other integration fields are optional add-ons.',
    ],
  },
  {
    id: 'tasks',
    icon: '✅',
    title: 'Tasks & Projects',
    subtitle: 'Manage work and assign via Outlook.',
    steps: [
      { title: 'Create a project', desc: 'Projects → + New Project. Name, description, deadline.' },
      { title: 'Add tasks', desc: 'Click a project → + Add Task. Assign by user name or Outlook email.' },
      { title: 'Use subtasks', desc: 'Like ClickUp checklists. Can be assigned to different users.' },
      { title: 'Track progress', desc: 'todo → in_progress → review → done. Done tasks auto-hide. All done → project is "ready to test".' },
    ],
    tips: [
      'Done tasks disappear from the main list.',
      'All tasks done = project becomes "ready to test" 🧪.',
      'Task assignment works with Outlook email — no need for usernames.',
    ],
  },
];

export default function Guides() {
  const [active, setActive] = useState(guides[0].id);

  const current = guides.find((g) => g.id === active);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Guides & Setup</h1>
        <p className="text-surface-500 text-sm mt-1">Outlook is the main connection. Other tools are add-ons for extra help.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0 space-y-1">
          {guides.map((g) => (
            <button key={g.id} onClick={() => setActive(g.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                active === g.id
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-surface-600 hover:bg-surface-50 border border-transparent'
              }`}>
              <span className="text-lg">{g.icon}</span>
              <div className="min-w-0">
                <p className="truncate">
                  {g.title}
                  {g.primary && <span className="ml-1.5 text-xs bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded-full">Primary</span>}
                </p>
                <p className="text-xs text-surface-400 truncate">{g.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          {current && (
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{current.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-surface-900">{current.title}</h2>
                    {current.primary && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">⭐ Primary</span>}
                    {!current.primary && <span className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full font-medium">Add-on</span>}
                  </div>
                  <p className="text-surface-500 text-sm">{current.subtitle}</p>
                </div>
              </div>

              <div className="space-y-6">
                {current.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${current.primary ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}`}>
                        {i + 1}
                      </div>
                      {i < current.steps.length - 1 && <div className={`w-0.5 flex-1 my-1 ${current.primary ? 'bg-primary-100' : 'bg-surface-100'}`}></div>}
                    </div>
                    <div className="pb-6">
                      <h3 className="font-semibold text-surface-900">{step.title}</h3>
                      <p className="text-sm text-surface-600 mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg border"
                style={{ backgroundColor: current.primary ? '#f0f5ff' : '#f8f9fa', borderColor: current.primary ? '#bfdbfe' : '#e5e7eb' }}>
                <p className="text-sm font-medium" style={{ color: current.primary ? '#1e40af' : '#374151' }}>💡 Tips</p>
                <ul className="space-y-1.5 mt-1">
                  {current.tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: current.primary ? '#1e40af' : '#6b7280' }}>
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

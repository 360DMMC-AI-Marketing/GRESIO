import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const CATEGORIES = [
  {
    icon: '📊', title: 'Project Management', desc: 'From ideation to delivery — manage every project type with adapted lifecycle phases.',
    features: [
      { title: '5 Project Types', desc: 'Software, Design, Business, Content, Research — each with its own lifecycle phases adapted to the work.' },
      { title: '7-Phase Lifecycle', desc: 'Discovery → Planning → Development → Testing → Review → Launch → Delivered. Auto-advance through phases.' },
      { title: 'Progress Tracking', desc: 'Visual phase bar with color-coded status: completed (green), active (blue), pending (gray).' },
      { title: 'Project Health Dashboard', desc: 'Completion %, overdue tasks, risk level, and days remaining — all visible at a glance.' },
      { title: 'Client & Tech Stack Mgmt', desc: 'Client name, tech stack tags, repos, staging/production URLs — everything in one place.' },
      { title: 'Archive & Restore', desc: 'Archive completed projects and restore them when needed. Full project history preserved.' },
    ],
  },
  {
    icon: '⚡', title: 'Sprints & Tasks', desc: 'Plan sprints, assign tasks, and track progress with Kanban boards and burndown charts.',
    features: [
      { title: 'Sprint Planning', desc: 'Create time-boxed sprints with goals, start/end dates, and status (Planning → Active → Completed).' },
      { title: 'Kanban Board', desc: 'Visual board with To Do, In Progress, and Done columns. Drag & drop tasks between statuses.' },
      { title: 'Task Priorities & Deadlines', desc: 'Urgent → High → Medium → Low priority levels. Overdue detection with color-coded warnings.' },
      { title: 'Subtasks & Attachments', desc: 'Like ClickUp checklists — add subtasks under any task. Upload files and link PRs or commits.' },
      { title: 'Task Assignment', desc: 'Assign tasks to team members by name or Outlook email. Filter by assignee, sprint, or priority.' },
      { title: 'Sprint Burndown', desc: 'Visual progress bar showing completed vs total tasks per sprint. Track team velocity in real time.' },
    ],
  },
  {
    icon: '🧪', title: 'Testing & QA', desc: 'Full test case management with auto-generated tests and bug tracking from failed results.',
    features: [
      { title: 'Test Case Management', desc: 'Full CRUD with auto-generated IDs. Statuses: Draft, Ready, In Progress, Passed, Failed, Blocked, Skipped.' },
      { title: 'Auto-Create Bug from Failed Test', desc: 'When a test fails, the system automatically creates a Bug task linked to the original feature.' },
      { title: 'Bug Tracking', desc: 'Bugs with severity, status (Open → Fixed → Closed), steps to reproduce, screenshots, and retest count.' },
      { title: 'Auto-Generate from Sprints', desc: 'Generate test cases automatically from completed sprint tasks. Never miss a test scenario.' },
      { title: 'Test Execution Dashboard', desc: 'Pass rate, counts per status, and one-click execute/retest workflow for QA teams.' },
      { title: 'Interest-Based Auto-Generation', desc: 'Configure topics/interests and GRESIO auto-generates relevant test cases with match scoring.' },
    ],
  },
  {
    icon: '🤖', title: 'Automation', desc: 'Smart automation that advances projects, creates tests, and reduces manual work.',
    features: [
      { title: 'Auto Status Flow', desc: 'Projects auto-advance through phases when conditions are met. No manual status updates needed.' },
      { title: 'Type-Specific Transitions', desc: 'Each of the 5 project types has unique auto-transition rules. Software, Design, Business, Content, Research — all different.' },
      { title: 'Manual Gates', desc: 'Launch and Delivered phases require explicit approval by Admin, PM, or Team Lead — full control over releases.' },
      { title: 'Evaluate Phase Button', desc: 'Manually trigger phase evaluation to check if conditions are met for the next phase.' },
    ],
  },
  {
    icon: '📈', title: 'Analytics & Reports', desc: 'Data-driven insights into project health, team performance, and delivery trends.',
    features: [
      { title: 'Company Dashboard', desc: 'Active projects, completed projects, blocked/delayed projects, and team online count at a glance.' },
      { title: 'Health Score', desc: 'Overall company health with color indicator (green/yellow/red). High-risk project alerts panel.' },
      { title: 'Velocity Tracking', desc: 'Average sprint velocity metrics. Track how your team is performing sprint over sprint.' },
      { title: 'Workload Analysis', desc: 'Low / Medium / High / Critical workload levels per user. Department-level breakdowns.' },
      { title: 'Participation Scoring', desc: '0-100 score per user based on activity. Color-coded performance indicators for managers.' },
      { title: 'Admin Reports', desc: 'Detailed project closure reports with full KPIs, task breakdowns, sprint velocity, testing stats, and team performance. Saved for future reference.' },
      { title: 'Client Reports', desc: 'Clean stakeholder-ready project summaries with key outcomes and delivery notes. Perfect for handoffs and audits. Every report is branded "Generated by GRESIO · Certified by 360 DMMC".' },
    ],
  },
  {
    icon: '👥', title: 'Team Management', desc: 'Role-based access control with granular permissions and intelligent team grouping.',
    features: [
      { title: '8 User Roles', desc: 'Admin, PM, Team Lead, Manager, QA Tester, Developer, Intern, Other — each with tailored permissions.' },
      { title: 'Role-Based Access (RBAC)', desc: '27+ granular permissions controlling create/edit/delete for projects, sprints, tasks, test cases, and more.' },
      { title: 'Team Groups', desc: 'Auto-created groups: Development, QA, Design, PM, Business, Admin, Interns — with role color coding.' },
      { title: 'Smart Invite & Suggestions', desc: 'Invite by email with role and group. AI-suggested team compositions based on project type.' },
      { title: 'Member Work Log Viewer', desc: 'Click any team member to see their work logs, project assignments, and role details.' },
    ],
  },
  {
    icon: '🔗', title: 'Integrations', desc: 'Connect the tools your team already uses — GitHub, Microsoft 365, Teams, Outlook, and more.',
    features: [
      { title: 'Microsoft 365 / Azure AD', desc: 'One-click import of all company users. Auto-infer roles from job titles. Send welcome emails with temp passwords.' },
      { title: 'GitHub Integration', desc: 'Track commits, pull requests, and issues. Activity scoring: commits (10pts), PRs (8pts), issues (5pts).' },
      { title: 'Microsoft Teams', desc: 'Auto-create Teams channels per project. Sync messages, meetings, and attendance tracking.' },
      { title: 'Outlook Sync', desc: 'Sync emails and calendar events. View email and calendar workload insights per team member.' },
      { title: 'ClickUp & Figma', desc: 'Map tasks by ClickUp ID. Link Figma design files with review and comment tracking in activity feed.' },
    ],
  },
  {
    icon: '🔔', title: 'Notifications & Search', desc: 'Stay informed with real-time alerts and find anything instantly with global search.',
    features: [
      { title: 'Real-Time Notifications', desc: 'In-app bell with unread count badge. Instant WebSocket delivery for task assignments, sprint events, and more.' },
      { title: 'Email Alerts', desc: 'Automated email notifications for key events: task overdue, sprint starts, test failures, phase transitions.' },
      { title: 'Global Search', desc: 'Search across projects, tasks, sprints, and users from the topbar. Debounced search-as-you-type with categorized results.' },
      { title: 'Notification Actions', desc: 'Accept/decline invitations inline. Mark read/unread, delete, or mark all read in one click.' },
    ],
  },
  {
    icon: '🏢', title: 'Enterprise', desc: 'Advanced features for organizations that need security, customization, and dedicated support.',
    features: [
      { title: 'SAML SSO', desc: 'Single sign-on for enterprise teams. One-click authentication with your identity provider.' },
      { title: 'On-Premise Deployment', desc: 'Deploy GRESIO on your own infrastructure. Full data control and compliance with internal policies.' },
      { title: 'Custom Fields & Workflows', desc: 'Tailor GRESIO to your processes. Add custom fields to projects/tasks. Define custom phase workflows.' },
      { title: 'SLA Guarantee', desc: 'Service Level Agreement with guaranteed uptime and response times for enterprise customers.' },
      { title: 'White-Label & API Access', desc: 'Remove GRESIO branding and add your own. Full API access for custom integrations and automation.' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* HERO */}
      <section className="pt-36 pb-20 px-5 bg-gradient-to-br from-white via-blue-50/30 to-white">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-sm font-medium text-primary-700 mb-6">
            🚀 180+ features to power your workflow
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight mb-5 tracking-tight">
            Everything you need to ship
          </h1>
          <p className="text-lg md:text-xl text-surface-500 max-w-3xl mx-auto mb-8 leading-relaxed">
            One platform covering the full project lifecycle — project management, sprints, 
            tasks, testing, analytics, integrations, and automation. No more juggling between tools.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/pricing" className="px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg text-base">
              See Plans & Pricing
            </Link>
            <Link to="/register" className="px-8 py-3.5 border-2 border-surface-300 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors text-base">
              Start Free
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-14 px-5 bg-primary-600">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ['5', 'Project Types'],
            ['7', 'Lifecycle Phases'],
            ['27+', 'Granular Permissions'],
            ['180+', 'Total Features'],
          ].map(([val, label], i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white mb-1">{val}</p>
              <p className="text-sm text-primary-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE CATEGORIES */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto space-y-20">
          {CATEGORIES.map((cat, ci) => (
            <div key={ci}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{cat.icon}</span>
                <h2 className="text-2xl md:text-3xl font-bold text-surface-900">{cat.title}</h2>
              </div>
              <p className="text-sm text-surface-500 mb-6 ml-0">{cat.desc}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.features.map((f, fi) => (
                  <div key={fi} className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:-translate-y-0.5 hover:border-primary-200 transition-all group">
                    <h3 className="font-semibold text-surface-900 text-sm mb-1.5 group-hover:text-primary-700 transition-colors">{f.title}</h3>
                    <p className="text-xs text-surface-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INTEGRATIONS STRIP */}
      <section className="py-16 px-5 bg-surface-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-xl font-bold text-surface-900 mb-3">Integrates with the tools you already use</h2>
          <p className="text-sm text-surface-500 mb-8">Connect your existing workflow — no need to switch platforms.</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { name: 'GitHub', icon: '⬛', bg: 'bg-gray-900', text: 'text-white' },
              { name: 'Microsoft 365', icon: '🟦', bg: 'bg-blue-600', text: 'text-white' },
              { name: 'Teams', icon: '💬', bg: 'bg-indigo-600', text: 'text-white' },
              { name: 'Outlook', icon: '✉️', bg: 'bg-blue-500', text: 'text-white' },
              { name: 'ClickUp', icon: '📋', bg: 'bg-purple-600', text: 'text-white' },
              { name: 'Figma', icon: '🎨', bg: 'bg-rose-600', text: 'text-white' },
            ].map((int, i) => (
              <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${int.bg} ${int.text} text-sm font-semibold shadow-sm`}>
                <span>{int.icon}</span>
                <span>{int.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to ship faster?</h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto">Join teams that use GRESIO to manage projects, track tasks, and deliver quality software — all in one platform.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/pricing" className="px-8 py-3.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 hover:scale-105 transition-all shadow-md hover:shadow-lg text-base">
              Choose Your Plan
            </Link>
            <Link to="/register" className="px-8 py-3.5 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-base">
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

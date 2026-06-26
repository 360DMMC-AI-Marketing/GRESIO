import { useState } from 'react';
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
      { title: 'Team Calendar', desc: 'Month-view calendar with color-coded tasks, sprints, project deadlines, milestones, events, and reminders — everything in one view.' },
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
      { title: 'Template Marketplace', desc: 'Pre-built project templates with phases, task skeletons, and role assignments. Save your best projects as reusable templates.' },
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
    icon: '👥', title: 'Department Management', desc: 'Role-based access control with granular permissions, capacity planning, and intelligent team grouping.',
    features: [
      { title: '8 User Roles', desc: 'Admin, PM, Team Lead, Manager, QA Tester, Developer, Intern, Other — each with tailored permissions.' },
      { title: 'Role-Based Access (RBAC)', desc: '27+ granular permissions controlling create/edit/delete for projects, sprints, tasks, test cases, and more.' },
      { title: 'Departments', desc: 'Auto-created groups: Development, QA, Design, PM, Business, Admin, Interns — with role color coding.' },
      { title: 'Smart Invite & Suggestions', desc: 'Invite by email with role and group. AI-suggested department compositions based on project type.' },
      { title: 'Member Work Log Viewer', desc: 'Click any member to see their work logs, project assignments, and role details.' },
      { title: 'Workload Heatmap', desc: '6-week capacity forecast per person. Green = available, amber = nearing limit, red = overbooked. Drag tasks to rebalance instantly.' },
      { title: 'Portfolio Matrix', desc: 'Visual grid of every project across health × progress dimensions. Spot stalled projects, resource bottlenecks, and delivery risks at a glance.' },
    ],
  },
  {
    icon: '🔗', title: 'Integrations', desc: 'Connect the tools your team already uses — GitHub, Microsoft 365, Teams, Outlook, and more.',
    features: [
      { title: 'Microsoft 365 / Azure AD', desc: 'One-click import of all company users. Auto-infer roles from job titles. Send welcome emails with temp passwords.' },
      { title: 'GitHub Integration', desc: 'Track commits, pull requests, and issues. Activity scoring: commits (10pts), PRs (8pts), issues (5pts).' },
      { title: 'Microsoft Teams', desc: 'Auto-create Teams channels per project. Sync messages, meetings, and attendance tracking.' },
      { title: 'Outlook Sync', desc: 'Sync emails and calendar events. View email and calendar workload insights per team member. Calendar events from Outlook appear in your GRESIO Calendar.' },
      { title: 'Calendar Integration', desc: 'Outlook calendar events are synced and displayed in the GRESIO Calendar alongside tasks, sprints, and project deadlines — one unified view.' },
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
      { title: 'On-Premise Deployment', desc: 'Deploy GRESIO on your own infrastructure. Full data control and compliance with internal policies.' },
      { title: 'Custom Fields & Workflows', desc: 'Tailor GRESIO to your processes. Add custom fields to projects/tasks. Define custom phase workflows.' },
      { title: 'SLA Guarantee', desc: 'Service Level Agreement with guaranteed uptime and response times for enterprise customers.' },
      { title: 'White-Label & API Access', desc: 'Remove GRESIO branding and add your own. Full API access for custom integrations and automation.' },
      { title: 'AI Voice Assistant', desc: 'Voice-controlled project management — say "hey gresio" to create tasks, navigate pages, assign work, and run commands hands-free through the smart assistant panel.' },
      { title: 'AI Chatbot', desc: 'Conversational AI assistant that understands your project context. Ask questions, generate reports, and execute commands through natural language chat — all inside the dashboard.' },
    ],
  },
  {
    icon: '📚', title: 'Knowledge Base', desc: 'A central hub that brings together your company wiki, WorkDNA archives, and project templates — searchable, editable, and always up to date.',
    features: [
      { title: 'Markdown Wiki Articles', desc: 'Create and edit documentation with live markdown preview. Full GFM support including tables, code blocks, and task lists.' },
      { title: 'Department Organization', desc: 'Organize articles by department with color-coded filter pills. Custom departments supported.' },
      { title: 'Star Rating System', desc: 'Rate articles 1–5 stars. See average ratings at a glance and sort by rating to find the best content.' },
      { title: 'File Attachments', desc: 'Attach files and documents to any wiki article. Upload via drag-drop or the attach button.' },
      { title: 'Import from .md / .txt', desc: 'Import existing markdown or text files directly as new wiki pages — perfect for migrating documentation.' },
      { title: 'Monthly Project Archive', desc: 'Every project auto-archived each month with full technical snapshot: features, tech stack, risks, repos, documents, stats, and team.' },
      { title: 'Decision Journal', desc: 'Every decision, alternative considered, and rationale — logged and searchable. Never ask "why did we do this?" again.' },
      { title: 'Déjà Vu Search', desc: 'Search archived projects and past decisions by keyword. Before starting something new, find similar past work and learn.' },
      { title: 'Pattern Detection', desc: 'Auto-detects overdue tasks, bug density, sprint cadence issues across all projects — rule-based, instant, no AI cost.' },
      { title: 'Template Marketplace', desc: 'Browse, rate, and download project templates for Software, Design, Business, Content, and Research — built by your team, for your team.' },
      { title: 'Real-Time Notifications', desc: 'Get notified when a new wiki article or template is created in your company. Never miss important knowledge.' },
    ],
  },
];

export default function FeaturesPage() {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => setOpenId(openId === id ? null : id);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />

      <section className="pt-36 pb-20 px-5 gradient-wave relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary), var(--bg-primary))' }}>
        <div className="absolute top-0 right-0 w-[650px] h-[650px] rounded-full opacity-[0.04] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-primary), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="max-w-5xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', color: 'var(--brand-primary)' }}>
            🚀 180+ features to power your workflow
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] leading-tight mb-5 tracking-tight">
            Everything you need to ship
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-tertiary)] max-w-3xl mx-auto mb-8 leading-relaxed">
            One platform covering the full project lifecycle — project management, sprints, 
            tasks, testing, capacity heatmap, portfolio matrix, WorkDNA, analytics, integrations, and automation. No more juggling between tools.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/pricing" className="btn-premium px-8 py-3.5 text-base">
              See Plans & Pricing
            </Link>
            <Link to="/register" className="px-8 py-3.5 border-2 border-[var(--border-primary)] text-[var(--text-secondary)] font-semibold rounded-[var(--radius-lg)] hover:bg-[var(--bg-secondary)] transition-colors text-base">
              Start Free
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-5 bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ['5', 'Project Types'],
            ['7', 'Lifecycle Phases'],
            ['27+', 'Granular Permissions'],
            ['180+', 'Total Features'],
          ].map(([val, label], i) => (
            <div key={i} className="card-premium glow-card p-6 text-center">
              <p className="text-3xl font-bold text-primary-600 mb-1">{val}</p>
              <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-secondary)]/30 to-[var(--bg-primary)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">Explore all features</h2>
            <p className="text-[var(--text-tertiary)] max-w-2xl mx-auto">Click any category to discover its features. Each module is designed to work independently or together as a complete workflow.</p>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map((cat, ci) => {
              const isOpen = openId === ci;
              return (
                <div key={ci}
                  className="animate-fade-in rounded-2xl border border-[var(--glass-border)] transition-all duration-300"
                  style={{
                    animationDelay: `${ci * 0.04}s`,
                    background: isOpen
                      ? 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))'
                      : 'var(--glass-bg)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: isOpen ? '0 8px 32px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  <button
                    onClick={() => toggle(ci)}
                    className="w-full flex items-center gap-4 px-6 py-5 bg-transparent border-none cursor-pointer text-left group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all duration-300 ${isOpen ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] shadow-lg shadow-[var(--brand-primary)]/20' : 'bg-[var(--bg-tertiary)]'}`}>
                      {isOpen ? (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span>{cat.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-base font-bold transition-colors duration-300 ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                          {cat.title}
                        </h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                          {cat.features.length} {cat.features.length === 1 ? 'feature' : 'features'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 transition-colors duration-300 ${isOpen ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-muted)]'}`}>
                        {cat.desc}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isOpen ? 'bg-[var(--brand-primary)]/10 rotate-180' : 'bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-primary)]'}`}>
                      <svg className={`w-4 h-4 transition-colors duration-300 ${isOpen ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-2 border-t border-[var(--glass-border)]">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                        {cat.features.map((f, fi) => (
                          <div key={fi}
                            className="group/card rounded-xl p-4 transition-all duration-300 hover:shadow-md border border-transparent hover:border-[var(--brand-primary)]/10"
                            style={{
                              background: 'var(--bg-primary)',
                              animation: isOpen ? `fadeIn 0.4s ease-out ${fi * 0.03}s both` : 'none',
                            }}>
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: `var(--brand-primary)` }} />
                              <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 group-hover/card:text-[var(--brand-primary)] transition-colors">{f.title}</h4>
                                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{f.desc}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-5 bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">Integrates with the tools you already use</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-12 max-w-2xl mx-auto">Connect your existing workflow — no need to switch platforms.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {[
              { 
                name: 'GitHub', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>,
              },
              { 
                name: 'Microsoft 365', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
              },
              { 
                name: 'Teams', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5"><rect x="1" y="1" width="22" height="22" rx="6" fill="#6264A7"/><path d="M6.5 6.5h11v3h-11zm3 4h5v8h-5z" fill="#fff"/></svg>,
              },
              { 
                name: 'Outlook', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 4.99L4 6h16zm0 12H4V8l8 5 8-5v10z"/></svg>,
              },
              { 
                name: 'ClickUp', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.3 14.3l-1.4 1.4L12 13.8l-3.9 3.9-1.4-1.4L12 11l5.3 5.3z"/></svg>,
              },
              { 
                name: 'Figma', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 8.462h-4.588c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98z"/><path d="M12.735 24H8.147c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588V24z"/><path d="M12.735 0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49h-4.588V0z"/></svg>,
              },
              { 
                name: 'Lovable', 
                svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
              },
            ].map((int, i) => (
              <div key={i} 
                className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg border border-[var(--glass-border)]"
                style={{ 
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--text-secondary)',
                }}>
                <span className="w-5 h-5 flex items-center justify-center" style={{ color: 'var(--brand-primary)' }}>
                  {int.svg}
                </span>
                <span>{int.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center animate-fade-in relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)]/20 via-[var(--brand-primary)]/10 to-[var(--brand-primary)]/20 rounded-3xl blur-3xl" />
          <div className="relative rounded-2xl p-12 md:p-16 overflow-hidden shadow-2xl border border-[var(--glass-border)]" style={{ background: 'var(--bg-secondary)' }}>
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.05] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-primary), transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-secondary), transparent 70%)', transform: 'translate(-30%, 30%)' }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Ready to ship faster?</h2>
              <p className="text-[var(--text-tertiary)] mb-10 max-w-lg mx-auto">Join teams that use GRESIO to manage projects, track tasks, and deliver quality software — all in one platform.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/pricing" className="btn-premium px-10 py-3.5 text-sm">
                  Choose Your Plan
                </Link>
                <Link to="/register" className="px-10 py-3.5 font-semibold rounded-xl transition-all duration-300 text-sm border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 hover:shadow-lg" style={{ color: 'var(--text-secondary)', background: 'var(--glass-bg)' }}>
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

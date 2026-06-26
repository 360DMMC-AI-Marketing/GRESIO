import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const PHASES = ['Discovery', 'Planning', 'Development', 'Testing', 'Review', 'Launch', 'Delivered', 'Report'];

const PHASE_DETAILS = [
  { num: 1, name: 'Discovery', auto: true, desc: 'Define project scope, collect requirements, and identify stakeholders. GRESIO auto-generates a project brief from initial inputs.' },
  { num: 2, name: 'Planning', auto: true, desc: 'Break down work into sprints, assign tasks, set milestones, and allocate resources. Burndown charts are auto-created.' },
  { num: 3, name: 'Development', auto: true, desc: 'Teams execute tasks in Kanban-style boards. Progress is tracked in real-time with status updates (To Do → In Progress → Done).' },
  { num: 4, name: 'Testing', auto: true, desc: 'QA teams create and run test cases linked to features. Failed tests can auto-create bug tasks for the development team.' },
  { num: 5, name: 'Review', auto: false, desc: 'Code reviews, QA sign-offs, and stakeholder demonstrations. The project lead manually approves the review phase.' },
  { num: 6, name: 'Launch', auto: false, desc: 'Deploy to production. Only Admin, PM, or Team Lead can approve the launch phase manually.' },
  { num: 7, name: 'Delivered', auto: false, desc: 'Project is completed and handed over. Final documentation is archived and team velocity metrics are recorded.' },
  { num: 8, name: 'Report', auto: false, desc: 'Generate professional project reports — Admin (full audit with KPIs, tasks, sprints, testing) or Client (stakeholder summary). Both export as PDF with GRESIO + 360 DMMC branding.' },
];

const FAQS = [
  {
    q: 'Is there a free tier?',
    a: 'Yes! Our Starter plan is free forever for up to 10 users and 3 projects. No credit card required — just sign up and start using GRESIO immediately.',
  },
  {
    q: 'How does the auto status flow work?',
    a: 'GRESIO automatically advances projects through their lifecycle phases when predefined conditions are met. Each of the 5 project types (Software, Design, Business, Content, Research) has its own adapted phase sequence. For example, when all tasks in the Development phase of a Software project are marked Done, the project automatically moves to Testing. Manual approval is only needed for Launch and Delivered phases across all project types.',
  },
  {
    q: 'What happens when all tasks in a phase are completed?',
    a: 'For auto phases (Discovery through Testing), GRESIO automatically transitions the project to the next phase. For manual phases (Review, Launch, Delivered), an authorized user (Admin, PM, or Team Lead) must manually approve the transition.',
  },
  {
    q: 'Can I customize the project phases?',
    a: 'Absolutely. GRESIO comes with 5 pre-defined project types (Software, Design, Business, Content, Research), each with its own adapted phase sequence. Enterprise plans include custom fields, custom workflows, and the ability to define your own project types with tailored phase sequences.',
  },
  {
    q: 'How does the Kanban board work?',
    a: 'Every project has a Kanban board with three default columns: To Do, In Progress, and Done. Tasks are moved by dragging them between columns. You can filter tasks by assignee, sprint, priority, or phase.',
  },
  {
    q: 'Can I import users from Azure AD?',
    a: 'Yes — admins can import all company users from Microsoft 365 with one click in the Admin panel. Team and Enterprise plans support this feature.',
  },
  {
    q: 'What integrations are supported?',
    a: 'GRESIO integrates with GitHub (sync commits and PRs), Microsoft Teams (receive notifications), and Outlook (sync calendar and tasks). The dedicated Calendar page shows all tasks, sprints, deadlines, and events in one month view. Azure AD/Microsoft 365 import is available on paid plans.',
  },
  {
    q: 'How do notifications work?',
    a: 'You receive in-app notifications in real-time for task assignments, sprint starts, deadline reminders, and team invitations. Email notifications are also sent for important updates. You can manage notification preferences in your profile settings.',
  },
  {
    q: 'Can I customize user roles?',
    a: 'Roles are pre-defined — Admin, Project Manager, Team Lead, Developer, QA, and Viewer — each with granular permissions. Only admins can change roles. Enterprise plans include additional custom role options.',
  },
  {
    q: 'How is my data secured?',
    a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Enterprise plans include on-premise deployment options, and SLA guarantees for data availability.',
  },
  {
    q: 'Can I track time spent on tasks?',
    a: 'Yes — GRESIO includes work log tracking. Members can log hours against tasks and sprints. Reports show time distribution across projects, phases, and members.',
  },
  {
    q: 'What analytics are available?',
    a: 'Basic reports include sprint burndown charts, task completion rates, and project progress. The Advanced Analytics dashboard (Team plan and above) provides velocity tracking, team workload distribution, trend analysis, and custom report builders.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Not yet, but we are planning to create a mobile app linked to this web app. Currently, GRESIO is fully responsive and works on all devices through the web browser. You can access your projects, tasks, and notifications on mobile without installing anything.',
  },
  {
    q: 'How do I get started?',
    a: 'Sign up for free, create your first project, invite your team members, and start adding tasks. We recommend visiting the Onboarding Guide for a step-by-step walkthrough of all features.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="glass-panel rounded-[var(--radius-xl)] p-8 md:p-12 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">How It Works</h1>
            <p className="text-lg text-[var(--text-tertiary)] max-w-xl mx-auto mb-12">Projects move through 8 phases automatically. You focus on the work, we handle the flow.</p>

            <div className="relative mb-16">
              <div className="hidden md:block absolute top-5 left-0 right-0 h-0.5 bg-[var(--border-primary)]" />
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-0">
                {PHASES.map((phase, i) => (
                  <div key={i} className="flex flex-col items-center relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 mb-2 ${i < 4 ? 'bg-primary-600 text-white border-primary-600' : i === 4 ? 'bg-amber-500 text-white border-amber-500' : i === 5 ? 'bg-indigo-600 text-white border-indigo-600' : i === 6 ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]'}`}>
                      {i + 1}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight ${i < 4 ? 'text-primary-700' : i === 4 ? 'text-amber-600' : i === 5 ? 'text-indigo-600' : i === 6 ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                      {phase}
                    </span>
                    <span className={`text-[9px] mt-0.5 ${i < 4 ? 'text-primary-400' : i === 4 ? 'text-amber-400' : i === 5 ? 'text-indigo-400' : i === 6 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                      {i < 4 ? 'Auto' : i < 6 ? 'Manual' : i === 6 ? 'Done' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mb-16 animate-fade-in">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHASE_DETAILS.map((d) => (
              <div key={d.num} className="card-premium glow-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${d.num <= 4 ? 'bg-primary-600 text-white' : d.num === 5 ? 'bg-amber-500 text-white' : d.num === 6 ? 'bg-indigo-600 text-white' : d.num === 7 ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>{d.num}</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{d.name}</span>
                  <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-medium ${d.auto ? 'bg-primary-50 text-primary-600' : d.num === 7 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {d.auto ? 'Auto' : d.num === 7 ? 'Done' : 'Manual'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center mt-6">🔒 Phases 6 (Launch), 7 (Delivered), and 8 (Report) require manual approval by Admin, PM, or Team Lead.</p>
        </div>

        <div className="max-w-5xl mx-auto mb-16 pt-8 animate-fade-in">
          <div className="glass-panel rounded-[var(--radius-xl)] p-8 md:p-12 mb-10">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">5 project types, each with adapted phases</h2>
              <p className="text-sm text-[var(--text-tertiary)] max-w-2xl mx-auto">Depending on what your team is building, GRESIO adjusts the lifecycle phases automatically. The first two phases (Discovery, Planning) and the last four (Testing, Review, Launch, Delivered) are shared — the middle phases adapt to your project type.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-5 gap-3">
            {[
              { type: 'Software\nDevelopment', icon: '💻', phases: ['Discovery', 'Planning', 'Development', 'Testing', 'Review', 'Launch', 'Delivered'], color: 'bg-primary-600' },
              { type: 'Design\nCreative', icon: '🎨', phases: ['Discovery', 'Planning', 'Designing', 'Prototyping', 'Testing', 'Review', 'Launch', 'Delivered'], color: 'bg-violet-500' },
              { type: 'Business\nMarketing / Growth', icon: '📈', phases: ['Discovery', 'Planning', 'Business Growth', 'Validation', 'Testing', 'Review', 'Launch', 'Delivered'], color: 'bg-emerald-500' },
              { type: 'Content\nWriting', icon: '✍️', phases: ['Discovery', 'Planning', 'Content Creation', 'Editing', 'Testing', 'Review', 'Launch', 'Delivered'], color: 'bg-amber-500' },
              { type: 'Research\nAnalysis', icon: '🔬', phases: ['Discovery', 'Planning', 'Research', 'Analysis', 'Testing', 'Review', 'Launch', 'Delivered'], color: 'bg-rose-500' },
            ].map((pt, i) => (
              <div key={i} className="card-premium glow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{pt.icon}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] whitespace-pre-line leading-tight">{pt.type}</span>
                </div>
                <div className="space-y-1">
                  {pt.phases.map((p, j) => (
                    <div key={j} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${j < pt.phases.length - 2 ? 'bg-primary-400' : j < pt.phases.length ? 'bg-[var(--text-muted)]' : 'bg-[var(--text-muted)]'}`} />
                      <span className={`text-[10px] ${j < pt.phases.length - 2 ? 'text-[var(--text-secondary)] font-medium' : j < pt.phases.length ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-muted)]'}`}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center mt-6">All project types share the same auto-flow logic. The system advances phases automatically when conditions are met, with manual gates only for Launch, Delivered, and Report.</p>
        </div>

        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="glass-panel rounded-[var(--radius-xl)] p-8 md:p-10">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item, i) => (
                <details key={i} className="card-premium glow-card p-4 group">
                  <summary className="text-sm font-medium text-[var(--text-primary)] cursor-pointer list-none flex items-center justify-between">
                    {item.q}
                    <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2">▼</span>
                  </summary>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

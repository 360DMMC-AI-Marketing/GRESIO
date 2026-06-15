import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

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
    a: 'GRESIO integrates with GitHub (sync commits and PRs), Microsoft Teams (receive notifications), and Outlook (sync calendar and tasks). Azure AD/Microsoft 365 import is available on paid plans.',
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
    a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Enterprise plans include SAML SSO, on-premise deployment options, and SLA guarantees for data availability.',
  },
  {
    q: 'Can I track time spent on tasks?',
    a: 'Yes — GRESIO includes work log tracking. Team members can log hours against tasks and sprints. Reports show time distribution across projects, phases, and team members.',
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

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-surface-900 text-center mb-10">Frequently asked questions</h1>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="bg-white rounded-xl border border-surface-200 p-4 group">
                <summary className="text-sm font-medium text-surface-900 cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-surface-400 group-open:rotate-180 transition-transform shrink-0 ml-2">▼</span>
                </summary>
                <p className="text-xs text-surface-500 mt-2 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

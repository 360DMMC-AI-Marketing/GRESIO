import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

export default function Landing() {
  useEffect(() => {
    const onScroll = () => {
      // no-op, kept for scroll context
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative pt-36 pb-28 px-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/40 to-white" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-100/20 to-transparent" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-sm font-medium text-primary-700 mb-8 animate-fade-in">
            🚀 Now available for modern teams
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-surface-900 leading-tight mb-6 tracking-tight">
            The Internal OS for<br />Modern Teams
          </h1>
           <p className="text-xl md:text-2xl text-surface-500 max-w-3xl mx-auto mb-10 leading-relaxed">
              Projects, sprints, tasks, testing, calendar, capacity heatmap, and portfolio matrix —
              unified in one platform. From discovery to delivery, GRESIO keeps your team aligned.
           </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/pricing" className="px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg text-base">
              See Plans & Pricing
            </Link>
            <Link to="/register" className="px-8 py-3.5 border-2 border-surface-300 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors text-base">
              Explore for Free
            </Link>
          </div>
          <div className="mt-14 flex items-center justify-center gap-10 text-sm text-surface-400">
            <span className="flex items-center gap-2">✅ No credit card</span>
            <span className="flex items-center gap-2">⚡ 2-minute setup</span>
            <span className="flex items-center gap-2">🔒 Enterprise-grade</span>
          </div>
        </div>
      </section>

      {/* WHAT IS GRESIO */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">Overview</span>
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3 mb-6">What is GRESIO?</h2>
          <p className="text-lg text-surface-600 leading-relaxed max-w-3xl mx-auto">
             GRESIO is a complete internal operating system built for teams that need more than just task management. 
             It combines project lifecycle management, sprint planning, task tracking, test case management, 
             team capacity heatmap, portfolio matrix, calendar view, and role-based access — all in one place.
          </p>
          <p className="text-lg text-surface-600 leading-relaxed max-w-3xl mx-auto mt-4">
            Whether you build software, run marketing campaigns, design products, manage business operations, 
            or conduct research, GRESIO adapts to your workflow with tailored lifecycle phases for each project type.
          </p>
          <p className="text-lg text-surface-600 leading-relaxed max-w-3xl mx-auto mt-4">
            When projects are delivered, GRESIO generates professional audit-ready reports — 
            one for your internal team and one for your clients — both branded and exportable as PDF.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
            <Link to="/features" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-base">
              Explore all features <span className="text-lg">→</span>
            </Link>
            <Link to="/how-it-works" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-surface-300 text-surface-700 font-medium rounded-lg hover:bg-surface-50 transition-colors text-base">
              How it works <span className="text-lg">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-24 px-5 bg-surface-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">Who it's for</span>
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3 mb-4">Built for every role in your organization</h2>
            <p className="text-surface-500 max-w-2xl mx-auto">From executives to developers, GRESIO gives everyone the right view of the work.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Leadership', desc: 'Portfolio-level visibility, resource allocation, and delivery metrics to guide strategic decisions.', link: '/features' },
              { title: 'Project Managers', desc: 'Sprint planning, milestone tracking, workload balancing, and auto status flows that save hours every week.', link: '/how-it-works' },
              { title: 'Developers & Designers', desc: 'Kanban boards, task management, test case execution, and deep integrations with GitHub, Figma, and more.', link: '/features' },
              { title: 'Clients & Stakeholders', desc: 'Dedicated client view with progress reports, milestone summaries, and direct communication channels.', link: '/pricing' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-6 text-left hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-surface-900 mb-2">{item.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed mb-4">{item.desc}</p>
                <Link to={item.link} className="text-xs font-medium text-primary-600 hover:text-primary-700">Learn more →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METHODOLOGY SECTION */}
      <section id="methodology" className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">Flexible by design</span>
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3 mb-4">A methodology for every project type</h2>
            <p className="text-surface-500 max-w-2xl mx-auto">Not every project follows the same lifecycle. GRESIO adapts its phases to how your team actually delivers — whether that's software, design, business, content, or research.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { type: 'Software', phases: 'Plan → Code → Test → Deploy → Review', icon: '💻', color: 'border-l-primary-500' },
              { type: 'Design', phases: 'Brief → Ideate → Prototype → Review → Deliver', icon: '🎨', color: 'border-l-violet-500' },
              { type: 'Business', phases: 'Analyze → Strategize → Execute → Review → Optimize', icon: '📈', color: 'border-l-emerald-500' },
              { type: 'Content', phases: 'Outline → Draft → Edit → Approve → Publish', icon: '✍️', color: 'border-l-amber-500' },
              { type: 'Research', phases: 'Question → Gather → Analyze → Conclude → Report', icon: '🔬', color: 'border-l-rose-500' },
            ].map((m, i) => (
              <div key={i} className={`bg-white rounded-xl border border-surface-200 border-l-4 ${m.color} p-5 text-left hover:shadow-md transition-all`}>
                <span className="text-xl mb-2 block">{m.icon}</span>
                <h3 className="text-sm font-bold text-surface-900 mb-1.5">{m.type}</h3>
                <p className="text-[11px] text-surface-500 leading-relaxed">{m.phases}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
              See how the phases work in detail <span className="text-lg">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-5 bg-primary-600">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ['500+', 'Projects Managed'],
            ['10K+', 'Tasks Completed'],
            ['120+', 'Active Teams'],
            ['99.9%', 'Uptime SLA'],
          ].map(([val, label], i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white mb-1">{val}</p>
              <p className="text-sm text-primary-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">Trusted by teams</span>
          <h2 className="text-3xl font-bold text-surface-900 mt-3 mb-3">What our users say</h2>
          <p className="text-surface-500 max-w-xl mx-auto mb-12">From startups to enterprises, GRESIO helps teams ship faster and stay organized.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'GRESIO replaced Jira, Trello, and our QA tool. One platform for everything.', author: 'Ahmed R.', role: 'CTO, SaaS Startup' },
              { quote: 'The auto status flow is a game-changer. Projects advance without micromanagement.', author: 'Sara L.', role: 'Engineering Manager' },
              { quote: 'We onboarded 30 team members in minutes with the Azure AD import.', author: 'Mohammed K.', role: 'IT Director, 360DMMC' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-6 text-left hover:shadow-md transition-all">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-amber-400 text-xs">★</span>
                  ))}
                </div>
                <p className="text-sm text-surface-600 leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">{t.author[0]}</div>
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{t.author}</p>
                    <p className="text-xs text-surface-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-surface-400">
            <span>⭐ 4.9/5 from 50+ reviews</span>
            <span className="w-px h-4 bg-surface-200" />
            <span>🏆 Used by teams at 360DMMC</span>
          </div>
        </div>
      </section>

      {/* TEAM INTELLIGENCE */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">Team Intelligence</span>
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3 mb-4">See everything. Know where to act.</h2>
            <p className="text-surface-500 max-w-2xl mx-auto">
              GRESIO gives you real-time visibility across every team member, project, and sprint — so you never guess who's over capacity or where a blocker is hiding.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: '📊', title: 'Team Workload Heatmap', desc: '6-week capacity forecast per person. Green = available, amber = nearing limit, red = overbooked. Drag tasks to rebalance instantly.', color: 'border-t-primary-500' },
              { icon: '📌', title: 'Portfolio Matrix', desc: 'Visual grid of every project across health × progress dimensions. Spot stalled projects, resource bottlenecks, and delivery risks at a glance.', color: 'border-t-violet-500' },
              { icon: '⚡', title: 'Auto Status Flow', desc: 'Define rules like: when all tasks in a phase are done, auto-advance to the next. Let GRESIO manage the lifecycle while you manage the work.', color: 'border-t-emerald-500' },
              { icon: '🧩', title: 'Template Marketplace', desc: 'Pre-built project templates with phases, task skeletons, and role assignments. Save your best projects as templates and reuse across teams.', color: 'border-t-amber-500' },
            ].map((f, i) => (
              <div key={i} className={`bg-surface-50/50 rounded-xl border border-surface-200 border-t-4 ${f.color} p-6 text-left hover:shadow-lg hover:bg-white transition-all`}>
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="text-base font-bold text-surface-900 mb-2">{f.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            {[
              { icon: '👥', label: 'Role-Based Access', desc: 'Admin, PM, Team Lead, Dev, QA, Viewer — each with granular permissions.' },
              { icon: '🧪', label: 'Test Case Management', desc: 'Create test suites per feature. Auto-create bugs when tests fail. Track QA progress per sprint.' },
              { icon: '📅', label: 'Calendar View', desc: 'See all tasks, milestones, and deadlines on a unified calendar. Filter by team, project, or person.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 text-left hover:shadow-md transition-all flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-surface-900 mb-1">{f.label}</h4>
                  <p className="text-xs text-surface-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKDNA — COMPANY BRAIN */}
      <section className="py-24 px-5 bg-surface-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">The next evolution</span>
            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3 mb-4">🧬 WorkDNA — Your Company Brain</h2>
            <p className="text-surface-500 max-w-2xl mx-auto">
              Every project makes you smarter. WorkDNA captures every decision, surfaces patterns from past projects, and warns you before mistakes repeat. No other PM tool has a memory.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '🗄️', title: 'Monthly Project Archive', desc: 'Every project auto-archived each month with full technical snapshot: features, tech stack, risks, repos, documents, stats, and team — everything in one place.', color: 'border-t-primary-500' },
              { icon: '📝', title: 'Decision Journal', desc: 'Every decision, alternative considered, and rationale — logged and searchable. Never ask "why did we do this?" again.', color: 'border-t-green-500' },
              { icon: '🔄', title: 'Déjà Vu Search', desc: 'Search archived projects and past decisions by keyword. Before starting something new, find similar past work and learn from what happened.', color: 'border-t-amber-500' },
              { icon: '🔍', title: 'Pattern Detection', desc: 'Auto-detects overdue tasks, bug density, sprint cadence issues across all projects — rule-based, instant, no AI cost, no setup needed.', color: 'border-t-red-500' },
            ].map((f, i) => (
              <div key={i} className={`bg-white rounded-xl border border-surface-200 border-t-4 ${f.color} p-6 text-left hover:shadow-lg transition-all`}>
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="text-base font-bold text-surface-900 mb-2">{f.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/pricing#workdna" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-base">
              See WorkDNA Plans <span className="text-lg">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-12 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <h2 className="text-3xl font-bold text-white mb-3 relative">Ready to streamline your projects?</h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto relative">Join teams that use GRESIO to ship faster, stay organized, and never miss a deadline.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
            <Link to="/pricing" className="px-10 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 hover:scale-105 transition-all shadow-md hover:shadow-lg text-base">
              Choose Your Plan
            </Link>
            <Link to="/register" className="px-10 py-4 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-base">
              Start Free Trial
            </Link>
          </div>
          <p className="text-xs text-primary-300 mt-4 relative">No credit card required · 2-minute setup · Cancel anytime</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly', suffix: '/month' },
  { value: 'semiannual', label: '6 months', suffix: '/mo', badge: 'Save 20%' },
  { value: 'annual', label: 'Yearly', suffix: '/mo', badge: 'Save 40%' },
];

const PLANS = [
  {
    name: 'Starter', price: { monthly: 0, semiannual: 0, annual: 0 }, period: { monthly: 'forever', semiannual: 'forever', annual: 'forever' },
    features: ['Up to 10 users', '3 projects', 'Basic reporting', 'Email support'], cta: 'Get Started', highlight: false,
  },
  {
    name: 'Team', price: { monthly: 29, semiannual: 23, annual: 17 }, period: { monthly: '/month', semiannual: '/mo', annual: '/mo' },
    features: ['Up to 50 users', 'Unlimited projects', 'Advanced reporting', 'Priority support', 'Azure AD import', 'Team dashboard'],
    cta: 'Start Free Trial', highlight: true, popular: true,
  },
  {
    name: 'Enterprise', price: { monthly: 99, semiannual: 79, annual: 59 }, period: { monthly: '/month', semiannual: '/mo', annual: '/mo' },
    features: ['Unlimited users', 'Unlimited projects', 'Custom fields & workflows', 'Dedicated support', 'SAML SSO', 'On-premise option', 'SLA guarantee'],
    cta: 'Contact Sales', highlight: false,
  },
];

const PHASES = ['Discovery', 'Planning', 'Development', 'Testing', 'Review', 'Launch', 'Delivered'];

const FEATURES = [
  { icon: '⚡', title: 'Sprint Management', desc: 'Create, plan, and execute agile sprints with burndown charts and velocity tracking.' },
  { icon: '📋', title: 'Task Tracking', desc: 'Assign, track, and complete tasks with status workflow: To Do → In Progress → Done.' },
  { icon: '🧪', title: 'Test Cases', desc: 'Create and execute QA tests linked to features. Auto-create bugs from failed tests.' },
  { icon: '🤖', title: 'Auto Status Flow', desc: 'Smart phase transitions based on project data — no manual status updates needed.' },
  { icon: '👥', title: 'Team Roles', desc: 'Role-based access: Admin, PM, Team Lead, Developer, QA, Viewer — each with granular permissions.' },
  { icon: '📧', title: 'Email Notifications', desc: 'In-app + email alerts for task assignments, sprint starts, overdue items, and more.' },
];

const DEMO_PREVIEWS = [
  {
    title: 'Dashboard',
    desc: 'Project health, sprint progress, activity feed — at a glance.',
    render: () => (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-[10px] text-surface-400">
          {['Discovery', 'Planning', 'Development', 'Testing'].map((p, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? 'bg-primary-500' : 'bg-surface-200'}`} />
          ))}
          <span className="text-primary-600 font-semibold ml-1">72%</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Sprints', value: '8', color: 'text-primary-600' },
            { label: 'Active Sprint', value: 'Sprint 4', color: 'text-emerald-600' },
            { label: 'Completed', value: '64%', color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-surface-50 rounded-lg p-2">
              <p className="text-[9px] text-surface-400">{s.label}</p>
              <p className={`text-xs font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {['Backend API refactor', 'Dashboard redesign', 'User auth module'].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-surface-500">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
              <span className="flex-1 truncate">{t}</span>
              <span className="text-surface-300">{i === 0 ? 'In Progress' : i === 1 ? 'Review' : 'Done'}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Project Detail',
    desc: 'Lifecycle phases, team members, linked resources.',
    render: () => (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1">
          {['Discovery','Planning','Dev','Testing','Review'].map((p, i) => (
            <div key={i} className={`text-[8px] px-1.5 py-0.5 rounded ${i < 3 ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-400'}`}>{p}</div>
          ))}
          <div className="text-[8px] text-amber-600 ml-auto">🔒 Launch</div>
        </div>
        <div className="bg-surface-50 rounded-lg p-2 space-y-1">
          {['Phase: Development', 'Team: 6 members', 'Deadline: Jun 20'].map((info, i) => (
            <div key={i} className="flex items-center gap-2 text-[9px] text-surface-500">
              <div className="w-1 h-1 rounded-full bg-surface-300" />
              {info}
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['A', 'S', 'M', 'J'].map((init, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-primary-500 text-white text-[8px] font-bold flex items-center justify-center">{init}</div>
          ))}
          <div className="w-5 h-5 rounded-full bg-surface-200 text-[8px] font-medium text-surface-400 flex items-center justify-center">+2</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Tasks & Sprints',
    desc: 'Kanban board with sprint burndown and workload.',
    render: () => (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-surface-700">Sprint 4</span>
          <span className="text-[8px] text-surface-400">Jun 10 - Jun 24</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { title: 'To Do', count: 4, color: 'bg-surface-100' },
            { title: 'In Progress', count: 2, color: 'bg-blue-50' },
            { title: 'Done', count: 6, color: 'bg-green-50' },
          ].map((col, i) => (
            <div key={i} className={`${col.color} rounded-lg p-1.5 min-h-[70px]`}>
              <p className="text-[8px] font-medium text-surface-500 mb-1">{col.title} ({col.count})</p>
              {i === 0 && <div className="bg-white rounded border border-surface-200 p-1 mb-1"><p className="text-[7px] text-surface-600">Setup CI/CD</p></div>}
              {i === 0 && <div className="bg-white rounded border border-surface-200 p-1"><p className="text-[7px] text-surface-600">Write tests</p></div>}
              {i === 1 && <div className="bg-white rounded border border-blue-200 p-1"><p className="text-[7px] text-blue-700">API integration</p></div>}
              {i === 2 && <div className="bg-white rounded border border-green-200 p-1"><p className="text-[7px] text-green-700 line-through">Login page</p></div>}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Admin Panel',
    desc: 'Integrations, user sync, and Azure AD import.',
    render: () => (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          {[{ name: 'Microsoft 365', connected: true }, { name: 'GitHub', connected: true }, { name: 'ClickUp', connected: false }].map((int, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-surface-50 rounded-lg p-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${int.connected ? 'bg-green-500' : 'bg-surface-300'}`} />
              <span className="text-[9px] text-surface-600 flex-1">{int.name}</span>
              <span className={`text-[7px] ${int.connected ? 'text-green-600' : 'text-surface-400'}`}>{int.connected ? 'Live' : 'Off'}</span>
            </div>
          ))}
        </div>
        <div className="border border-surface-200 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-2 text-[9px] text-surface-500">
            <span className="font-medium text-surface-700">Import from Microsoft 365</span>
            <span className="ml-auto text-primary-600">Import Users</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-surface-400">
            <span>@</span>
            <span className="flex-1 border-b border-dotted border-surface-300 pb-0.5">yourcompany.com</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-surface-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Graph API connected · 24 users synced
        </div>
      </div>
    ),
  },
  {
    title: 'Analytics & Reports',
    desc: 'Track project velocity, team workload, and delivery trends.',
    render: () => (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Active Projects', value: '12', change: '+3', up: true },
            { label: 'Tasks Done', value: '847', change: '+12%', up: true },
            { label: 'Team Members', value: '34', change: '+5', up: true },
            { label: 'Avg Velocity', value: '24/sprint', change: '-2%', up: false },
          ].map((s, i) => (
            <div key={i} className="bg-surface-50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <p className="text-[8px] text-surface-400">{s.label}</p>
                <span className={`text-[8px] font-medium ${s.up ? 'text-green-600' : 'text-red-500'}`}>{s.change}</span>
              </div>
              <p className="text-sm font-bold text-surface-900">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-surface-50 rounded-lg p-2">
          <p className="text-[9px] font-medium text-surface-600 mb-1.5">Monthly Activity</p>
          <div className="flex items-end gap-1 h-8">
            {[40, 65, 80, 45, 90, 55, 70, 85, 60, 75, 95, 50].map((h, i) => (
              <div key={i} className="flex-1 bg-primary-500 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[7px] text-surface-400 mt-1">
            <span>Jan</span><span>Jun</span><span>Dec</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'User Management',
    desc: 'Manage roles, permissions, and team access controls.',
    render: () => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <input type="text" readOnly value="Search users..." className="w-28 px-2 py-1 text-[8px] border border-surface-200 rounded bg-surface-50 text-surface-400" />
            <div className="text-[8px] px-1.5 py-1 bg-surface-100 rounded text-surface-500">Role: All</div>
          </div>
          <div className="text-[8px] px-2 py-1 bg-primary-100 text-primary-700 rounded font-medium">+ Add User</div>
        </div>
        <div className="space-y-1">
          {[
            { name: 'Ahmed R.', role: 'Admin', status: 'active', email: 'ahmed@co.com' },
            { name: 'Sara L.', role: 'PM', status: 'active', email: 'sara@co.com' },
            { name: 'Mohammed K.', role: 'Developer', status: 'idle', email: 'mk@co.com' },
            { name: 'Fatima Z.', role: 'Team Lead', status: 'active', email: 'fatima@co.com' },
          ].map((u, i) => (
            <div key={i} className="flex items-center gap-2 bg-surface-50 rounded-lg p-1.5">
              <div className="w-5 h-5 rounded-full bg-primary-500 text-white text-[7px] font-bold flex items-center justify-center">{u.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-surface-700 truncate">{u.name}</p>
                <p className="text-[7px] text-surface-400 truncate">{u.email}</p>
              </div>
              <div className={`text-[7px] px-1 py-0.5 rounded ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{u.role}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState('semiannual');
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-surface-200' : 'bg-white/0'}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 grid grid-cols-3 items-center">
          <Link to="/" className="flex items-center gap-2.5 group justify-self-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:shadow-md transition-shadow">C</div>
            <span className="text-lg font-bold text-surface-900 tracking-tight">CIOS</span>
          </Link>
          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium text-surface-500">
            <button onClick={() => scrollTo('features')} className="hover:text-surface-900 transition-colors">Features</button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-surface-900 transition-colors">How It Works</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-surface-900 transition-colors">Pricing</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-surface-900 transition-colors">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-surface-900 transition-colors">Contact</button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Link to="/login" className="text-sm font-medium text-surface-600 hover:text-surface-900 px-4 py-2 rounded-lg hover:bg-surface-100 transition-colors">Sign In</Link>
            <button onClick={() => scrollTo('pricing')} className="text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white px-5 py-2 rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all shadow-sm hover:shadow-md">See Plans</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs font-medium text-primary-700 mb-6">
            🚀 Now available for modern teams
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight mb-4">
            The Internal OS for<br />Modern Teams
          </h1>
          <p className="text-lg md:text-xl text-surface-500 max-w-2xl mx-auto mb-8">
            Projects, sprints, tasks, and testing — unified in one platform. 
            From discovery to delivery, CIOS keeps your team aligned.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => scrollTo('pricing')} className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm">
              See Plans & Pricing
            </button>
            <Link to="/register" className="px-6 py-3 border border-surface-300 text-surface-700 font-medium rounded-lg hover:bg-surface-50 transition-colors text-sm">
              Explore for Free
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-surface-400">
            <span className="flex items-center gap-1.5">✅ No credit card</span>
            <span className="flex items-center gap-1.5">⚡ 2-minute setup</span>
            <span className="flex items-center gap-1.5">🔒 Enterprise-grade</span>
          </div>
        </div>
      </section>

      {/* DEMO PREVIEW */}
      <section id="demo" className="py-20 px-5 bg-surface-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">See CIOS in action</h2>
            <p className="text-surface-500 max-w-xl mx-auto">A sneak peek at what you'll get — real screens from the platform.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_PREVIEWS.map((preview, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="bg-white border-b border-surface-100 px-3 py-2 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="ml-2 text-[10px] font-medium text-surface-400">{preview.title}</span>
                </div>
                <div className="p-3">
                  {preview.render()}
                </div>
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-surface-500">{preview.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-surface-500 text-sm mb-4">This is just the tip of the iceberg. Sprint reports, Kanban boards, time tracking, client portals, and more — all inside CIOS, ready for you to explore.</p>
            <button onClick={() => scrollTo('pricing')} className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm">
              See Plans & Pricing <span className="text-lg">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">Everything you need to ship</h2>
            <p className="text-surface-500 max-w-xl mx-auto">One platform covering the full project lifecycle — no more juggling between tools.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-6 hover:shadow-md hover:border-surface-300 transition-all">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="font-semibold text-surface-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-surface-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-surface-900 mb-3">How It Works</h2>
          <p className="text-surface-500 max-w-xl mx-auto mb-12">Projects move through 7 phases automatically. You focus on the work, we handle the flow.</p>
          <div className="relative">
            <div className="hidden md:block absolute top-5 left-0 right-0 h-0.5 bg-surface-200" />
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3 md:gap-0">
              {PHASES.map((phase, i) => (
                <div key={i} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 mb-2 ${i < 4 ? 'bg-primary-600 text-white border-primary-600' : i === 4 ? 'bg-amber-500 text-white border-amber-500' : i === 5 ? 'bg-surface-800 text-white border-surface-800' : 'bg-surface-100 text-surface-400 border-surface-200'}`}>
                    {i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i < 4 ? 'text-primary-700' : i === 4 ? 'text-amber-600' : i === 5 ? 'text-surface-700' : 'text-surface-400'} text-center leading-tight`}>
                    {phase}
                  </span>
                  <span className={`text-[9px] mt-0.5 ${i < 4 ? 'text-primary-400' : i === 4 ? 'text-amber-400' : i === 5 ? 'text-surface-400' : 'text-surface-300'}`}>
                    {i < 4 ? 'Auto' : i < 6 ? 'Manual' : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-surface-400 mt-8">🔒 Phases 6 (Launch) and 7 (Delivered) require manual approval by Admin, PM, or Team Lead.</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-5 bg-primary-600">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ['100+', 'Projects Managed'],
            ['1,000+', 'Tasks Completed'],
            ['50+', 'Active Teams'],
            ['99.9%', 'Uptime'],
          ].map(([val, label], i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white mb-1">{val}</p>
              <p className="text-sm text-primary-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-5 bg-surface-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-surface-900 mb-3">Trusted by growing teams</h2>
          <p className="text-surface-500 max-w-xl mx-auto mb-10">From startups to enterprises, CIOS helps teams ship faster.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'CIOS replaced Jira, Trello, and our QA tool. One platform for everything.', author: 'Ahmed R.', role: 'CTO, SaaS Startup' },
              { quote: 'The auto status flow is a game-changer. Projects advance without micromanagement.', author: 'Sara L.', role: 'Engineering Manager' },
              { quote: 'We onboarded 30 team members in minutes with the Azure AD import.', author: 'Mohammed K.', role: 'IT Director, 360DMMC' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 text-left">
                <p className="text-xs text-surface-600 leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <p className="text-xs font-semibold text-surface-900">{t.author}</p>
                  <p className="text-[10px] text-surface-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-surface-900 mb-3">Simple, transparent pricing</h2>
          <p className="text-surface-500 max-w-xl mx-auto mb-8">Start free, scale as you grow. Save up to 40% with longer plans.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-surface-100 rounded-xl p-1 mb-10">
            {BILLING_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setBilling(opt.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${billing === opt.value ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                {opt.label}
                {opt.badge && <span className="ml-1.5 text-[10px] font-bold text-green-600">{opt.badge}</span>}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => {
              const price = plan.price[billing];
              const period = plan.period[billing];
              const monthlyEquiv = billing === 'semiannual' ? Math.round(price) : billing === 'annual' ? Math.round(price) : price;
              const totalDisplay = billing === 'semiannual' ? `$${price * 6}` : billing === 'annual' ? `$${price * 12}` : null;
              return (
              <div key={i} className={`relative rounded-xl border p-6 text-left flex flex-col ${plan.popular ? 'bg-primary-600 border-primary-600 text-white scale-105 shadow-lg ring-2 ring-primary-400' : 'bg-white border-surface-200'}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-0.5 rounded-full">Most Popular</div>}
                <div>
                  <h3 className={`text-sm font-semibold mb-1 ${plan.popular ? 'text-primary-100' : 'text-surface-500'}`}>{plan.name}</h3>
                  <div className="mb-1">
                    <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'text-surface-900'}`}>${price}</span>
                    <span className={`text-sm ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>{period}</span>
                  </div>
                  {billing !== 'monthly' && price > 0 && (
                    <p className={`text-[11px] ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>
                      {billing === 'semiannual' ? `$${price}/mo — billed $${price * 6} every 6 months` : `$${price}/mo — billed $${price * 12} yearly`}
                      <br />
                      <span className="font-semibold text-green-500">Save {billing === 'semiannual' ? '20' : '40'}% vs monthly</span>
                    </p>
                  )}
                  {price === 0 && <p className={`text-[11px] mt-1 ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>Free forever</p>}
                </div>
                <ul className="space-y-2 my-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`text-xs flex items-center gap-2 ${plan.popular ? 'text-primary-100' : 'text-surface-500'}`}>
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {plan.cta === 'Contact Sales' ? (
                  <button onClick={() => scrollTo('contact')}
                    className="w-full block text-center text-sm font-medium py-2.5 rounded-lg transition-colors bg-surface-50 text-surface-700 hover:bg-surface-100 border border-surface-200">
                    Contact Sales
                  </button>
                ) : (
                  <Link to={`/register${plan.price.monthly === 0 ? '' : '?plan=' + plan.name.toLowerCase()}`}
                    className={`block text-center text-sm font-medium py-2.5 rounded-lg transition-colors ${plan.popular ? 'bg-white text-primary-700 hover:bg-primary-50' : 'bg-surface-50 text-surface-700 hover:bg-surface-100 border border-surface-200'}`}>
                    {plan.cta}
                  </Link>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-5 bg-surface-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-surface-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {[
              { q: 'Is there a free tier?', a: 'Yes! Our Starter plan is free forever for up to 10 users and 3 projects.' },
              { q: 'Can I import users from Azure AD?', a: 'Yes — admins can import all company users from Microsoft 365 with one click in the Admin panel.' },
              { q: 'How does the auto status flow work?', a: 'CIOS automatically advances projects through phases when conditions are met (e.g., all tasks done moves to Testing).' },
              { q: 'Can I customize user roles?', a: 'Roles are pre-defined (Admin, PM, Team Lead, Developer, QA, Viewer) with granular permissions. Only admins can change roles.' },
              { q: 'Is my data secure?', a: 'Yes. All data is encrypted in transit and at rest. Enterprise plans include SSO and on-premise options.' },
            ].map((item, i) => (
              <details key={i} className="bg-white rounded-xl border border-surface-200 p-4 group">
                <summary className="text-sm font-medium text-surface-900 cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-surface-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-xs text-surface-500 mt-2 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-surface-900 mb-3">Get in Touch</h2>
            <p className="text-surface-500 max-w-xl mx-auto">Have a question, need a custom plan, or want to schedule a meeting? We're here to help.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 bg-surface-50 rounded-2xl p-8 border border-surface-200">
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Full Name</label>
                    <input type="text" placeholder="John Doe" className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
                    <input type="email" placeholder="john@company.com" className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Subject</label>
                  <input type="text" placeholder="How can we help you?" className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Message</label>
                  <textarea rows={4} placeholder="Tell us more about your project, timeline, and requirements..." className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300 resize-none"></textarea>
                </div>
                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all shadow-sm hover:shadow-md">Send Message</button>
              </form>
            </div>
            <div className="md:col-span-2 space-y-5">
              <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 text-lg mb-3">📅</div>
                <h3 className="text-sm font-semibold text-surface-900 mb-1">Schedule a Meeting</h3>
                <p className="text-xs text-surface-500 mb-4">Book a 30-minute call with our team to discuss your needs and see a live demo.</p>
                <a href="https://360dmmc.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                  Book a Demo <span className="text-sm">→</span>
                </a>
              </div>
              <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 text-lg mb-3">✉</div>
                <h3 className="text-sm font-semibold text-surface-900 mb-1">Email Us Directly</h3>
                <p className="text-xs text-surface-500 mb-1">Prefer email? Reach out anytime.</p>
                <a href="mailto:Consult@360DMMC.com" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">Consult@360DMMC.com</a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to streamline your projects?</h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto">Join teams that use CIOS to ship faster, stay organized, and never miss a deadline.</p>
          <button onClick={() => scrollTo('pricing')} className="inline-block px-8 py-3 bg-white text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors shadow-sm text-sm">
            Choose Your Plan
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-surface-200 bg-white py-10 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <span className="text-lg font-bold text-surface-900 tracking-tight">CIOS</span>
              <p className="text-xs text-surface-400 mt-2 leading-relaxed">The internal operating system for modern software teams.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Demo', 'Docs'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Status', 'Privacy', 'Terms'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-xs font-semibold text-surface-900 mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}><button className="text-xs text-surface-400 hover:text-surface-900 transition-colors">{link}</button></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-surface-400">&copy; {new Date().getFullYear()} CIOS. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-surface-400">
              <a href="mailto:Consult@360DMMC.com" className="hover:text-primary-600 transition-colors">Consult@360DMMC.com</a>
              <span className="w-px h-3 bg-surface-200"></span>
              <a href="https://360dmmc.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">Powered by 360 DMMC</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

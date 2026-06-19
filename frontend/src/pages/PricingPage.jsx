import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small teams getting started',
    price: { monthly: 0, semiannual: 0, annual: 0 },
    badge: 'Free forever',
    cta: 'Get Started',
    color: 'from-surface-50 to-surface-100',
    border: 'border-surface-200',
    accent: 'text-surface-500',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" className="text-surface-300" />
        <path d="M12 16l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400" />
      </svg>
    ),
    capabilities: [
      { label: 'Team members', value: 'Up to 10', icon: '👥' },
      { label: 'Active projects', value: '3', icon: '📁' },
      { label: 'Sprint management', value: true, icon: '⚡' },
      { label: 'Kanban boards', value: true, icon: '📋' },
      { label: 'Test cases', value: true, icon: '🧪' },
      { label: 'GitHub integration', value: true, icon: '🔗' },
      { label: 'Work logs', value: true, icon: '⏱️' },
      { label: 'Auto status flow', value: false, icon: '🔄' },
      { label: 'WorkDNA', value: false, icon: '🧬' },
      { label: 'Advanced reports', value: false, icon: '📊' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For growing teams that ship fast',
    price: { monthly: 29, semiannual: 23, annual: 17 },
    badge: 'Most popular',
    cta: 'Start Free Trial',
    color: 'from-primary-600 to-primary-800',
    border: 'border-primary-600',
    accent: 'text-white',
    popular: true,
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="8" stroke="currentColor" strokeWidth="1.5" className="text-primary-200" />
        <path d="M11 21v-2a4 4 0 014-4h2a4 4 0 014 4v2M16 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-white" />
      </svg>
    ),
    capabilities: [
      { label: 'Team members', value: 'Up to 50', icon: '👥' },
      { label: 'Active projects', value: 'Unlimited', icon: '📁' },
      { label: 'Sprint management', value: true, icon: '⚡' },
      { label: 'Kanban boards', value: true, icon: '📋' },
      { label: 'Test cases', value: true, icon: '🧪' },
      { label: 'Auto status flow', value: true, icon: '🔄' },
      { label: 'WorkDNA archive + journal', value: true, icon: '🧬' },
      { label: 'Team workload heatmap', value: true, icon: '📊' },
      { label: 'Admin PDF reports', value: true, icon: '📄' },
      { label: 'Client PDF reports', value: true, icon: '📑' },
      { label: 'Advanced analytics', value: true, icon: '📈' },
      { label: 'MS Teams + Outlook', value: true, icon: '🔗' },
      { label: 'Priority support', value: true, icon: '🎯' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For organizations with advanced needs',
    price: { monthly: 99, semiannual: 79, annual: 59 },
    badge: 'Full power',
    cta: 'Contact Sales',
    color: 'from-amber-500 to-amber-700',
    border: 'border-amber-500',
    accent: 'text-white',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M4 28V8l8-4 8 4v20H4z" stroke="currentColor" strokeWidth="1.5" className="text-amber-200" />
        <path d="M12 28v-8h8v8M12 12h8M12 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-white" />
      </svg>
    ),
    capabilities: [
      { label: 'Team members', value: 'Unlimited', icon: '👥' },
      { label: 'Active projects', value: 'Unlimited', icon: '📁' },
      { label: 'Everything in Team', value: true, icon: '✅' },
      { label: 'Custom fields & workflows', value: true, icon: '⚙️' },
      { label: 'Dedicated account manager', value: true, icon: '👤' },
      { label: 'SAML SSO', value: true, icon: '🔐' },
      { label: 'On-premise option', value: true, icon: '🖥️' },
      { label: 'White-label', value: 'Add-on', icon: '🏷️' },
      { label: 'API access', value: 'Add-on', icon: '🔌' },
      { label: 'SLA guarantee', value: true, icon: '📋' },
    ],
  },
];

const BILLING = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semiannual', label: '6 months', save: '20%' },
  { value: 'annual', label: 'Yearly', save: '40%' },
];

const FEATURES = [
  {
    group: 'Team & Access',
    items: [
      { label: 'Team members', starter: '10', team: '50', enterprise: '∞' },
      { label: 'Projects', starter: '3', team: '∞', enterprise: '∞' },
      { label: 'Roles (Admin, PM, Lead, Dev, QA, Viewer)', starter: true, team: true, enterprise: true },
      { label: 'Role-based permissions', starter: true, team: true, enterprise: true },
      { label: 'Azure AD / M365 import', starter: false, team: true, enterprise: true },
    ],
  },
  {
    group: 'Project Management',
    items: [
      { label: '8-step lifecycle (5 project types)', starter: true, team: true, enterprise: true },
      { label: 'Sprint management + burndown', starter: true, team: true, enterprise: true },
      { label: 'Kanban task board', starter: true, team: true, enterprise: true },
      { label: 'Calendar view', starter: true, team: true, enterprise: true },
      { label: 'Work log tracking', starter: true, team: true, enterprise: true },
      { label: 'Auto status flow', starter: false, team: true, enterprise: true },
      { label: 'Team workload heatmap', starter: false, team: true, enterprise: true },
    ],
  },
  {
    group: 'Testing & Quality',
    items: [
      { label: 'Test case management', starter: true, team: true, enterprise: true },
      { label: 'Auto-create bugs from failures', starter: true, team: true, enterprise: true },
    ],
  },
  {
    group: 'Reporting & Analytics',
    items: [
      { label: 'Dashboard analytics', starter: true, team: true, enterprise: true },
      { label: 'Advanced analytics', starter: false, team: true, enterprise: true },
      { label: 'Admin PDF reports', starter: false, team: true, enterprise: true },
      { label: 'Client PDF reports', starter: false, team: true, enterprise: true },
      { label: 'Custom reports', starter: false, team: false, enterprise: true },
    ],
  },
  {
    group: 'WorkDNA — Company Brain',
    items: [
      { label: 'Monthly project archive', starter: false, team: true, enterprise: true },
      { label: 'Decision journal', starter: false, team: true, enterprise: true },
      { label: 'Deja vu search', starter: false, team: true, enterprise: true },
      { label: 'Pattern detection', starter: false, team: true, enterprise: true },
    ],
  },
  {
    group: 'Integrations & Support',
    items: [
      { label: 'GitHub integration', starter: true, team: true, enterprise: true },
      { label: 'MS Teams + Outlook', starter: true, team: true, enterprise: true },
      { label: 'Email + community support', starter: true, team: false, enterprise: false },
      { label: 'Priority support', starter: false, team: true, enterprise: false },
      { label: 'Dedicated account manager', starter: false, team: false, enterprise: true },
      { label: 'SAML SSO', starter: false, team: false, enterprise: true },
      { label: 'On-premise deployment', starter: false, team: false, enterprise: true },
      { label: 'White-label / API add-ons', starter: false, team: false, enterprise: 'Add-on' },
    ],
  },
];

function Capability({ cap, planId }) {
  const isStarter = planId === 'starter';
  const textCls = isStarter ? 'text-surface-600' : 'text-white/90';
  if (cap.value === true) return <span className={`${textCls}`}>✓</span>;
  if (cap.value === false) return <span className={`${isStarter ? 'text-surface-300' : 'text-white/30'}`}>—</span>;
  return <span className={`font-semibold ${isStarter ? 'text-surface-900' : 'text-white'}`}>{cap.value}</span>;
}

const PROJECT_TYPES = [
  { id: 'software', label: '💻 Software', desc: 'Dev, code, deploy' },
  { id: 'design', label: '🎨 Design', desc: 'UX, brand, creative' },
  { id: 'business', label: '📈 Business', desc: 'Ops, strategy' },
  { id: 'content', label: '✍️ Content', desc: 'Writing, media' },
  { id: 'research', label: '🔬 Research', desc: 'Analysis, data' },
];

const NEEDS = [
  { id: 'tasks', label: '📋 Task & sprint mgmt', plan: 'starter' },
  { id: 'testing', label: '🧪 QA testing', plan: 'starter' },
  { id: 'reports', label: '📑 PDF reports', plan: 'team' },
  { id: 'dna', label: '🧬 WorkDNA archive', plan: 'team' },
  { id: 'capacity', label: '📊 Capacity planning', plan: 'team' },
  { id: 'sso', label: '🔐 SSO & enterprise', plan: 'enterprise' },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('semiannual');
  const [activeGroup, setActiveGroup] = useState(0);
  const [teamSize, setTeamSize] = useState(5);
  const [projectTypes, setProjectTypes] = useState([]);
  const [keyNeeds, setKeyNeeds] = useState([]);

  const toggleArray = (arr, item) => arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const recommended = (() => {
    const hasEnterpriseNeed = keyNeeds.some(n => NEEDS.find(nd => nd.id === n)?.plan === 'enterprise');
    const hasTeamNeed = keyNeeds.some(n => NEEDS.find(nd => nd.id === n)?.plan === 'team');
    if (teamSize > 50 || hasEnterpriseNeed) return { id: 'enterprise', label: 'Enterprise', emoji: '🏢', reason: hasEnterpriseNeed ? 'Your security & compliance needs' : 'Your team size requires unlimited seats' };
    if (teamSize >= 5 || hasTeamNeed || projectTypes.length >= 3) return { id: 'team', label: 'Team', emoji: '🚀', reason: hasTeamNeed ? `You need ${keyNeeds.filter(n => NEEDS.find(nd => nd.id === n)?.plan === 'team').map(n => NEEDS.find(nd => nd.id === n)?.label.split(' ').slice(1).join(' ')).join(', ')}` : 'Your team is ready to scale' };
    return { id: 'starter', label: 'Starter', emoji: '🌱', reason: 'Perfect for small teams getting started' };
  })();

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* HERO */}
      <section className="pt-36 pb-14 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#f0f4ff_0%,_transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-xs font-semibold text-primary-700 mb-6">
            🚀 Save up to 40% with annual billing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-surface-900 tracking-tight mb-3">
            One platform,<br />three ways to grow
          </h1>
          <p className="text-lg text-surface-500 max-w-2xl mx-auto">
            Start with everything you need. Scale with more power. Upgrade when you outgrow.
          </p>

          {/* Recommendation Quiz */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-white border-2 border-primary-100 rounded-2xl shadow-lg shadow-primary-100/30 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center gap-3">
                <span className="text-xl">🧭</span>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Not sure which plan?</p>
                  <p className="text-primary-200 text-xs">Answer a few quick questions — we'll recommend the right fit.</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Q1: Team size */}
                <div>
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">👥 How big is your team?</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                      className="w-10 h-10 rounded-xl border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-100 hover:border-surface-300 transition-all text-lg font-bold cursor-pointer">−</button>
                    <div className="flex-1 relative">
                      <input type="range" min="1" max="200" value={teamSize}
                        onChange={e => setTeamSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-surface-200 rounded-full appearance-none cursor-pointer accent-primary-600" />
                      <div className="flex justify-between text-[10px] text-surface-400 mt-1 px-0.5">
                        <span>1</span><span>50</span><span>100</span><span>200</span>
                      </div>
                    </div>
                    <div className="w-16 h-10 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center text-sm font-bold text-primary-700">
                      {teamSize}
                    </div>
                    <button onClick={() => setTeamSize(Math.min(200, teamSize + 1))}
                      className="w-10 h-10 rounded-xl border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-100 hover:border-surface-300 transition-all text-lg font-bold cursor-pointer">+</button>
                  </div>
                </div>

                {/* Q2: Project types */}
                <div>
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">📋 What do you build? <span className="text-surface-300 font-normal normal-case">(tap all that apply)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_TYPES.map(pt => (
                      <button key={pt.id} onClick={() => setProjectTypes(toggleArray(projectTypes, pt.id))}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          projectTypes.includes(pt.id)
                            ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                            : 'bg-white border-surface-200 text-surface-500 hover:border-surface-300 hover:text-surface-700'
                        }`}>
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3: Key needs */}
                <div>
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">🎯 What matters most to you? <span className="text-surface-300 font-normal normal-case">(tap all that apply)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {NEEDS.map(nd => (
                      <button key={nd.id} onClick={() => setKeyNeeds(toggleArray(keyNeeds, nd.id))}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          keyNeeds.includes(nd.id)
                            ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                            : 'bg-white border-surface-200 text-surface-500 hover:border-surface-300 hover:text-surface-700'
                        }`}>
                        {nd.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Result */}
                <div className={`rounded-xl border-2 p-4 flex items-center gap-4 transition-all ${
                  recommended.id === 'starter'
                    ? 'border-surface-200 bg-surface-50'
                    : recommended.id === 'team'
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-amber-200 bg-amber-50'
                }`}>
                  <span className="text-3xl">{recommended.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-surface-900">
                      We recommend <span className={`${
                        recommended.id === 'team' ? 'text-primary-600' : recommended.id === 'enterprise' ? 'text-amber-600' : 'text-surface-600'
                      }`}>{recommended.label}</span>
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">{recommended.reason}</p>
                  </div>
                  <a href={`#plan-${recommended.id}`}
                    className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                      recommended.id === 'team'
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : recommended.id === 'enterprise'
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-surface-800 text-white hover:bg-surface-900'
                    }`}>
                    View {recommended.label} →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Billing toggle */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center bg-surface-100 rounded-xl p-1 gap-0.5">
              {BILLING.map(b => (
                <button key={b.value} onClick={() => setBilling(b.value)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer border-none ${
                    billing === b.value ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                  }`}>
                  {b.label}
                  {b.save && billing === b.value && (
                    <span className="ml-1 text-[10px] font-bold text-green-600">−{b.save}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PLAN CARDS — JOURNEY LAYOUT */}
      <section className="px-5 pb-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-0 md:gap-4 items-stretch">
          {PLANS.map((plan, i) => {
            const price = plan.price[billing];
            const monthlyEquiv = billing === 'semiannual' ? price : billing === 'annual' ? price : price;
            const periodLabel = billing === 'monthly' ? '/month' : billing === 'semiannual' ? '/mo billed semi' : '/mo billed yearly';

            return (
              <div key={plan.id} className={`relative flex flex-col ${
                i === 0 ? '' : i === 1 ? '-mt-4 md:mt-0' : 'mt-4 md:mt-0'
              }`}>
                {/* Connector line */}
                {i > 0 && (
                  <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 z-10">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="#2347e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                <div id={`plan-${plan.id}`} className={`relative rounded-2xl border-2 p-6 flex flex-col h-full transition-all duration-300 ${
                  plan.popular
                    ? 'bg-primary-600 border-primary-600 shadow-xl shadow-primary-200 scale-[1.02] z-20'
                    : 'bg-white border-surface-200 hover:border-surface-300 shadow-sm hover:shadow-md'
                }`}>
                  {/* Badge */}
                  <div className={`absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    plan.popular
                      ? 'bg-amber-400 text-amber-900'
                      : 'bg-surface-100 text-surface-500'
                  }`}>
                    {plan.badge}
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4 mt-1">
                    <div className={plan.popular ? 'text-white' : 'text-primary-600'}>
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${plan.popular ? 'text-white' : 'text-surface-900'}`}>{plan.name}</h3>
                      <p className={`text-xs ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className={`text-4xl font-black tracking-tight ${plan.popular ? 'text-white' : 'text-surface-900'}`}>
                      ${price}
                    </span>
                    <span className={`text-sm ml-1 ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>
                      {price === 0 ? 'forever' : periodLabel}
                    </span>
                    {billing !== 'monthly' && price > 0 && (
                      <p className={`text-[11px] mt-0.5 ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>
                        ${monthlyEquiv}/mo — ${price * (billing === 'semiannual' ? 6 : 12)} {billing === 'semiannual' ? 'every 6 months' : 'yearly'}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  {plan.cta === 'Contact Sales' ? (
                    <Link to="/contact"
                      className={`block text-center text-sm font-semibold py-2.5 rounded-xl transition-all mb-5 ${
                        plan.popular
                          ? 'bg-white text-primary-700 hover:bg-primary-50'
                          : 'bg-surface-900 text-white hover:bg-surface-800'
                      }`}>
                      Contact Sales
                    </Link>
                  ) : (
                    <Link to={`/register${plan.price.monthly === 0 ? '' : '?plan=' + plan.id}`}
                      className={`block text-center text-sm font-semibold py-2.5 rounded-xl transition-all mb-5 ${
                        plan.popular
                          ? 'bg-white text-primary-700 hover:bg-primary-50'
                          : 'bg-surface-900 text-white hover:bg-surface-800'
                      }`}>
                      {plan.cta}
                    </Link>
                  )}

                  {/* Capabilities grid */}
                  <div className="space-y-1.5 flex-1">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>
                      What's included
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {plan.capabilities.map((cap, ci) => (
                        <div key={ci} className="flex items-center gap-2 text-xs">
                          <span className="shrink-0 text-[10px]">{cap.icon}</span>
                          <span className={`truncate ${plan.popular ? 'text-white/80' : 'text-surface-500'}`}>{cap.label}</span>
                          <span className="ml-auto shrink-0">
                            <Capability cap={cap} planId={plan.id} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURE BROWSER — Accordion */}
      <section className="py-16 px-5 bg-surface-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Everything compared</h2>
            <p className="text-sm text-surface-400">Click a category to see what each plan includes</p>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
            {FEATURES.map((section, si) => (
              <div key={si} className="border-b border-surface-100 last:border-b-0">
                <button onClick={() => setActiveGroup(activeGroup === si ? -1 : si)}
                  className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-surface-50 transition-colors cursor-pointer border-none">
                  <span className="text-sm font-bold text-surface-700">{section.group}</span>
                  <svg className={`w-4 h-4 text-surface-400 transition-transform ${activeGroup === si ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {activeGroup === si && (
                  <div className="px-6 pb-4">
                    {section.items.map((item, ri) => (
                      <div key={ri} className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-b-0">
                        <span className="flex-1 text-xs text-surface-600">{item.label}</span>
                        <span className={`w-20 text-center text-xs font-medium ${
                          item.starter === true ? 'text-green-600' : item.starter === false ? 'text-surface-300' : 'text-surface-700'
                        }`}>
                          {item.starter === true ? '✓' : item.starter === false ? '—' : item.starter}
                        </span>
                        <span className={`w-20 text-center text-xs font-medium bg-primary-50 py-1 rounded ${
                          item.team === true ? 'text-primary-700' : item.team === false ? 'text-surface-300' : 'text-surface-700'
                        }`}>
                          {item.team === true ? '✓' : item.team === false ? '—' : item.team}
                        </span>
                        <span className={`w-20 text-center text-xs font-medium ${
                          item.enterprise === true ? 'text-amber-600' : item.enterprise === false ? 'text-surface-300' : 'text-surface-700'
                        }`}>
                          {item.enterprise === true ? '✓' : item.enterprise === false ? '—' : item.enterprise}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-12 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <h2 className="text-3xl font-bold text-white mb-3 relative">Ready to build something great?</h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto relative">No credit card. No setup cost. Just you and a platform that works the way you do.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
            <Link to="/register"
              className="px-10 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 hover:scale-105 transition-all shadow-md text-base">
              Start Free — No CC Required
            </Link>
            <Link to="/contact"
              className="px-10 py-4 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-base">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

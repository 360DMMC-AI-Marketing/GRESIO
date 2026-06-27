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
    icon: '🚀',
    savings: '',
    capabilities: [
      { label: 'Up to 10 members', included: true },
      { label: '3 active projects', included: true },
      { label: 'Sprint management', included: true },
      { label: 'Kanban boards', included: true },
      { label: 'GitHub integration', included: true },
      { label: 'Test case management', included: true },
      { label: 'Work logs', included: true },
      { label: 'Auto status flow', included: false },
      { label: 'WorkDNA archives', included: false },
      { label: 'Advanced reports', included: false },
      { label: 'Knowledge Base', included: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For growing teams that ship fast',
    price: { monthly: 29, semiannual: 23, annual: 17 },
    badge: 'Best value',
    cta: 'Start Free Trial',
    icon: '⚡',
    savings: 'Save 40%',
    capabilities: [
      { label: 'Up to 50 members', included: true },
      { label: 'Unlimited projects', included: true },
      { label: 'Sprint management', included: true },
      { label: 'Kanban boards', included: true },
      { label: 'GitHub integration', included: true },
      { label: 'Auto status flow', included: true },
      { label: 'WorkDNA archives', included: true },
      { label: 'Admin & client PDF reports', included: true },
      { label: 'Advanced analytics', included: true },
      { label: 'MS Teams + Outlook', included: true },
      { label: 'Priority support', included: true },
      { label: 'Knowledge Base', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For organizations with advanced needs',
    price: { monthly: 99, semiannual: 79, annual: 59 },
    badge: 'Most popular',
    cta: 'Contact Sales',
    icon: '🏢',
    savings: 'Save 40%',
    capabilities: [
      { label: 'Unlimited members', included: true },
      { label: 'Unlimited projects', included: true },
      { label: 'Everything in Team', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'AI Voice + Chat', included: true },
      { label: 'API access', included: true },
      { label: 'Knowledge Base', included: true },
    ],
  },
];

const BILLING = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semiannual', label: '6 Months' },
  { value: 'annual', label: 'Annual', save: '−40%' },
];

const FEATURES = [
  {
    group: 'Team & Access',
    items: [
      { label: 'Members', starter: '10', team: '50', enterprise: '∞' },
      { label: 'Active projects', starter: '3', team: '∞', enterprise: '∞' },
      { label: 'Role-based permissions', starter: true, team: true, enterprise: true },
      { label: 'Azure AD / M365 import', starter: false, team: true, enterprise: true },
    ],
  },
  {
    group: 'Project Management',
    items: [
      { label: '7-step lifecycle', starter: true, team: true, enterprise: true },
      { label: 'Sprint management', starter: true, team: true, enterprise: true },
      { label: 'Kanban task board', starter: true, team: true, enterprise: true },
      { label: 'Calendar view', starter: true, team: true, enterprise: true },
      { label: 'Work log tracking', starter: true, team: true, enterprise: true },
      { label: 'Auto status flow', starter: false, team: true, enterprise: true },
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
      { label: 'API access', starter: false, team: false, enterprise: true },
    ],
  },
  {
    group: 'AI & Intelligence',
    items: [
      { label: 'AI Voice Assistant', starter: false, team: false, enterprise: true },
      { label: 'AI Chatbot', starter: false, team: false, enterprise: true },
    ],
  },
  {
    group: 'Knowledge Base',
    items: [
      { label: 'Markdown wiki articles', starter: false, team: true, enterprise: true },
      { label: 'File attachments', starter: false, team: true, enterprise: true },
      { label: 'Template marketplace', starter: false, team: true, enterprise: true },
    ],
  },
];

const PROJECT_TYPES = [
  { id: 'software', label: 'Software' },
  { id: 'design', label: 'Design' },
  { id: 'business', label: 'Business' },
  { id: 'content', label: 'Content' },
  { id: 'research', label: 'Research' },
];

const NEEDS = [
  { id: 'tasks', label: 'Task & sprint mgmt', plan: 'starter' },
  { id: 'testing', label: 'QA testing', plan: 'starter' },
  { id: 'reports', label: 'PDF reports', plan: 'team' },
  { id: 'dna', label: 'WorkDNA archive', plan: 'team' },
  { id: 'capacity', label: 'Capacity planning', plan: 'team' },
  { id: 'ai', label: 'AI voice & chat', plan: 'enterprise' },
  { id: 'kb', label: 'Knowledge Base', plan: 'team' },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('annual');
  const [activeGroup, setActiveGroup] = useState(0);
  const [teamSize, setTeamSize] = useState(5);
  const [projectTypes, setProjectTypes] = useState([]);
  const [keyNeeds, setKeyNeeds] = useState([]);

  const toggleArray = (arr, item) => arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const recommended = (() => {
    const hasEnterpriseNeed = keyNeeds.some(n => NEEDS.find(nd => nd.id === n)?.plan === 'enterprise');
    const hasTeamNeed = keyNeeds.some(n => NEEDS.find(nd => nd.id === n)?.plan === 'team');
    if (teamSize > 50 || hasEnterpriseNeed) return 'enterprise';
    if (teamSize >= 5 || hasTeamNeed || projectTypes.length >= 3) return 'team';
    return 'starter';
  })();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />

      <section className="pt-36 pb-16 px-5 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full opacity-[0.035] pointer-events-none" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/25 rounded-full text-xs font-semibold text-[var(--brand-primary)] mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            Save up to 40% with annual billing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] tracking-tight mb-4 animate-fade-in">
            Simple pricing.<br />No surprises.
          </h1>
          <p className="text-lg text-[var(--text-tertiary)] max-w-xl mx-auto animate-fade-in">
            Start free. Upgrade when you need more power. All plans include a 14-day free trial.
          </p>

          <div className="mt-8 flex justify-center animate-fade-in">
            <div className="inline-flex items-center bg-[var(--bg-secondary)] rounded-2xl p-1 gap-1 border border-[var(--glass-border)] shadow-sm">
              {BILLING.map(b => (
                <button key={b.value} onClick={() => setBilling(b.value)}
                  className={`relative px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer border-none ${
                    billing === b.value
                      ? 'glass-panel text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}>
                  {b.label}
                  {b.save && (
                    <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${
                      billing === b.value
                        ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                    }`}>
                      {b.save}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const price = plan.price[billing];
            const periodLabel = billing === 'monthly' ? '/mo' : billing === 'semiannual' ? '/mo, billed 6mo' : '/mo, billed annual';

            return (
              <div key={plan.id} id={`plan-${plan.id}`}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 animate-fade-in ${
                  plan.id === 'enterprise'
                    ? 'bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border-[var(--brand-primary)]/40 shadow-lg shadow-[var(--brand-primary)]/10 scale-[1.02] z-10'
                    : 'bg-[var(--bg-secondary)]/50 border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 hover:shadow-md'
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}>

                {plan.id === 'enterprise' && (
                  <>
                    <div className="absolute inset-0 rounded-2xl border-2 border-[var(--brand-primary)]/30 pointer-events-none" />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white shadow-xl shadow-[var(--brand-primary)]/40 whitespace-nowrap border border-white/15 z-10">
                      Most popular
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between mb-4 mt-1">
                  <div>
                    <h3 className={`text-lg font-bold ${plan.id === 'enterprise' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{plan.tagline}</p>
                  </div>
                  <span className="text-2xl">{plan.icon}</span>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[10px] font-medium text-[var(--text-muted)] self-start mt-1.5">$</span>
                    <span className={`num-mono text-5xl font-black tracking-tight ${plan.id === 'enterprise' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {price}
                    </span>
                    <span className="text-sm text-[var(--text-tertiary)] ml-1">
                      {price === 0 ? '' : periodLabel}
                    </span>
                  </div>
                  {price === 0 && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Free forever, no credit card</p>
                  )}
                  {plan.savings && price > 0 && billing === 'annual' && (
                    <p className="text-xs text-[var(--brand-primary)] font-semibold mt-1">
                      Save 40% vs monthly billing
                    </p>
                  )}
                </div>

                {plan.cta === 'Contact Sales' ? (
                  <div className="mb-5 space-y-2">
                    <Link to="/contact"
                      className="block text-center text-sm font-semibold py-3 rounded-xl transition-all btn-premium">
                      Contact Sales
                    </Link>
                    <Link to="/register?plan=enterprise"
                      className="block text-center text-xs font-medium py-2.5 rounded-xl border border-dashed border-[var(--brand-primary)]/40 text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 hover:bg-[var(--brand-primary)]/15 transition-all">
                      Choose this plan →
                    </Link>
                  </div>
                ) : (
                  <div className="mb-5">
                    <Link to={`/register${plan.price.monthly === 0 ? '' : '?plan=' + plan.id}`}
                      className={`block text-center text-sm font-semibold py-3 rounded-xl transition-all ${
                        plan.id === 'enterprise'
                          ? 'btn-premium'
                          : 'border-2 border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] bg-transparent'
                      }`}>
                      {plan.cta}
                    </Link>
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">What's included</p>
                  {plan.capabilities.map((cap, ci) => (
                    <div key={ci} className="flex items-center gap-2.5 text-xs">
                      <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        cap.included === true
                          ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                          : cap.included === false
                            ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                            : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      }`}>
                        <span className="text-[9px] font-bold">
                          {cap.included === true ? '✓' : cap.included === false ? '−' : '±'}
                        </span>
                      </span>
                      <span className={`${
                        cap.included === true
                          ? plan.id === 'enterprise' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
                          : 'text-[var(--text-muted)]'
                      }`}>
                        {cap.label}
                        {typeof cap.included === 'string' && (
                          <span className="text-[var(--brand-primary)] font-semibold ml-1">{cap.included}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Compare plans in detail</h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-2">See exactly what you get with each plan</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] flex items-center justify-center text-xs font-bold">?</span>
                Find your perfect plan
              </h3>
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Team size</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                      className="w-8 h-8 rounded-xl border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all text-sm font-bold cursor-pointer bg-[var(--bg-tertiary)]">−</button>
                    <input type="number" min="1" max="200" value={teamSize}
                      onChange={e => setTeamSize(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                      className="num-mono w-16 text-center text-sm font-bold text-[var(--text-primary)] border border-[var(--glass-border)] focus:border-[var(--brand-primary)] rounded-xl py-2 outline-none bg-[var(--bg-tertiary)]/50" />
                    <button onClick={() => setTeamSize(Math.min(200, teamSize + 1))}
                      className="w-8 h-8 rounded-xl border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all text-sm font-bold cursor-pointer bg-[var(--bg-tertiary)]">+</button>
                    <span className="text-xs text-[var(--text-muted)]">members</span>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project types</p>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_TYPES.map(pt => (
                      <button key={pt.id} onClick={() => setProjectTypes(toggleArray(projectTypes, pt.id))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          projectTypes.includes(pt.id)
                            ? 'bg-[var(--brand-primary)]/15 border-[var(--brand-primary)]/40 text-[var(--brand-primary)]'
                            : 'bg-[var(--bg-tertiary)] border-[var(--glass-border)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)]/30'
                        }`}>
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Key needs</p>
                  <div className="flex flex-wrap gap-2">
                    {NEEDS.map(nd => (
                      <button key={nd.id} onClick={() => setKeyNeeds(toggleArray(keyNeeds, nd.id))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          keyNeeds.includes(nd.id)
                            ? 'bg-[var(--brand-primary)]/15 border-[var(--brand-primary)]/40 text-[var(--brand-primary)]'
                            : 'bg-[var(--bg-tertiary)] border-[var(--glass-border)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)]/30'
                        }`}>
                        {nd.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--glass-border)] pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Recommended</p>
                      <p className="text-sm font-bold text-[var(--brand-primary)] mt-0.5">
                        {recommended === 'team' ? 'Team' : recommended === 'enterprise' ? 'Enterprise' : 'Starter'}
                      </p>
                    </div>
                    <a href={`#plan-${recommended}`}
                      className="text-xs font-semibold px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] transition-all shadow-sm">
                      View Plan
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] flex items-center justify-center text-xs font-bold">☰</span>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Full feature comparison</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Click a category to expand</p>
                  </div>
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {FEATURES.map((section, si) => (
                  <div key={si} className="border-b border-[var(--glass-border)] last:border-b-0">
                    <button onClick={() => setActiveGroup(activeGroup === si ? -1 : si)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-none">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{section.group}</span>
                      <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${activeGroup === si ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeGroup === si && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-2 py-1.5 mb-1 border-b border-[var(--glass-border)]">
                          <span className="flex-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Feature</span>
                          <span className="w-14 text-center text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Starter</span>
                          <span className="w-14 text-center text-[9px] font-bold text-[var(--brand-primary)] uppercase tracking-widest bg-[var(--brand-primary)]/10 py-0.5 rounded">Team</span>
                          <span className="w-14 text-center text-[9px] font-bold text-[var(--brand-primary)] uppercase tracking-widest">Enterprise</span>
                        </div>
                        {section.items.map((item, ri) => (
                          <div key={ri} className="flex items-center gap-2 py-2 border-b border-[var(--glass-border)] last:border-b-0">
                            <span className="flex-1 text-[11px] text-[var(--text-tertiary)]">{item.label}</span>
                            <span className={`w-14 text-center text-[10px] font-medium ${item.starter === true ? 'text-[var(--brand-primary)]' : item.starter === false ? 'text-[var(--text-muted)]' : 'text-[var(--text-tertiary)]'}`}>
                              {item.starter === true ? '✓' : item.starter === false ? '—' : item.starter}
                            </span>
                            <span className={`w-14 text-center text-[10px] font-medium bg-[var(--brand-primary)]/10 py-0.5 rounded ${item.team === true ? 'text-[var(--brand-primary)]' : item.team === false ? 'text-[var(--text-muted)]' : 'text-[var(--text-tertiary)]'}`}>
                              {item.team === true ? '✓' : item.team === false ? '—' : item.team}
                            </span>
                            <span className={`w-14 text-center text-[10px] font-medium ${item.enterprise === true ? 'text-[var(--brand-primary)]' : item.enterprise === false ? 'text-[var(--text-muted)]' : 'text-[var(--text-tertiary)]'}`}>
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
          </div>
        </div>
      </section>

      <section className="pb-20 px-5">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)]/20 via-[var(--brand-primary)]/10 to-[var(--brand-primary)]/20 rounded-3xl blur-3xl" />
          <div className="relative rounded-2xl p-12 md:p-16 text-center overflow-hidden shadow-2xl border border-[var(--glass-border)]" style={{ background: 'var(--bg-secondary)' }}>
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.05] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-primary), transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Ready to transform your workflow?</h2>
              <p className="text-[var(--text-tertiary)] mb-10 max-w-md mx-auto">No credit card required. Start your free trial today and see why teams love GRESIO.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="btn-premium px-10 py-3.5 text-sm">
                  Start Free Trial
                </Link>
                <Link to="/contact" className="px-10 py-3.5 font-semibold rounded-xl transition-all duration-300 text-sm border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 hover:shadow-lg" style={{ color: 'var(--text-secondary)', background: 'var(--glass-bg)' }}>
                  Talk to Sales
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
import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly', suffix: '/month' },
  { value: 'semiannual', label: '6 months', suffix: '/mo', badge: 'Save 20%' },
  { value: 'annual', label: 'Yearly', suffix: '/mo', badge: 'Save 40%' },
];

const PLANS = [
  {
    name: 'Starter', price: { monthly: 0, semiannual: 0, annual: 0 }, period: { monthly: 'forever', semiannual: 'forever', annual: 'forever' },
    cta: 'Get Started', popular: false,
  },
  {
    name: 'Team', price: { monthly: 29, semiannual: 23, annual: 17 }, period: { monthly: '/month', semiannual: '/mo', annual: '/mo' },
    cta: 'Start Free Trial', popular: true,
  },
  {
    name: 'Enterprise', price: { monthly: 99, semiannual: 79, annual: 59 }, period: { monthly: '/month', semiannual: '/mo', annual: '/mo' },
    cta: 'Contact Sales', popular: false,
  },
];

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500 mx-auto">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Dash = () => (
  <span className="text-surface-300 mx-auto block text-center">—</span>
);

function Cell({ value, highlighted }) {
  const base = 'text-xs py-3 px-3 text-center';
  const bg = highlighted ? 'bg-primary-50/60' : '';
  const cls = highlighted ? 'font-semibold text-surface-800' : 'text-surface-500';
  if (value === true) return <td className={`${base} ${bg}`}><Check /></td>;
  if (value === false) return <td className={`${base} ${bg}`}><Dash /></td>;
  return <td className={`${base} ${bg} ${cls}`}>{value}</td>;
}

const FEATURE_SECTIONS = [
  {
    title: 'Users & Access',
    rows: [
      { label: 'Team members', starter: 'Up to 10', team: 'Up to 50', enterprise: 'Unlimited' },
      { label: 'Active projects', starter: '3', team: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Role-based access (Admin, PM, Lead, Dev, QA, Viewer)', starter: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Project Management',
    rows: [
      { label: 'Sprint management with burndown charts', starter: true, team: true, enterprise: true },
      { label: 'Task tracking (Kanban board)', starter: true, team: true, enterprise: true },
      { label: '7-step project lifecycle phases', starter: true, team: true, enterprise: true },
      { label: 'Work log tracking', starter: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Testing & Quality',
    rows: [
      { label: 'Test case management', starter: true, team: true, enterprise: true },
      { label: 'Auto-create bugs from failed tests', starter: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Automation',
    rows: [
      { label: 'Auto status flow (smart phase transitions)', starter: false, team: true, enterprise: true },
    ],
  },
  {
    title: 'Reporting & Analytics',
    rows: [
      { label: 'Basic reporting', starter: true, team: true, enterprise: true },
      { label: 'Advanced analytics dashboard', starter: false, team: true, enterprise: true },
      { label: 'Custom reports', starter: false, team: false, enterprise: true },
    ],
  },
  {
    title: 'Integrations',
    rows: [
      { label: 'Azure AD / Microsoft 365 import', starter: false, team: true, enterprise: true },
      { label: 'GitHub integration', starter: true, team: true, enterprise: true },
      { label: 'Microsoft Teams integration', starter: true, team: true, enterprise: true },
      { label: 'Outlook integration', starter: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Notifications',
    rows: [
      { label: 'Email notifications', starter: true, team: true, enterprise: true },
      { label: 'In-app notifications', starter: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Community support', starter: true, team: false, enterprise: false },
      { label: 'Email support', starter: true, team: false, enterprise: false },
      { label: 'Priority support', starter: false, team: true, enterprise: false },
      { label: 'Dedicated support & account manager', starter: false, team: false, enterprise: true },
    ],
  },
  {
    title: 'Enterprise Features',
    rows: [
      { label: 'Custom fields & workflows', starter: false, team: false, enterprise: true },
      { label: 'SAML SSO', starter: false, team: false, enterprise: true },
      { label: 'On-premise deployment option', starter: false, team: false, enterprise: true },
      { label: 'SLA guarantee', starter: false, team: false, enterprise: true },
      { label: 'White-label option', starter: false, team: '—', enterprise: 'Add-on' },
      { label: 'API access', starter: false, team: '—', enterprise: 'Add-on' },
    ],
  },
];

function PlanCard({ plan, billing }) {
  const price = plan.price[billing];
  const period = plan.period[billing];
  const monthlyEquiv = billing === 'semiannual' ? Math.round(price) : billing === 'annual' ? Math.round(price) : price;

  return (
    <div className={`relative rounded-xl border px-5 py-6 text-center flex flex-col items-center ${plan.popular ? 'bg-primary-600 border-primary-600 text-white scale-105 shadow-lg ring-2 ring-primary-400 z-10' : 'bg-white border-surface-200'}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
          Most Popular
        </div>
      )}
      <h3 className={`text-sm font-semibold mb-1 ${plan.popular ? 'text-primary-100' : 'text-surface-500'}`}>{plan.name}</h3>
      <div className="mb-1">
        <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'text-surface-900'}`}>${price}</span>
        <span className={`text-sm ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>{period}</span>
      </div>
      {billing !== 'monthly' && price > 0 && (
        <p className={`text-[10px] leading-tight ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>
          ${monthlyEquiv}/mo — billed ${price * (billing === 'semiannual' ? 6 : 12)} {billing === 'semiannual' ? 'every 6 months' : 'yearly'}
        </p>
      )}
      {price === 0 && <p className={`text-[10px] ${plan.popular ? 'text-primary-200' : 'text-surface-400'}`}>Free forever</p>}
      <div className="mt-4 w-full">
        {plan.cta === 'Contact Sales' ? (
          <Link to="/contact"
            className={`block text-center text-sm font-semibold py-2.5 rounded-lg transition-all ${plan.popular ? 'bg-white text-primary-700 hover:bg-primary-50' : 'bg-surface-50 text-surface-700 hover:bg-surface-100 border border-surface-200'}`}>
            Contact Sales
          </Link>
        ) : (
          <Link to={`/register${plan.price.monthly === 0 ? '' : '?plan=' + plan.name.toLowerCase()}`}
            className={`block text-center text-sm font-semibold py-2.5 rounded-lg transition-all ${plan.popular ? 'bg-white text-primary-700 hover:bg-primary-50' : 'bg-surface-50 text-surface-700 hover:bg-surface-100 border border-surface-200'}`}>
            {plan.cta}
          </Link>
        )}
      </div>
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="max-w-5xl mx-auto overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold text-surface-400 uppercase tracking-wider py-3 px-3 w-[34%]" />
            {['Starter', 'Team', 'Enterprise'].map((name, i) => (
              <th key={i} className={`text-center text-sm font-bold py-3 px-3 w-[22%] ${i === 1 ? 'bg-primary-50 text-primary-800' : 'text-surface-600'}`}>
                <div className="flex flex-col items-center gap-1">
                  {i === 1 && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">MOST POPULAR</span>
                  )}
                  {name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_SECTIONS.map((section, si) => (
            <Fragment key={si}>
              <tr>
                <td colSpan={4} className="text-left text-xs font-bold text-surface-700 bg-surface-50 py-2.5 px-3 uppercase tracking-wider border-t border-surface-200">
                  {section.title}
                </td>
              </tr>
              {section.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-surface-100 hover:bg-surface-50/50 transition-colors">
                  <td className="text-xs text-surface-600 py-3 px-3">{row.label}</td>
                  <Cell value={row.starter} highlighted={false} />
                  <Cell value={row.team} highlighted={true} />
                  <Cell value={row.enterprise} highlighted={false} />
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState('semiannual');

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-surface-900 mb-4">Simple, transparent pricing</h1>
            <p className="text-lg text-surface-500 max-w-xl mx-auto">Start free, scale as you grow. Save up to 40% with longer plans.</p>
          </div>

          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center bg-surface-100 rounded-xl p-1">
              {BILLING_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setBilling(opt.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${billing === opt.value ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                  {opt.label}
                  {opt.badge && <span className="ml-1.5 text-[10px] font-bold text-green-600">{opt.badge}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-stretch mb-16 max-w-4xl mx-auto">
            {PLANS.map((plan, i) => (
              <PlanCard key={i} plan={plan} billing={billing} />
            ))}
          </div>

          <h2 className="text-2xl font-bold text-surface-900 text-center mb-8">Compare plans in detail</h2>
          <ComparisonTable />
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

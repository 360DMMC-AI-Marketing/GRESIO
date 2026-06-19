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
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/30 to-white" />
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-surface-900 leading-tight mb-6 tracking-tight">
            The Internal OS for<br />Modern Teams
          </h1>
           <p className="text-xl md:text-2xl text-surface-500 max-w-3xl mx-auto mb-10 leading-relaxed">
              From discovery to delivery — one platform for the entire project lifecycle.
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
            <span>Free plan available</span>
            <span className="w-px h-4 bg-surface-200" />
            <span>2-minute setup</span>
            <span className="w-px h-4 bg-surface-200" />
            <span>Enterprise-grade</span>
          </div>
        </div>
      </section>

      {/* WHAT IS GRESIO */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">Overview</span>
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mt-3 mb-6">What is GRESIO?</h2>
          <p className="text-lg text-surface-600 leading-relaxed max-w-3xl mx-auto">
            GRESIO is an internal operating system for teams that need more than task management. 
            It handles the full project lifecycle, adapts to any workflow, and generates 
            professional audit-ready reports at delivery — branded and exportable as PDF.
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

      {/* STATS */}
      <section className="py-24 px-5 bg-surface-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase">By the numbers</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              ['500+', 'Projects Managed'],
              ['10K+', 'Tasks Completed'],
              ['120+', 'Active Teams'],
              ['99.9%', 'Uptime SLA'],
            ].map(([val, label], i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-6 text-center hover:shadow-md transition-all">
                <p className="text-3xl font-bold text-primary-600 mb-1">{val}</p>
                <p className="text-sm text-surface-500">{label}</p>
              </div>
            ))}
          </div>
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
            <span>4.9/5 from 50+ reviews</span>
            <span className="w-px h-4 bg-surface-200" />
            <span>Used by teams at 360DMMC</span>
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
          <p className="text-xs text-primary-300 mt-4 relative">Free plan available · 2-minute setup · Cancel anytime</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

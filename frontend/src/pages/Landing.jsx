import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

export default function Landing() {
  useEffect(() => {
    const onScroll = () => {};
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="dark page-enter min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <PublicNavbar />

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-wave" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 40%, var(--bg-primary) 80%)', backgroundSize: '200% 200%' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)' }} />

        <div className="relative max-w-6xl mx-auto text-center px-5 py-36">
          <div className="animate-fade-in inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-10">
            <span className="w-2 h-2 rounded-full live-dot"></span>
            <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Now with AI voice & chat for Enterprise</span>
          </div>

          <h1 className="animate-slide-up text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-8 tracking-tight" style={{
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--brand-primary) 40%, #a78bfa 60%, var(--brand-hover) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            The Internal OS<br />for Modern Teams
          </h1>

          <p className="animate-fade-in delay-200 text-xl md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            From discovery to delivery — one platform for the entire project lifecycle.
          </p>

          <div className="animate-fade-in delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pricing" className="btn-premium text-base px-10 py-4 inline-flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
              See Plans & Pricing
            </Link>
            <Link to="/register" className="glass-panel text-base px-10 py-4 font-semibold rounded-xl transition-all hover:scale-[1.02] inline-flex items-center justify-center" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
              Explore for Free
            </Link>
          </div>

          <div className="animate-fade-in delay-300 mt-14 flex items-center justify-center gap-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Free plan available
            </span>
            <span className="w-px h-5" style={{ background: 'var(--border-primary)' }} />
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              2-minute setup
            </span>
            <span className="w-px h-5" style={{ background: 'var(--border-primary)' }} />
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Enterprise-grade
            </span>
          </div>
        </div>
      </section>

      <section className="py-28 px-5" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="animate-fade-in">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--brand-primary)' }}>Overview</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6" style={{ color: 'var(--text-primary)' }}>What is GRESIO?</h2>
          </div>
          <div className="animate-slide-up delay-100 glass-panel rounded-2xl p-10 md:p-14 max-w-4xl mx-auto">
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              GRESIO is an internal operating system for teams that need more than task management.
              It handles the full project lifecycle, adapts to any workflow, and generates
              professional audit-ready reports at delivery — branded and exportable as PDF.
              Enterprise plans include AI voice assistant and chatbot for hands-free project management.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link to="/features" className="btn-premium inline-flex items-center gap-2 px-7 py-3" style={{ borderRadius: 'var(--radius-lg)' }}>
                Explore all features <span className="text-lg">→</span>
              </Link>
              <Link to="/how-it-works" className="glass-panel inline-flex items-center gap-2 px-7 py-3 font-semibold rounded-xl transition-all hover:scale-[1.02]" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                How it works <span className="text-lg">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 px-5" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--brand-primary)' }}>Who it's for</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4" style={{ color: 'var(--text-primary)' }}>Built for every role in your organization</h2>
            <p className="max-w-2xl mx-auto" style={{ color: 'var(--text-tertiary)' }}>From executives to developers, GRESIO gives everyone the right view of the work.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {[
              { title: 'Leadership', desc: 'Portfolio-level visibility, resource allocation, and delivery metrics to guide strategic decisions.', link: '/features', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { title: 'Project Managers', desc: 'Sprint planning, milestone tracking, workload balancing, and auto status flows that save hours every week.', link: '/how-it-works', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              { title: 'Developers & Designers', desc: 'Kanban boards, task management, test case execution, and deep integrations with GitHub and more.', link: '/features', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
              { title: 'Clients & Stakeholders', desc: 'Dedicated client view with progress reports, milestone summaries, and direct communication channels.', link: '/pricing', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            ].map((item, i) => (
              <div key={i} className="glass-panel glow-card rounded-2xl p-7 text-left transition-all hover:-translate-y-1 group" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, var(--brand-primary), rgba(99,102,241,0.2))' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                <Link to={item.link} className="text-xs font-medium transition-all inline-flex items-center gap-1 group-hover:gap-2" style={{ color: 'var(--brand-primary)' }}>
                  Learn more <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-5" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--brand-primary)' }}>Built for teams</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 stagger">
            {[
              ['5', 'Project Types'],
              ['7', 'Lifecycle Phases'],
              ['10', 'User Roles'],
              ['27+', 'Granular Permissions'],
            ].map(([val, label], i) => (
              <div key={i} className="glass-panel rounded-2xl p-8 text-center transition-all hover:-translate-y-1" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                <p className="text-4xl font-bold mb-2 num-mono" style={{ background: 'linear-gradient(135deg, var(--brand-primary), #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{val}</p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-5" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="animate-fade-in">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--brand-primary)' }}>Trusted by teams</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-3" style={{ color: 'var(--text-primary)' }}>What our users say</h2>
            <p className="max-w-xl mx-auto mb-14" style={{ color: 'var(--text-tertiary)' }}>From startups to enterprises, GRESIO helps teams ship faster and stay organized.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger">
            {[
              { quote: 'GRESIO replaced Jira, Trello, and our QA tool. One platform for everything.', author: 'Ahmed R.', role: 'CTO, SaaS Startup' },
              { quote: 'The auto status flow is a game-changer. Projects advance without micromanagement.', author: 'Sara L.', role: 'Engineering Manager' },
              { quote: 'We onboarded 30 team members in minutes with the Azure AD import.', author: 'Mohammed K.', role: 'IT Director, 360DMMC' },
            ].map((t, i) => (
              <div key={i} className="glass-panel glow-card rounded-2xl p-8 text-left transition-all hover:-translate-y-1" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="mb-5" style={{ color: 'var(--brand-primary)', opacity: 0.4 }}>
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, var(--brand-primary), #a78bfa)', color: 'white' }}>
                    {t.author[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.author}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 flex items-center justify-center gap-6 text-sm animate-fade-in" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f59e0b' }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              4.9/5 from 50+ reviews
            </span>
            <span className="w-px h-5" style={{ background: 'var(--border-primary)' }} />
            <span>Used by teams at 360DMMC</span>
          </div>
        </div>
      </section>

      <section className="py-28 px-5" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-3xl p-12 md:p-16 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))', borderColor: 'var(--glass-border)' }}>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Ready to streamline your projects?</h2>
              <p className="mb-10 max-w-lg mx-auto" style={{ color: 'var(--text-tertiary)' }}>Join teams that use GRESIO to ship faster, stay organized, and never miss a deadline.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/pricing" className="btn-premium text-base px-10 py-4 inline-flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
                  Choose Your Plan
                </Link>
                <Link to="/register" className="glass-panel text-base px-10 py-4 font-semibold rounded-xl transition-all hover:scale-[1.02] inline-flex items-center justify-center" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                  Start Free Trial
                </Link>
              </div>
              <p className="text-xs mt-6" style={{ color: 'var(--text-muted)' }}>Free plan available · 2-minute setup · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

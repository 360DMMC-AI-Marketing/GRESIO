import { useState } from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { api } from '../services/api';

const BENEFITS = [
  { icon: '⚡', title: 'Lightning-fast response', desc: 'We typically reply within 2–4 hours during business days. No automated nonsense.' },
  { icon: '🔒', title: 'Enterprise-grade security', desc: 'Your data is protected with SOC 2 and GDPR compliant infrastructure.' },
  { icon: '🎯', title: 'Tailored live demo', desc: 'See GRESIO configured for your team size, project types, and workflow.' },
  { icon: '📋', title: 'Zero pressure, pure value', desc: 'No sales pitch. Just answers, a demo, and you decide if it fits.' },
];

const TRUST_BADGES = [
  { name: 'Enterprise Ready', icon: '🏢' },
  { name: 'SOC 2 Compliant', icon: '🔐' },
  { name: 'GDPR Compliant', icon: '🇪🇺' },
  { name: '99.9% Uptime', icon: '📈' },
  { name: '24/7 Support', icon: '🎧' },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/contact', { name, email, subject, message });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
        <PublicNavbar />
        <section className="pt-36 pb-20 px-5">
          <div className="max-w-md mx-auto text-center animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)]/20 via-[var(--brand-primary)]/10 to-[var(--brand-primary)]/20 rounded-[var(--radius-xl)] blur-3xl" />
              <div className="relative glass-panel rounded-[var(--radius-xl)] p-10 border border-[var(--glass-border)]">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Message sent!</h2>
                <p className="text-[var(--text-tertiary)] text-sm mb-2">We&apos;ll get back to you within 24 hours.</p>
                <p className="text-[var(--text-muted)] text-xs mb-6">Our team typically responds within 2–4 hours during business hours.</p>
                <button onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 cursor-pointer"
                  style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', color: 'var(--text-secondary)' }}>
                  Send another message
                </button>
              </div>
            </div>
          </div>
        </section>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />

      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.025] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-primary), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.02] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--brand-secondary), transparent 70%)', transform: 'translate(-20%, 20%)' }} />

        <div className="pt-36 pb-20 px-5 relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5 border border-[var(--glass-border)]" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', color: 'var(--brand-primary)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand-primary)' }} />
                Typically responds in 2–4 hours
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Let&apos;s talk</h1>
              <p className="text-lg text-[var(--text-tertiary)] max-w-2xl mx-auto leading-relaxed">Have a project, a question, or just want to see GRESIO in action? We&apos;re here to help — no commitment required.</p>
            </div>

            <div className="grid lg:grid-cols-5 gap-8 animate-fade-in">
              <div className="lg:col-span-3">
                <div className="rounded-2xl p-8 border border-[var(--glass-border)]" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
                  <h2 className="text-base font-bold text-[var(--text-primary)] mb-6">Send us a message</h2>
                  {error && (
                    <div className="mb-5 px-4 py-3 rounded-xl text-sm border" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>{error}</div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required
                          placeholder="John Doe"
                          className="w-full px-4 py-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all duration-300 placeholder:text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                          placeholder="john@company.com"
                          className="w-full px-4 py-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all duration-300 placeholder:text-[var(--text-muted)]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Subject</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required
                        placeholder="How can we help you?"
                        className="w-full px-4 py-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all duration-300 placeholder:text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Message</label>
                      <textarea value={message} onChange={e => setMessage(e.target.value)} required
                        rows={5} placeholder="Tell us about your project, timeline, team size, and what you're looking for..."
                        className="w-full px-4 py-3 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all duration-300 placeholder:text-[var(--text-muted)] resize-none"></textarea>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button type="submit" disabled={loading}
                        className="btn-premium px-8 py-3 text-sm font-semibold flex items-center gap-2">
                        {loading ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending…
                          </>
                        ) : (
                          <>
                            Send Message
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </>
                        )}
                      </button>
                      <span className="text-xs text-[var(--text-muted)]">No spam. Ever.</span>
                    </div>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="rounded-2xl p-6 border border-[var(--glass-border)] transition-all duration-300 hover:shadow-lg group flex-1" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: 'white' }}>
                    📅
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Book a live demo</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mb-3 leading-relaxed">See GRESIO in action. We&apos;ll walk you through the platform tailored to your team&apos;s needs.</p>
                  <a href="https://360dmmc.com/contact" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 hover:gap-2"
                    style={{ color: 'var(--brand-primary)' }}>
                    Schedule 30 min →
                  </a>
                </div>

                <div className="rounded-2xl p-6 border border-[var(--glass-border)] transition-all duration-300 hover:shadow-lg group flex-1" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white' }}>
                    ✉
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Email us directly</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mb-1 leading-relaxed">Prefer email? We respond within 2–4 hours during business days.</p>
                  <a href="mailto:Consult@360DMMC.com" className="text-xs font-semibold transition-colors duration-200" style={{ color: 'var(--brand-primary)' }}>
                    Consult@360DMMC.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-20 animate-fade-in">
              <div className="text-center mb-10">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Why reach out?</span>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">Every conversation starts here</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {BENEFITS.map((b, i) => (
                  <div key={i} className="rounded-2xl p-6 border border-[var(--glass-border)] text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 text-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      {b.icon}
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{b.title}</h3>
                    <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 animate-fade-in">
              <div className="rounded-2xl p-8 border border-[var(--glass-border)]" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                  {TRUST_BADGES.map((badge, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--bg-tertiary)' }}>{badge.icon}</span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

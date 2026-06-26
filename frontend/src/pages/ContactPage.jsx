import { useState } from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { api } from '../services/api';

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
            <div className="glass-panel rounded-[var(--radius-xl)] p-8">
              <div className="w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Message sent!</h2>
              <p className="text-[var(--text-tertiary)] text-sm">We&apos;ll get back to you as soon as possible.</p>
              <button onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
                className="mt-6 text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-hover)] transition-colors bg-transparent border-none cursor-pointer">
                Send another message
              </button>
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
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <div className="glass-panel rounded-[var(--radius-xl)] p-8 md:p-12 inline-block">
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">Get in Touch</h1>
              <p className="text-lg text-[var(--text-tertiary)] max-w-xl mx-auto">Have a question, need a custom plan, or want to schedule a meeting? We're here to help.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 card-premium p-8">
              {error && (
                <div className="mb-4 px-4 py-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-sm text-[var(--danger-text)]">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      placeholder="John Doe" className="w-full px-4 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="john@company.com" className="w-full px-4 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Subject</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required
                    placeholder="How can we help you?" className="w-full px-4 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} required
                    rows={4} placeholder="Tell us more about your project, timeline, and requirements..." className="w-full px-4 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)] resize-none"></textarea>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-premium w-full py-2.5 text-sm">
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </div>
            <div className="md:col-span-2 space-y-5">
              <div className="card-premium glow-card p-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--info-bg)] flex items-center justify-center text-[var(--brand-primary)] text-lg mb-3">📅</div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Schedule a Meeting</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">Book a 30-minute call with our team to discuss your needs and see a live demo.</p>
                <a href="https://360dmmc.com/contact" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-hover)] transition-colors">
                  Book a Demo <span className="text-sm">→</span>
                </a>
              </div>
              <div className="card-premium glow-card p-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--info-bg)] flex items-center justify-center text-[var(--brand-primary)] text-lg mb-3">✉</div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Email Us Directly</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Prefer email? Reach out anytime.</p>
                <a href="mailto:Consult@360DMMC.com" className="text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-hover)] transition-colors">Consult@360DMMC.com</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

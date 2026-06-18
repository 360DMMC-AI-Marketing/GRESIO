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
      <div className="min-h-screen bg-white">
        <PublicNavbar />
        <section className="pt-36 pb-20 px-5">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Message sent!</h2>
            <p className="text-surface-500 text-sm">We&apos;ll get back to you as soon as possible.</p>
            <button onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
              className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors bg-transparent border-none cursor-pointer">
              Send another message
            </button>
          </div>
        </section>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <section className="pt-36 pb-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-surface-900 mb-4">Get in Touch</h1>
            <p className="text-lg text-surface-500 max-w-xl mx-auto">Have a question, need a custom plan, or want to schedule a meeting? We're here to help.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 bg-surface-50 rounded-2xl p-8 border border-surface-200">
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      placeholder="John Doe" className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="john@company.com" className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Subject</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required
                    placeholder="How can we help you?" className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} required
                    rows={4} placeholder="Tell us more about your project, timeline, and requirements..." className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-300 resize-none"></textarea>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </div>
            <div className="md:col-span-2 space-y-5">
              <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 text-lg mb-3">📅</div>
                <h3 className="text-sm font-semibold text-surface-900 mb-1">Schedule a Meeting</h3>
                <p className="text-xs text-surface-500 mb-4">Book a 30-minute call with our team to discuss your needs and see a live demo.</p>
                <a href="https://360dmmc.com/contact" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
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
      <PublicFooter />
    </div>
  );
}

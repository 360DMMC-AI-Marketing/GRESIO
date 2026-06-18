import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Referrals() {
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, signedUp: 0, rewarded: 0 });
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals/generate', {
      headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
    }).then(r => r.json())
      .then(d => { setCode(d.code); setLink(d.link); })
      .catch(() => {});

    fetch('/api/referrals/my', {
      headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
    }).then(r => r.json())
      .then(d => { setReferrals(d.referrals || []); setStats(d.stats || {}); })
      .catch(() => {});
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const shareVia = (platform) => {
    let url = '';
    const text = `Manage your projects like a pro with GRESIO! Sign up with my referral link: ${link}`;
    if (platform === 'email') url = `mailto:?subject=Check out GRESIO&body=${encodeURIComponent(text)}`;
    if (platform === 'twitter') url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    if (platform === 'linkedin') url = `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-surface-900 mb-1">Referral Program</h1>
      <p className="text-xs text-surface-500 mb-4">Share GRESIO with others and earn rewards.</p>

      <div className="bg-white rounded-xl border border-surface-200 p-5 mb-4">
        <h2 className="text-sm font-bold text-surface-900 mb-2">Your Referral Link</h2>
        <div className="flex gap-2 mb-3">
          <input readOnly value={link}
            className="flex-1 text-xs border border-surface-200 rounded-lg px-3 py-2 bg-surface-50 outline-none" />
          <button onClick={copyLink}
            className="px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => shareVia('email')} className="px-3 py-1.5 bg-surface-100 text-surface-700 rounded-lg text-xs hover:bg-surface-200 transition-colors cursor-pointer border-none">📧 Email</button>
          <button onClick={() => shareVia('twitter')} className="px-3 py-1.5 bg-surface-100 text-surface-700 rounded-lg text-xs hover:bg-surface-200 transition-colors cursor-pointer border-none">🐦 Twitter</button>
          <button onClick={() => shareVia('linkedin')} className="px-3 py-1.5 bg-surface-100 text-surface-700 rounded-lg text-xs hover:bg-surface-200 transition-colors cursor-pointer border-none">💼 LinkedIn</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-surface-900' },
          { label: 'Pending', value: stats.pending, color: 'text-warning-600' },
          { label: 'Signed Up', value: stats.signedUp, color: 'text-primary-600' },
          { label: 'Rewards', value: stats.rewarded, color: 'text-success-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-surface-200 p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-surface-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        <div className="px-4 py-3 border-b border-surface-100 font-semibold text-sm text-surface-900">Referral History</div>
        {referrals.length === 0 ? (
          <div className="p-6 text-center text-xs text-surface-400">
            No referrals yet. Share your link to get started!
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {referrals.map(r => (
              <div key={r._id} className="px-4 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-surface-900">{r.referredEmail}</span>
                  <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    r.status === 'rewarded' ? 'bg-success-50 text-success-600' :
                    r.status === 'signed_up' ? 'bg-primary-50 text-primary-600' :
                    'bg-surface-100 text-surface-500'
                  }`}>{r.status}</span>
                </div>
                <span className="text-surface-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

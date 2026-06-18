import { useState, useEffect } from 'react';
import Modal from './Modal';

export default function ShareReportModal({ open, onClose, reportId }) {
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [expiration, setExpiration] = useState('30');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && reportId) {
      setEnabled(false);
      setPassword('');
      setExpiration('30');
      setShareUrl('');
      setCopied(false);
    }
  }, [open, reportId]);

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
        body: JSON.stringify({
          enabled: true,
          password: password || undefined,
          expiresInDays: expiration === 'never' ? null : Number(expiration),
        }),
      });
      const data = await res.json();
      if (data.url) {
        setShareUrl(data.url);
        setEnabled(true);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await fetch(`/api/reports/${reportId}/share`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      });
      setEnabled(false);
      setShareUrl('');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Share Report" icon="🔗">
      <div className="space-y-3 text-sm">
        <p className="text-xs text-surface-500">Create a public link to share this report with clients. No login required.</p>

        {!enabled ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Password (optional)</label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full text-xs border border-surface-200 rounded-lg px-3 py-2 outline-none focus:border-[#2347e8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Link expires</label>
              <select value={expiration} onChange={e => setExpiration(e.target.value)}
                className="w-full text-xs border border-surface-200 rounded-lg px-3 py-2 outline-none focus:border-[#2347e8]">
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="never">Never</option>
              </select>
            </div>
            <button onClick={handleShare} disabled={loading}
              className="w-full px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] disabled:opacity-50 transition-colors cursor-pointer border-none">
              {loading ? 'Creating...' : 'Generate Share Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-success-50 text-success-700 text-[10px] px-3 py-2 rounded-lg border border-success-100">
              ✓ Report is publicly shared
            </div>
            <div className="flex gap-2">
              <input readOnly value={shareUrl}
                className="flex-1 text-[10px] border border-surface-200 rounded-lg px-3 py-2 bg-surface-50 outline-none" />
              <button onClick={copyLink}
                className="px-3 py-2 bg-surface-100 text-surface-700 rounded-lg text-xs font-semibold hover:bg-surface-200 transition-colors cursor-pointer border-none">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={handleDisable} disabled={loading}
              className="w-full px-4 py-2 bg-danger-50 text-danger-600 rounded-lg text-xs font-semibold hover:bg-danger-100 disabled:opacity-50 transition-colors cursor-pointer border-none">
              Disable Share Link
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

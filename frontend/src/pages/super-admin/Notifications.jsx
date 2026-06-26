import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCheck, Trash2, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeIcon = (type) => {
  const map = { signup:'🆕', alert:'⚠️', upgrade:'⬆️', warning:'⚡', admin:'👤', reminder:'⏰' };
  return map[type] || '🔔';
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(console.error);
  }, []);

  const markAllRead = () => {
    api.markAllNotificationsRead().then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))).catch(console.error);
  };

  const dismiss = (id) => {
    api.deleteNotification(id).then(() => setNotifications(prev => prev.filter(n => n._id !== id))).catch(console.error);
  };

  const markRead = (id) => {
    api.markNotificationRead(id).then(() => setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))).catch(console.error);
  };

  return (
    <div className="flex flex-col gap-5 page-enter">
      <div className="flex items-center justify-between glass-panel">
        <div>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer mb-2">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{notifications.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-voice="mark-all-read" onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors border-none cursor-pointer">
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
      </div>

      <div className="card-premium glow-card overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
            <Bell size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">New notifications will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {notifications.map(n => (
              <div key={n._id}
                className={`flex items-start gap-3 px-5 py-4 dark:hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${!n.read ? 'dark:bg-[var(--bg-tertiary)]/30' : ''}`}
                onClick={() => { if (!n.read) markRead(n._id); }}>
                <span className="text-lg mt-0.5">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] shrink-0" />}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); dismiss(n._id); }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg bg-transparent border-none cursor-pointer flex-shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

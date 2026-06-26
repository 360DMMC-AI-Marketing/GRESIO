import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, CheckCheck, X, LogOut } from 'lucide-react';
import { api } from '../../services/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', handler);
    api.getNotifications().then(setNotifications).catch(console.error);
    const id = setInterval(() => api.getNotifications().then(setNotifications).catch(console.error), 15000);
    return () => { document.removeEventListener('mousedown', handler); clearInterval(id); };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => { api.markAllNotificationsRead().then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))).catch(console.error); };

  const dismissNotif = (id) => { api.deleteNotification(id).then(() => setNotifications(prev => prev.filter(n => n._id !== id))).catch(console.error); };

  const typeIcon = (type) => {
    const map = { signup:'🆕', alert:'⚠️', upgrade:'⬆️', warning:'⚡', admin:'👤', reminder:'⏰' };
    return map[type] || '🔔';
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/super/companies?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search companies, admins..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearch}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[var(--radius-lg)] placeholder-[var(--text-muted)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]" />
        </div>

        <div className="flex items-center gap-4">

          <div className="relative" ref={ref}>
            <button onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] transition-all cursor-pointer bg-transparent border-none">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 glass-panel bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)]">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-hover)] font-medium bg-transparent border-none cursor-pointer">
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${!n.read ? 'bg-[var(--info-bg)]' : ''}`}
                        onClick={() => { if (!n.read) { api.markNotificationRead(n._id).then(() => setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x))).catch(console.error); } }}>
                        <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)]">{n.title}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{n.message}</div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-1">{n.createdAt ? timeAgo(n.createdAt) : ''}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); dismissNotif(n._id); }}
                          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-[var(--border-secondary)] text-center">
                   <button onClick={() => { setShowNotifs(false); navigate('/super/notifications'); }} className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-hover)] font-medium bg-transparent border-none cursor-pointer">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => navigate('/super/profile')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight capitalize">super admin</p>
            </div>
            <div className="relative shrink-0">
              <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'SA'}
              </div>
            </div>
          </button>
          <button onClick={() => { if (onLogout) onLogout(); }}
            className="p-2 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 rounded-[var(--radius-lg)] transition-all cursor-pointer bg-transparent border-none"
            title="Logout">
            <LogOut size={18} />
          </button>

        </div>
      </div>
    </header>
  );
}
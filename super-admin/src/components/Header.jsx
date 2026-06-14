import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, CheckCheck, X, LogOut } from 'lucide-react';
import { api } from '../api';

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
      navigate(`/companies?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search companies, admins..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearch}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        </div>

        <div className="flex items-center gap-4">

          <div className="relative" ref={ref}>
            <button onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-surface-200 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                  <span className="text-sm font-semibold text-surface-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer">
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-surface-400">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-surface-50 hover:bg-surface-50 transition-colors ${!n.read ? 'bg-primary-50/30' : ''}`}
                        onClick={() => { if (!n.read) { api.markNotificationRead(n._id).then(() => setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x))).catch(console.error); } }}>
                        <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-surface-900">{n.title}</div>
                          <div className="text-[11px] text-surface-500 mt-0.5 leading-relaxed">{n.message}</div>
                          <div className="text-[10px] text-surface-400 mt-1">{n.createdAt ? timeAgo(n.createdAt) : ''}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); dismissNotif(n._id); }}
                          className="p-0.5 text-surface-300 hover:text-surface-500 bg-transparent border-none cursor-pointer flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-surface-100 text-center">
                  <button onClick={() => { setShowNotifs(false); navigate('/notifications'); }} className="text-xs text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
            <div className="text-right">
              <p className="text-xs font-semibold text-neutral-900 leading-tight">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-neutral-400 leading-tight capitalize">super admin</p>
            </div>
            <div className="relative shrink-0">
              <div className="w-8 h-8 bg-[#2347e8] rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'SA'}
              </div>
            </div>
          </button>
          <button onClick={() => { if (onLogout) onLogout(); }}
            className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
            title="Logout">
            <LogOut size={18} />
          </button>

        </div>
      </div>
    </header>
  );
}

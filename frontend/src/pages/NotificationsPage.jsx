import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifications } from '../services/api';

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const getColumn = (n) => {
  if (['project_update', 'project_invite'].includes(n.type)) return 'projects';
  if (['task_assigned', 'task_updated'].includes(n.type)) return 'tasks';
  if (['mention', 'system', 'meeting_reminder', 'deadline_alert', 'warning', 'worklog_added', 'project_relay', 'wiki_created'].includes(n.type)) return 'other';
  if (n.type === 'status_change') {
    if (/project/i.test(n.title)) return 'projects';
    return 'tasks';
  }
  return 'other';
};

const getProjectDot = (n) => {
  const t = (n.title + ' ' + n.message).toLowerCase();
  if (/launched|delivered|completed/.test(t)) return '#10B981';
  if (/created/.test(t)) return '#F59E0B';
  if (/cancelled|canceled/.test(t)) return '#EF4444';
  return '#3B82F6';
};

const getTaskIcon = (n) => {
  const t = (n.title + ' ' + n.message).toLowerCase();
  if (/tc-|test case/.test(t)) return '🧪';
  if (n.type === 'deadline_alert' || /overdue/.test(t)) return '⏰';
  if (/completed|done|passed/.test(t)) return '✅';
  return '⚠️';
};

const getOtherIcon = (n) => {
  if (n.type === 'mention' || /mentioned/.test(n.message)) return '💬';
  if (n.type === 'meeting_reminder') return '📅';
  if (n.type === 'deadline_alert' || /overdue/.test(n.title)) return '⏰';
  if (n.type === 'project_relay') return '🎯';
  if (n.type === 'wiki_created') return '📄';
  return '🔔';
};

const COLUMN_CONFIG = {
  projects: {
    icon: '📁', label: 'Projects', color: '#2563EB', bg: '#EFF6FF',
    borderColor: '#2563EB',
  },
  tasks: {
    icon: '✅', label: 'Tasks & Tests', color: '#059669', bg: '#ECFDF5',
    borderColor: '#059669',
  },
  other: {
    icon: '📢', label: 'Other', color: '#6B7280', bg: '#F9FAFB',
    borderColor: '#6B7280',
  },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    notifications.cleanupStale()
      .catch(() => {})
      .finally(() => {
        notifications.getAll()
          .then(r => setNotifs(r.data))
          .catch(() => {});
      });
  }, []);

  const handleAction = async (n, actionName) => {
    try {
      const res = await notifications.handleAction(n._id, actionName);
      const status = res.data?.status;
      if (status === 'active' || status === 'declined') {
        setNotifs(prev => prev.filter(item => item._id !== n._id));
      }
    } catch (err) { console.error(err); }
  };

  const toggleRead = async (n) => {
    try {
      if (n.read) {
        await notifications.markUnread(n._id);
      } else {
        await notifications.markRead(n._id);
      }
      setNotifs(prev => prev.map(item => item._id === n._id ? { ...item, read: !item.read } : item));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await notifications.delete(id);
      setNotifs(prev => prev.filter(item => item._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notifications.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  };

  const [activeTab, setActiveTab] = useState('projects');

  if (!user) return null;
  const projectsNotifs = notifs.filter(n => getColumn(n) === 'projects');
  const tasksNotifs = notifs.filter(n => getColumn(n) === 'tasks');
  const otherNotifs = notifs.filter(n => getColumn(n) === 'other');
  const unread = notifs.filter(n => !n.read).length;

  const TABS = [
    { key: 'projects', icon: '📁', label: 'Projects', color: '#2563EB', bg: '#EFF6FF' },
    { key: 'tasks', icon: '✅', label: 'Tasks', color: '#059669', bg: '#ECFDF5' },
    { key: 'other', icon: '📢', label: 'Other', color: '#6B7280', bg: '#F9FAFB' },
  ];

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900">Notifications</h1>
            {unread > 0 && (
              <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">{unread} unread</span>
            )}
          </div>
          <button onClick={() => navigate(-1)}
            className="text-sm text-neutral-500 hover:text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-lg transition-colors">
            Back
          </button>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {unread > 0 && (
            <div className="flex justify-end px-5 pt-3 pb-0">
              <button onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer transition-colors">
                <span>✓✓</span> Mark all as read <span className="text-neutral-400 font-normal">({unread})</span>
              </button>
            </div>
          )}
          <div className="flex border-b border-neutral-100">
            {TABS.map(tab => {
              const count = notifs.filter(n => getColumn(n) === tab.key && !n.read).length;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-12 text-sm font-medium transition-all duration-200 bg-transparent border-none cursor-pointer relative"
                  style={{
                    color: isActive ? tab.color : '#6B7280',
                    fontWeight: isActive ? 600 : 400,
                    borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                    background: isActive ? tab.bg : '#FFFFFF',
                  }}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none" style={{background:tab.color}}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="p-5 space-y-2 transition-all duration-200">
            {(() => {
              const activeNotifs = notifs.filter(n => getColumn(n) === activeTab);
              const cfg = COLUMN_CONFIG[activeTab];
              if (activeNotifs.length === 0) {
                const emptyMessages = { projects: 'No project notifications yet', tasks: 'No task notifications yet', other: 'No other notifications' };
                return (
                  <div className="flex flex-col items-center justify-center py-14 text-neutral-400">
                    <span className="text-3xl mb-3">{cfg.icon}</span>
                    <p className="text-sm">{emptyMessages[activeTab]}</p>
                  </div>
                );
              }
              return activeNotifs.map(n => (
                <div key={n._id}
                  className="relative bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-md group"
                  style={{borderColor:'#E5E7EB',borderLeftWidth:n.read ? 1 : 3,borderLeftColor:n.read ? '#E5E7EB' : cfg.borderColor}}>
                  <div className="flex items-start gap-2">
                    {activeTab === 'projects' && (
                      <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{background:getProjectDot(n)}} />
                    )}
                    {activeTab === 'tasks' && (
                      <span className="mt-0.5 shrink-0">{getTaskIcon(n)}</span>
                    )}
                    {activeTab === 'other' && (
                      <span className="mt-0.5 shrink-0">{getOtherIcon(n)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${n.read ? 'text-neutral-500' : 'font-semibold text-neutral-900'}`} style={n.metadata?.stale ? {textDecoration:'line-through',opacity:0.6} : {}}>{n.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span onClick={() => toggleRead(n)}
                            className="cursor-pointer text-xs select-none transition-colors hover:opacity-70"
                            title={n.read ? 'Mark as unread' : 'Mark as read'}
                            style={{ color: n.read ? '#2563EB' : '#9CA3AF' }}>
                            {n.read ? '✓✓' : '✓'}
                          </span>
                          <button onClick={() => handleDelete(n._id)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-danger-500 bg-transparent border-none cursor-pointer text-sm p-0.5 transition-all"
                            title="Delete">&times;</button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-500 mt-0.5" style={n.metadata?.stale ? {textDecoration:'line-through',opacity:0.6} : {}}>{n.message}</p>
                      <p className="text-xs text-neutral-300 mt-1.5">{timeAgo(n.createdAt)}</p>
                      {n.actions && n.actions.length > 0 && !n.read && (
                        <div className="flex gap-2 mt-2">
                          {n.actions.map(a => (
                            <button key={a.action} onClick={() => handleAction(n, a.action)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg border-none cursor-pointer transition-colors"
                              style={{background:a.action === 'accept_invite' ? '#2347e8' : '#f3f4f6',color:a.action === 'accept_invite' ? 'white' : '#374151'}}>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {n.link && !n.metadata?.stale && (
                        <button onClick={() => navigate(n.link)}
                          className="text-xs font-medium mt-2 bg-transparent border-none cursor-pointer p-0 transition-colors"
                          style={{color:cfg.color}}>
                          View details →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

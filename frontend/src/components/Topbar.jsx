import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { notifications } from '../services/api';

const STATUS_DOT = {
  active: 'bg-success-500', idle: 'bg-warning-500',
  in_meeting: 'bg-info-500', inactive: 'bg-neutral-400', offline: 'bg-neutral-300',
};

const PLAN_INFO = {
  starter: { label: 'Starter', color: '#6b7280', bg: '#f3f4f6', limit: 10 },
  team: { label: 'Team', color: '#1e40af', bg: '#eef2ff', limit: 50 },
  enterprise: { label: 'Enterprise', color: '#92400e', bg: '#fffbeb', limit: Infinity },
};
const PLAN_ICON = { starter: '🌱', team: '🚀', enterprise: '🏢' };

export default function Topbar({ sidebarWidth, showHamburger, onHamburgerClick }) {
  const { user, company, logout, socket } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const panelRef = useRef(null);
  const unread = notifs.filter(n => !n.read).length;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const [notifSettings, setNotifSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notifSettings') || '{"sound":true,"enabled":true}'); }
    catch { return { sound: true, enabled: true }; }
  });
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearch(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      try {
        const q = searchQuery.trim();
        const res = await api.get('/search', { params: { q } });
        if (!mountedRef.current) return;
        const results = res.data.results || [];
        setSearchResults(results);
        setShowSearch(results.length > 0);
      } catch (e) { console.error(e); }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const fetchNotifs = () => {
    notifications.getAll()
      .then(r => setNotifs(r.data))
      .catch(() => {});
  };

  useEffect(() => { fetchNotifs(); }, []);

  useEffect(() => { localStorage.setItem('notifSettings', JSON.stringify(notifSettings)); }, [notifSettings]);

  const [toast, setToast] = useState(null);

  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = ctx.createGain();
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      [523.25, 659.25].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        o.connect(g);
        o.start(ctx.currentTime + i * 0.12);
        o.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch (e) {}
  }

  useEffect(() => {
    if (!socket || !notifSettings.enabled) return;
    const onNotif = (n) => {
      setNotifs(prev => [n, ...prev]);
      setToast(n);
      if (notifSettings.sound) playNotifSound();
      setTimeout(() => setToast(null), 4000);
    };
    socket.on('notification', onNotif);
    return () => socket.off('notification', onNotif);
  }, [socket, notifSettings]);

  const handleAction = async (n, actionName) => {
    try {
      const res = await notifications.handleAction(n._id, actionName);
      const status = res.data?.status;
      if (status === 'active' || status === 'declined') {
        fetchNotifs();
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
      fetchNotifs();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await notifications.delete(id);
      fetchNotifs();
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notifications.markAllRead();
      fetchNotifs();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

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
    if (['project_update', 'project_invite'].includes(n.type)) {
      if (/test case|tc-|test_case/i.test(n.title + ' ' + n.message)) return 'tasks';
      return 'projects';
    }
    if (['task_assigned', 'task_updated', 'task_update', 'status_change'].includes(n.type)) return 'tasks';
    if (['mention', 'system', 'meeting_reminder', 'deadline_alert'].includes(n.type)) return 'other';
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
    return '🔔';
  };

  const projectsNotifs = notifs.filter(n => getColumn(n) === 'projects');
  const tasksNotifs = notifs.filter(n => getColumn(n) === 'tasks');
  const otherNotifs = notifs.filter(n => getColumn(n) === 'other');

  const COLUMN_CONFIG = {
    projects: {
      icon: '📁', label: 'Projects', color: '#2563EB', bg: '#EFF6FF',
      borderColor: '#2563EB', hoverBg: '#EFF6FF',
    },
    tasks: {
      icon: '✅', label: 'Tasks & Tests', color: '#059669', bg: '#ECFDF5',
      borderColor: '#059669', hoverBg: '#ECFDF5',
    },
    other: {
      icon: '📢', label: 'Other', color: '#6B7280', bg: '#F9FAFB',
      borderColor: '#6B7280', hoverBg: '#F9FAFB',
    },
  };

  const TABS = [
    { key: 'projects', icon: '📁', label: 'Projects', color: '#2563EB', bg: '#EFF6FF' },
    { key: 'tasks', icon: '✅', label: 'Tasks', color: '#059669', bg: '#ECFDF5' },
    { key: 'other', icon: '📢', label: 'Other', color: '#6B7280', bg: '#F9FAFB' },
  ];

  const renderColumn = (key, notifsList, getIcon, getDot) => {
    const cfg = COLUMN_CONFIG[key];
    return (
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg mb-2 shrink-0" style={{background:cfg.bg}}>
          <span className="text-xs">{cfg.icon}</span>
          <span className="text-xs font-semibold" style={{color:cfg.color}}>{cfg.label} ({notifsList.length})</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5" style={{maxHeight:310}}>
          {notifsList.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-neutral-400">No {key === 'other' ? '' : key} notifications yet</p>
            </div>
          ) : notifsList.map(n => (
            <div key={n._id}
              onClick={() => { if (n.link) { navigate(n.link); setShowPanel(false); } else if (!n.read) toggleRead(n); }}
              className="relative bg-white border rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 group"
              style={{borderColor:'#E5E7EB',borderLeftWidth:n.read ? 1 : 3,borderLeftColor:n.read ? '#E5E7EB' : cfg.borderColor,borderRadius:8}}>
              <div className="flex items-start gap-1.5">
                {getDot && (
                  <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{background:getDot(n)}} />
                )}
                {getIcon && !getDot && (
                  <span className="text-xs mt-0.5 shrink-0">{getIcon(n)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs truncate ${n.read ? 'text-neutral-500' : 'font-semibold text-neutral-900'}`}>{n.title}</p>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-neutral-300 mt-1">{timeAgo(n.createdAt)}</p>
                  {n.actions && n.actions.length > 0 && !n.read && (
                    <div className="flex gap-1 mt-1.5">
                      {n.actions.map(a => (
                        <button key={a.action} onClick={(e) => { e.stopPropagation(); handleAction(n, a.action); }}
                          className="text-[9px] font-semibold px-2 py-0.5 rounded border-none cursor-pointer transition-colors"
                          style={{background:a.action === 'accept_invite' ? '#2347e8' : '#f3f4f6',color:a.action === 'accept_invite' ? 'white' : '#374151'}}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span onClick={(e) => { e.stopPropagation(); toggleRead(n); }}
                  className="cursor-pointer text-xs select-none transition-colors hover:opacity-70"
                  title={n.read ? 'Mark as unread' : 'Mark as read'}
                  style={{ color: n.read ? '#2563EB' : '#9CA3AF' }}>
                  {n.read ? '✓✓' : '✓'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Link to="/notifications" onClick={() => setShowPanel(false)}
          className="block text-center text-[10px] font-semibold py-2 mt-1 rounded-lg hover:bg-opacity-50 transition-colors shrink-0"
          style={{color:cfg.color}}
          onMouseEnter={e => e.target.style.background = cfg.bg}
          onMouseLeave={e => e.target.style.background = 'transparent'}>
          View all {key === 'other' ? '' : key} →
        </Link>
      </div>
    );
  };

  return (
    <header style={{ left: sidebarWidth }} className="h-14 bg-white border-b border-neutral-200 fixed top-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 transition-all duration-300 ease-in-out shadow-sm">
      {showHamburger && (
        <button onClick={onHamburgerClick}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 mr-2 cursor-pointer bg-transparent border-none transition-colors shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10001] bg-neutral-800 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-medium max-w-[400px] pointer-events-none animate-fade-in">
          {toast.title}
        </div>
      )}
      <div className="relative" ref={searchRef}>
        <div className="flex items-center gap-2 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-1.5 w-[240px] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" placeholder="Search projects, tasks..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setShowSearch(false); } }}
            onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
            className="bg-transparent border-none outline-none text-xs text-neutral-700 w-full placeholder:text-neutral-400" />
        </div>
        {showSearch && (
          <div className="absolute top-10 left-0 w-[320px] bg-white rounded-2xl border border-neutral-200 shadow-2xl z-50 max-h-72 overflow-y-auto animate-fade-in">
            {searchResults.map((r, i) => (
              <div key={i} onClick={() => { navigate(r.to); setShowSearch(false); setSearchQuery(''); }}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
                <span className="text-[10px] font-semibold text-neutral-400 w-14 shrink-0">{r.type}</span>
                <span className="text-xs text-neutral-800 truncate">{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={panelRef}>
          <button onClick={() => { setShowPanel(v => !v); setShowNotifSettings(false); }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 cursor-pointer text-sm transition-colors">
            🔔
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-[16px] h-[16px] bg-danger-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-[2px] border-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showPanel && (
            <div className="absolute right-0 top-10 w-[380px] bg-white rounded-2xl border border-neutral-200 shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <span className="text-sm font-semibold text-neutral-900">Notifications</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer transition-colors">
                      <span>✓✓</span> Mark all as read <span className="text-neutral-400 font-normal">({unread})</span>
                    </button>
                  )}
                  <button onClick={() => setShowPanel(false)}
                    className="text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer p-0.5 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex border-b border-neutral-100">
                {TABS.map(tab => {
                  const count = notifs.filter(n => getColumn(n) === tab.key && !n.read).length;
                  const isActive = activeTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 text-xs font-medium transition-all duration-200 bg-transparent border-none cursor-pointer relative"
                      style={{
                        color: isActive ? tab.color : '#6B7280',
                        fontWeight: isActive ? 600 : 400,
                        borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                        background: isActive ? tab.bg : '#FFFFFF',
                      }}>
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none" style={{background:tab.color}}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="max-h-[350px] overflow-y-auto p-4 space-y-1.5 transition-all duration-200">
                {(() => {
                  const activeNotifs = notifs.filter(n => getColumn(n) === activeTab);
                  const cfg = COLUMN_CONFIG[activeTab];
                  if (activeNotifs.length === 0) {
                    const emptyMessages = { projects: 'No project notifications yet', tasks: 'No task notifications yet', other: 'No other notifications' };
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-neutral-400 transition-opacity duration-200">
                        <span className="text-2xl mb-2">{cfg.icon}</span>
                        <p className="text-xs">{emptyMessages[activeTab]}</p>
                      </div>
                    );
                  }
                  return activeNotifs.map(n => (
                    <div key={n._id}
                      onClick={() => { if (n.link) { navigate(n.link); setShowPanel(false); } else if (!n.read) toggleRead(n); }}
                      className="relative bg-white border rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 group hover:shadow-sm"
                      style={{borderColor:'#E5E7EB',borderLeftWidth:n.read ? 1 : 3,borderLeftColor:n.read ? '#E5E7EB' : cfg.borderColor,borderRadius:8}}>
                      <div className="flex items-start gap-1.5">
                        {activeTab === 'projects' && (
                          <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{background:getProjectDot(n)}} />
                        )}
                        {activeTab === 'tasks' && (
                          <span className="text-xs mt-0.5 shrink-0">{getTaskIcon(n)}</span>
                        )}
                        {activeTab === 'other' && (
                          <span className="text-xs mt-0.5 shrink-0">{getOtherIcon(n)}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs truncate ${n.read ? 'text-neutral-500' : 'font-semibold text-neutral-900'}`}>{n.title}</p>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-neutral-300 mt-1">{timeAgo(n.createdAt)}</p>
                          {n.actions && n.actions.length > 0 && !n.read && (
                            <div className="flex gap-1 mt-1.5">
                              {n.actions.map(a => (
                                <button key={a.action} onClick={(e) => { e.stopPropagation(); handleAction(n, a.action); }}
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded border-none cursor-pointer transition-colors"
                                  style={{background:a.action === 'accept_invite' ? '#2347e8' : '#f3f4f6',color:a.action === 'accept_invite' ? 'white' : '#374151'}}>
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <span onClick={(e) => { e.stopPropagation(); toggleRead(n); }}
                          className="cursor-pointer text-xs select-none transition-colors hover:opacity-70"
                          title={n.read ? 'Mark as unread' : 'Mark as read'}
                          style={{ color: n.read ? '#2563EB' : '#9CA3AF' }}>
                          {n.read ? '✓✓' : '✓'}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-neutral-100">
                <span />
                <button onClick={() => { setShowPanel(false); setShowNotifSettings(true); }}
                  className="text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer p-1 rounded transition-colors hover:bg-neutral-100"
                  title="Notification settings">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-neutral-200" />
        {(() => {
          const plan = company?.plan || 'starter';
          const info = PLAN_INFO[plan] || PLAN_INFO.starter;
          const usage = company?.usage || {};
          const userPct = info.limit === Infinity ? 0 : Math.round(((usage.userCount || 0) / info.limit) * 100);
          const badge = (
            <>
              <span style={{fontSize:12}}>{PLAN_ICON[plan] || '📋'}</span>
              <span className="tracking-wider">PLAN</span>
              <span className="font-bold">{info.label}</span>
              {info.limit !== Infinity && (
                <span className="flex items-center gap-1.5 ml-1">
                  <span className="w-9 h-[3px] rounded-full overflow-hidden" style={{background:'rgba(0,0,0,0.08)'}}>
                    <span className="block h-full rounded-full transition-all" style={{width:`${Math.min(userPct,100)}%`,background:userPct >= 90 ? '#ef4444' : info.color}} />
                  </span>
                  <span className="text-[9px] opacity-60 font-medium">{usage.userCount || 0}/{info.limit}</span>
                </span>
              )}
            </>
          );
          return user?.role === 'admin' ? (
            <Link to="/admin" className="flex items-center gap-2 text-[11px] font-semibold rounded-full px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer"
              style={{color:info.color,background:info.bg}}>
              {badge}
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-semibold rounded-full px-3.5 py-1.5 border border-neutral-200 cursor-default"
              style={{color:info.color,background:info.bg}}>
              {badge}
            </div>
          );
        })()}
        <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="text-right">
            <p className="text-xs font-semibold text-neutral-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-neutral-400 leading-tight capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <div className="relative shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <span className={`absolute -bottom-[1px] -right-[1px] w-[10px] h-[10px] border-[2px] border-white rounded-full ${STATUS_DOT[user?.status] || 'bg-neutral-300'}`} />
          </div>
        </Link>
        <button onClick={logout}
          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
          title="Sign out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
      {showNotifSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onClick={() => setShowNotifSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[340px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900">Notification Settings</p>
              <button onClick={() => setShowNotifSettings(false)}
                className="text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer p-0.5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-neutral-600">🔔 Notification sound</span>
              <button onClick={() => setNotifSettings(s => ({ ...s, sound: !s.sound }))}
                className={`relative w-9 h-5 rounded-full transition-colors border-none cursor-pointer ${notifSettings.sound ? 'bg-brand-600' : 'bg-neutral-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${notifSettings.sound ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-neutral-600">🔕 Enable notifications</span>
              <button onClick={() => setNotifSettings(s => ({ ...s, enabled: !s.enabled }))}
                className={`relative w-9 h-5 rounded-full transition-colors border-none cursor-pointer ${notifSettings.enabled ? 'bg-brand-600' : 'bg-neutral-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${notifSettings.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </label>
          </div>
        </div>
      )}
    </header>
  );
}

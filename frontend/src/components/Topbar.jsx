import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifications, projects, tasks, sprints, users } from '../services/api';

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

export default function Topbar({ sidebarWidth }) {
  const { user, company, logout, socket } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const unread = notifs.filter(n => !n.read).length;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearch(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = searchQuery.trim();
        const [projRes, taskRes, sprintRes, userRes] = await Promise.all([
          projects.getAll(),
          tasks.getAll(),
          sprints.getAll(),
          users.getAll({ search: q }),
        ]);
        const allProj = projRes.data || [];
        const allTasks = taskRes.data || [];
        const allSprints = sprintRes.data || [];
        const allUsers = userRes.data || [];
        const lq = q.toLowerCase();
        const results = [
          ...allProj.filter(p => p.name?.toLowerCase().includes(lq)).slice(0, 5).map(p => ({ type:'Project', label:p.name, to:`/projects/${p._id}` })),
          ...allTasks.filter(t => t.title?.toLowerCase().includes(lq)).slice(0, 5).map(t => ({ type:'Task', label:t.title, to:`/tasks` })),
          ...allSprints.filter(s => s.name?.toLowerCase().includes(lq)).slice(0, 5).map(s => ({ type:'Sprint', label:s.name, to:`/sprints` })),
          ...allUsers.filter(u => u.name?.toLowerCase().includes(lq)).slice(0, 5).map(u => ({ type:'User', label:u.name, to:`/users` })),
        ];
        setSearchResults(results);
        setShowSearch(results.length > 0);
      } catch (e) { console.error(e); }
    }, 250);
  }, [searchQuery]);

  const fetchNotifs = () => {
    notifications.getAll()
      .then(r => setNotifs(r.data))
      .catch(() => {});
  };

  useEffect(() => { fetchNotifs(); }, []);

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
    if (!socket) return;
    const onNotif = (n) => {
      setNotifs(prev => [n, ...prev]);
      setToast(n);
      playNotifSound();
      setTimeout(() => setToast(null), 4000);
    };
    socket.on('notification', onNotif);
    return () => socket.off('notification', onNotif);
  }, [socket]);

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

  return (
    <header style={{ left: sidebarWidth || 200 }} className="h-12 bg-white border-b border-neutral-200 fixed top-0 right-0 z-30 flex items-center justify-between px-5 transition-all duration-300 ease-in-out">
      {toast && (
        <div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:10001,background:'#1f2937',color:'white',padding:'10px 18px',borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,0.2)',fontSize:12,fontWeight:500,maxWidth:400,pointerEvents:'none',animation:'fadeSlideDown 0.3s ease'}}>
          🔔 {toast.title}
        </div>
      )}
      <div className="relative" ref={searchRef}>
        <div className="flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 w-[200px]">
          <span className="text-neutral-400 text-[11px]">🔍</span>
          <input type="text" placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setShowSearch(false); } }}
            onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
            className="bg-transparent border-none outline-none text-xs text-neutral-700 w-full" />
        </div>
        {showSearch && (
          <div className="absolute top-9 left-0 w-[300px] bg-white rounded-xl border border-neutral-200 shadow-modal z-50 max-h-72 overflow-y-auto">
            {searchResults.map((r, i) => (
              <div key={i} onClick={() => { navigate(r.to); setShowSearch(false); setSearchQuery(''); }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
                <span className="text-[10px] font-semibold text-neutral-400 w-12 shrink-0">{r.type}</span>
                <span className="text-xs text-neutral-800 truncate">{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="relative" ref={panelRef}>
          <button onClick={() => setShowPanel(v => !v)}
            className="relative w-7 h-7 flex items-center justify-center rounded-md bg-neutral-100 cursor-pointer text-[13px]">
            🔔
            {unread > 0 && (
              <span className="absolute top-[2px] right-[2px] w-[14px] h-[14px] bg-danger-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-[1.5px] border-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showPanel && (
            <div className="absolute right-0 top-10 w-80 bg-white rounded-xl border border-neutral-200 shadow-modal z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <span className="text-sm font-semibold text-neutral-900">Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-center text-neutral-400 text-sm py-10">No notifications yet</p>
                ) : notifs.map(n => (
                  <div key={n._id} className="flex items-start gap-2 px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 group">
                    <button onClick={() => toggleRead(n)}
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 border-none cursor-pointer ${n.read ? 'bg-neutral-300 hover:bg-brand-400' : 'bg-brand-500 hover:bg-neutral-400'}`}
                      title={n.read ? 'Mark as unread' : 'Mark as read'} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (n.link) { navigate(n.link); setShowPanel(false); } else if (!n.read) toggleRead(n); }}>
                      <p className={`text-xs truncate ${n.read ? 'text-neutral-500' : 'font-semibold text-neutral-900'}`}>{n.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{n.message}</p>
                      {n.actions && n.actions.length > 0 && !n.read && (
                        <div className="flex gap-1.5 mt-1.5">
                          {n.actions.map(a => (
                            <button key={a.action} onClick={(e) => { e.stopPropagation(); handleAction(n, a.action); }}
                              style={{fontSize:9,background:a.action === 'accept_invite' ? '#2347e8' : '#f3f4f6',color:a.action === 'accept_invite' ? 'white' : '#374151',padding:'3px 8px',borderRadius:4,border:'none',cursor:'pointer',fontWeight:600}}>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(n._id)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 text-neutral-400 hover:text-danger-500 bg-transparent border-none cursor-pointer text-xs p-0.5 transition-opacity"
                      title="Delete">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-neutral-200" />
        {(() => {
          const plan = company?.plan || 'starter';
          const info = PLAN_INFO[plan] || PLAN_INFO.starter;
          const usage = company?.usage || {};
          const userPct = info.limit === Infinity ? 0 : Math.round(((usage.userCount || 0) / info.limit) * 100);
          return (
            <Link to="/admin" style={{display:'flex',alignItems:'center',gap:6,fontSize:10,fontWeight:600,color:info.color,background:info.bg,padding:'3px 10px',borderRadius:20,textDecoration:'none',cursor:'pointer',lineHeight:'18px'}}>
              <span style={{fontSize:11}}>{PLAN_ICON[plan] || '📋'}</span>
              <span style={{fontWeight:700}}>PLAN:</span>
              <span>{info.label}</span>
              {info.limit !== Infinity && (
                <span style={{display:'inline-flex',alignItems:'center',gap:3,marginLeft:2}}>
                  <span style={{width:32,height:3,background:'rgba(0,0,0,0.08)',borderRadius:2,display:'inline-block',overflow:'hidden',verticalAlign:'middle'}}>
                    <span style={{display:'block',height:'100%',width:`${Math.min(userPct,100)}%`,background:userPct >= 90 ? '#ef4444' : info.color,borderRadius:2}} />
                  </span>
                  <span style={{fontSize:8,opacity:0.7}}>{usage.userCount || 0}/{info.limit}</span>
                </span>
              )}
            </Link>
          );
        })()}
        <Link to="/profile" className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-neutral-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-neutral-400 leading-tight capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <div className="relative shrink-0">
            <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <span className={`absolute -bottom-[1px] -right-[1px] w-[9px] h-[9px] border-[1.5px] border-white rounded-full ${STATUS_DOT[user?.status] || 'bg-neutral-300'}`} />
          </div>
        </Link>
        <button onClick={logout}
          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
          title="Sign out">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

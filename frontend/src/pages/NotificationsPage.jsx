import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifications } from '../services/api';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    notifications.getAll()
      .then(r => setNotifs(r.data))
      .catch(() => {});
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-neutral-900">Notifications</h1>
          <button onClick={() => navigate(-1)}
            className="text-sm text-neutral-500 hover:text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-lg transition-colors">
            Back
          </button>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200">
          {notifs.length === 0 ? (
            <p className="text-center text-neutral-400 py-16">No notifications yet</p>
          ) : (
            notifs.map(n => (
              <div key={n._id} className="flex items-start gap-3 px-5 py-4 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 group">
                <button onClick={() => toggleRead(n)}
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 border-none cursor-pointer ${n.read ? 'bg-neutral-300 hover:bg-brand-400' : 'bg-brand-500 hover:bg-neutral-400'}`}
                  title={n.read ? 'Mark as unread' : 'Mark as read'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-neutral-500' : 'font-semibold text-neutral-900'}`}>{n.title}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{n.message}</p>
                  {n.actions && n.actions.length > 0 && !n.read && (
                    <div className="flex gap-2 mt-2">
                      {n.actions.map(a => (
                        <button key={a.action} onClick={() => handleAction(n, a.action)}
                          style={{fontSize:11,background:a.action === 'accept_invite' ? '#2347e8' : '#f3f4f6',color:a.action === 'accept_invite' ? 'white' : '#374151',padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600}}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(n._id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-neutral-400 hover:text-danger-500 bg-transparent border-none cursor-pointer text-sm p-1 transition-opacity"
                  title="Delete">&times;</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

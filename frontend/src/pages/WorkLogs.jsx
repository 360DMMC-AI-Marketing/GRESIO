import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Dropdown from '../components/Dropdown';
import toast from 'react-hot-toast';

const MOOD_EMOJI = { great:'😊', good:'🙂', okay:'😐', difficult:'😓' };
const CATEGORIES = ['development', 'meeting', 'review', 'testing', 'deployment', 'other'];
const MOODS = ['great','good','okay','difficult'];
const STATUS_DOT = { todo:'#d1d5db', in_progress:'#3b82f6', review:'#f59e0b', done:'#22c55e', delayed:'#ef4444' };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = key.split('.').reduce((o, p) => o?.[p], item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export default function WorkLogs() {
  const { user } = useAuth();
  const isManager = ['admin','project_manager','team_lead'].includes(user?.role);

  const [view, setView] = useState('my'); // my, history
  const [myLogs, setMyLogs] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [userData, setUserData] = useState({ projects: [], tasks: [] });
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [hours, setHours] = useState(1);
  const [category, setCategory] = useState('development');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('good');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('select');
  const [editingId, setEditingId] = useState(null);

  const today = todayStr();

  const loadMyLogs = async (date) => {
    try {
      const res = await api.get('/work-logs/my', { params: { date: date || today } });
      setMyLogs(res.data);
    } catch (e) { /* ignore */ }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get(`/work-logs/history/${user._id}`);
      setHistoryLogs(res.data);
    } catch (e) { /* ignore */ }
  };

  const loadUserData = async () => {
    try {
      const res = await api.get('/work-logs/user-data');
      setUserData(res.data);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([
      loadMyLogs(),
      loadUserData(),
    ]).finally(() => setLoading(false));
  }, []);

  const openForm = (log) => {
    if (log) {
      setEditingId(log._id);
      setSelectedProject(log.project?._id || '');
      setSelectedTask(log.task?._id || '');
      setHours(log.hours);
      setCategory(log.category);
      setDescription(log.description || '');
      setNotes(log.notes || '');
      setMood(log.mood || 'good');
      setStep('confirm');
    } else {
      setEditingId(null);
      setSelectedProject('');
      setSelectedTask('');
      setHours(1);
      setCategory('development');
      setDescription('');
      setNotes('');
      setMood('good');
      setStep('select');
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const body = {
        date: today, project: selectedProject || undefined,
        task: selectedTask || undefined, taskTitle: userData.tasks.find(t => t._id === selectedTask)?.title || 'Work',
        hours, category, description, notes, mood,
      };
      if (editingId) {
        await api.patch(`/work-logs/${editingId}`, body);
      } else {
        await api.post('/work-logs', body);
      }
      setShowForm(false);
      setEditingId(null);
      await loadMyLogs();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const projectTasks = selectedProject
    ? userData.tasks.filter(t => t.project?._id === selectedProject || t.project === selectedProject)
    : [];

  const myHours = myLogs.reduce((s, l) => s + (l.hours || 0), 0);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-surface-900">📋 Work Log</h1>
          <p className="text-sm text-surface-500 mt-0.5">Track your daily work across projects</p>
        </div>
        <button onClick={() => { openForm(); loadUserData(); }}
          className="btn btn-blue text-sm">
          + Log work
        </button>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 mb-5 bg-surface-100 rounded-lg p-1 w-fit">
        {[
          { key:'my', label:`My Log (${myLogs.length})` },
          { key:'history', label:'History (14d)' },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setView(tab.key); if (tab.key === 'history') loadHistory(); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border-none ${
              view === tab.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700 bg-transparent'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Log View */}
      {view === 'my' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-surface-900">{new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}</h2>
              <p className="text-sm text-surface-400">{myLogs.length} entries · {myHours}h total</p>
            </div>
          </div>

          {myLogs.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No work logged today</p>
              <button onClick={() => { openForm(); loadUserData(); }} className="btn btn-blue mt-3 text-sm">Log your first entry</button>
            </div>
          ) : (
            <div className="space-y-2">
              {myLogs.map(log => (
                <div key={log._id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900 truncate">{log.taskTitle}</span>
                      {log.project && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 shrink-0">{log.project.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-surface-400 capitalize">{log.category}</span>
                      {log.description && <span className="text-xs text-surface-400 truncate">· {log.description}</span>}
                    </div>
                    {log.notes && <div className="text-xs text-surface-400 mt-0.5 italic">📝 {log.notes}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-surface-900">{log.hours}h</span>
                    <span className="text-base">{MOOD_EMOJI[log.mood]}</span>
                    <button onClick={() => openForm(log)}
                      className="text-xs text-primary-600 hover:text-primary-800 bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-surface-900 mb-4">Last 14 Days</h2>
          {historyLogs.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">No logs found in the last 14 days</p>
            </div>
          ) : (
            (() => {
              const grouped = groupBy(historyLogs, 'date');
              return Object.entries(grouped).sort(([a],[b]) => b.localeCompare(a)).map(([date, logs]) => {
                const dayTotal = logs.reduce((s, l) => s + (l.hours || 0), 0);
                return (
                  <div key={date} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-surface-700">
                        {new Date(date+'T00:00:00').toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' })}
                      </span>
                      <span className="text-xs text-surface-400">{dayTotal}h · {logs.map(l => MOOD_EMOJI[l.mood]).filter(Boolean).join(' ')}</span>
                    </div>
                    <div className="space-y-1">
                      {logs.map(log => (
                        <div key={log._id} className="p-2 bg-surface-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-surface-700 truncate">{log.taskTitle}</span>
                            {log.project && <span className="text-[10px] text-surface-400">{log.project.name}</span>}
                            <span className="text-xs text-surface-400 capitalize">{log.category}</span>
                            <span className="text-sm font-semibold text-surface-900">{log.hours}h</span>
                          </div>
                          {(log.description || log.notes) && (
                            <div className="text-[11px] text-surface-400 mt-1">
                              {log.description && <span>{log.description}</span>}
                              {log.notes && <span className="italic ml-2">📝 {log.notes}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[420px] max-h-[85vh] overflow-y-auto z-[1002] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-surface-900">{editingId ? 'Edit Entry' : 'Log Today\'s Work'}</h3>
              <button onClick={() => setShowForm(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-100 text-surface-500 hover:text-surface-700 cursor-pointer border-none text-xs">✕</button>
            </div>

            {step === 'select' ? (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">1. Select Project</label>
                   <Dropdown value={selectedProject} onChange={v => { setSelectedProject(v); setSelectedTask(''); }}
                     options={[{value:'', label:'— Select project —'}, ...userData.projects.map(p => ({value:p._id, label:p.name}))]} style={{width:'100%'}} />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">2. Select Task</label>
                   <Dropdown value={selectedTask} onChange={v => setSelectedTask(v)}
                     options={selectedProject
                       ? [{value:'', label:'— Select task —'}, ...projectTasks.map(t => ({value:t._id, label:t.title}))]
                       : [{value:'', label:'— Select a project first —'}]
                     } style={{width:'100%'}} />
                </div>

                <button onClick={() => {
                  if (!selectedTask) { toast.error('Please select a task'); return; }
                  setStep('confirm');
                }}
                  className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer border-none">
                  Continue
                </button>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">Task</label>
                  <div className="px-3 py-2 bg-surface-50 rounded-lg text-sm text-surface-700">
                    {userData.tasks.find(t => t._id === selectedTask)?.title || 'Work'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1.5">Hours</label>
                    <input type="number" min="0.5" max="24" step="0.5" value={hours}
                      onChange={e => setHours(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1.5">Category</label>
                     <Dropdown value={category} onChange={v => setCategory(v)}
                       options={CATEGORIES.map(c => ({value:c, label:c}))} style={{width:'100%'}} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">Description (optional)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    rows={2} className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">Notes / Blockers (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">Mood</label>
                  <div className="flex gap-2">
                    {MOODS.map(m => (
                      <button key={m} onClick={() => setMood(m)}
                        className={`flex-1 py-2 rounded-lg text-lg transition-all cursor-pointer border ${
                          mood === m ? 'border-primary-500 bg-primary-50' : 'border-surface-200 bg-surface-50 hover:border-surface-300'
                        }`}>
                        {MOOD_EMOJI[m]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep('select')}
                    className="flex-1 py-2 bg-surface-100 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-200 transition-colors cursor-pointer border-none">
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={saving}
                    className="flex-[2] py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Save Entry'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

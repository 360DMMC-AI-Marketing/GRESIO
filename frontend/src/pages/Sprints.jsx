import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprints as sprintsApi, projects, tasks as tasksApi, users as usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Dropdown from '../components/Dropdown';

const STATUS_META = {
  planning: { label:'Planning', cls:'bg-neutral-100 text-neutral-600' },
  active:   { label:'Active',   cls:'bg-info-50 text-info-700' },
  completed:{ label:'Done',     cls:'bg-success-50 text-success-700' },
  cancelled:{ label:'Cancelled',cls:'bg-danger-50 text-danger-700' },
};
const STATUS_DOT = { planning:'#e5e7eb', active:'#2347e8', completed:'#22c55e', cancelled:'#dc2626' };
const BAR_GRADIENT = {
  planning: 'linear-gradient(90deg, #9ca3af, #d1d5db)',
  active:   'linear-gradient(90deg, #1e40af, #3b82f6)',
  completed:'linear-gradient(90deg, #047857, #34d399)',
  cancelled:'linear-gradient(90deg, #78716c, #a8a29e)',
};
const BAR_GLOW = {
  planning: '#9ca3af',
  active:   '#3b82f6',
  completed:'#34d399',
  cancelled:'#a8a29e',
};
const CAN_MANAGE = ['admin','team_lead','project_manager'];
const PRIORITY_CLS = { blocker:'priority-blocker', critical:'priority-critical', urgent:'priority-urgent', high:'priority-high', medium:'priority-medium', low:'text-neutral-400' };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'; }
function fmtDateFull(d) { return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'; }

export default function Sprints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title:'', priority:'medium', assignee:'', deadline:'' });
  const [creatingTask, setCreatingTask] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [expandedSprint, setExpandedSprint] = useState(null);
  const canManage = CAN_MANAGE.includes(user?.role);

  const fetch = () => {
    const params = {};
    if (filterProject) params.project = filterProject;
    if (filterStatus) params.status = filterStatus;
    sprintsApi.getAll(params).then(r => setList(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [filterProject, filterStatus]);
  useEffect(() => { projects.getAll().then(r => setAllProjects(r.data)).catch(() => {}); }, []);
  useEffect(() => { usersApi.getAll().then(r => setAllUsers(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sprintId = params.get('sprintId');
    if (sprintId) {
      setHighlightId(sprintId);
      setExpandedSprint(sprintId);
      params.delete('sprintId');
      window.history.replaceState(null, '', `/sprints?${params.toString()}`);
      setTimeout(() => {
        document.getElementById(`sprint-${sprintId}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 300);
      setTimeout(() => setHighlightId(null), 3000);
    }
  }, []);

  const handleRemoveTask = async (sprintId, taskId) => {
    try { await sprintsApi.removeTask(sprintId, taskId); fetch(); } catch (e) { console.error(e); }
  };

  const handleCreateTaskInSprint = async (sprintId) => {
    if (!taskForm.title.trim()) return;
    setCreatingTask(sprintId);
    try {
      const sprint = list.find(s => s._id === sprintId);
      await tasksApi.create({
        title: taskForm.title,
        priority: taskForm.priority,
        assignee: taskForm.assignee || undefined,
        projectId: sprint?.project?._id,
        sprint: sprintId,
        deadline: taskForm.deadline || undefined,
      });
      setTaskForm({ title:'', priority:'medium', assignee:'', deadline:'' });
      setShowAddTask(null);
      fetch();
    } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
    finally { setCreatingTask(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <>
    <style>{`
@keyframes auraPulse {
  0%, 100% { opacity: 0.4; transform: scaleY(1); }
  50% { opacity: 0.7; transform: scaleY(1.15); }
}
.sprint-bar-track { background: linear-gradient(90deg, #f1f5f9, #e2e8f0); }
.sprint-bar-glow {
  position: absolute;
  border-radius: 9999px;
  bottom: -2px;
  height: 20px;
  filter: blur(8px);
  animation: auraPulse 3s ease-in-out infinite;
  transition: width 0.7s ease-out;
}
.sprint-bar-fill {
  position: absolute;
  height: 100%;
  border-radius: 9999px;
  transition: width 0.7s ease-out;
}
    `}</style>
    <div>
      <div className="flex items-center justify-between mb-3">
        <div><h1 className="text-lg font-bold text-surface-900">Sprints</h1><p className="text-xs text-surface-400">{list.length} sprints</p></div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 px-3 py-2 mb-3 flex gap-2">
        <Dropdown value={filterProject} onChange={v => setFilterProject(v)}
          options={[{value:'', label:'All projects'}, ...allProjects.map(p => ({value:p._id, label:p.name}))]} style={{width:200}} />
        <Dropdown value={filterStatus} onChange={v => setFilterStatus(v)}
          options={[{value:'', label:'All statuses'}, ...Object.entries(STATUS_META).map(([v,m]) => ({value:v, label:m.label, dot: STATUS_DOT[v]}))]} style={{width:160}} />
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-surface-400"><p className="text-sm">No sprints found</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          {list.map(s => {
            const total = s.tasks?.length || 0;
            const done = s.tasks?.filter(t => t.status === 'done').length || 0;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            const isExpanded = expandedSprint === s._id;

            return (
              <div key={s._id} id={`sprint-${s._id}`}
                className={`border-b border-surface-100 last:border-b-0 transition-all ${
                  highlightId === s._id ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                }`}>
                <div className="flex items-center gap-3 px-4 py-2.5 transition-colors">
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${STATUS_META[s.status]?.cls}`}>
                    {STATUS_META[s.status]?.label}
                  </span>
                  <div className="min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => s.project?._id && navigate(`/projects/${s.project._id}`)}>
                    <span className="text-xs font-semibold text-surface-900">{s.name}</span>
                    {s.project && <span className="text-[10px] text-surface-400 ml-1.5">in {s.project.name}</span>}
                  </div>
                  <span className="text-[10px] text-surface-400 whitespace-nowrap">{fmtDate(s.startDate)} — {fmtDate(s.endDate)}</span>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${pct === 100 ? 'text-success-700' : 'text-surface-500'}`}>
                    {done}/{total} {pct}%
                  </span>
                  <button onClick={() => setExpandedSprint(isExpanded ? null : s._id)}
                    className="p-0.5 rounded hover:bg-surface-100 transition-colors cursor-pointer border-none bg-transparent">
                    <svg className={`w-3 h-3 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="px-4 pb-2.5">
                  <div className="relative h-2 sprint-bar-track rounded-full overflow-hidden">
                    <div className="sprint-bar-glow" style={{ width: `${pct}%`, background: BAR_GLOW[s.status] }} />
                    <div className="sprint-bar-fill" style={{ width: `${pct}%`, background: BAR_GRADIENT[s.status] }} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-surface-100 pt-2">
                    {s.tasks?.length > 0 ? (
                      <div className="space-y-0.5 mb-2">
                        {s.tasks.map(t => (
                          <div key={t._id} className="flex items-center gap-2 py-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              t.status === 'done' ? 'bg-emerald-500' :
                              t.status === 'in_progress' ? 'bg-blue-500' : 'bg-surface-300'
                            }`} />
                            <span className="flex-1 text-[10px] text-surface-700 truncate">{t.title}</span>
                            {t.priority && <span className={PRIORITY_CLS[t.priority] || 'priority-medium'} style={{fontSize:8,whiteSpace:'nowrap'}}>{t.priority}</span>}
                            {t.deadline && (
                              <span className={`text-[8px] whitespace-nowrap ${
                                new Date(t.deadline) < new Date() && t.status !== 'done' ? 'text-danger-500 font-semibold' : 'text-surface-400'
                              }`}>
                                {new Date(t.deadline).toLocaleDateString('en',{month:'short',day:'numeric'})}
                              </span>
                            )}
                            {t.assignee && (
                              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0"
                                style={{
                                  background: t.assignee.role === 'developer' ? '#f0fdf4' : t.assignee.role === 'intern' ? '#fff7ed' : '#dce6ff',
                                  color: t.assignee.role === 'developer' ? '#16a34a' : t.assignee.role === 'intern' ? '#c2410c' : '#1a35c4',
                                }}>
                                {t.assignee.name?.charAt(0)}
                              </div>
                            )}
                            {canManage && (
                              <span onClick={() => handleRemoveTask(s._id, t._id)}
                                className="text-[10px] text-red-400 hover:text-red-600 cursor-pointer shrink-0 transition-colors">✕</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-surface-400 italic mb-2">No tasks in this sprint</p>
                    )}

                    {canManage && (
                      <div>
                        {showAddTask === s._id ? (
                          <div className="flex flex-col gap-1.5 bg-surface-50 rounded-lg p-2">
                            <input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title:e.target.value})} placeholder="Task title *" autoFocus
                              className="w-full px-2 py-1 border border-surface-200 rounded text-[10px] bg-white outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 box-border" />
                            <div className="flex gap-1.5">
                              <Dropdown value={taskForm.priority} onChange={v => setTaskForm({...taskForm, priority:v})}
                                options={['low','medium','high','urgent','blocker','critical'].map(p => ({value:p, label:p.charAt(0).toUpperCase() + p.slice(1)}))} style={{flex:1}} />
                              <Dropdown value={taskForm.assignee} onChange={v => setTaskForm({...taskForm, assignee:v})}
                                options={[{value:'', label:'Unassigned'}, ...allUsers.map(u => ({value:u._id, label:u.name}))]} style={{flex:1}} />
                            </div>
                            <input type="date" className="select" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline:e.target.value})} />
                            <div className="flex gap-1.5">
                              <button onClick={() => handleCreateTaskInSprint(s._id)} disabled={creatingTask === s._id || !taskForm.title.trim()}
                                className={`flex-1 px-2 py-1 rounded text-[9px] font-semibold border-none transition-colors ${
                                  creatingTask === s._id || !taskForm.title.trim()
                                    ? 'bg-surface-200 text-surface-400 cursor-not-allowed'
                                    : 'bg-primary-600 text-white cursor-pointer hover:bg-primary-700'
                                }`}>
                                {creatingTask === s._id ? 'Creating…' : 'Create Task'}
                              </button>
                              <button onClick={() => { setShowAddTask(null); setTaskForm({title:'',priority:'medium',assignee:'',deadline:''}); }}
                                className="px-2 py-1 bg-surface-100 text-surface-600 rounded text-[9px] border-none cursor-pointer font-medium hover:bg-surface-200 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddTask(s._id)}
                            className="w-full px-2 py-1 bg-primary-50 text-primary-700 rounded text-[9px] font-semibold border-none cursor-pointer hover:bg-primary-100 transition-colors">
                            + Add Task
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

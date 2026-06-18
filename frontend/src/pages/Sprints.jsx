import { useState, useEffect } from 'react';
import { sprints as sprintsApi, projects, tasks as tasksApi, users as usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';

const STATUS_META = {
  planning: { label:'Planning', cls:'bg-neutral-100 text-neutral-600' },
  active:   { label:'Active',   cls:'bg-info-50 text-info-700' },
  completed:{ label:'Done',     cls:'bg-success-50 text-success-700' },
  cancelled:{ label:'Cancelled',cls:'bg-danger-50 text-danger-700' },
};
const CAN_MANAGE = ['admin','team_lead','project_manager'];
const PRIORITY_ORDER = { blocker:0, critical:1, urgent:2, high:3, medium:4, low:5 };
const PRIORITY_CLS = { blocker:'priority-blocker', critical:'priority-critical', urgent:'priority-urgent', high:'priority-high', medium:'priority-medium', low:'text-neutral-400' };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'; }

export default function Sprints() {
  const { user } = useAuth();
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
      const res = await tasksApi.create({
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

  if (loading) return (
    <div>
      <Skeleton.PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 space-y-4"><Skeleton.Box w="60%" h={20} /><Skeleton.Box w="100%" h={8} /><Skeleton.Text lines={2} /></div>)}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'#111827'}}>Sprints</div><div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>{list.length} sprints</div></div>
      </div>

      <div className="card" style={{padding:'8px 12px',marginBottom:12,display:'flex',gap:8}}>
        <Dropdown value={filterProject} onChange={v => setFilterProject(v)}
          options={[{value:'', label:'All projects'}, ...allProjects.map(p => ({value:p._id, label:p.name}))]} style={{width:200}} />
        <Dropdown value={filterStatus} onChange={v => setFilterStatus(v)}
          options={[{value:'', label:'All statuses'}, ...Object.entries(STATUS_META).map(([v,m]) => ({value:v, label:m.label}))]} style={{width:160}} />
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-neutral-400"><p className="text-4xl mb-3">⚡</p><p>No sprints found</p></div>
      ) : (
        <div className="sprint-grid">
          {list.map(s => {
            const total = s.tasks?.length || 0;
            const done = s.tasks?.filter(t => t.status === 'done').length || 0;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            return (
              <div className="sprint-card" key={s._id} id={`sprint-${s._id}`} style={highlightId === s._id ? {border:'2px solid #2347e8',boxShadow:'0 0 12px rgba(35,71,232,0.25)',transition:'all 0.3s'} : {}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                  <div>
                    <div className="sprint-name">{s.name}</div>
                    {s.project && <div className="sprint-proj">{s.project.name}</div>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontSize:9,background:STATUS_META[s.status]?.cls?.match(/bg-\w+-\d+/)?.[0] || '#f3f4f6',color:STATUS_META[s.status]?.cls?.match(/text-\w+-\d+/)?.[0] || '#4b5563',padding:'3px 8px',borderRadius:20,fontWeight:600}} className={STATUS_META[s.status]?.cls}>
                      {STATUS_META[s.status]?.label}
                    </span>
                  </div>
                </div>
                {s.goal && <div className="sprint-goal">{s.goal}</div>}
                <div className="sprint-dates">📅 {fmtDate(s.startDate)} → {fmtDate(s.endDate)}</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginTop:6}}>
                  <span style={{color:'#6b7280'}}>{done}/{total} tasks done</span>
                  <span style={{fontWeight:600,color:'#111827'}}>{pct}%</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`,background:pct === 100 ? '#22c55e' : '#2347e8'}} /></div>
                <div style={{maxHeight:200,overflowY:'auto',marginTop:4}}>
                  {s.tasks?.map(t => (
                    <div className="sprint-task-row" key={t._id} style={{display:'flex',alignItems:'center',gap:4}}>
                      <div className="t-dot" style={{background:t.status === 'done' ? '#22c55e' : t.status === 'in_progress' ? '#3b82f6' : '#e5e7eb',flexShrink:0}} />
                          <span style={{flex:1,fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span>
                          {t.priority && <span className={PRIORITY_CLS[t.priority] || 'priority-medium'} style={{fontSize:7}}>{t.priority}</span>}
                          {t.deadline && <span style={{fontSize:8,color:new Date(t.deadline)<new Date()&&t.status!=='done'?'#ef4444':'#9ca3af',flexShrink:0}}>{new Date(t.deadline).toLocaleDateString('en',{month:'short',day:'numeric'})}</span>}
                      {t.assignee && (
                        <div className="a-av" style={{width:14,height:14,fontSize:6,flexShrink:0,
                          background:t.assignee.role === 'developer' ? '#f0fdf4' : t.assignee.role === 'intern' ? '#fff7ed' : '#dce6ff',
                          color:t.assignee.role === 'developer' ? '#16a34a' : t.assignee.role === 'intern' ? '#c2410c' : '#1a35c4'}}>
                          {t.assignee.name?.charAt(0)}
                        </div>
                      )}
                      {canManage && (
                        <span onClick={() => handleRemoveTask(s._id, t._id)} style={{cursor:'pointer',color:'#f87171',fontSize:9,flexShrink:0}}>✕</span>
                      )}
                    </div>
                  ))}
                </div>
                {canManage && (
                  <div style={{marginTop:6}}>
                    {showAddTask === s._id ? (
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        <input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title:e.target.value})} placeholder="Task title *" autoFocus
                          style={{width:'100%',padding:'4px 6px',border:'0.5px solid #e5e7eb',borderRadius:4,fontSize:9,background:'#f9fafb',outline:'none',boxSizing:'border-box'}} />
                        <div style={{display:'flex',gap:4}}>
                          <Dropdown value={taskForm.priority} onChange={v => setTaskForm({...taskForm, priority:v})}
                            options={['low','medium','high','urgent','blocker','critical'].map(p => ({value:p, label:p.charAt(0).toUpperCase() + p.slice(1)}))} style={{flex:1}} />
                          <Dropdown value={taskForm.assignee} onChange={v => setTaskForm({...taskForm, assignee:v})}
                            options={[{value:'', label:'Unassigned'}, ...allUsers.map(u => ({value:u._id, label:u.name}))]} style={{flex:1}} />
                        </div>
                        <input type="date" className="select" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline:e.target.value})} />
                        <div style={{display:'flex',gap:4}}>
                          <button onClick={() => handleCreateTaskInSprint(s._id)} disabled={creatingTask === s._id || !taskForm.title.trim()}
                            style={{flex:1,padding:'4px 6px',background:'#2347e8',color:'white',border:'none',borderRadius:4,fontSize:9,fontWeight:600,cursor:creatingTask === s._id || !taskForm.title.trim()?'not-allowed':'pointer',opacity:creatingTask === s._id || !taskForm.title.trim()?0.6:1}}>
                            {creatingTask === s._id ? 'Creating…' : 'Create Task'}
                          </button>
                          <button onClick={() => { setShowAddTask(null); setTaskForm({title:'',priority:'medium',assignee:'',deadline:''}); }}
                            style={{fontSize:9,color:'#6b7280',background:'#f3f4f6',border:'none',borderRadius:4,padding:'4px 6px',cursor:'pointer'}}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddTask(s._id)}
                        style={{fontSize:9,color:'#2347e8',background:'#f0f4ff',border:'none',borderRadius:4,padding:'3px 8px',cursor:'pointer',width:'100%'}}>
                        + Add Task
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
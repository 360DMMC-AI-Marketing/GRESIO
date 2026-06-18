import { useState, useEffect } from 'react';
import { tasks, users as usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import toast from 'react-hot-toast';

const STATUS_CLASS = { todo:'t-todo', in_progress:'t-inprog', review:'t-review', done:'t-done', delayed:'t-todo' };
const PRIORITY_CLASS = { blocker:'priority-blocker', critical:'priority-critical', urgent:'priority-urgent', high:'priority-high', medium:'priority-medium', low:'text-neutral-400' };
const FILTERS = ['all','todo','in_progress','review','done','delayed'];
const SEPARATE_TYPES = ['Admin', 'HR', 'Meeting', 'Training', 'Research', 'Bug Fix', 'Other'];
const SEPARATE_COLORS = { Admin:'#6366f1', HR:'#ec4899', Meeting:'#f59e0b', Training:'#10b981', Research:'#3b82f6', 'Bug Fix':'#ef4444', Other:'#6b7280' };

export default function Tasks() {
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(urlParams.get('tab') === 'separate' ? 'separate' : 'project');
  const [projectTasks, setProjectTasks] = useState([]);
  const [separateTasks, setSeparateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [subOpen, setSubOpen] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [allUsers, setAllUsers] = useState([]);

  const canCreateSeparate = ['admin', 'project_manager', 'team_lead', 'manager'].includes(user?.role);
  const isManager = ['admin', 'project_manager', 'team_lead', 'manager'].includes(user?.role);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId');
    if (taskId) {
      tasks.getById(taskId).then(res => {
        setSelectedTask(res.data);
        if (res.data.scope === 'separate') setTab('separate');
        else setTab('project');
        params.delete('taskId');
        window.history.replaceState(null, '', `/tasks?${params.toString()}`);
      }).catch(() => {
        params.delete('taskId');
        window.history.replaceState(null, '', `/tasks?${params.toString()}`);
      });
    } else {
      const newTab = params.get('tab');
      if (newTab === 'separate' || newTab === 'project') setTab(newTab);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') !== tab) {
      params.set('tab', tab);
      window.history.replaceState(null, '', `/tasks?${params.toString()}`);
    }
  }, [tab]);

  const fetchProjectTasks = (f) => {
    setLoading(true);
    const params = {};
    if (f !== 'all') params.status = f;
    tasks.getAll(params).then((res) => setProjectTasks(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  const fetchSeparateTasks = (f) => {
    setLoading(true);
    const params = {};
    if (f !== 'all') params.status = f;
    tasks.getSeparate(params).then((res) => setSeparateTasks(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'project') fetchProjectTasks(filter);
    else fetchSeparateTasks(filter);
  }, [tab, filter]);

  useEffect(() => {
    usersApi.getAll().then((res) => setAllUsers(res.data)).catch(() => {});
  }, []);

  const currentList = tab === 'project' ? projectTasks : separateTasks;
  const filtered = search
    ? currentList.filter(t => (t.title || '').toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()))
    : currentList;

  const counts = { all: currentList.length, todo:0, in_progress:0, review:0, done:0, delayed:0 };
  currentList.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  const handleStatusChange = async (task, newStatus) => {
    try {
      await tasks.update(task._id, { status: newStatus });
      if (tab === 'project') fetchProjectTasks(filter);
      else fetchSeparateTasks(filter);
      if (selectedTask?._id === task._id) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (e) { alert(e.response?.data?.message || 'Failed to update status'); }
  };

  const toggleBulkSelect = (id) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (updates) => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0) return;
    try {
      const res = await tasks.bulkUpdate({ taskIds: ids, updates });
      const msg = res.data?.results;
      if (msg) toast.success(`${msg.updated} task(s) updated${msg.skipped > 0 ? `, ${msg.skipped} skipped` : ''}`);
      setSelectedTaskIds(new Set());
      if (tab === 'project') fetchProjectTasks(filter);
      else fetchSeparateTasks(filter);
    } catch (e) { toast.error(e.response?.data?.message || 'Bulk update failed'); }
  };

  if (loading && currentList.length === 0) {
    return (
      <div>
        <Skeleton.PageHeader />
        <div className="bg-white rounded-xl border border-surface-200">
          {[1,2,3,4,5,6].map(i => <Skeleton.TaskRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'#111827'}}>Tasks</div><div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>{currentList.length} tasks total</div></div>
        <div style={{display:'flex',gap:8}}>
          {(tab === 'separate' && canCreateSeparate) && (
            <button onClick={() => setShowCreateModal(true)}
              style={{padding:'6px 14px',background:'#2347e8',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
              + Add Separate Task
            </button>
          )}
        </div>
      </div>

      <div style={{display:'flex',gap:0,marginBottom:0,borderBottom:'1px solid #e5e7eb'}}>
        <div onClick={() => { setTab('project'); setFilter('all'); setSearch(''); setSelectedTask(null); }}
          style={{padding:'8px 20px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom: tab === 'project' ? '2px solid #2347e8' : '2px solid transparent',color: tab === 'project' ? '#2347e8' : '#6b7280',transition:'all 0.15s'}}>
          Project Tasks
        </div>
        <div onClick={() => { setTab('separate'); setFilter('all'); setSearch(''); setSelectedTask(null); }}
          style={{padding:'8px 20px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom: tab === 'separate' ? '2px solid #2347e8' : '2px solid transparent',color: tab === 'separate' ? '#2347e8' : '#6b7280',transition:'all 0.15s'}}>
          Separate Tasks
        </div>
      </div>

      <div className="card" style={{marginBottom:10,marginTop:10}}>
        <div style={{padding:'8px 12px',display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
          <div style={{display:'flex',gap:3}}>
            {FILTERS.map(s => (
              <span key={s} onClick={() => setFilter(s)}
                style={{padding:'4px 10px',background:filter === s ? '#2347e8' : '#f3f4f6',color:filter === s ? 'white' : '#6b7280',borderRadius:6,fontSize:10,fontWeight:filter === s ? 600 : 500,cursor:'pointer'}}>
                {s.replace('_', ' ')} <span style={{opacity:0.7}}>{counts[s]}</span>
              </span>
            ))}
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search..."
              style={{padding:'4px 8px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:10,background:'#f9fafb',outline:'none',width:110}} />
          </div>
        </div>
      </div>

      {selectedTaskIds.size > 0 && (
        <BulkActionBar count={selectedTaskIds.size} allUsers={allUsers} onAction={handleBulkAction} onClear={() => setSelectedTaskIds(new Set())} />
      )}

      {tab === 'project' ? (
        <ProjectTaskTable tasks={filtered} subOpen={subOpen} setSubOpen={setSubOpen} onSelect={setSelectedTask} onStatusChange={handleStatusChange} selectedIds={selectedTaskIds} onToggleSelect={toggleBulkSelect} />
      ) : (
        <SeparateTaskTable tasks={filtered} onSelect={setSelectedTask} onStatusChange={handleStatusChange} isManager={isManager} user={user} />
      )}

      {showCreateModal && (
        <CreateSeparateTaskModal
          allUsers={allUsers}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchSeparateTasks(filter); }}
        />
      )}

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          allUsers={allUsers}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => {
            if (tab === 'project') fetchProjectTasks(filter);
            else fetchSeparateTasks(filter);
          }}
          user={user}
        />
      )}
    </div>
  );
}

function ProjectTaskTable({ tasks: list, subOpen, setSubOpen, onSelect, onStatusChange, selectedIds, onToggleSelect }) {
  const allSelected = list.length > 0 && list.every(t => selectedIds.has(t._id));
  const toggleAll = () => {
    if (allSelected) {
      list.forEach(t => { if (selectedIds.has(t._id)) onToggleSelect(t._id); });
    } else {
      list.forEach(t => { if (!selectedIds.has(t._id)) onToggleSelect(t._id); });
    }
  };
  return (
    <div className="card">
      <table className="task-table">
        <thead><tr><th style={{width:28}}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll}
            style={{accentColor:'#2347e8',cursor:'pointer'}} />
        </th><th>Task</th><th>Project</th><th>Status</th><th>Subtask</th><th>Priority</th><th>Assignee</th><th>Deadline</th></tr></thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={8} style={{textAlign:'center',padding:20,fontSize:11,color:'#9ca3af'}}>No project tasks found</td></tr>
            ) : list.map((t) => {
            const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done';
            const subDone = t.subtasks?.filter(st => st.completed).length || 0;
            const subTotal = t.subtasks?.length || 0;
            return (
              <tr key={t._id} onClick={() => { if (!selectedIds?.has(t._id)) onSelect(t); }} style={{cursor:'pointer'}}>
                <td onClick={e => e.stopPropagation()} style={{width:28}}>
                  <input type="checkbox" checked={selectedIds?.has(t._id)} onChange={() => onToggleSelect?.(t._id)}
                    style={{accentColor:'#2347e8',cursor:'pointer'}} />
                </td>
                <td style={{fontWeight:500,color:'#111827'}}>
                  {t.title}
                  {t.description && <div style={{fontSize:10,color:'#9ca3af'}}>{t.description}</div>}
                </td>
                <td>
                  {t.project?.name && <span style={{fontSize:9,background:'#f0f4ff',color:'#2347e8',padding:'2px 6px',borderRadius:5,fontWeight:500}}>{t.project.name}</span>}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <StatusDropdown status={t.status} onChange={(s) => onStatusChange(t, s)} />
                </td>
                <td style={{position:'relative'}} onClick={e => e.stopPropagation()}>
                  {subTotal > 0 ? (
                    <span style={{fontSize:9,color:'#6b7280',cursor:'pointer'}}
                      onClick={() => setSubOpen(subOpen === t._id ? null : t._id)}>
                      {subDone}/{subTotal} ✓
                    </span>
                  ) : <span style={{fontSize:9,color:'#d1d5db'}}>—</span>}
                  {subOpen === t._id && (
                    <div style={{position:'absolute',background:'white',border:'0.5px solid #e5e7eb',borderRadius:6,padding:6,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',zIndex:10,marginTop:4,minWidth:160}}>
                      {t.subtasks?.map(st => (
                        <label key={st._id} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,padding:'2px 0',cursor:'pointer'}}>
                          <input type="checkbox" checked={st.completed} style={{accentColor:'#2347e8'}} />
                          <span style={{textDecoration:st.completed?'line-through':'none',color:st.completed?'#9ca3af':'#374151'}}>{st.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </td>
                <td><span className={PRIORITY_CLASS[t.priority] || 'priority-medium'}>{t.priority}</span></td>
                <td>
                  {t.assignee ? (
                    <div className="assignee-chip">
                      <Avatar name={t.assignee.name} role={t.assignee.role} />
                      <span>{t.assignee.name}</span>
                    </div>
                  ) : <span style={{color:'#9ca3af'}}>Unassigned</span>}
                </td>
                <td style={{fontSize:10,color: isOverdue ? '#ef4444' : '#6b7280'}}>
                  {t.deadline ? new Date(t.deadline).toLocaleDateString('en',{month:'short',day:'numeric'}) : '-'}
                  {isOverdue && <span style={{fontSize:8,marginLeft:3}}>OVERDUE</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeparateTaskTable({ tasks: list, onSelect, onStatusChange, isManager, user }) {
  return (
    <div className="card">
      <table className="task-table">
        <thead><tr><th>Task</th><th>Type</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Assigned By</th><th>Deadline</th><th>Created</th></tr></thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={8} style={{textAlign:'center',padding:20,fontSize:11,color:'#9ca3af'}}>No separate tasks found</td></tr>
          ) : list.map((t) => {
            const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done';
            const color = SEPARATE_COLORS[t.separateType] || '#6b7280';
            return (
              <tr key={t._id} onClick={() => onSelect(t)} style={{cursor:'pointer'}}>
                <td style={{fontWeight:500,color:'#111827'}}>
                  {t.title}
                  {t.description && <div style={{fontSize:10,color:'#9ca3af'}}>{t.description}</div>}
                </td>
                <td>
                  <span style={{fontSize:9,background:`${color}18`,color, padding:'2px 8px',borderRadius:20,fontWeight:600,display:'inline-block'}}>{t.separateType || 'Other'}</span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <StatusDropdown status={t.status} onChange={(s) => onStatusChange(t, s)} />
                </td>
                <td><span className={PRIORITY_CLASS[t.priority] || 'priority-medium'}>{t.priority}</span></td>
                <td>
                  {t.assignee ? (
                    <div className="assignee-chip">
                      <Avatar name={t.assignee.name} role={t.assignee.role} />
                      <span>{t.assignee.name}</span>
                    </div>
                  ) : <span style={{color:'#9ca3af'}}>Unassigned</span>}
                </td>
                <td>
                  {t.createdBy ? (
                    <div className="assignee-chip">
                      <Avatar name={t.createdBy.name} role={t.createdBy.role} />
                      <span style={{fontSize:10}}>{t.createdBy.name}</span>
                    </div>
                  ) : <span style={{color:'#9ca3af'}}>—</span>}
                </td>
                <td style={{fontSize:10,color: isOverdue ? '#ef4444' : '#6b7280'}}>
                  {t.deadline ? new Date(t.deadline).toLocaleDateString('en',{month:'short',day:'numeric'}) : '-'}
                  {isOverdue && <span style={{fontSize:8,marginLeft:3}}>OVERDUE</span>}
                </td>
                <td style={{fontSize:10,color:'#9ca3af'}}>
                  {new Date(t.createdAt).toLocaleDateString('en',{month:'short',day:'numeric'})}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BulkActionBar({ count, allUsers, onAction, onClear }) {
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const hasChanges = bulkStatus || bulkPriority || bulkAssignee;
  return (
    <div className="card" style={{marginBottom:10,border:'1px solid #2347e8',background:'#f0f4ff'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:600,color:'#2347e8'}}>{count} selected</span>
        <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
          style={{padding:'4px 8px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:10,background:'white'}}>
          <option value="">Status…</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
          <option value="delayed">Delayed</option>
        </select>
        <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)}
          style={{padding:'4px 8px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:10,background:'white'}}>
          <option value="">Priority…</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)}
          style={{padding:'4px 8px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:10,background:'white'}}>
          <option value="">Assignee…</option>
          {allUsers.filter(u => u.isActive).map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        <button onClick={() => {
          const updates = {};
          if (bulkStatus) updates.status = bulkStatus;
          if (bulkPriority) updates.priority = bulkPriority;
          if (bulkAssignee) updates.assignee = bulkAssignee;
          if (Object.keys(updates).length > 0) onAction(updates);
          setBulkStatus(''); setBulkPriority(''); setBulkAssignee('');
        }} disabled={!hasChanges}
          style={{padding:'4px 12px',background:hasChanges?'#2347e8':'#9ca3af',color:'white',border:'none',borderRadius:6,fontSize:10,fontWeight:600,cursor:hasChanges?'pointer':'default',opacity:hasChanges?1:0.5}}>
          Apply
        </button>
        <button onClick={onClear}
          style={{padding:'4px 8px',background:'transparent',color:'#6b7280',border:'none',borderRadius:6,fontSize:10,cursor:'pointer'}}>
          Clear
        </button>
      </div>
    </div>
  );
}

function StatusDropdown({ status, onChange }) {
  return (
    <select value={status} onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className={STATUS_CLASS[status] || 't-todo'}
      style={{fontSize:9,fontWeight:600,padding:'2px 7px',borderRadius:20,border:'none',cursor:'pointer',outline:'none',appearance:'none'}}>
      {['todo','in_progress','review','done','delayed'].map(s => (
        <option key={s} value={s}>{s.replace('_',' ')}</option>
      ))}
    </select>
  );
}

function Avatar({ name, role }) {
  const bg = role === 'developer' ? '#f0fdf4' : role === 'intern' ? '#fff7ed' : role === 'qa_tester' ? '#fef2f2' : '#dce6ff';
  const color = role === 'developer' ? '#16a34a' : role === 'intern' ? '#c2410c' : role === 'qa_tester' ? '#dc2626' : '#1a35c4';
  return <div className="a-av" style={{background:bg,color:color}}>{(name || '?').charAt(0)}</div>;
}

function CreateSeparateTaskModal({ allUsers, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [separateType, setSeparateType] = useState('Other');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return alert('Task title is required');
    setSaving(true);
    try {
      await tasks.createSeparate({
        title: title.trim(),
        description: desc.trim(),
        separateType,
        assignee: assigneeId || undefined,
        priority,
        deadline: deadline || undefined,
      });
      onCreated();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Create Separate Task" icon="📋"
      footer={
        <>
          <button onClick={onClose}
            style={{padding:'5px 12px',background:'#f3f4f6',color:'#374151',borderRadius:6,fontSize:11,border:'none',cursor:'pointer'}}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !title.trim()}
            style={{padding:'5px 12px',background:'#2347e8',color:'white',borderRadius:6,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',opacity:saving||!title.trim()?0.6:1}}>
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </>
      }>
      <div>
        <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Task Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter task title"
          style={{width:'100%',padding:'6px 10px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:11,outline:'none',boxSizing:'border-box',marginBottom:10}} />
        <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" rows={2}
          style={{width:'100%',padding:'6px 10px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:11,outline:'none',resize:'vertical',boxSizing:'border-box',marginBottom:10}} />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Type</label>
            <Dropdown value={separateType} onChange={v => setSeparateType(v)}
              options={SEPARATE_TYPES.map(t => ({value:t, label:t}))} style={{width:'100%'}} />
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Priority</label>
            <Dropdown value={priority} onChange={v => setPriority(v)}
              options={['low','medium','high','critical'].map(p => ({value:p, label:p.charAt(0).toUpperCase() + p.slice(1)}))} style={{width:'100%'}} />
          </div>
        </div>
        <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Assignee</label>
        <Dropdown value={assigneeId} onChange={v => setAssigneeId(v)}
          options={[{value:'', label:'Unassigned'}, ...allUsers.filter(u => u.isActive).map(u => ({value:u._id, label:`${u.name} (${u.email})`}))]} style={{width:'100%',marginBottom:10}} />
        <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Deadline</label>
        <input type="date" className="select" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
    </Modal>
  );
}

function TaskDrawer({ task, allUsers, onClose, onUpdated, user }) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [editType, setEditType] = useState(task.separateType || 'Other');
  const [editAssignee, setEditAssignee] = useState(task.assignee?._id || '');
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDeadline, setEditDeadline] = useState(task.deadline ? task.deadline.split('T')[0] : '');
  const [editStatus, setEditStatus] = useState(task.status);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [aiPriority, setAiPriority] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const isCreator = task.createdBy?._id === user?._id;
  const isAdmin = user?.role === 'admin';
  const isAssignee = task.assignee?._id === user?._id;
  const canEdit = isCreator || isAdmin;
  const canDelete = isCreator || isAdmin;
  const canChangeStatus = isCreator || isAdmin || isAssignee;

  useEffect(() => {
    setActivityLog([
      { action: 'Created', by: task.createdBy?.name || 'Unknown', at: task.createdAt },
    ]);
  }, [task._id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {};
      if (editTitle !== task.title) data.title = editTitle;
      if (editDesc !== (task.description || '')) data.description = editDesc;
      if (editType !== (task.separateType || 'Other')) data.separateType = editType;
      if (editAssignee !== (task.assignee?._id || '')) data.assignee = editAssignee || null;
      if (editPriority !== task.priority) data.priority = editPriority;
      if (editDeadline !== (task.deadline ? task.deadline.split('T')[0] : '')) data.deadline = editDeadline || null;
      if (editStatus !== task.status) data.status = editStatus;
      if (Object.keys(data).length > 0) {
        await tasks.update(task._id, data);
      }
      onUpdated();
      setEditing(false);
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasks.delete(task._id);
      onUpdated();
      onClose();
    } catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  const handleViewStatusChange = async (newStatus) => {
    try {
      await tasks.update(task._id, { status: newStatus });
      onUpdated();
    } catch (e) { alert(e.response?.data?.message || 'Failed to update status'); }
  };

  const handleAutoPrioritize = async () => {
    setAiLoading(true);
    try {
      const res = await tasks.autoPrioritize(task._id);
      setAiPriority(res.data);
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit Task' : 'Task Details'} icon="📝" style={{maxWidth:520}}>
      {editing ? (
        <div>
          <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Title</label>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
            style={{width:'100%',padding:'6px 10px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:11,outline:'none',boxSizing:'border-box',marginBottom:10}} />
          <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Description</label>
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
            style={{width:'100%',padding:'6px 10px',border:'0.5px solid #d1d5db',borderRadius:6,fontSize:11,outline:'none',resize:'vertical',boxSizing:'border-box',marginBottom:10}} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Priority</label>
              <div style={{display:'flex',gap:4,alignItems:'center'}}>
                <Dropdown value={editPriority} onChange={v => { setEditPriority(v); setAiPriority(null); }}
                  options={['low','medium','high','urgent','critical','blocker'].map(p => ({value:p, label:p.charAt(0).toUpperCase() + p.slice(1)}))} style={{flex:1}} />
                <button onClick={handleAutoPrioritize} disabled={aiLoading} title="Suggest priority"
                  style={{padding:'3px 6px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',borderRadius:4,fontSize:9,cursor:'pointer',opacity:aiLoading?0.6:1,whiteSpace:'nowrap'}}>
                  ✨ {aiLoading ? '…' : 'Auto'}
                </button>
              </div>
              {aiPriority && (
                <div style={{fontSize:9,marginTop:3,color:'#6b7280',background:'#f3f4f6',padding:'3px 6px',borderRadius:4}}>
                  Suggest <strong style={{color:'#2347e8',textTransform:'capitalize'}}>{aiPriority.suggested}</strong>
                  {aiPriority.reasons?.length > 0 && ` (${aiPriority.reasons.join(', ')})`}
                  <span onClick={() => { setEditPriority(aiPriority.suggested); setAiPriority(null); }}
                    style={{marginLeft:6,color:'#2347e8',cursor:'pointer',fontWeight:600}}>Apply</span>
                </div>
              )}
            </div>
            {task.scope === 'separate' && (
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Type</label>
                <Dropdown value={editType} onChange={v => setEditType(v)}
                  options={SEPARATE_TYPES.map(t => ({value:t, label:t}))} style={{width:'100%'}} />
              </div>
            )}
          </div>
          <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Assignee</label>
          <Dropdown value={editAssignee} onChange={v => setEditAssignee(v)}
            options={[{value:'', label:'Unassigned'}, ...allUsers.filter(u => u.isActive).map(u => ({value:u._id, label:u.name}))]} style={{width:'100%',marginBottom:10}} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Status</label>
              <Dropdown value={editStatus} onChange={v => setEditStatus(v)}
                options={['todo','in_progress','review','done','delayed'].map(s => ({value:s, label:s.replace('_',' ')}))} style={{width:'100%'}} />
            </div>
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3}}>Deadline</label>
              <input type="date" className="select" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
            </div>
          </div>
          <div style={{display:'flex',gap:6,justifyContent:'flex-end',marginTop:10}}>
            <button onClick={() => setEditing(false)} style={{padding:'5px 12px',background:'#f3f4f6',color:'#374151',borderRadius:6,fontSize:11,border:'none',cursor:'pointer'}}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{padding:'5px 12px',background:'#2347e8',color:'white',borderRadius:6,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',opacity:saving?0.6:1}}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:4}}>{task.title}</div>
            {task.description && <div style={{fontSize:11,color:'#6b7280',marginBottom:6}}>{task.description}</div>}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              {task.scope === 'separate' && task.separateType && (
                <span style={{fontSize:9,background:`${SEPARATE_COLORS[task.separateType] || '#6b7280'}18`,color:SEPARATE_COLORS[task.separateType]||'#6b7280',padding:'2px 8px',borderRadius:20,fontWeight:600}}>{task.separateType}</span>
              )}
              {canChangeStatus ? (
                <StatusDropdown status={task.status} onChange={handleViewStatusChange} />
              ) : (
                <span className={STATUS_CLASS[task.status] || 't-todo'} style={{fontSize:9,fontWeight:600,padding:'2px 7px',borderRadius:20}}>{task.status.replace('_',' ')}</span>
              )}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16,padding:10,background:'#f9fafb',borderRadius:10}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{fontSize:9,color:'#9ca3af',marginBottom:1}}>Priority</div>
                <button onClick={handleAutoPrioritize} disabled={aiLoading}
                  style={{padding:'1px 5px',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',border:'none',borderRadius:3,fontSize:7,cursor:'pointer',opacity:aiLoading?0.6:1}}>
                  ✨ {aiLoading ? '…' : 'AI'}
                </button>
              </div>
              <div style={{fontSize:11,fontWeight:600,color:'#374151'}}>
                {task.priority}
                {aiPriority && (
                  <span style={{marginLeft:6,fontSize:9,color:'#6b7280',fontWeight:400}}>
                    → <strong style={{color:'#2347e8'}}>{aiPriority.suggested}</strong>
                    <span onClick={() => setEditing(true)} style={{marginLeft:4,color:'#2347e8',cursor:'pointer',fontWeight:600,textDecoration:'underline'}}>Edit</span>
                  </span>
                )}
              </div>
            </div>
            <div><div style={{fontSize:9,color:'#9ca3af',marginBottom:1}}>Deadline</div><div style={{fontSize:11,fontWeight:600,color: task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done' ? '#ef4444' : '#374151'}}>{task.deadline ? new Date(task.deadline).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : '—'}</div></div>
            <div><div style={{fontSize:9,color:'#9ca3af',marginBottom:1}}>Assignee</div><div>{task.assignee ? <div className="assignee-chip"><Avatar name={task.assignee.name} role={task.assignee.role} /><span style={{fontSize:11}}>{task.assignee.name}</span></div> : <span style={{fontSize:11,color:'#9ca3af'}}>Unassigned</span>}</div></div>
            <div><div style={{fontSize:9,color:'#9ca3af',marginBottom:1}}>Created By</div><div>{task.createdBy ? <div className="assignee-chip"><Avatar name={task.createdBy.name} role={task.createdBy.role} /><span style={{fontSize:11}}>{task.createdBy.name}</span></div> : <span style={{fontSize:11,color:'#9ca3af'}}>—</span>}</div></div>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:6}}>Activity Log</div>
            <div style={{borderLeft:'2px solid #e5e7eb',paddingLeft:10}}>
              {activityLog.map((a, i) => (
                <div key={i} style={{fontSize:10,color:'#6b7280',marginBottom:4}}>
                  <span style={{fontWeight:600,color:'#374151'}}>{a.by}</span> {a.action} — {new Date(a.at).toLocaleString()}
                </div>
              ))}
            </div>
          </div>

          <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
            {canEdit && <button onClick={() => setEditing(true)} style={{padding:'5px 12px',background:'#2347e8',color:'white',borderRadius:6,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>Edit</button>}
            {canDelete && <button onClick={handleDelete} style={{padding:'5px 12px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>Delete</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

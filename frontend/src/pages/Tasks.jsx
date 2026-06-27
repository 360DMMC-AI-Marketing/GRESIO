import { useState, useEffect, useCallback } from 'react';
import { tasks, users as usersApi, projects as projectsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import Dropdown from '../components/Dropdown';
import { LoadingState, ErrorState } from '../components/StateComponents';
import toast from 'react-hot-toast';

const PRIORITY_STYLES = {
  blocker: 'bg-red-100 text-red-700', critical: 'bg-orange-100 text-orange-700',
  urgent: 'bg-amber-100 text-amber-700', high: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-surface-100 text-surface-600', low: 'bg-surface-50 text-surface-400'
};
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', delayed: 'Delayed' };
const STATUS_COLORS = { todo: 'border-t-sky-500', in_progress: 'border-t-amber-500', review: 'border-t-violet-500', done: 'border-t-emerald-500', delayed: 'border-t-red-500' };
const STATUS_BG = { todo: 'bg-sky-50 text-sky-700', in_progress: 'bg-amber-50 text-amber-700', review: 'bg-violet-50 text-violet-700', done: 'bg-emerald-50 text-emerald-700', delayed: 'bg-red-50 text-red-700' };
const FILTERS = ['all', 'todo', 'in_progress', 'review', 'done', 'delayed'];
const SEPARATE_TYPES = ['Admin', 'HR', 'Meeting', 'Training', 'Research', 'Bug Fix', 'Other'];
const SEPARATE_COLORS = { Admin: '#6366f1', HR: '#ec4899', Meeting: '#f59e0b', Training: '#10b981', Research: '#3b82f6', 'Bug Fix': '#ef4444', Other: '#6b7280' };
const KANBAN_COLUMNS = ['todo', 'in_progress', 'review', 'done'];

export default function Tasks() {
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(urlParams.get('tab') === 'separate' ? 'separate' : 'project');
  const [projectTasks, setProjectTasks] = useState([]);
  const [separateTasks, setSeparateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [subOpen, setSubOpen] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [allUsers, setAllUsers] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [projectsList, setProjectsList] = useState([]);

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

  const fetchProjectTasks = useCallback((f, proj) => {
    setLoading(true);
    setError(null);
    const params = {};
    if (f !== 'all') params.status = f;
    if (proj) params.project = proj;
    tasks.getAll(params).then((res) => setProjectTasks(res.data)).catch((e) => setError(e.message || 'Failed to load tasks')).finally(() => setLoading(false));
  }, []);

  const fetchSeparateTasks = useCallback((f) => {
    setLoading(true);
    setError(null);
    const params = {};
    if (f !== 'all') params.status = f;
    tasks.getSeparate(params).then((res) => setSeparateTasks(res.data)).catch((e) => setError(e.message || 'Failed to load tasks')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'project') fetchProjectTasks(filter, projectFilter);
    else fetchSeparateTasks(filter);
  }, [tab, filter, projectFilter, fetchProjectTasks, fetchSeparateTasks]);

  useEffect(() => {
    usersApi.getAll().then((res) => setAllUsers(res.data)).catch(() => {});
    projectsApi.getAll().then((res) => setProjectsList(res.data)).catch(() => {});
  }, []);

  const handleProjectFilterChange = (e) => {
    setProjectFilter(e.target.value);
  };

  const currentList = tab === 'project' ? projectTasks : separateTasks;
  const filtered = search
    ? currentList.filter(t => (t.title || '').toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()))
    : currentList;

  const handleStatusChange = async (task, newStatus) => {
    try {
      await tasks.update(task._id, { status: newStatus });
      if (tab === 'project') fetchProjectTasks(filter);
      else fetchSeparateTasks(filter);
      if (selectedTask?._id === task._id) setSelectedTask({ ...selectedTask, status: newStatus });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update status'); }
  };

  const handleDrop = async (taskId, newStatus) => {
    setDraggedTask(null);
    await handleStatusChange({ _id: taskId }, newStatus);
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
    return <LoadingState message="Loading tasks..." />;
  }

  if (error) return <ErrorState message={error} onRetry={() => { if (tab === 'project') fetchProjectTasks(filter, projectFilter); else fetchSeparateTasks(filter); }} />;

  return (
    <div className="px-4 py-5 max-w-7xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-surface-900">Tasks</h1>
          <p className="text-xs text-surface-400"><span className="num-mono">{currentList.length}</span> tasks total</p>
        </div>
        <div className="flex gap-2">
          {(tab === 'separate' && canCreateSeparate) && (
            <button data-voice="add-separate-task" onClick={() => setShowCreateModal(true)}
              className="btn-premium text-xs px-3.5 py-1.5">
              + Add Separate Task
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-0 border-b border-surface-200">
        <button data-voice="tab-project-tasks" onClick={() => { setTab('project'); setFilter('all'); setSearch(''); setProjectFilter(''); setSelectedTask(null); }}
          className={`px-5 py-2 text-xs font-semibold cursor-pointer transition-all ${
            tab === 'project' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-surface-400 border-b-2 border-transparent hover:text-surface-600'
          }`}>
          Project Tasks
        </button>
        <button data-voice="tab-separate-tasks" onClick={() => { setTab('separate'); setFilter('all'); setSearch(''); setProjectFilter(''); setSelectedTask(null); }}
          className={`px-5 py-2 text-xs font-semibold cursor-pointer transition-all ${
            tab === 'separate' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-surface-400 border-b-2 border-transparent hover:text-surface-600'
          }`}>
          Separate Tasks
        </button>
      </div>

      <div className="glass-panel rounded-[var(--radius-xl)] border border-surface-200 my-3">
        <div className="px-3 py-2 flex flex-wrap gap-1.5 items-center">
          <div className="flex gap-1">
            {FILTERS.map(s => (
              <span key={s} data-voice={`filter-${s}`} onClick={() => setFilter(s)}
                className={`px-2.5 py-1 rounded-[var(--radius-lg)] text-[10px] cursor-pointer font-medium transition-all ${
                  filter === s ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                }`}>
                {s.replace('_', ' ')}
              </span>
            ))}
          </div>
          {tab === 'project' && (
            <select value={projectFilter} onChange={handleProjectFilterChange}
              className="px-2 py-1 border border-surface-200 rounded-[var(--radius-lg)] text-[10px] bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 max-w-[160px] transition-all cursor-pointer">
              <option value="">All projects</option>
              {projectsList.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          )}
          <div className="ml-auto">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="px-2 py-1 border border-surface-200 rounded-[var(--radius-lg)] text-[10px] bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-[110px] transition-all" />
          </div>
        </div>
      </div>

      {selectedTaskIds.size > 0 && (
        <BulkActionBar count={selectedTaskIds.size} allUsers={allUsers} onAction={handleBulkAction} onClear={() => setSelectedTaskIds(new Set())} />
      )}

      {tab === 'project' ? (
        <KanbanBoard
          tasks={filtered}
          draggedTask={draggedTask}
          setDraggedTask={setDraggedTask}
          onDrop={handleDrop}
          subOpen={subOpen}
          setSubOpen={setSubOpen}
          onSelect={setSelectedTask}
          selectedIds={selectedTaskIds}
          onToggleSelect={toggleBulkSelect}
        />
      ) : (
        <KanbanBoard
          tasks={filtered}
          draggedTask={draggedTask}
          setDraggedTask={setDraggedTask}
          onDrop={handleDrop}
          subOpen={subOpen}
          setSubOpen={setSubOpen}
          onSelect={setSelectedTask}
          selectedIds={selectedTaskIds}
          onToggleSelect={toggleBulkSelect}
        />
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

function KanbanBoard({ tasks: list, draggedTask, setDraggedTask, onDrop, subOpen, setSubOpen, onSelect, selectedIds, onToggleSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
      {KANBAN_COLUMNS.map(col => {
        const colTasks = list.filter(t => t.status === col);
        return (
          <div key={col}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-primary-50/50'); }}
            onDragLeave={e => e.currentTarget.classList.remove('bg-primary-50/50')}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-primary-50/50');
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId) onDrop(taskId, col);
            }}
            className="card-premium bg-surface-50/50 rounded-[var(--radius-xl)] border border-surface-200 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-[var(--radius-full)] ${
                  col === 'todo' ? 'bg-sky-500' : col === 'in_progress' ? 'bg-amber-500' : col === 'review' ? 'bg-violet-500' : 'bg-emerald-500'
                }`} />
                <span className="text-xs font-bold text-surface-700">{STATUS_LABELS[col]}</span>
              </div>
              <span className="num-mono text-[10px] font-medium text-surface-400 bg-surface-100 px-2 py-0.5 rounded-[var(--radius-full)]">{colTasks.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 min-h-[200px]">
              {colTasks.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-surface-300 italic">Drop tasks here</div>
              ) : (
                colTasks.map(t => (
                  <div key={t._id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', t._id); setDraggedTask(t._id); }}
                    onDragEnd={() => setDraggedTask(null)}
                    className={`bg-white rounded-[var(--radius-lg)] border border-surface-200 border-t-2 ${
                      STATUS_COLORS[t.status] || 'border-t-surface-200'
                    } p-2.5 cursor-pointer hover:shadow-[var(--elevation-mid)] hover:-translate-y-0.5 transition-all ${
                      draggedTask === t._id ? 'opacity-50 shadow-[var(--elevation-high)]' : ''
                    }`}
                    onClick={() => onSelect(t)}>
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <input type="checkbox" checked={selectedIds?.has(t._id)}
                        onChange={e => { e.stopPropagation(); onToggleSelect?.(t._id); }}
                        onClick={e => e.stopPropagation()}
                        className="accent-primary-600 mt-0.5 shrink-0 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-surface-900 leading-tight truncate">{t.title}</p>
                        {t.description && <p className="text-[10px] text-surface-400 mt-0.5 line-clamp-1">{t.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-full)] ${PRIORITY_STYLES[t.priority] || 'bg-surface-100 text-surface-500'}`}>
                        {t.priority}
                      </span>
                      {t.project?.name && (
                        <span className="text-[9px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-[var(--radius-full)] font-medium truncate max-w-[100px]">
                          {t.project.name}
                        </span>
                      )}
                      {t.deadline && (
                        <span className={`num-mono text-[9px] font-medium px-1.5 py-0.5 rounded-[var(--radius-full)] ${
                          new Date(t.deadline) < new Date() && t.status !== 'done'
                            ? 'bg-red-50 text-red-600' : 'bg-surface-50 text-surface-500'
                        }`}>
                          {new Date(t.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-surface-100">
                      <div className="flex items-center gap-1">
                        {t.assignee ? (
                          <span className="text-[9px] text-surface-500 font-medium truncate max-w-[80px]">{t.assignee.name}</span>
                        ) : (
                          <span className="text-[9px] text-surface-300 italic">Unassigned</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {t.subtasks?.length > 0 && (
                          <span className="num-mono text-[9px] text-surface-400">
                            {t.subtasks.filter(st => st.completed).length}/{t.subtasks.length}
                          </span>
                        )}
                        {t.priority === 'blocker' || t.priority === 'critical' ? (
                          <span className="w-1.5 h-1.5 rounded-[var(--radius-full)] bg-red-500" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}



function BulkActionBar({ count, allUsers, onAction, onClear }) {
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const hasChanges = bulkStatus || bulkPriority || bulkAssignee;
  return (
    <div className="card-premium bg-primary-50 border border-primary-300 rounded-[var(--radius-xl)] mb-3">
      <div className="flex items-center gap-2.5 px-3 py-2 flex-wrap">
        <span className="text-[11px] font-semibold text-primary-700">{count} selected</span>
        <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
          className="px-2 py-1 border border-surface-200 rounded-[var(--radius-lg)] text-[10px] bg-white outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Status...</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
        <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)}
          className="px-2 py-1 border border-surface-200 rounded-[var(--radius-lg)] text-[10px] bg-white outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Priority...</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)}
          className="px-2 py-1 border border-surface-200 rounded-[var(--radius-lg)] text-[10px] bg-white outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Assignee...</option>
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
          className={`text-[10px] font-semibold border-none transition-colors ${
            hasChanges ? 'btn-premium px-3 py-1' : 'bg-surface-200 text-surface-400 cursor-not-allowed px-3 py-1 rounded-[var(--radius-lg)]'
          }`}>
          Apply
        </button>
        <button onClick={onClear}
          className="btn btn-gray px-2 py-1 text-[10px]">
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
      className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-[var(--radius-full)] border-none cursor-pointer outline-none appearance-none ${STATUS_BG[status] || 'bg-surface-100 text-surface-600'}`}>
      {['todo', 'in_progress', 'review', 'done', 'delayed'].map(s => (
        <option key={s} value={s}>{s.replace('_', ' ')}</option>
      ))}
    </select>
  );
}

function Avatar({ name, role }) {
  const bg = role === 'developer' ? 'bg-green-50' : role === 'intern' ? 'bg-orange-50' : role === 'qa_tester' ? 'bg-red-50' : 'bg-primary-50';
  const color = role === 'developer' ? 'text-green-600' : role === 'intern' ? 'text-orange-600' : role === 'qa_tester' ? 'text-red-600' : 'text-primary-700';
  return <div className={`w-5 h-5 rounded-[var(--radius-full)] flex items-center justify-center text-[9px] font-bold shrink-0 ${bg} ${color}`}>{(name || '?').charAt(0)}</div>;
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
    if (!title.trim()) return toast.error('Task title is required');
    setSaving(true);
    try {
      await tasks.createSeparate({
        title: title.trim(), description: desc.trim(), separateType,
        assignee: assigneeId || undefined, priority, deadline: deadline || undefined,
      });
      onCreated();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create task'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Create Separate Task" icon="📋"
      footer={
        <>
          <button onClick={onClose}
            className="btn btn-gray px-3 py-1.5 text-[11px]">Cancel</button>
          <button data-voice="create-task-submit" onClick={handleSubmit} disabled={saving || !title.trim()}
            className={`text-[11px] font-semibold border-none transition-colors ${
              saving || !title.trim() ? 'bg-surface-200 text-surface-400 cursor-not-allowed px-3 py-1.5 rounded-[var(--radius-lg)]' : 'btn-premium px-3 py-1.5'
            }`}>
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </>
      }>
      <div className="space-y-2.5">
        <div>
          <label className="text-[10px] font-medium text-surface-700 block mb-1">Task Title *</label>
          <input data-voice="field-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter task title"
            className="w-full px-2.5 py-1.5 border border-surface-300 rounded-[var(--radius-lg)] text-[11px] outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all box-border" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-700 block mb-1">Description</label>
          <textarea data-voice="field-desc" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" rows={2}
            className="w-full px-2.5 py-1.5 border border-surface-300 rounded-[var(--radius-lg)] text-[11px] outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-vertical box-border" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-medium text-surface-700 block mb-1">Type</label>
            <Dropdown value={separateType} onChange={v => setSeparateType(v)}
              options={SEPARATE_TYPES.map(t => ({ value: t, label: t }))} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-surface-700 block mb-1">Priority</label>
            <Dropdown value={priority} onChange={v => setPriority(v)}
              options={['low', 'medium', 'high', 'critical'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-700 block mb-1">Assignee</label>
          <Dropdown value={assigneeId} onChange={v => setAssigneeId(v)}
            options={[{ value: '', label: 'Unassigned' }, ...allUsers.filter(u => u.isActive).map(u => ({ value: u._id, label: `${u.name} (${u.email})` }))]} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-700 block mb-1">Deadline</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="select w-full" />
        </div>
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
  const [activityLog] = useState([
    { action: 'Created', by: task.createdBy?.name || 'Unknown', at: task.createdAt },
  ]);
  const [aiPriority, setAiPriority] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isCreator = task.createdBy?._id === user?._id;
  const isAdmin = user?.role === 'admin';
  const isAssignee = task.assignee?._id === user?._id;
  const canEdit = isCreator || isAdmin;
  const canDelete = isCreator || isAdmin;
  const canChangeStatus = isCreator || isAdmin || isAssignee;

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
      if (Object.keys(data).length > 0) await tasks.update(task._id, data);
      onUpdated();
      setEditing(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await tasks.delete(task._id);
      onUpdated();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  const handleViewStatusChange = async (newStatus) => {
    try {
      await tasks.update(task._id, { status: newStatus });
      onUpdated();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update status'); }
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
    <><Modal open onClose={onClose} title={editing ? 'Edit Task' : 'Task Details'} icon="📝" style={{ maxWidth: 520 }}>
      {editing ? (
        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] font-medium text-surface-700 block mb-1">Title</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-surface-300 rounded-[var(--radius-lg)] text-[11px] outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all box-border" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-surface-700 block mb-1">Description</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
              className="w-full px-2.5 py-1.5 border border-surface-300 rounded-[var(--radius-lg)] text-[11px] outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-vertical box-border" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-medium text-surface-700 block mb-1">Priority</label>
              <div className="flex gap-1 items-center">
                <Dropdown value={editPriority} onChange={v => { setEditPriority(v); setAiPriority(null); }}
                  options={['low', 'medium', 'high', 'urgent', 'critical', 'blocker'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
                <button onClick={handleAutoPrioritize} disabled={aiLoading}
                  className="px-1.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded text-[9px] border-none cursor-pointer disabled:opacity-60 whitespace-nowrap hover:opacity-90 transition-opacity">
                  {aiLoading ? '...' : 'AI'}
                </button>
              </div>
              {aiPriority && (
                <div className="text-[9px] mt-1 text-surface-500 bg-surface-100 px-1.5 py-1 rounded">
                  Suggest <strong className="text-primary-600 capitalize">{aiPriority.suggested}</strong>
                  {aiPriority.reasons?.length > 0 && ` (${aiPriority.reasons.join(', ')})`}
                  <span onClick={() => { setEditPriority(aiPriority.suggested); setAiPriority(null); }}
                    className="ml-1.5 text-primary-600 cursor-pointer font-semibold">Apply</span>
                </div>
              )}
            </div>
            {task.scope === 'separate' && (
              <div>
                <label className="text-[10px] font-medium text-surface-700 block mb-1">Type</label>
                <Dropdown value={editType} onChange={v => setEditType(v)}
                  options={SEPARATE_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-medium text-surface-700 block mb-1">Assignee</label>
            <Dropdown value={editAssignee} onChange={v => setEditAssignee(v)}
              options={[{ value: '', label: 'Unassigned' }, ...allUsers.filter(u => u.isActive).map(u => ({ value: u._id, label: u.name }))]} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-medium text-surface-700 block mb-1">Status</label>
              <Dropdown value={editStatus} onChange={v => setEditStatus(v)}
                options={['todo', 'in_progress', 'review', 'done', 'delayed'].map(s => ({ value: s, label: s.replace('_', ' ') }))} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-surface-700 block mb-1">Deadline</label>
              <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                className="select w-full" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-end pt-2 border-t border-surface-100">
            <button onClick={() => setEditing(false)}
              className="btn btn-gray px-3 py-1.5 text-[11px]">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className={`text-[11px] font-semibold border-none transition-colors ${
                saving ? 'bg-surface-200 text-surface-400 cursor-not-allowed px-3 py-1.5 rounded-[var(--radius-lg)]' : 'btn-premium px-3 py-1.5'
              }`}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <h3 className="text-base font-semibold text-surface-900 mb-1">{task.title}</h3>
            {task.description && <p className="text-[11px] text-surface-500 mb-1.5">{task.description}</p>}
            <div className="flex gap-1.5 flex-wrap items-center">
              {task.scope === 'separate' && task.separateType && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-[var(--radius-full)]"
                  style={{ background: `${SEPARATE_COLORS[task.separateType] || 'var(--text-tertiary)'}18`, color: SEPARATE_COLORS[task.separateType] || 'var(--text-tertiary)' }}>
                  {task.separateType}
                </span>
              )}
              {canChangeStatus ? (
                <StatusDropdown status={task.status} onChange={handleViewStatusChange} />
              ) : (
                <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-[var(--radius-full)] ${STATUS_BG[task.status] || 'bg-surface-100 text-surface-600'}`}>
                  {task.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-4 p-2.5 bg-surface-50 rounded-[var(--radius-lg)]">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[9px] text-surface-400">Priority</span>
                <button onClick={handleAutoPrioritize} disabled={aiLoading}
                  className="px-1 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded text-[7px] border-none cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity">
                  {aiLoading ? '...' : 'AI'}
                </button>
              </div>
              <div className="text-[11px] font-semibold text-surface-700 capitalize">
                {task.priority}
                {aiPriority && (
                  <span className="ml-1.5 text-[9px] text-surface-400 font-normal">
                    → <strong className="text-primary-600">{aiPriority.suggested}</strong>
                    <span onClick={() => setEditing(true)} className="ml-1 text-primary-600 cursor-pointer font-semibold underline">Edit</span>
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[9px] text-surface-400 block mb-0.5">Deadline</span>
              <span className={`text-[11px] font-semibold ${
                task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-surface-700'
              }`}>
                {task.deadline ? new Date(task.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-surface-400 block mb-0.5">Assignee</span>
              {task.assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={task.assignee.name} role={task.assignee.role} />
                  <span className="text-[11px] font-medium text-surface-700">{task.assignee.name}</span>
                </div>
              ) : <span className="text-[11px] text-surface-400">Unassigned</span>}
            </div>
            <div>
              <span className="text-[9px] text-surface-400 block mb-0.5">Created By</span>
              {task.createdBy ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={task.createdBy.name} role={task.createdBy.role} />
                  <span className="text-[11px] text-surface-500">{task.createdBy.name}</span>
                </div>
              ) : <span className="text-[11px] text-surface-400">—</span>}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-[11px] font-semibold text-surface-700 mb-1.5">Activity Log</h4>
            <div className="border-l-2 border-surface-200 pl-2.5 space-y-1">
              {activityLog.map((a, i) => (
                <div key={i} className="text-[10px] text-surface-500">
                  <span className="font-semibold text-surface-700">{a.by}</span> {a.action} — {new Date(a.at).toLocaleString()}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-end pt-2 border-t border-surface-100">
            {canEdit && <button onClick={() => setEditing(true)}
              className="btn-premium px-3 py-1.5 text-[11px]">Edit</button>}
            {canDelete && <button onClick={() => setShowConfirmDelete(true)}
              className="btn btn-gray px-3 py-1.5 text-[11px]">Delete</button>}
          </div>
        </div>
      )}
    </Modal>
      <ConfirmModal
        open={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Delete this task permanently?"
        confirmText="Delete" />
  </>
);
}

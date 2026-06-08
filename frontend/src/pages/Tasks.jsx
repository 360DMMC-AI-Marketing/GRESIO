import { useState, useEffect } from 'react';
import { tasks } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_CLASS = { todo:'t-todo', in_progress:'t-inprog', review:'t-review', done:'t-done', delayed:'t-todo' };
const PRIORITY_CLASS = { blocker:'priority-blocker', critical:'priority-critical', urgent:'priority-urgent', high:'priority-high', medium:'priority-medium', low:'text-neutral-400' };
const FILTERS = ['all','todo','in_progress','review','done','delayed'];

export default function Tasks() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [subOpen, setSubOpen] = useState(null);
  const { user } = useAuth();

  const fetchTasks = (f) => {
    setLoading(true);
    const params = {};
    if (f !== 'all') params.status = f;
    tasks.getAll(params).then((res) => setList(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(filter); }, [filter]);

  if (loading && list.length === 0) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const filtered = search ? list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())) : list;
  const counts = { all: list.length, todo:0, in_progress:0, review:0, done:0, delayed:0 };
  list.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'#111827'}}>Tasks</div><div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>{list.length} tasks total</div></div>
      </div>

      <div className="card" style={{marginBottom:10}}>
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

      <div className="card">
        <table className="task-table">
          <thead><tr><th style={{width:28}}><input type="checkbox" style={{accentColor:'#2347e8'}} /></th><th>Task</th><th>Project</th><th>Status</th><th>Subtask</th><th>Priority</th><th>Assignee</th><th>Deadline</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{textAlign:'center',padding:20,fontSize:11,color:'#9ca3af'}}>No tasks found</td></tr>
            ) : filtered.map((t) => {
              const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done';
              const subDone = t.subtasks?.filter(st => st.completed).length || 0;
              const subTotal = t.subtasks?.length || 0;
              return (
                <tr key={t._id}>
                  <td><input type="checkbox" style={{accentColor:'#2347e8'}} /></td>
                  <td style={{fontWeight:500,color:'#111827'}}>
                    {t.title}
                    {t.description && <div style={{fontSize:10,color:'#9ca3af'}}>{t.description}</div>}
                  </td>
                  <td>
                    {t.project?.name && <span style={{fontSize:9,background:'#f0f4ff',color:'#2347e8',padding:'2px 6px',borderRadius:5,fontWeight:500}}>{t.project.name}</span>}
                  </td>
                  <td>
                    <span className={STATUS_CLASS[t.status] || 't-todo'}
                      style={{fontSize:9,fontWeight:600,padding:'2px 7px',borderRadius:20,display:'inline-block'}}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
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
                            <input type="checkbox" checked={st.completed}
                              onChange={async () => {
                                await tasks.updateSubtask(t._id, st._id, { completed: !st.completed });
                                fetchTasks(filter);
                              }}
                              style={{accentColor:'#2347e8'}} />
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
                        <div className="a-av" style={{background:t.assignee.role === 'developer' ? '#f0fdf4' : t.assignee.role === 'intern' ? '#fff7ed' : '#dce6ff',color:t.assignee.role === 'developer' ? '#16a34a' : t.assignee.role === 'intern' ? '#c2410c' : '#1a35c4'}}>
                          {t.assignee.name?.charAt(0)}
                        </div>
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
    </div>
  );
}
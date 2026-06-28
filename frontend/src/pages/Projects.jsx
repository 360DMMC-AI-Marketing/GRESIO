import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import ReportChoiceModal from '../components/ReportChoiceModal';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Search } from 'lucide-react';
import FEATURES from '../config/featureFlags';

const STATUS_CLASS = {
  on_track:'bg-success-50 text-success-700', at_risk:'bg-warning-50 text-warning-700',
  delayed:'bg-danger-50 text-danger-700', ready_to_test:'bg-info-50 text-info-700',
  completed:'bg-neutral-100 text-neutral-600',
};
const PROGRESS_COLOR = (val) => {
  if (val >= 80) return '#22c55e';
  if (val >= 40) return '#f59e0b';
  return '#ef4444';
};
export default function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', client: '', deadline: '', projectType: 'umbrella', departments: [{ name: '', type: 'software' }] });
  const [expanded, setExpanded] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [reportProject, setReportProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const pollRef = useRef(null);
  const fetchProjects = (showLoader) => {
    if (showLoader) setLoading(true);
    setError(null);
    projects.getAll()
      .then((res) => setList(res.data))
      .catch((e) => setError(e.message || 'Failed to load projects'))
      .finally(() => { if (showLoader) setLoading(false); });
  };
  useEffect(() => {
    fetchProjects(true);
    pollRef.current = setInterval(() => fetchProjects(false), 15000);
    return () => clearInterval(pollRef.current);
  }, [location.state?.refresh]);

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        client: form.client,
        deadline: form.deadline || undefined,
        members: [user._id],
      };
      if (form.projectType === 'umbrella') {
        const depts = form.departments.filter(d => d.name.trim()).map(d => ({ name: d.name.trim(), type: d.type }));
        if (depts.length === 0) return;
        payload.departments = depts;
      }
      const res = await projects.create(payload);
      const created = res.data;
      setList((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ name: '', description: '', client: '', deadline: '', projectType: 'umbrella', departments: [{ name: '', type: 'software' }] });
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await projects.delete(id);
      setList((prev) => prev.filter((p) => p._id !== id));
    } catch (err) { console.error(err); }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <LoadingState message="Loading projects..." />;

  if (error) return <ErrorState message={error} onRetry={() => fetchProjects(true)} />;

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) : list;
  const umbrellas = filtered.filter(p => p.projectType === 'umbrella' || p.children?.length > 0);
  const standalone = filtered.filter(p => !p.parentProject && p.projectType !== 'umbrella' && (!p.children || p.children.length === 0));

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-3 glass-panel" style={{padding:'8px 14px',borderRadius:'var(--radius-lg)'}}>
        <div className="shrink-0">
          <div className="text-sm font-bold text-neutral-900">Projects</div>
          <div className="text-[10px] text-neutral-400 mt-0.5"><span className="num-mono">{filtered.length}</span> active</div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <div className="relative w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search projects..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]" />
          </div>
          {['admin', 'project_manager'].includes(user?.role) && (
            <button data-voice="new-project" onClick={() => setShowForm(!showForm)} className="btn-premium shrink-0">
              + New Project
            </button>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Project" icon="📁"
        footer={
          <>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all cursor-pointer border-none">Cancel</button>
            <button data-voice="create-project" onClick={handleCreate} disabled={!form.name.trim()}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border-none ${
                !form.name.trim() ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]' : 'btn-premium text-white'
              }`}
              style={form.name.trim() ? {padding:'0.375rem 0.75rem'} : {}}>
              Create
            </button>
          </>
        }>
        <div className="space-y-2.5">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Project type</label>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setForm({ ...form, projectType: 'standalone' })}
                className={`flex-1 text-xs font-medium rounded-lg transition-all cursor-pointer border-none px-3 py-1.5 ${
                  form.projectType === 'standalone'
                    ? 'btn-premium text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-primary)]'
                }`}
                style={form.projectType === 'standalone' ? {padding:'0.375rem 0.75rem'} : {}}>
                📄 Standalone Project
              </button>
              <button type="button" onClick={() => setForm({ ...form, projectType: 'umbrella' })}
                className={`flex-1 text-xs font-medium rounded-lg transition-all cursor-pointer border-none px-3 py-1.5 ${
                  form.projectType === 'umbrella'
                    ? 'btn-premium text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-primary)]'
                }`}
                style={form.projectType === 'umbrella' ? {padding:'0.375rem 0.75rem'} : {}}>
                🏢 Umbrella + Sub-Projects
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Project name *</label>
            <input data-voice="field-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name"
              className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all box-border" required />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Description</label>
            <input data-voice="field-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description"
              className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all box-border" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Client name</label>
              <input data-voice="field-client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Client name"
                className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all box-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="select w-full" />
            </div>
          </div>
          {form.projectType === 'umbrella' && (
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Departments (sub-projects) *</label>
              {form.departments.map((dept, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                  <input value={dept.name} onChange={(e) => {
                    const depts = [...form.departments];
                    depts[i] = { ...depts[i], name: e.target.value };
                    setForm({ ...form, departments: depts });
                  }} placeholder="Department name"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all box-border" />
                  <select value={dept.type} onChange={(e) => {
                    const depts = [...form.departments];
                    depts[i] = { ...depts[i], type: e.target.value };
                    setForm({ ...form, departments: depts });
                  }} className="select w-[120px] text-xs">
                    <option value="software">Software</option>
                    <option value="design">Design</option>
                    <option value="business">Business</option>
                    <option value="content">Content</option>
                    <option value="research">Research</option>
                  </select>
                  {form.departments.length > 1 && (
                    <button onClick={() => {
                      const depts = form.departments.filter((_, j) => j !== i);
                      setForm({ ...form, departments: depts.length ? depts : [{ name: '', type: 'software' }] });
                    }} className="px-2 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer border-none whitespace-nowrap"
                      style={{color:'var(--text-danger)',background:'var(--bg-danger-subtle)'}}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm({ ...form, departments: [...form.departments, { name: '', type: 'software' }] })}
                className="px-2.5 py-1 text-xs font-medium rounded-lg text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all cursor-pointer border-none">
                + Add department
              </button>
            </div>
          )}
        </div>
      </Modal>

      {filtered.length === 0 ? (
        <EmptyState icon="📁" title={list.length === 0 ? "No projects yet" : "No results"} description={list.length === 0 ? "Create your first project to get started" : `No projects matching "${searchQuery}"`} />
      ) : (
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {umbrellas.map((p) => (
            <div key={p._id} style={{gridColumn:'1/-1',marginBottom:0}}>
              <div className="card card-premium glow-card" style={{padding:14,cursor:'pointer',borderLeft:'3px solid var(--brand-500)'}} onClick={() => navigate(`/projects/${p._id}`)}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>
                    <span style={{cursor:'pointer',userSelect:'none'}} onClick={(e) => { e.stopPropagation(); toggleExpand(p._id); }}>{expanded[p._id] ? '▼' : '▶'}</span> {p.name}
                    <span style={{fontSize:9,color:'var(--brand-500)',background:'var(--bg-brand-subtle)',padding:'1px 6px',borderRadius:'var(--radius-sm)',marginLeft:6,fontWeight:500}}>Umbrella</span>
                  </span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span className={`status-badge ${STATUS_CLASS[p.status] || 'bg-neutral-100 text-neutral-600'}`}
                      style={{textTransform:'capitalize'}}>
                      {(p.phase || 'planning').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                    </span>
                    {['admin', 'project_manager'].includes(user?.role) && (
                      <span onClick={(e) => { e.stopPropagation(); setConfirmState({ title:'Delete project', message:`Delete project "${p.name}" permanently? All sub-projects and data will be removed.`, onConfirm:() => handleDelete(p._id) }); }}
                        className="btn btn-gray" style={{fontSize:12,color:'var(--text-danger)',padding:'2px 6px',minHeight:0}} title="Delete project">✕</span>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',fontSize:9,color:'var(--text-muted)',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                  <span>📋 {p.client || p.settings?.clientName || 'N/A'}</span>
                  <span>📅 {p.deadline ? new Date(p.deadline).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : 'No deadline'}</span>
                  <span>🏢 {(p.children || []).length} sub-project(s)</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-muted)',alignItems:'center'}}>
                  <span><span className="num-mono">{p.members?.length || 0}</span> members</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:80,height:5,background:'var(--bg-tertiary)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{width:`${p.progress || 0}%`,height:'100%',background:PROGRESS_COLOR(p.progress || 0),borderRadius:4,transition:'width 0.5s ease'}} />
                    </div>
                    <span style={{fontWeight:600,color:'var(--text-primary)'}}><span className="num-mono">{p.progress || 0}</span>%</span>
                  </div>
                </div>
              </div>
              {expanded[p._id] && (p.children || []).map((child) => (
                <div key={child._id} className="card card-premium" style={{padding:14,cursor:'pointer',marginLeft:20,marginTop:6,borderLeft:'2px solid var(--border-primary)'}}
                  onClick={() => navigate(`/projects/${child._id}`)}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>
                      {child.name}
                      <span style={{fontSize:9,color:'var(--text-muted)',background:'var(--bg-tertiary)',padding:'1px 6px',borderRadius:'var(--radius-sm)',marginLeft:6,fontWeight:400}}>Department</span>
                    </span>
                    <span className={`status-badge ${STATUS_CLASS[child.status] || 'bg-neutral-100 text-neutral-600'}`}
                      style={{textTransform:'capitalize',fontSize:9}}>
                      {(child.phase || 'planning').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                    </span>
                  </div>
                  <div style={{display:'flex',fontSize:9,color:'var(--text-muted)',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    <span>👥 <span className="num-mono">{child.members?.length || 0}</span> members · ️<span className="num-mono">{child.tasks?.length || 0}</span> tasks</span>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
                      <div style={{width:60,height:4,background:'var(--bg-tertiary)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:`${child.progress || 0}%`,height:'100%',background:PROGRESS_COLOR(child.progress || 0),borderRadius:3,transition:'width 0.5s ease'}} />
                      </div>
                      <span style={{fontWeight:600,color:'var(--text-primary)'}}><span className="num-mono">{child.progress || 0}</span>%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {standalone.map((p) => (
            <div key={p._id} className="card card-premium" style={{padding:14,cursor:'pointer'}} onClick={() => navigate(`/projects/${p._id}`)}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{p.name}</span>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span className={`status-badge ${STATUS_CLASS[p.status] || 'bg-neutral-100 text-neutral-600'}`}
                    style={{textTransform:'capitalize'}}>
                    {(p.phase || 'planning').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                  </span>
                  {p.projectType && p.projectType !== 'umbrella' && <span style={{fontSize:8,color:'var(--text-muted)',background:'var(--bg-tertiary)',padding:'2px 6px',borderRadius:'var(--radius-sm)'}}>{p.projectType}</span>}
                  {['admin', 'project_manager'].includes(user?.role) && (
                    <span onClick={(e) => { e.stopPropagation(); setConfirmState({ title:'Delete project', message:`Delete project "${p.name}" permanently? All tasks and data will be removed.`, onConfirm:() => handleDelete(p._id) }); }}
                      className="btn btn-gray" style={{fontSize:12,color:'var(--text-danger)',padding:'2px 6px',minHeight:0}} title="Delete project">✕</span>
                  )}
                </div>
              </div>
              {p.description && <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:8}}>{p.description}</div>}
              <div style={{display:'flex',fontSize:9,color:'var(--text-muted)',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                <span>📋 Client: {p.client || p.settings?.clientName || 'N/A'}</span>
                <span>📅 Deadline: {p.deadline ? new Date(p.deadline).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : 'N/A'}</span>
                <span>🕐 Created: {new Date(p.createdAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-muted)',alignItems:'center'}}>
                <span><span className="num-mono">{p.members?.length || 0}</span> members · <span className="num-mono">{p.tasks?.length || 0}</span> tasks</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:80,height:5,background:'var(--bg-tertiary)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{width:`${p.progress}%`,height:'100%',background:PROGRESS_COLOR(p.progress),borderRadius:4,transition:'width 0.5s ease'}} />
                  </div>
                  <span style={{fontWeight:600,color:'var(--text-primary)'}}><span className="num-mono">{p.progress}</span>%</span>
                </div>
              </div>
              {(p.status === 'completed' || p.phase === 'delivered') && ['admin','project_manager','manager','team_lead'].includes(user?.role) && (
                <div style={{display:'flex',gap:4,marginTop:8}}>
                  <button data-voice="generate-report"
                    onClick={(e) => { e.stopPropagation(); setReportProject(p); }}
                    className="btn-premium" style={{flex:1,fontSize:10}}>
                    Generate Report
                  </button>
                  {FEATURES.customReportEditor && (
                    <button data-voice="customize-report"
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p._id}/reports/edit`); }}
                      className="btn btn-gray" style={{flex:1,fontSize:10}}>
                      Customize Report
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reportProject && (
        <ReportChoiceModal
          projectId={reportProject._id}
          projectName={reportProject.name}
          onClose={() => setReportProject(null)}
          onGenerated={() => {}}
        />
      )}
      <ConfirmModal
        open={!!confirmState} onClose={() => setConfirmState(null)}
        title={confirmState?.title} message={confirmState?.message}
        onConfirm={confirmState?.onConfirm || (() => {})}
        confirmText="Delete"
      />
    </div>
  );
}

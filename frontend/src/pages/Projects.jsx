import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import ReportChoiceModal from '../components/ReportChoiceModal';

const STATUS_CLASS = {
  on_track:'bg-success-50 text-success-700', at_risk:'bg-warning-50 text-warning-700',
  delayed:'bg-danger-50 text-danger-700', ready_to_test:'bg-info-50 text-info-700',
  completed:'bg-neutral-100 text-neutral-600',
};
const labelStyle = {display:'block',fontSize:10,fontWeight:500,color:'#374151',marginBottom:3};
const inputStyle = {width:'100%',padding:'6px 10px',fontSize:11,border:'0.5px solid #d1d5db',borderRadius:6,outline:'none',boxSizing:'border-box',background:'#f9fafb'};

export default function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', client: '', deadline: '', projectType: 'software' });
  const [confirmState, setConfirmState] = useState(null);
  const [reportProject, setReportProject] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    projects.getAll()
      .then((res) => setList(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [location.state?.refresh]);

  const handleCreate = async () => {
    try {
      const res = await projects.create({ ...form, members: [user._id] });
      setList((prev) => [res.data, ...prev]);
      setShowForm(false);
      setForm({ name: '', description: '', client: '', deadline: '', projectType: 'software' });
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await projects.delete(id);
      setList((prev) => prev.filter((p) => p._id !== id));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-neutral-900">Projects</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">{list.length} active projects</div>
        </div>
        {['admin', 'project_manager'].includes(user?.role) && (
          <button onClick={() => setShowForm(!showForm)}
            style={{padding:'6px 12px',background:'#2347e8',color:'white',borderRadius:7,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>
            + New Project
          </button>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Project" icon="📁"
        footer={
          <>
            <button onClick={() => setShowForm(false)}
              style={{padding:'5px 12px',background:'#f3f4f6',color:'#374151',borderRadius:6,fontSize:11,border:'none',cursor:'pointer'}}>Cancel</button>
            <button onClick={handleCreate}
              style={{padding:'5px 12px',background:'#2347e8',color:'white',borderRadius:6,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>Create</button>
          </>
        }>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={labelStyle}>Project name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name"
              style={inputStyle} required /></div>
          <div><label style={labelStyle}>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description"
              style={inputStyle} /></div>
          <div><label style={labelStyle}>Client name</label>
            <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Client name"
              style={inputStyle} /></div>
          <div><label style={labelStyle}>Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              style={inputStyle} /></div>
          <div style={{gridColumn:'1/-1'}}><label style={labelStyle}>Project type</label>
            <select value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })}
              style={{...inputStyle,appearance:'auto'}}>
              <option value="software">Software / Development</option>
              <option value="design">Design / Creative</option>
              <option value="business">Business / Marketing / Growth</option>
              <option value="content">Content / Writing</option>
              <option value="research">Research / Analysis</option>
            </select></div>
        </div>
      </Modal>

      {list.length === 0 ? (
        <div className="text-center py-20 text-neutral-400"><p className="text-4xl mb-3">📁</p><p>No projects yet</p></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {list.map((p) => (
            <div key={p._id} className="card" style={{padding:14,cursor:'pointer'}} onClick={() => navigate(`/projects/${p._id}`)}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>{p.name}</span>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span className={`status-badge ${STATUS_CLASS[p.status] || 'bg-neutral-100 text-neutral-600'}`}
                    style={{textTransform:'capitalize'}}>
                    {(p.phase || 'planning').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                  </span>
                  {p.projectType && <span style={{fontSize:8,color:'#6b7280',background:'#f3f4f6',padding:'2px 6px',borderRadius:4}}>{p.projectType}</span>}
                  {['admin', 'project_manager'].includes(user?.role) && (
                    <span onClick={(e) => { e.stopPropagation(); setConfirmState({ title:'Delete project', message:`Delete project "${p.name}" permanently? All tasks and data will be removed.`, onConfirm:() => handleDelete(p._id) }); }}
                      style={{fontSize:12,color:'#f87171',cursor:'pointer',padding:'2px'}} title="Delete project">✕</span>
                  )}
                </div>
              </div>
              {p.description && <div style={{fontSize:11,color:'#6b7280',marginBottom:8}}>{p.description}</div>}
              <div style={{display:'flex',fontSize:9,color:'#6b7280',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                <span>📋 Client: {p.client || p.settings?.clientName || 'N/A'}</span>
                <span>📅 Deadline: {p.deadline ? new Date(p.deadline).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : 'N/A'}</span>
                <span>🕐 Created: {new Date(p.createdAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#6b7280'}}>
                <span>{p.members?.length || 0} members · {p.tasks?.length || 0} tasks</span>
                <span style={{fontWeight:600,color:'#111827'}}>{p.progress}%</span>
              </div>
              {(p.status === 'completed' || p.phase === 'delivered') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setReportProject(p); }}
                  style={{marginTop:8,width:'100%',padding:'5px 0',background:'#2347e8',color:'white',borderRadius:6,fontSize:10,fontWeight:600,border:'none',cursor:'pointer'}}
                >
                  Generate Report
                </button>
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

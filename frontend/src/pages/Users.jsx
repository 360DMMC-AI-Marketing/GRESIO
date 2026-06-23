import { useState, useEffect } from 'react';
import api, { workLogs } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Dropdown from '../components/Dropdown';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  admin: { bg:'#eef2ff', clr:'#4338ca' },
  company_owner: { bg:'#eef2ff', clr:'#4338ca' },
  project_manager: { bg:'#fffbeb', clr:'#d97706' },
  team_leader: { bg:'#eef2ff', clr:'#4338ca' },
  scrum_master: { bg:'#eef2ff', clr:'#4338ca' },
  manager: { bg:'#f5f3ff', clr:'#7c3aed' },
  developer: { bg:'#f0fdf4', clr:'#16a34a' },
  frontend_developer: { bg:'#f0fdf4', clr:'#16a34a' },
  backend_developer: { bg:'#f0fdf4', clr:'#059669' },
  full_stack_developer: { bg:'#f0fdf4', clr:'#16a34a' },
  mobile_developer: { bg:'#f0fdf4', clr:'#0891b2' },
  devops_engineer: { bg:'#f0fdf4', clr:'#65a30d' },
  qa_tester: { bg:'#fdf4ff', clr:'#a21caf' },
  automation_tester: { bg:'#fdf4ff', clr:'#a21caf' },
  qa_lead: { bg:'#fdf4ff', clr:'#7e22ce' },
  ui_designer: { bg:'#fdf4ff', clr:'#c026d3' },
  ux_designer: { bg:'#fdf4ff', clr:'#c026d3' },
  product_designer: { bg:'#fdf4ff', clr:'#c026d3' },
  designer: { bg:'#fdf4ff', clr:'#c026d3' },
  business_analyst: { bg:'#fff7ed', clr:'#c2410c' },
  product_owner: { bg:'#fff7ed', clr:'#c2410c' },
  business_developer: { bg:'#fff7ed', clr:'#c2410c' },
  intern: { bg:'#f1f5f9', clr:'#475569' },
  development_intern: { bg:'#f1f5f9', clr:'#475569' },
  qa_intern: { bg:'#f1f5f9', clr:'#475569' },
  design_intern: { bg:'#f1f5f9', clr:'#475569' },
  business_intern: { bg:'#f1f5f9', clr:'#475569' },
};

const CAN_MANAGE = ['admin', 'project_manager', 'team_lead'];

const ROLE_CATEGORIES = [
  { label:'Developer', roles:['developer','frontend_developer','backend_developer','full_stack_developer','mobile_developer','devops_engineer'] },
  { label:'QA', roles:['qa_tester','automation_tester','qa_lead'] },
  { label:'Design', roles:['designer','ui_designer','ux_designer','product_designer'] },
  { label:'Management', roles:['project_manager','team_leader','scrum_master','manager'] },
  { label:'Business', roles:['business_analyst','product_owner','business_developer'] },
  { label:'Intern', roles:['intern','development_intern','qa_intern','design_intern','business_intern'] },
  { label:'Admin', roles:['admin','company_owner'] },
];

const USER_ROLES = [
  { value:'admin', label:'Admin' },
  { value:'project_manager', label:'Project Manager' },
  { value:'team_lead', label:'Team Lead' },
  { value:'manager', label:'Manager' },
  { value:'designer', label:'Designer' },
  { value:'business_analyst', label:'Business Analyst' },
  { value:'developer', label:'Developer' },
  { value:'qa_tester', label:'QA Tester' },
  { value:'intern', label:'Intern' },
  { value:'other', label:'Other' },
];

export default function Users() {
  const { user } = useAuth();
  const canManage = CAN_MANAGE.includes(user?.role);
  const [groupedData, setGroupedData] = useState({ groups:[], ungrouped:[] });
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ email:'', projectRole:'developer', teamGroup:'', project:'', message:'' });
  const [projects, setProjects] = useState([]);
  const [projectGroups, setProjectGroups] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('assignments');
  const [showNewDeptForm, setShowNewDeptForm] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptIcon, setNewDeptIcon] = useState('👥');
  const [memberWorkLogs, setMemberWorkLogs] = useState([]);
  const [loadingWorkLogs, setLoadingWorkLogs] = useState(false);
  const [showWLForm, setShowWLForm] = useState(false);
  const [editingWLId, setEditingWLId] = useState(null);
  const [wlForm, setWlForm] = useState({ date:new Date().toISOString().split('T')[0], hours:1, project:'', description:'', tags:'' });
  const [selectedWLDetail, setSelectedWLDetail] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show:false, message:'', onConfirm:null });
  const [savingRole, setSavingRole] = useState(false);

  const canChangeRole = user?.role === 'admin';

  const fetchData = async () => {
    try {
      const [groupedRes, projRes] = await Promise.all([
        api.get('/projects/teams/grouped'),
        api.get('/projects'),
      ]);
      setGroupedData(groupedRes.data);
      setProjects(projRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    setSavingRole(true);
    try {
      await api.patch(`/users/${userId}`, { role: newRole });
      toast.success('Role updated');
      setSelectedMember(prev => prev ? {
        ...prev,
        user: { ...prev.user, role: newRole },
      } : null);
      const groupedRes = await api.get('/projects/teams/grouped');
      setGroupedData(groupedRes.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  useEffect(() => {
    if (!addForm.project) { setProjectGroups([]); return; }
    api.get(`/projects/${addForm.project}/team/groups`)
      .then(r => setProjectGroups(r.data))
      .catch(() => setProjectGroups([]));
  }, [addForm.project]);

  useEffect(() => {
    if (!selectedMember) { setMemberWorkLogs([]); return; }
    const uid = selectedMember.user?._id;
    if (!uid) return;
    setLoadingWorkLogs(true);
    workLogs.getHistory(uid).then(r => setMemberWorkLogs(r.data)).catch(() => {}).finally(() => setLoadingWorkLogs(false));
  }, [selectedMember]);

  const toggleCollapse = (name) => setCollapsed(p => ({ ...p, [name]: !p[name] }));

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addForm.project) return toast.error('Select a project');
    if (!addForm.email) return toast.error('Email is required');
    try {
      await api.post(`/projects/${addForm.project}/team`, {
        email: addForm.email,
        projectRole: addForm.projectRole,
        teamGroup: addForm.teamGroup || undefined,
        message: addForm.message,
      });
      toast.success('Invitation sent successfully');
      setShowAddForm(false);
      setAddForm({ email:'', projectRole:'developer', teamGroup:'', project:'', message:'' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add member'); }
  };

  const handleRemoveMembership = async (membership) => {
    setConfirmModal({
      show:true,
      message:'Remove this member from this project?',
      onConfirm:async () => {
        try {
          const projectId = membership.project?._id || membership.project;
          await api.delete(`/projects/${projectId}/team/${membership.memberId}`);
          setSelectedMember(null);
          fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
      },
    });
  };

  const handleDeleteUser = async (userId, userName) => {
    setConfirmModal({
      show:true,
      message:`Delete "${userName}" permanently? They will lose access and be removed from all projects.`,
      onConfirm:async () => {
        try {
          await api.delete(`/users/${userId}`);
          setSelectedMember(null);
          fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete user'); }
      },
    });
  };

  const totalMembers = groupedData.groups.reduce((s, g) => s + g.members.length, 0) + groupedData.ungrouped.length;

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' });
  }

  function getWeekStart() {
    const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff)); monday.setHours(0, 0, 0, 0); return monday;
  }

  function isThisWeek(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr + 'T00:00:00');
    const ws = getWeekStart(); const we = new Date(ws); we.setDate(we.getDate() + 7);
    return date >= ws && date < we;
  }

  const TAG_STYLES = {
    coding:{ bg:'#dbeafe', clr:'#1d4ed8' }, meeting:{ bg:'#fef3c7', clr:'#b45309' },
    review:{ bg:'#ede9fe', clr:'#6d28d9' }, testing:{ bg:'#dcfce7', clr:'#15803d' },
    design:{ bg:'#fce7f3', clr:'#be185d' }, deployment:{ bg:'#f5f5f4', clr:'#44403c' },
    documentation:{ bg:'#e0e7ff', clr:'#4338ca' }, default:{ bg:'#f3f4f6', clr:'#374151' },
  };
  function getTagStyle(tag) { return TAG_STYLES[tag.toLowerCase().trim()] || TAG_STYLES.default; }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const renderMemberRow = (member, groupIcon) => {
    const userRole = member.user?.role || 'developer';
    const rs = ROLE_STYLES[userRole] || ROLE_STYLES.developer;
    const counts = member.assignmentCounts || { tasks: 0, testCases: 0, bugs: 0 };
    const totalWork = counts.tasks + counts.testCases + counts.bugs;
    const assignState = totalWork > 0 ? 'assigned' : 'free';
    const assignColor = assignState === 'assigned' ? '#16a34a' : '#9ca3af';
    const assignLabel = assignState === 'assigned' ? 'Assigned' : 'Free';
    const barFill = assignState === 'assigned' ? 100 : 0;
    const name = member.user?.name || member.user?.email || 'Unknown';
    const initial = name.charAt(0).toUpperCase();
    return (
      <div key={`${member.user?._id || member.user?.email}-${groupIcon}`}
        onClick={() => setSelectedMember(member)}
        style={{ display:'grid', gridTemplateColumns:'32px 1fr 140px 80px 36px', gap:10, alignItems:'center', padding:'10px 54px 10px 64px', borderBottom:'1px solid #f9fafb', transition:'background 0.1s', cursor:'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
        <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, background:rs.bg, color:rs.clr, flexShrink:0 }}>
          {initial}
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:500, color:'#111827', display:'flex', alignItems:'center', gap:6 }}>
            {name}
            {member.memberships?.length > 1 && (
              <span style={{ fontSize:9, background:'#f0f4ff', color:'#1a35c4', padding:'1px 7px', borderRadius:4, fontWeight:500, whiteSpace:'nowrap' }}>
                {member.memberships.length} projects
              </span>
            )}
          </div>
          {member.user?.email && <div style={{ fontSize:9, color:'#9ca3af', marginTop:1 }}>{member.user.email}</div>}
        </div>
        <div>
          <span style={{ fontSize:10, background:rs.bg, color:rs.clr, padding:'2px 8px', borderRadius:4, fontWeight:500, whiteSpace:'nowrap' }}>
            {userRole.replace(/_/g, ' ')}
          </span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:assignColor, display:'inline-block' }}></span>
            <span style={{ fontSize:9, color:assignColor, fontWeight:600 }}>{assignLabel}</span>
          </div>
          <div style={{ width:'100%', height:2, background:'#e5e7eb', borderRadius:2, overflow:'hidden' }}>
            <div style={{ width:barFill+'%', height:'100%', background:assignColor, borderRadius:2, transition:'width 0.3s' }}></div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'center' }}>
          {canManage && member.user?._id && (
            <button type="button" onClick={e => { e.stopPropagation(); handleDeleteUser(member.user._id, name); }}
              style={{ background:'none', border:'none', color:'#fca5a5', fontSize:13, cursor:'pointer', padding:'2px 6px', borderRadius:4, lineHeight:1 }}
              onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color='#fca5a5'}
              title="Delete user">✕</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:'#111827' }}>Organization Chart</div>
          <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{totalMembers} members across {groupedData.groups.length} departments</div>
        </div>
        {canManage && (
          <div style={{ display:'flex', gap:6 }}>
            <button data-voice="create-department" onClick={() => setShowNewDeptForm(!showNewDeptForm)}
              style={{ padding:'7px 16px', background:'#2347e8', color:'white', borderRadius:8, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:14 }}>+</span> Create department
            </button>
            <button data-voice="invite-member" onClick={() => setShowAddForm(!showAddForm)}
              style={{ padding:'7px 16px', background:'#2347e8', color:'white', borderRadius:8, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:14 }}>+</span> Invite
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember}
          style={{ background:'white', borderRadius:12, border:'1px solid #2347e8', padding:'16px 18px', marginBottom:16, boxShadow:'0 2px 8px rgba(35,71,232,0.08)' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#111827', marginBottom:12 }}>Invite a new member</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email:e.target.value })}
              placeholder="Email address *" required
              style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, outline:'none' }} />
            <Dropdown value={addForm.projectRole} onChange={v => setAddForm({ ...addForm, projectRole:v })}
              options={ROLE_CATEGORIES.flatMap(c => c.roles.map(r => ({value:r, label:`${c.label} > ${r.replace(/_/g,' ')}`})))} style={{width:'100%'}} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <Dropdown value={addForm.project} onChange={v => setAddForm({ ...addForm, project:v, teamGroup:'' })}
              options={[{value:'', label:'— Select project —'}, ...projects.map(p => ({value:p._id, label:p.name}))]} style={{width:'100%'}} />
            <Dropdown value={addForm.teamGroup} onChange={v => setAddForm({ ...addForm, teamGroup:v })}
              options={[{value:'', label:'— Select department —'}, ...projectGroups.map(g => ({value:g._id, label:`${g.icon} ${g.name}`}))]} style={{width:'100%'}} />
          </div>
          <textarea value={addForm.message} onChange={e => setAddForm({ ...addForm, message:e.target.value })}
            placeholder="Invitation message (optional)"
            rows={2}
            style={{ width:'100%', padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, outline:'none', resize:'vertical', marginBottom:10, fontFamily:'inherit', boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:6 }}>
            <button type="submit"
              style={{ padding:'6px 16px', background:'#2347e8', color:'white', borderRadius:6, fontSize:10, fontWeight:600, border:'none', cursor:'pointer' }}>Send Invite</button>
            <button type="button" onClick={() => setShowAddForm(false)}
              style={{ padding:'6px 16px', background:'#f3f4f6', color:'#374151', borderRadius:6, fontSize:10, border:'none', cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      {showNewDeptForm && (
        <div style={{ background:'white', borderRadius:12, border:'1px solid #2347e8', padding:'16px 18px', marginBottom:16, boxShadow:'0 2px 8px rgba(35,71,232,0.08)' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#111827', marginBottom:12 }}>Create new department</div>
          <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
            placeholder="Department name *" style={{ width:'100%', padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, outline:'none', marginBottom:10, boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
            {['👥','💻','🎨','⚙️','📋','🔬','📊','🏗️','📝','🛠️','🎯','📦'].map(emoji => (
              <span key={emoji} onClick={() => setNewDeptIcon(emoji)}
                style={{ fontSize:16, cursor:'pointer', padding:'2px 4px', borderRadius:4, background: newDeptIcon === emoji ? '#e0e7ff' : 'transparent' }}>{emoji}</span>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button type="button" onClick={async () => {
              if (!newDeptName.trim()) { toast.error('Enter a department name'); return; }
              const projectId = addForm.project || projects[0]?._id;
              if (!projectId) { toast.error('No project available'); return; }
              try {
                await api.post(`/projects/${projectId}/team/groups`, { name: newDeptName.trim(), icon: newDeptIcon });
                const r = await api.get(`/projects/${projectId}/team/groups`);
                setProjectGroups(r.data);
                setNewDeptName('');
                setNewDeptIcon('👥');
                setShowNewDeptForm(false);
                toast.success('Department created');
              } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
            }}
              style={{ padding:'6px 16px', background:'#2347e8', color:'white', borderRadius:6, fontSize:10, fontWeight:600, border:'none', cursor:'pointer' }}>Create</button>
            <button type="button" onClick={() => { setShowNewDeptForm(false); setNewDeptName(''); setNewDeptIcon('👥'); }}
              style={{ padding:'6px 16px', background:'#f3f4f6', color:'#374151', borderRadius:6, fontSize:10, border:'none', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {groupedData.groups.length === 0 && groupedData.ungrouped.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9ca3af' }}>
          <p style={{ fontSize:32, marginBottom:8 }}>👥</p>
          <p style={{ fontSize:12 }}>No members yet</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {groupedData.groups.map(g => (
            <div key={g.name}
              style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div onClick={() => toggleCollapse(g.name)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:collapsed[g.name] ? 'none' : '1px solid #e5e7eb', cursor:'pointer', userSelect:'none' }}>
                <span style={{ fontSize:10, color:'#9ca3af', transition:'transform 0.2s', transform:collapsed[g.name] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                <span style={{ fontSize:20, flexShrink:0 }}>{g.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{g.name}</div>
                  <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>
                    {g.members.length} {g.members.length === 1 ? 'member' : 'members'}
                  </div>
                </div>
                <span style={{ fontSize:10, color:'#6b7280', background:'#f3f4f6', padding:'2px 12px', borderRadius:12, fontWeight:600 }}>
                  {g.members.length}
                </span>
              </div>
              {!collapsed[g.name] && (
                g.members.length === 0 ? (
                  <div style={{ padding:'24px', textAlign:'center', color:'#9ca3af', fontSize:11 }}>No members in this department yet</div>
                ) : (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 140px 80px 36px', gap:10, padding:'8px 54px 8px 64px', background:'#f9fafb', borderBottom:'1px solid #f3f4f6', fontSize:9, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <div></div>
                      <div>Member</div>
                      <div>Role</div>
                      <div style={{ textAlign:'center' }}>Load</div>
                      <div></div>
                    </div>
                    {g.members.map(m => renderMemberRow(m, g.name))}
                  </div>
                )
              )}
            </div>
          ))}
          {groupedData.ungrouped.length > 0 && (
            <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:'1px solid #e5e7eb' }}>
                <span style={{ fontSize:10, color:'#9ca3af' }}>▼</span>
                <span style={{ fontSize:20, flexShrink:0 }}>📋</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>Ungrouped</div>
                  <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>{groupedData.ungrouped.length} members</div>
                </div>
                <span style={{ fontSize:10, color:'#6b7280', background:'#f3f4f6', padding:'2px 12px', borderRadius:12, fontWeight:600 }}>{groupedData.ungrouped.length}</span>
              </div>
              {groupedData.ungrouped.map(m => {
                const rs = ROLE_STYLES[m.projectRole] || ROLE_STYLES.developer;
                const counts = m.assignmentCounts || { tasks: 0, testCases: 0, bugs: 0 };
                const totalWork = counts.tasks + counts.testCases + counts.bugs;
                const uaState = totalWork > 0 ? 'assigned' : 'free';
                const uaColor = uaState === 'assigned' ? '#16a34a' : '#9ca3af';
                const uaLabel = uaState === 'assigned' ? 'Assigned' : 'Free';
                return (
                  <div key={m._id}
                    onClick={() => setSelectedMember({ user:m.user, memberships:[{ project:m.project, projectRole:m.projectRole, status:m.status, memberId:m._id }] })}
                    style={{ display:'grid', gridTemplateColumns:'32px 1fr 140px 80px 36px', gap:10, alignItems:'center', padding:'10px 54px 10px 64px', borderBottom:'1px solid #f9fafb', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, background:rs.bg || '#f3f4f6', color:rs.clr || '#374151', flexShrink:0 }}>
                      {(m.user?.name || m.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#111827' }}>{m.user?.name || m.email}</div>
                      {m.user?.email && <div style={{ fontSize:9, color:'#9ca3af', marginTop:1 }}>{m.user.email}</div>}
                    </div>
                    <div><span style={{ fontSize:10, background:'#f3f4f6', color:'#374151', padding:'2px 8px', borderRadius:4 }}>{m.projectRole || 'developer'}</span></div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:uaColor, display:'inline-block' }}></span>
                        <span style={{ fontSize:9, color:uaColor, fontWeight:600 }}>{uaLabel}</span>
                      </div>
                      <div style={{ width:'100%', height:2, background:'#e5e7eb', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:uaState==='assigned'?'100%':'0%', height:'100%', background:uaColor, borderRadius:2 }}></div>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      {canManage && m.user?._id && (
                        <button type="button" onClick={e => { e.stopPropagation(); handleDeleteUser(m.user._id, m.user?.name || m.email); }}
                          style={{ background:'none', border:'none', color:'#fca5a5', fontSize:13, cursor:'pointer', padding:'2px 6px', borderRadius:4, lineHeight:1 }}
                          onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color='#fca5a5'}
                          title="Delete user">✕</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Member Detail Slide-in */}
      {selectedMember && (
        <>
          <div onClick={() => setSelectedMember(null)}
            className="fixed inset-0 bg-black/30 z-[999]" />
          <div className="fixed top-0 right-0 bottom-0 w-[420px] bg-white z-[1000] flex flex-col overflow-hidden shadow-[-8px_0_30px_rgba(0,0,0,0.12)] animate-[slideIn_0.2s_ease-out]">
            <style>{`@keyframes slideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>
            <div className="px-5 py-[16px] border-b border-surface-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold bg-indigo-50 text-indigo-700 shrink-0">
                  {(selectedMember.user?.name || selectedMember.user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-surface-900">{selectedMember.user?.name || selectedMember.user?.email}</div>
                  <div className="text-[10px] text-surface-500 mt-[1px]">{selectedMember.user?.email}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span style={{ fontSize:9, background:ROLE_STYLES[selectedMember.user?.role]?.bg||'#f3f4f6', color:ROLE_STYLES[selectedMember.user?.role]?.clr||'#6b7280', padding:'1px 6px', borderRadius:3, fontWeight:500 }}>
                      {selectedMember.user?.role?.replace(/_/g, ' ') || '—'}
                    </span>
                    {canChangeRole && selectedMember.user?.role !== 'super_admin' && (
                      <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
                        <select
                          value={selectedMember.user?.role || ''}
                          onChange={e => handleRoleChange(selectedMember.user?._id, e.target.value)}
                          disabled={savingRole}
                          style={{ fontSize:9, padding:'1px 4px', borderRadius:3, border:'1px solid #d1d5db', background:'white', color:'#374151', cursor:'pointer', outline:'none', maxWidth:100 }}
                        >
                          {USER_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        {savingRole && <span style={{ fontSize:8, color:'#6b7280', marginLeft:4 }}>...</span>}
                      </div>
                    )}
                    {canChangeRole && selectedMember.user?._id && (
                      <div style={{ marginTop:6 }}>
                        <span style={{ fontSize:9, color:'#6b7280' }}>Departments:</span>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                          {groupedData.groups.map(g => {
                            const depts = Array.isArray(selectedMember.user?.department)
                              ? selectedMember.user.department
                              : (selectedMember.user?.department ? [selectedMember.user.department] : []);
                            const isChecked = depts.includes(g.name);
                            return (
                              <label key={g.name}
                                style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 6px', borderRadius:4, fontSize:10, cursor:'pointer', background:isChecked?'#2347e8':'#f3f4f6', color:isChecked?'white':'#374151', border:'1px solid', borderColor:isChecked?'#2347e8':'#e5e7eb', userSelect:'none' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={async () => {
                                    const newDepts = isChecked
                                      ? depts.filter(d => d !== g.name)
                                      : [...depts, g.name];
                                    try {
                                      await api.patch(`/users/${selectedMember.user._id}/department`, { groupNames: newDepts });
                                      setSelectedMember(prev => prev ? {
                                        ...prev,
                                        user: { ...prev.user, department: newDepts },
                                      } : null);
                                      toast.success(`Departments updated`);
                                      const groupedRes = await api.get('/projects/teams/grouped');
                                      setGroupedData(groupedRes.data);
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || 'Failed to update departments');
                                    }
                                  }}
                                  style={{ display:'none' }}
                                />
                                <span>{g.icon}</span>
                                <span>{g.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)}
                style={{ background:'#f3f4f6', border:'none', borderRadius:8, width:28, height:28, fontSize:12, color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            {/* Tab navigation */}
            <div style={{ display:'flex', borderBottom:'1px solid #f3f4f6' }}>
              <div onClick={() => setActiveDrawerTab('assignments')}
                style={{ flex:1, padding:'10px 0', textAlign:'center', fontSize:11, fontWeight:600, cursor:'pointer', transition:'color 0.15s',
                  color: activeDrawerTab === 'assignments' ? '#2347e8' : '#6b7280',
                  borderBottom: activeDrawerTab === 'assignments' ? '2px solid #2347e8' : '2px solid transparent' }}>
                Project Assignments
              </div>
              <div onClick={() => setActiveDrawerTab('worklog')}
                style={{ flex:1, padding:'10px 0', textAlign:'center', fontSize:11, fontWeight:600, cursor:'pointer', transition:'color 0.15s',
                  color: activeDrawerTab === 'worklog' ? '#2347e8' : '#6b7280',
                  borderBottom: activeDrawerTab === 'worklog' ? '2px solid #2347e8' : '2px solid transparent' }}>
                Work Log
              </div>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
              {activeDrawerTab === 'assignments' && (
                <>
                  <div style={{ fontSize:11, fontWeight:600, color:'#111827', marginBottom:10 }}>
                    Project Assignments ({(selectedMember.memberships || []).filter(ms => ms.project).length || 0})
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {(selectedMember.memberships || []).filter(ms => ms.project).map((ms, i) => {
                      const rs = ROLE_STYLES[ms.projectRole] || ROLE_STYLES.developer;
                      const isActive = ms.status === 'active';
                      return (
                        <div key={i}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#f9fafb', borderRadius:8, border:'1px solid #f3f4f6' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:11, fontWeight:600, color:'#111827' }}>
                              {ms.project?.name || 'Unknown project'}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                              <span style={{ fontSize:9, background:rs.bg, color:rs.clr, padding:'1px 6px', borderRadius:3, fontWeight:500 }}>
                                {ms.projectRole?.replace(/_/g, ' ') || 'developer'}
                              </span>
                              <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                                <span style={{ width:5, height:5, borderRadius:'50%', background:isActive?'#22c55e':'#f59e0b', display:'inline-block' }}></span>
                                <span style={{ fontSize:9, color:isActive?'#16a34a':'#d97706', fontWeight:500 }}>{isActive ? 'Active' : 'Pending'}</span>
                              </span>
                            </div>
                          </div>
                          {canManage && ms.memberId && (ms.project?._id || ms.project) && (
                            <button data-voice="remove-member" onClick={() => handleRemoveMembership(ms)}
                              style={{ background:'none', border:'none', color:'#fca5a5', fontSize:13, cursor:'pointer', padding:2, lineHeight:1 }}
                              onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color='#fca5a5'}
                              title="Remove from project">✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(!selectedMember.memberships || selectedMember.memberships.filter(ms => ms.project).length === 0) && (
                    <div style={{ textAlign:'center', padding:'20px 0', color:'#9ca3af', fontSize:11 }}>No project assignments</div>
                  )}
                </>
              )}

              {activeDrawerTab === 'worklog' && (
                <>
                  {(() => {
                    const uid = selectedMember.user?._id;
                    const isOwnProfile = uid && uid === user?._id;
                    const weekLogs = memberWorkLogs.filter(l => isThisWeek(l.date));
                    const weekHours = weekLogs.reduce((s, l) => s + (l.hours || 0), 0);
                    const todayLogs = memberWorkLogs.filter(l => l.date === new Date().toISOString().split('T')[0]);
                    const todayHours = todayLogs.reduce((s, l) => s + (l.hours || 0), 0);
                    const goal = 40;
                    const pct = Math.min(100, Math.round((weekHours / goal) * 100));
                    return (
                      <div style={{ background:'linear-gradient(135deg,#f0f4ff,#eef2ff)', borderRadius:10, padding:'14px 16px', marginBottom:14, border:'1px solid #dce6ff' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>This Week: <span style={{ color:'#2347e8', fontSize:16 }}>{weekHours}h</span></div>
                            <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>Today: <span style={{ fontWeight:600, color:'#374151' }}>{todayHours}h</span></div>
                          </div>
                          {isOwnProfile && (
                            <button onClick={() => {
                              setShowWLForm(true); setEditingWLId(null);
                              setWlForm({ date:new Date().toISOString().split('T')[0], hours:1, project:'', description:'', tags:'' });
                            }}
                              style={{ padding:'7px 16px', background:'#2347e8', color:'white', borderRadius:7, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 2px 6px rgba(35,71,232,0.3)' }}>
                              + Add Entry
                            </button>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:8, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ width:pct+'%', height:'100%', background:pct >= 100 ? '#22c55e' : '#2347e8', borderRadius:4, transition:'width 0.3s' }}></div>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:'#6b7280' }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize:9, color:'#9ca3af', marginTop:6 }}>Weekly goal: {goal}h</div>
                      </div>
                    );
                  })()}

                  {loadingWorkLogs ? (
                    <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af', fontSize:11 }}>
                      <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" style={{ margin:'0 auto 10px' }}></div>
                      Loading work logs...
                    </div>
                  ) : memberWorkLogs.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'50px 0', color:'#9ca3af' }}>
                      <p style={{ fontSize:32, marginBottom:10 }}>📋</p>
                      <p style={{ fontSize:13, fontWeight:600, color:'#6b7280' }}>No work logged yet</p>
                      <p style={{ fontSize:11, marginTop:6, color:'#9ca3af' }}>
                        {(() => {
                          const uid = selectedMember.user?._id;
                          return uid && uid === user?._id
                            ? 'Click Add Entry to log your first activity'
                            : 'This user has no work log entries';
                        })()}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const uid = selectedMember.user?._id;
                      const isOwnProfile = uid && uid === user?._id;
                      const grouped = {};
                      memberWorkLogs.forEach(l => {
                        if (!grouped[l.date]) grouped[l.date] = [];
                        grouped[l.date].push(l);
                      });
                      return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, logs]) => {
                        const dayTotal = logs.reduce((s, l) => s + (l.hours || 0), 0);
                        return (
                          <div key={date} style={{ marginBottom:16 }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, paddingBottom:4, borderBottom:'1px solid #f3f4f6' }}>
                              <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>
                                {formatDateDisplay(date)}
                              </span>
                              <span style={{ fontSize:11, fontWeight:600, color:'#2347e8' }}>{dayTotal}h</span>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                              {logs.map(wl => (
                                <div key={wl._id}
                                  onClick={() => { if (!isOwnProfile) setSelectedWLDetail(wl); }}
                                  style={{ background:'white', borderRadius:8, border:'1px solid #e5e7eb', padding:'12px 14px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', cursor:isOwnProfile?'default':'pointer', transition:'box-shadow 0.15s' }}
                                  onMouseEnter={e => { if (!isOwnProfile) e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; }}
                                  onMouseLeave={e => { if (!isOwnProfile) e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                                        <span style={{ fontSize:16, fontWeight:800, color:'#2347e8' }}>{wl.hours}h</span>
                                        {wl.project?.name && (
                                          <span style={{ fontSize:10, fontWeight:600, background:'#dce6ff', color:'#1a35c4', padding:'2px 10px', borderRadius:5 }}>
                                            {wl.project.name}
                                          </span>
                                        )}
                                      </div>
                                      {wl.description && (
                                        <div style={{ fontSize:11, color:'#374151', marginBottom:5, lineHeight:1.5 }}>{wl.description}</div>
                                      )}
                                      {wl.tags && wl.tags.length > 0 && (
                                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                                          {wl.tags.map((tag, ti) => {
                                            const s = getTagStyle(tag);
                                            return (
                                              <span key={ti} style={{ fontSize:9, fontWeight:600, background:s.bg, color:s.clr, padding:'2px 8px', borderRadius:4 }}>
                                                {tag}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                    {isOwnProfile ? (
                                      <div style={{ display:'flex', gap:4, marginLeft:10, flexShrink:0 }}>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingWLId(wl._id); setShowWLForm(true);
                                          setWlForm({
                                            date: wl.date || new Date().toISOString().split('T')[0],
                                            hours: wl.hours || 1,
                                            project: wl.project?._id || '',
                                            description: wl.description || '',
                                            tags: (wl.tags || []).join(', '),
                                          });
                                        }}
                                          style={{ background:'#f3f4f6', border:'none', borderRadius:5, width:26, height:26, fontSize:11, color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                                          onMouseEnter={e => e.currentTarget.style.background='#dce6ff'}
                                          onMouseLeave={e => e.currentTarget.style.background='#f3f4f6'}
                                          title="Edit">✏️</button>
                                        <button onClick={(e) => { e.stopPropagation();
                                          setConfirmModal({
                                            show:true,
                                            message:'Delete this work log entry?',
                                            onConfirm:async () => {
                                              try {
                                                await workLogs.delete(wl._id);
                                                setMemberWorkLogs(prev => prev.filter(x => x._id !== wl._id));
                                              } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
                                            },
                                          });
                                        }}
                                          style={{ background:'#f3f4f6', border:'none', borderRadius:5, width:26, height:26, fontSize:11, color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                                          onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
                                          onMouseLeave={e => e.currentTarget.style.background='#f3f4f6'}
                                          title="Delete">🗑️</button>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize:9, color:'#9ca3af', flexShrink:0, marginLeft:8 }}>👁️</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </>
              )}
            </div>
          </div>

          {/* Work Log Form Modal */}
          {showWLForm && (
            <>
              <div onClick={() => setShowWLForm(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1001]" />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[400px] z-[1002] p-[22px]">
                <div className="flex items-center justify-between mb-[14px]">
                  <span className="text-sm font-bold text-surface-900">{editingWLId ? 'Edit Entry' : 'Add Work Log Entry'}</span>
                  <button onClick={() => setShowWLForm(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-100 text-surface-500 hover:text-surface-700 cursor-pointer border-none text-xs">✕</button>
                </div>

                <div className="mb-[10px]">
                  <label className="block text-[10px] font-medium text-surface-700 mb-[3px]">Date</label>
                   <input type="date" className="select" value={wlForm.date} onChange={e => setWlForm({ ...wlForm, date:e.target.value })} />
                </div>

                <div className="mb-[10px]">
                  <label className="block text-[10px] font-medium text-surface-700 mb-[3px]">Hours</label>
                  <input type="number" min="0.5" max="24" step="0.5" value={wlForm.hours}
                    onChange={e => setWlForm({ ...wlForm, hours:parseFloat(e.target.value) || 0.5 })}
                    className="w-full px-[10px] py-[7px] text-[11px] border border-surface-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 box-border" />
                </div>

                <div className="mb-[10px]">
                  <label className="block text-[10px] font-medium text-surface-700 mb-[3px]">Project</label>
                   <Dropdown value={wlForm.project} onChange={v => setWlForm({ ...wlForm, project:v })}
                     options={[{value:'', label:'— Select project —'}, ...(selectedMember.memberships || []).map(ms => ({value:ms.project?._id || ms.project, label:ms.project?.name || 'Unknown'}))]} />
                </div>

                <div className="mb-[10px]">
                  <label className="block text-[10px] font-medium text-surface-700 mb-[3px]">Description</label>
                  <textarea value={wlForm.description} onChange={e => setWlForm({ ...wlForm, description:e.target.value })}
                    rows={3} placeholder="What was done?"
                    className="w-full px-[10px] py-[7px] text-[11px] border border-surface-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 resize-none box-border font-inherit" />
                </div>

                <div className="mb-[14px]">
                  <label className="block text-[10px] font-medium text-surface-700 mb-[3px]">Tags <span className="text-surface-400 font-normal">(optional, comma separated)</span></label>
                  <input type="text" value={wlForm.tags} onChange={e => setWlForm({ ...wlForm, tags:e.target.value })}
                    placeholder='e.g. coding, meeting, review'
                    className="w-full px-[10px] py-[7px] text-[11px] border border-surface-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 box-border" />
                </div>

                <div className="flex gap-[6px]">
                  <button onClick={() => setShowWLForm(false)}
                    className="flex-1 py-[7px] bg-surface-100 text-surface-600 rounded-lg text-[10px] font-semibold border-none cursor-pointer hover:bg-surface-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={async () => {
                    if (!wlForm.hours || wlForm.hours <= 0) { toast.error('Hours must be greater than 0'); return; }
                    try {
                      const tags = wlForm.tags ? wlForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                      const body = {
                        date: wlForm.date,
                        project: wlForm.project || undefined,
                        hours: wlForm.hours,
                        description: wlForm.description,
                        tags,
                      };
                      if (editingWLId) {
                        const res = await workLogs.update(editingWLId, body);
                        setMemberWorkLogs(prev => prev.map(l => l._id === editingWLId ? { ...l, ...res.data, tags } : l));
                      } else {
                        const res = await workLogs.create(body);
                        setMemberWorkLogs(prev => [res.data, ...prev]);
                      }
                      setShowWLForm(false);
                      setEditingWLId(null);
                    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
                  }}
                    className="flex-[2] py-[7px] bg-primary-600 text-white rounded-lg text-[10px] font-semibold border-none cursor-pointer hover:bg-primary-700 transition-colors">
                    {editingWLId ? 'Update Entry' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Work Log Detail Modal */}
          {selectedWLDetail && (
            <>
              <div onClick={() => setSelectedWLDetail(null)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1001]" />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[400px] z-[1002] p-[22px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-surface-900">Work Log Details</span>
                  <button onClick={() => setSelectedWLDetail(null)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-100 text-surface-500 hover:text-surface-700 cursor-pointer border-none text-xs">✕</button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-primary-50 rounded-lg px-[14px] py-[10px]">
                    <span className="text-xl font-extrabold text-primary-600">{selectedWLDetail.hours}h</span>
                    <span className="text-[11px] text-surface-500">{selectedWLDetail.date}</span>
                  </div>
                  {selectedWLDetail.project?.name && (
                    <div>
                      <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Project</div>
                      <span className="text-[11px] font-semibold bg-primary-100 text-primary-700 px-[10px] py-[3px] rounded-[5px]">{selectedWLDetail.project.name}</span>
                    </div>
                  )}
                  {selectedWLDetail.taskTitle && (
                    <div>
                      <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Task</div>
                      <div className="text-[11px] text-surface-600">{selectedWLDetail.taskTitle}</div>
                    </div>
                  )}
                  {selectedWLDetail.description && (
                    <div>
                      <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Description</div>
                      <div className="text-[11px] text-surface-600 leading-relaxed bg-surface-50 rounded-lg px-[10px] py-[8px]">{selectedWLDetail.description}</div>
                    </div>
                  )}
                  {selectedWLDetail.notes && (
                    <div>
                      <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Notes</div>
                      <div className="text-[11px] text-surface-600 leading-relaxed bg-surface-50 rounded-lg px-[10px] py-[8px]">{selectedWLDetail.notes}</div>
                    </div>
                  )}
                  <div className="flex gap-4">
                    {selectedWLDetail.category && (
                      <div>
                        <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Category</div>
                        <span className="text-[10px] font-medium bg-surface-100 text-surface-600 px-[8px] py-[2px] rounded-[4px]">{selectedWLDetail.category}</span>
                      </div>
                    )}
                    {selectedWLDetail.mood && (
                      <div>
                        <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Mood</div>
                        <span className="text-[11px]">{selectedWLDetail.mood === 'great' ? '😊' : selectedWLDetail.mood === 'good' ? '🙂' : selectedWLDetail.mood === 'okay' ? '😐' : '😓'} {selectedWLDetail.mood}</span>
                      </div>
                    )}
                  </div>
                  {selectedWLDetail.tags && selectedWLDetail.tags.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mb-[3px]">Tags</div>
                      <div className="flex gap-1 flex-wrap">
                        {selectedWLDetail.tags.map((tag, ti) => {
                          const s = getTagStyle(tag);
                          return <span key={ti} className="text-[9px] font-semibold px-[8px] py-[2px] rounded-[4px]" style={{background:s.bg, color:s.clr}}>{tag}</span>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {confirmModal.show && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[9999]" onClick={() => setConfirmModal({ show:false, message:'', onConfirm:null })} />
          <div className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-white rounded-2xl shadow-2xl p-6">
            <div className="text-[13px] font-semibold text-surface-900 mb-1">Confirm</div>
            <div className="text-[11px] text-surface-500 mb-5">{confirmModal.message}</div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmModal({ show:false, message:'', onConfirm:null })}
                className="text-[11px] font-semibold px-4 py-[7px] rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors">Cancel</button>
              <button data-voice="confirm-remove" type="button" onClick={() => { confirmModal.onConfirm?.(); setConfirmModal({ show:false, message:'', onConfirm:null }); }}
                className="text-[11px] font-semibold px-4 py-[7px] rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Remove</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

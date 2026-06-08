import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const CAN_MANAGE = ['admin', 'project_manager', 'team_leader'];

const ROLE_CATEGORIES = [
  { label:'Developer', roles:['developer','frontend_developer','backend_developer','full_stack_developer','mobile_developer','devops_engineer'] },
  { label:'QA', roles:['qa_tester','automation_tester','qa_lead'] },
  { label:'Design', roles:['designer','ui_designer','ux_designer','product_designer'] },
  { label:'Management', roles:['project_manager','team_leader','scrum_master'] },
  { label:'Business', roles:['business_analyst','product_owner','business_developer'] },
  { label:'Intern', roles:['intern','development_intern','qa_intern','design_intern','business_intern'] },
  { label:'Admin', roles:['admin','company_owner'] },
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

  useEffect(() => {
    if (!addForm.project) { setProjectGroups([]); return; }
    api.get(`/projects/${addForm.project}/team/groups`)
      .then(r => setProjectGroups(r.data))
      .catch(() => setProjectGroups([]));
  }, [addForm.project]);

  const toggleCollapse = (name) => setCollapsed(p => ({ ...p, [name]: !p[name] }));

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addForm.project) return alert('Select a project');
    try {
      await api.post(`/projects/${addForm.project}/team`, {
        email: addForm.email,
        projectRole: addForm.projectRole,
        teamGroup: addForm.teamGroup || undefined,
        message: addForm.message,
      });
      setShowAddForm(false);
      setAddForm({ email:'', projectRole:'developer', teamGroup:'', project:'', message:'' });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to add member'); }
  };

  const handleRemoveMembership = async (membership) => {
    if (!window.confirm('Remove this member from this project?')) return;
    try {
      const projectId = membership.project?._id || membership.project;
      await api.delete(`/projects/${projectId}/team/${membership.memberId}`);
      setSelectedMember(null);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to remove'); }
  };

  const totalMembers = groupedData.groups.reduce((s, g) => s + g.members.length, 0) + groupedData.ungrouped.length;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const renderMemberRow = (member, groupIcon) => {
    const first = member.memberships?.[0] || {};
    const rs = ROLE_STYLES[first.projectRole] || ROLE_STYLES.developer;
    const allActive = member.memberships.every(m => m.status === 'active');
    const name = member.user?.name || member.user?.email || 'Unknown';
    const initial = name.charAt(0).toUpperCase();
    return (
      <div key={`${member.user?._id || member.user?.email}-${groupIcon}`}
        onClick={() => setSelectedMember(member)}
        style={{ display:'grid', gridTemplateColumns:'32px 1fr 140px 90px 36px', gap:10, alignItems:'center', padding:'10px 54px 10px 64px', borderBottom:'1px solid #f9fafb', transition:'background 0.1s', cursor:'pointer' }}
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
            {first.projectRole?.replace(/_/g, ' ') || 'developer'}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:allActive?'#22c55e':'#f59e0b', display:'inline-block' }}></span>
          <span style={{ fontSize:10, color:allActive?'#16a34a':'#d97706', fontWeight:500 }}>{allActive ? 'Active' : 'Mixed'}</span>
        </div>
        <div></div>
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
          <button onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding:'7px 16px', background:'#2347e8', color:'white', borderRadius:8, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:14 }}>+</span> Invite Member
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember}
          style={{ background:'white', borderRadius:12, border:'1px solid #2347e8', padding:'16px 18px', marginBottom:16, boxShadow:'0 2px 8px rgba(35,71,232,0.08)' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#111827', marginBottom:12 }}>Invite a new team member</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email:e.target.value })}
              placeholder="Email address *" required
              style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, outline:'none' }} />
            <select value={addForm.projectRole} onChange={e => setAddForm({ ...addForm, projectRole:e.target.value })}
              style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, background:'white', outline:'none' }}>
              {ROLE_CATEGORIES.map(c => (
                <optgroup key={c.label} label={c.label}>
                  {c.roles.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <select value={addForm.project} onChange={e => setAddForm({ ...addForm, project:e.target.value, teamGroup:'' })}
              style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, background:'white', outline:'none' }}>
              <option value="">— Select project —</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <select value={addForm.teamGroup} onChange={e => setAddForm({ ...addForm, teamGroup:e.target.value })}
              style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:11, background:'white', outline:'none' }}>
              <option value="">— No group —</option>
              {projectGroups.map(g => <option key={g._id} value={g._id}>{g.icon} {g.name}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button type="submit"
              style={{ padding:'6px 16px', background:'#2347e8', color:'white', borderRadius:6, fontSize:10, fontWeight:600, border:'none', cursor:'pointer' }}>Send Invite</button>
            <button type="button" onClick={() => setShowAddForm(false)}
              style={{ padding:'6px 16px', background:'#f3f4f6', color:'#374151', borderRadius:6, fontSize:10, border:'none', cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      {groupedData.groups.length === 0 && groupedData.ungrouped.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9ca3af' }}>
          <p style={{ fontSize:32, marginBottom:8 }}>👥</p>
          <p style={{ fontSize:12 }}>No team members yet</p>
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
                    {g.projects?.length > 1 && <span> · {g.projects.length} projects</span>}
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
                    <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 140px 90px 36px', gap:10, padding:'8px 54px 8px 64px', background:'#f9fafb', borderBottom:'1px solid #f3f4f6', fontSize:9, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <div></div>
                      <div>Team Member</div>
                      <div>Role</div>
                      <div>Status</div>
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
                return (
                  <div key={m._id}
                    onClick={() => setSelectedMember({ user:m.user, memberships:[m] })}
                    style={{ display:'grid', gridTemplateColumns:'32px 1fr 140px 90px 36px', gap:10, alignItems:'center', padding:'10px 54px 10px 64px', borderBottom:'1px solid #f9fafb', cursor:'pointer' }}
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
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:m.status==='active'?'#22c55e':'#f59e0b', display:'inline-block' }}></span>
                      <span style={{ fontSize:10, color:m.status==='active'?'#16a34a':'#d97706', fontWeight:500 }}>{m.status === 'active' ? 'Active' : 'Pending'}</span>
                    </div>
                    <div></div>
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
            style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.3)', zIndex:999 }} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'white', zIndex:1000,
            boxShadow:'-8px 0 30px rgba(0,0,0,0.12)', display:'flex', flexDirection:'column', overflow:'hidden',
            animation:'slideIn 0.2s ease-out' }}>
            <style>{`@keyframes slideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>
            <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, background:'#eef2ff', color:'#4338ca', flexShrink:0 }}>
                  {(selectedMember.user?.name || selectedMember.user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{selectedMember.user?.name || selectedMember.user?.email}</div>
                  <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>{selectedMember.user?.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)}
                style={{ background:'#f3f4f6', border:'none', borderRadius:8, width:28, height:28, fontSize:12, color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#111827', marginBottom:10 }}>
                Project Assignments ({selectedMember.memberships?.length || 0})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(selectedMember.memberships || []).map((ms, i) => {
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
                      {canManage && (
                        <button onClick={() => handleRemoveMembership(ms)}
                          style={{ background:'none', border:'none', color:'#fca5a5', fontSize:13, cursor:'pointer', padding:2, lineHeight:1 }}
                          onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color='#fca5a5'}
                          title="Remove from project">✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
              {(!selectedMember.memberships || selectedMember.memberships.length === 0) && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9ca3af', fontSize:11 }}>No project assignments</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

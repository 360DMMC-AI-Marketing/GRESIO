import React, { useState, useEffect } from 'react';
import { analytics, projects } from '../services/api';
import StatCard from '../components/StatCard';
import Dropdown from '../components/Dropdown';

const secTitle = { fontSize:15,fontWeight:600,color:'#111827',marginBottom:12,display:'flex',alignItems:'center',gap:8 };
const card = { background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:14 };
const badge = (bg,color) => ({ fontSize:9,padding:'2px 7px',borderRadius:20,background:bg||'#f3f4f6',color:color||'#374151',fontWeight:600 });
const statRow = { display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0' };

const WORKLOAD_LEVELS = [
  { max:30, label:'Low', color:'#22c55e', bg:'#f0fdf4' },
  { max:50, label:'Medium', color:'#f59e0b', bg:'#fffbeb' },
  { max:75, label:'High', color:'#f97316', bg:'#fff7ed' },
  { max:100, label:'Critical', color:'#ef4444', bg:'#fef2f2' },
];

function getWorkload(completionRate) {
  const inverted = 100 - (completionRate || 0);
  return WORKLOAD_LEVELS.find(w => inverted <= w.max) || WORKLOAD_LEVELS[WORKLOAD_LEVELS.length - 1];
}

function getParticipationColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

const DEPT_COLORS = ['#2347e8','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

const DEPT_BRAND = {
  'Development Team': { short:'Engineering', color:'#3B82F6', icon:'👨‍💻' },
  'QA & Testing Team': { short:'QA', color:'#10B981', icon:'🧪' },
  'Design Team': { short:'Design', color:'#8B5CF6', icon:'🎨' },
  'Project Management Team': { short:'PM', color:'#F59E0B', icon:'📊' },
  'Business Team': { short:'Business', color:'#EC4899', icon:'📈' },
  'Administration Team': { short:'Admin', color:'#EF4444', icon:'🔐' },
  'Interns': { short:'Interns', color:'#EAB308', icon:'🎓' },
};

function buildDeptData(project, groupedData) {
  if (!project || !groupedData) return [];
  const memberMap = {};
  (project.members || []).forEach(m => { memberMap[m.userId] = m; });
  const depts = (groupedData.groups || []).map((g, i) => {
    const deptMembers = (g.members || [])
      .map(m => {
        const uid = m.user?._id || m.user;
        const pm = memberMap[uid];
        return pm && uid ? { ...pm, user: m.user } : null;
      })
      .filter(Boolean);
    if (deptMembers.length === 0) return null;
    const getTotal = m => m.role === 'qa_tester' ? (m.testCasesAssigned||0) : (m.tasksAssigned||0);
    const getDone = m => m.role === 'qa_tester' ? (m.testCasesPassed||0) : (m.tasksDone||0);
    const totalTasks = deptMembers.reduce((s, m) => s + getTotal(m), 0);
    const doneTasks = deptMembers.reduce((s, m) => s + getDone(m), 0);
    const avgParticipation = Math.round(deptMembers.reduce((s, m) => s + (m.participation || 0), 0) / deptMembers.length);
    return {
      groupId: g._id || i,
      name: g.name,
      icon: g.icon || '👥',
      headcount: deptMembers.length, totalTasks, doneTasks, avgParticipation,
      members: deptMembers,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    };
  }).filter(Boolean);
  const groupedIds = new Set();
  (groupedData.groups || []).forEach(g => {
    (g.members || []).forEach(m => { groupedIds.add(String(m.user?._id || m.user)); });
  });
  const ungrouped = (project.members || []).filter(m => !groupedIds.has(m.userId));
  if (ungrouped.length > 0) {
    depts.push({
      groupId: 'ungrouped', name: 'Ungrouped', icon: '👤',
      headcount: ungrouped.length,
      totalTasks: ungrouped.reduce((s, m) => s + ((m.role === 'qa_tester' ? (m.testCasesAssigned||0) : (m.tasksAssigned||0))), 0),
      doneTasks: ungrouped.reduce((s, m) => s + ((m.role === 'qa_tester' ? (m.testCasesPassed||0) : (m.tasksDone||0))), 0),
      avgParticipation: Math.round(ungrouped.reduce((s, m) => s + (m.participation || 0), 0) / ungrouped.length),
      members: ungrouped, color: '#9ca3af',
    });
  }
  return depts;
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('workload');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDeptProject, setSelectedDeptProject] = useState(null);
  const [groupedMembers, setGroupedMembers] = useState(null);
  const [loadingDept, setLoadingDept] = useState(false);
  const [expandedDept, setExpandedDept] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [domainGroups, setDomainGroups] = useState(null);
  const [loadingDomainGroups, setLoadingDomainGroups] = useState(false);
  const [deptSearchQ, setDeptSearchQ] = useState('');
  const [deptSortCol, setDeptSortCol] = useState('name');
  const [deptSortDir, setDeptSortDir] = useState('asc');
  const [deptPage, setDeptPage] = useState(0);
  const [deptExpandedMember, setDeptExpandedMember] = useState(null);

  useEffect(() => {
    analytics.getCompany()
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDeptProject) {
      setLoadingDept(true);
      setGroupedMembers(null);
      projects.getGroupedMembers(selectedDeptProject.projectId)
        .then(r => setGroupedMembers(r.data))
        .catch(() => setGroupedMembers(null))
        .finally(() => setLoadingDept(false));
    } else {
      setGroupedMembers(null);
      setLoadingDept(false);
    }
  }, [selectedDeptProject]);

  useEffect(() => {
    setLoadingDomainGroups(true);
    projects.getAllDomainTeamGroups()
      .then(r => setDomainGroups(r.data))
      .catch(() => setDomainGroups(null))
      .finally(() => setLoadingDomainGroups(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;
  if (error) return <div style={{padding:20,fontSize:12,color:'#ef4444'}}>Error: {error}</div>;
  if (!data) return <div className="p-8 text-sm text-surface-500">No analytics data available.</div>;

  const { company, employeePerformance, projectParticipation, sprints, risks, resources, activity, healthScore, taskCompletionRateAll, insights } = data;

  // Build employee-project matrix: flatten projectParticipation into rows
  const employeeProjectRows = [];
  const employeeMap = {};
  employeePerformance.forEach(ep => { employeeMap[ep.userId] = ep; });

  projectParticipation.forEach(proj => {
    (proj.members || []).forEach(m => {
      const emp = employeeMap[m.userId] || {};
      const isQa = (m.role || emp.role) === 'qa_tester';
      const activeTasks = isQa
        ? (m.testCasesAssigned||0) - (m.testCasesPassed||0) - (m.testCasesFailed||0)
        : m.tasksAssigned - m.tasksDone;
      employeeProjectRows.push({
        employeeId: m.userId,
        employeeName: m.name,
        employeeRole: m.role || emp.role || '—',
        projectId: proj.projectId,
        projectName: proj.name,
        projectCompletion: proj.taskCompletionRate,
        participation: m.participation,
        tasksAssigned: m.tasksAssigned,
        tasksDone: m.tasksDone,
        activeTasks: Math.max(0, activeTasks),
        testCasesAssigned: m.testCasesAssigned || 0,
        testCasesPassed: m.testCasesPassed || 0,
        testCasesFailed: m.testCasesFailed || 0,
        overallScore: emp.participationScore || 0,
        taskCompletion: emp.taskCompletion || 0,
        sprintCompletion: emp.sprintCompletion || 0,
        deadlineRate: emp.deadlineRate || 0,
      });
    });
  });

  // Project Workload Dashboard
  const projectWorkload = projectParticipation.map(p => {
    const teamSize = p.members.length;
    const wl = getWorkload(p.taskCompletionRate);
    return { ...p, teamSize, workload: wl };
  });

  // Top contributors (top 5 by participation score)
  const topContributors = [...employeePerformance].sort((a, b) => b.participationScore - a.participationScore).slice(0, 5);

  // Underutilized (participation < 40)
  const underutilized = employeePerformance.filter(e => e.participationScore < 40);

  // Overloaded (assignedTasks > 15 or activityScore > avg * 1.5)
  const avgScore = employeePerformance.reduce((s, e) => s + e.activityScore, 0) / (employeePerformance.length || 1);
  const overloaded = employeePerformance.filter(e => e.assignedTasks > 15 || e.activityScore > avgScore * 1.5);

  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const tasksAll = projectParticipation.reduce((s, p) => s + (p.members || []).reduce((t, m) => t + (m.tasksAssigned || 0), 0), 0);
  const avgPart = Math.round(employeePerformance.reduce((s, e) => s + (e.participationScore || 0), 0) / (employeePerformance.length || 1));

  const tabs = [
    { key:'workload', label:'📊 Workload & Overview' },
    { key:'projects', label:'📋 Projects' },
    { key:'people', label:'👥 People' },
  ];

  return (
    <div style={{padding:'16px 20px',maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#111827',margin:0}}>Analytics</h1>
          <p style={{fontSize:11,color:'#6b7280',margin:'2px 0 0'}}>Workload distribution, company health, and performance overview</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'white',borderRadius:8,border:'0.5px solid #e5e7eb',padding:'4px 6px'}}>
          {tabs.map(t => (
            <span key={t.key} onClick={() => setTab(t.key)}
              style={{fontSize:10,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontWeight:500,
                background:tab===t.key?'#2347e8':'transparent',color:tab===t.key?'white':'#374151'}}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* ── WORKLOAD TAB (default) ── */}
      {tab === 'workload' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Employee Project Participation Table */}
          <div style={card}>
            <div style={secTitle}>
              <span>👥 Employee Project Participation</span>
              <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· contribution per project</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',fontSize:10,borderCollapse:'collapse',minWidth:650}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid #e5e7eb'}}>
                    <th style={{textAlign:'left',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Employee</th>
                    <th style={{textAlign:'left',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Role</th>
                    <th style={{textAlign:'left',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Project</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Participation</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Tasks</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Done</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>TC</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Passed</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Active</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeProjectRows.length === 0 ? (
                    <tr><td colSpan={10} style={{padding:20,textAlign:'center',color:'#9ca3af'}}>No project participation data available</td></tr>
                  ) : employeeProjectRows.map((r, i) => (
                    <tr key={`${r.employeeId}-${r.projectId}`} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                      <td style={{padding:'5px 8px',fontWeight:500,color:'#111827'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:20,height:20,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {r.employeeName.charAt(0)}
                          </div>
                          <span style={{cursor:'pointer',textDecoration:'none',borderBottom:'1px dashed #d1d5db'}}>{r.employeeName}</span>
                        </div>
                      </td>
                      <td style={{padding:'5px 8px'}}><span style={badge('#e0e7ff','#4338ca')}>{r.employeeRole.replace(/_/g, ' ')}</span></td>
                      <td style={{padding:'5px 8px',fontWeight:500,color:'#1d4ed8'}}
                        onClick={() => setSelectedProject(r)}
                        title="Click for project details">
                        <span style={{cursor:'pointer',borderBottom:'1px dashed #93c5fd'}}

                        >{r.projectName}</span>
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'center'}}>
                        <span style={{fontWeight:700,color:getParticipationColor(r.participation),fontSize:11}}>{r.participation}%</span>
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'center',fontWeight:500,color:r.employeeRole==='qa_tester'?'#d1d5db':'#374151'}}>{r.employeeRole === 'qa_tester' ? '—' : r.tasksAssigned}</td>
                      <td style={{padding:'5px 8px',textAlign:'center',fontWeight:500,color:r.employeeRole==='qa_tester'?'#d1d5db':'#22c55e'}}>{r.employeeRole === 'qa_tester' ? '—' : r.tasksDone}</td>
                      <td style={{padding:'5px 8px',textAlign:'center',fontWeight:500,color:r.employeeRole!=='qa_tester'?'#d1d5db':'#374151'}}>{r.employeeRole !== 'qa_tester' ? '—' : (r.testCasesAssigned||0)}</td>
                      <td style={{padding:'5px 8px',textAlign:'center',fontWeight:500,color:r.employeeRole!=='qa_tester'?'#d1d5db':'#22c55e'}}>{r.employeeRole !== 'qa_tester' ? '—' : (r.testCasesPassed||0)}</td>
                      <td style={{padding:'5px 8px',textAlign:'center',color:r.activeTasks > 0 ? '#f59e0b' : '#9ca3af',fontWeight:500}}>{r.activeTasks}</td>
                      <td style={{padding:'5px 8px',textAlign:'center'}}>
                        <div style={{width:50,height:4,background:'#e5e7eb',borderRadius:2,margin:'0 auto'}}>
                          <div style={{height:4,borderRadius:2,background:getParticipationColor(r.participation),width:Math.min(r.participation,100)+'%'}} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Project Workload Dashboard */}
          <div style={card}>
            <div style={secTitle}>
              <span>📊 Project Workload Dashboard</span>
              <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· department size & effort distribution</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',fontSize:10,borderCollapse:'collapse',minWidth:550}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid #e5e7eb'}}>
                    <th style={{textAlign:'left',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Project</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Department Size</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Progress</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Workload</th>
                    <th style={{textAlign:'right',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {projectWorkload.map(p => (
                    <tr key={p.projectId} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                      <td style={{padding:'5px 8px',fontWeight:600,color:'#111827'}}>{p.name}</td>
                      <td style={{padding:'5px 8px',textAlign:'center'}}>{p.teamSize}</td>
                      <td style={{padding:'5px 8px',textAlign:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                          <div style={{width:60,height:4,background:'#e5e7eb',borderRadius:2}}>
                            <div style={{height:4,borderRadius:2,background:'#2347e8',width:Math.min(p.taskCompletionRate,100)+'%'}} />
                          </div>
                          <span style={{fontWeight:600,color:'#111827',fontSize:9}}>{p.taskCompletionRate}%</span>
                        </div>
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'center'}}>
                        <span style={{...badge(p.workload.bg,p.workload.color),fontSize:8}}>{p.workload.label}</span>
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'right',fontSize:9,color:'#6b7280'}}>
                        {p.doneTasks}/{p.totalTasks} tasks
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── OVERVIEW SECTION (merged) ── */}
          {/* Health Score Hero */}
          <div style={{...card,display:'flex',alignItems:'center',gap:16,background:healthColor+'06',border:'0.5px solid '+healthColor+'30',padding:16}}>
            <div style={{width:60,height:60,borderRadius:'50%',background:healthColor+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:22,fontWeight:800,color:healthColor}}>{healthScore}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:'#111827',display:'flex',alignItems:'center',gap:6}}>
                Company Health
                <span style={{fontSize:9,fontWeight:500,padding:'2px 8px',borderRadius:12,background:healthColor+'20',color:healthColor}}>
                  {healthScore >= 70 ? '🟢 Healthy' : healthScore >= 40 ? '🟡 Warning' : '🔴 Critical'}
                </span>
              </div>
              <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>
                {company.completionRate}% project completion · {taskCompletionRateAll}% tasks done · {company.activeProjects} active projects
              </div>
              <div style={{marginTop:6,height:5,background:'#e5e7eb',borderRadius:3}}>
                <div style={{height:5,borderRadius:3,background:healthColor,width:healthScore+'%',transition:'width 0.5s'}} />
              </div>
            </div>
            <div style={{display:'flex',gap:14,flexShrink:0}}>
              <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'#111827'}}>{company.activeProjects}</div><div style={{fontSize:8,color:'#6b7280'}}>Active</div></div>
              <div style={{width:1,background:'#e5e7eb'}} />
              <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'#111827'}}>{employeePerformance.length}</div><div style={{fontSize:8,color:'#6b7280'}}>People</div></div>
              <div style={{width:1,background:'#e5e7eb'}} />
              <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'#111827'}}>{sprints.total}</div><div style={{fontSize:8,color:'#6b7280'}}>Sprints</div></div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
            {[
              { label:'Total Employees', value:employeePerformance.length, icon:'👥', bg:'#eff6ff', col:'#3b82f6' },
              { label:'Active Projects', value:company.activeProjects, icon:'📁', bg:'#f0fdf4', col:'#22c55e' },
              { label:'Sprint Velocity', value:sprints.velocity+' pts', icon:'⚡', bg:'#fefce8', col:'#eab308' },
              { label:'Completion Rate', value:taskCompletionRateAll+'%', icon:'🎯', bg:'#f0fdf4', col:'#22c55e' },
              { label:'Total Tasks', value:tasksAll||'—', icon:'📋', bg:'#f5f3ff', col:'#8b5cf6' },
              { label:'Overdue Tasks', value:risks.overdueTasks, icon:'🔴', bg:'#fef2f2', col:'#ef4444' },
              { label:'Avg Participation', value:avgPart+'%', icon:'⭐', bg:'#fffbeb', col:'#f59e0b' },
              { label:'Blocked Projects', value:company.blockedProjects, icon:'🚫', bg:'#fef2f2', col:'#ef4444' },
            ].map(m => (
              <div key={m.label} style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:32,height:32,borderRadius:8,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{m.icon}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:m.col}}>{m.value}</div>
                  <div style={{fontSize:8,color:'#6b7280',marginTop:1}}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sprint + Risk + Workload Balance */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>⚡ Sprint Summary</div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Total Sprints</span><span style={{fontWeight:600,fontSize:12}}>{sprints.total}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Active</span><span style={{fontWeight:600,color:'#2347e8'}}>{sprints.active}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Completed</span><span style={{fontWeight:600,color:'#22c55e'}}>{sprints.completed}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Completion Rate</span><span style={{fontWeight:600}}>{sprints.completionRate}%</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Velocity</span><span style={{fontWeight:600,color:'#eab308'}}>{sprints.velocity} pts/sprint</span></div>
              <div style={{marginTop:6,height:4,background:'#e5e7eb',borderRadius:2}}>
                <div style={{height:4,borderRadius:2,background:'#2347e8',width:Math.min(sprints.completionRate,100)+'%'}} />
              </div>
            </div>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>🚨 Risk Dashboard</div>
              {[
                { label:'Overdue Projects', val:risks.overdueProjects, warn:risks.overdueProjects>0 },
                { label:'Near Deadline', val:risks.nearDeadline, warn:risks.nearDeadline>0 },
                { label:'Overdue Tasks', val:risks.overdueTasks, warn:risks.overdueTasks>0 },
                { label:'Unassigned Tasks', val:risks.unassignedTasks, warn:risks.unassignedTasks>0 },
                { label:'Urgent Projects', val:risks.urgentProjects, warn:risks.urgentProjects>0 },
                { label:'Blocked', val:company.blockedProjects, warn:company.blockedProjects>0 },
              ].map(r => (
                <div key={r.label} style={statRow}>
                  <span style={{color:'#6b7280'}}>{r.label}</span>
                  <span style={{fontWeight:600,color:r.warn?'#ef4444':'#22c55e',display:'flex',alignItems:'center',gap:3}}>
                    {r.warn && '⚠️'}{r.val}
                  </span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>⚖️ Workload Balance</div>
              {(() => {
                const onTrack = employeePerformance.length - overloaded.length - underutilized.length;
                const bars = [
                  { label:'On Track', val:onTrack, col:'#22c55e', bg:'#f0fdf4' },
                  { label:'Underutilized', val:underutilized.length, col:'#f59e0b', bg:'#fffbeb' },
                  { label:'Overloaded', val:overloaded.length, col:'#ef4444', bg:'#fef2f2' },
                ];
                const total = Math.max(1, employeePerformance.length);
                return (
                  <>
                    <div style={{display:'flex',gap:3,height:22,marginBottom:8,borderRadius:4,overflow:'hidden'}}>
                      {bars.map(b => b.val > 0 && (
                        <div key={b.label} style={{height:22,background:b.col,flex:b.val,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white',fontWeight:600,minWidth:22}}>
                          {b.val}
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      {bars.map(b => (
                        <div key={b.label} style={statRow}>
                          <span style={{display:'flex',alignItems:'center',gap:4}}>
                            <span style={{width:7,height:7,borderRadius:1,background:b.col,display:'inline-block'}} />
                            <span style={{color:'#6b7280'}}>{b.label}</span>
                          </span>
                          <span style={{fontWeight:600,color:b.col}}>{b.val} ({Math.round(b.val/total*100)}%)</span>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:6,paddingTop:6,borderTop:'0.5px solid #e5e7eb',display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:9,color:'#6b7280'}}>Total Members</span>
                      <span style={{fontSize:11,fontWeight:700,color:'#111827'}}>{employeePerformance.length}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Most Active + Recent Activity */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                <span>⭐ Most Active</span>
                <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· top by score</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {activity.mostActiveUsers.map((u,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.charAt(0)}</div>
                    <span style={{fontSize:10,fontWeight:500,color:'#374151',flex:1}}>{u.name}</span>
                    <div style={{width:50,height:4,background:'#e5e7eb',borderRadius:2}}>
                      <div style={{height:4,borderRadius:2,background:'#2347e8',width:Math.min(u.participationScore||0,100)+'%'}} />
                    </div>
                    <span style={{fontSize:9,fontWeight:600,color:'#2347e8'}}>{u.participationScore||0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>📰 Recent Activity</div>
              <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:200,overflowY:'auto'}}>
                {(activity.recentActivities || []).slice(0,10).map((a,i) => (
                  <div key={i} style={{fontSize:9,padding:'4px 0',borderBottom:'0.5px solid #f3f4f6',color:'#374151'}}>
                    <span style={{fontWeight:500}}>{a.userName}</span>
                    <span style={{color:'#6b7280'}}> {a.description}</span>
                    <span style={{fontSize:8,color:'#9ca3af',marginLeft:4}}>{a.timeAgo || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          {insights?.length > 0 && (
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>🤖 AI Insights</div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {insights.map((ins,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',background:'#fffbeb',borderRadius:6,fontSize:10,color:'#92400e'}}>
                    <span>💡</span>
                    {ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Needs Attention */}
          {(underutilized.length > 0 || overloaded.length > 0) && (
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>⚠️ Needs Attention</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {underutilized.length > 0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:'#f59e0b',marginBottom:4}}>Underutilized ({underutilized.length})</div>
                    {underutilized.slice(0,5).map(u => (
                      <div key={u.userId} style={{fontSize:9,padding:'3px 0',color:'#6b7280'}}>· {u.name} ({u.participationScore}%)</div>
                    ))}
                  </div>
                )}
                {overloaded.length > 0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:'#ef4444',marginBottom:4}}>Overloaded ({overloaded.length})</div>
                    {overloaded.slice(0,5).map(u => (
                      <div key={u.userId} style={{fontSize:9,padding:'3px 0',color:'#6b7280'}}>· {u.name} ({u.assignedTasks} tasks)</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {tab === 'projects' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Project Contribution Breakdown */}
          <div style={card}>
            <div style={secTitle}>📋 Project Contribution Breakdown</div>

            {/* Project selector */}
            <div style={{marginBottom:12}}>
              <Dropdown
                value={selectedDeptProject?.projectId || ''}
                onChange={v => {
                  if (!v) { setSelectedDeptProject(null); setExpandedDept(null); return; }
                  const proj = projectParticipation.find(p => p.projectId === v);
                  setSelectedDeptProject(proj || null);
                  setExpandedDept(null);
                }}
                options={[
                  {value:'', label:'Select a project to analyze...'},
                  ...projectParticipation.map(p => ({
                    value:p.projectId,
                    label:`${p.name} · ${p.taskCompletionRate}% ${p.taskCompletionRate > 70 ? '🟢' : p.taskCompletionRate > 40 ? '🟡' : '🔴'}`
                  }))
                ]}
                style={{width:'100%'}}
              />
            </div>

            {!selectedDeptProject && (
              <div style={{textAlign:'center',padding:'24px 0',fontSize:11,color:'#9ca3af'}}>
                Select a project above to view department-based contribution breakdown
              </div>
            )}

            {selectedDeptProject && loadingDept && (
              <div style={{textAlign:'center',padding:20}}>
                <div className="animate-spin" style={{display:'inline-block',width:20,height:20,border:'2px solid #e5e7eb',borderTopColor:'#2347e8',borderRadius:'50%'}} />
                <div style={{fontSize:10,color:'#6b7280',marginTop:6}}>Loading department data...</div>
              </div>
            )}

            {selectedDeptProject && !loadingDept && groupedMembers && (() => {
              const departments = buildDeptData(selectedDeptProject, groupedMembers);
              const totalMembers = departments.reduce((s, d) => s + d.headcount, 0);
              const totalContrib = departments.reduce((s, d) => s + d.avgParticipation, 0) || 1;
              const donutSize = 160, strokeW = 28, radius = (donutSize - strokeW) / 2, circ = 2 * Math.PI * radius, cxcy = donutSize / 2;
              let cumPct = 0;

              return (
                <>
                  <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
                    {/* Donut chart */}
                    <div style={{flexShrink:0,position:'relative'}}>
                      <svg width={donutSize} height={donutSize} style={{transform:'rotate(-90deg)'}}>
                        <circle cx={cxcy} cy={cxcy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />
                        {departments.map((d, i) => {
                          const pct = d.avgParticipation / totalContrib;
                          const len = Math.max(pct * circ, 1);
                          const off = -cumPct * circ;
                          cumPct += pct;
                          const isActive = expandedDept === d.groupId;
                          return (
                            <circle key={d.groupId} cx={cxcy} cy={cxcy} r={radius}
                              fill="none" stroke={d.color} strokeWidth={strokeW}
                              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={off}
                              onClick={() => setExpandedDept(d.groupId === expandedDept ? null : d.groupId)}
                              style={{cursor:'pointer',opacity:!expandedDept||isActive?1:0.35,transition:'opacity 0.2s'}}
                            />
                          );
                        })}
                      </svg>
                      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
                        <div style={{fontSize:22,fontWeight:700,color:'#111827'}}>{totalMembers}</div>
                        <div style={{fontSize:9,color:'#6b7280',marginTop:-2}}>members</div>
                      </div>
                    </div>

                    {/* Department cards */}
                    <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,minWidth:200}}>
                      {departments.map(d => {
                        const isExpanded = expandedDept === d.groupId;
                        return (
                          <div key={d.groupId}
                            onClick={() => setExpandedDept(isExpanded ? null : d.groupId)}
                            style={{background:isExpanded?d.color+'08':'#f9fafb',borderRadius:8,padding:10,
                              border:'0.5px solid '+(isExpanded?d.color+'40':'#e5e7eb'),cursor:'pointer',transition:'all 0.15s'}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                              <span style={{fontSize:14}}>{d.icon}</span>
                              <span style={{fontSize:10,fontWeight:600,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{d.name}</span>
                              <span style={{fontSize:9,fontWeight:600,color:d.color}}>{d.avgParticipation}%</span>
                            </div>
                            <div style={{fontSize:9,color:'#6b7280',marginBottom:4}}>
                              {d.headcount} member{d.headcount!==1?'s':''} · {d.doneTasks}/{d.totalTasks} {d.members.every(m => m.role === 'qa_tester') ? 'tc' : 'tasks'}
                            </div>
                            <div style={{height:3,background:'#e5e7eb',borderRadius:2}}>
                              <div style={{height:3,borderRadius:2,background:d.color,width:Math.min(d.avgParticipation,100)+'%'}} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded department detail */}
                  {expandedDept && (() => {
                    const dept = departments.find(d => d.groupId === expandedDept);
                    if (!dept) return null;
                    return (
                      <div style={{marginTop:8,background:'#f9fafb',borderRadius:10,border:'0.5px solid #e5e7eb',padding:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <div style={{fontSize:12,fontWeight:600,color:'#111827',display:'flex',alignItems:'center',gap:6}}>
                            <span>{dept.icon}</span>
                            <span>{dept.name}</span>
                            <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· {dept.headcount} member{dept.headcount!==1?'s':''} · {dept.avgParticipation}% contribution</span>
                          </div>
                        </div>
                        {dept.members.length === 0 ? (
                          <div style={{fontSize:9,color:'#9ca3af',padding:'4px 0'}}>No member data for this department</div>
                        ) : (
                          <>
                            <table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}>
                              <thead>
                                <tr style={{borderBottom:'0.5px solid #d1d5db'}}>
                                  <th style={{textAlign:'left',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Member</th>
                                  <th style={{textAlign:'center',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Tasks</th>
                                  <th style={{textAlign:'center',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Done</th>
                                  <th style={{textAlign:'center',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>TC</th>
                                  <th style={{textAlign:'center',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Passed</th>
                                  <th style={{textAlign:'right',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Contribution</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dept.members.map(m => (
                                  <tr key={m.userId} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                                    <td style={{padding:'4px 6px',fontWeight:500,color:'#374151'}}>
                                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                                        <div style={{width:16,height:16,borderRadius:'50%',background:dept.color+'20',color:dept.color,fontSize:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:600}}>{m.name.charAt(0)}</div>
                                        {m.name}
                                      </div>
                                    </td>
                                    <td style={{padding:'4px 6px',textAlign:'center',color:m.role==='qa_tester'?'#d1d5db':'#6b7280'}}>{m.role === 'qa_tester' ? '—' : m.tasksAssigned}</td>
                                    <td style={{padding:'4px 6px',textAlign:'center',color:m.role==='qa_tester'?'#d1d5db':'#22c55e'}}>{m.role === 'qa_tester' ? '—' : m.tasksDone}</td>
                                    <td style={{padding:'4px 6px',textAlign:'center',color:m.role!=='qa_tester'?'#d1d5db':'#6b7280'}}>{m.role !== 'qa_tester' ? '—' : (m.testCasesAssigned||0)}</td>
                                    <td style={{padding:'4px 6px',textAlign:'center',color:m.role!=='qa_tester'?'#d1d5db':'#22c55e'}}>{m.role !== 'qa_tester' ? '—' : (m.testCasesPassed||0)}</td>
                                    <td style={{padding:'4px 6px',textAlign:'right'}}>
                                      <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                                        <div style={{width:50,height:4,background:'#e5e7eb',borderRadius:2}}>
                                          <div style={{height:4,borderRadius:2,background:getParticipationColor(m.participation),width:Math.min(m.participation,100)+'%'}} />
                                        </div>
                                        <span style={{fontWeight:700,fontSize:10,color:getParticipationColor(m.participation),minWidth:30,textAlign:'right'}}>{m.participation}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,padding:'4px 6px',background:'white',borderRadius:6}}>
                              <span style={{fontSize:9,color:'#6b7280'}}>Department Average</span>
                              <div style={{flex:1,height:4,background:'#e5e7eb',borderRadius:2}}>
                                <div style={{height:4,borderRadius:2,background:dept.color,width:Math.min(dept.avgParticipation,100)+'%'}} />
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color:dept.color,minWidth:30,textAlign:'right'}}>{dept.avgParticipation}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── PEOPLE TAB ── */}
      {tab === 'people' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Department Selector */}
          <div style={card}>
            <div style={secTitle}>
              <span>🏢 Department Analytics</span>
              <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· select a department to analyze</span>
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              <Dropdown
                value={selectedDept || ''}
                onChange={v => { setSelectedDept(v || null); setDeptPage(0); setDeptSearchQ(''); setDeptExpandedMember(null); }}
                options={[
                  {value:'', label:'Select a department...'},
                  ...(domainGroups?.groups || []).map(g => {
                    const cnt = g.members?.length || 0;
                    return {value:g.name, label:`${g.icon || '👥'} ${DEPT_BRAND[g.name]?.short || g.name} · ${cnt} member${cnt!==1?'s':''}`};
                  })
                ]}
                style={{flex:1,minWidth:220}}
              />
              {selectedDept && (() => {
                const bc = (DEPT_BRAND[selectedDept]?.color) || '#6b7280';
                return (
                  <span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:bc,fontWeight:600}}>
                    <span style={{fontSize:18}}>{DEPT_BRAND[selectedDept]?.icon || '👥'}</span>
                    <span>{DEPT_BRAND[selectedDept]?.short || selectedDept}</span>
                  </span>
                );
              })()}
            </div>
          </div>

          {selectedDept && loadingDomainGroups && (
            <div style={{textAlign:'center',padding:20}}>
              <div className="animate-spin" style={{display:'inline-block',width:20,height:20,border:'2px solid #e5e7eb',borderTopColor:'#2347e8',borderRadius:'50%'}} />
              <div style={{fontSize:10,color:'#6b7280',marginTop:6}}>Loading department data...</div>
            </div>
          )}

          {selectedDept && !loadingDomainGroups && !domainGroups && (
            <div style={{textAlign:'center',padding:16,fontSize:11,color:'#9ca3af'}}>
              Unable to load department data. No departments configured.
            </div>
          )}

          {selectedDept && domainGroups && !loadingDomainGroups && (() => {
            const group = (domainGroups.groups || []).find(g => g.name === selectedDept);
            if (!group) return <div style={{padding:20,fontSize:11,color:'#9ca3af',textAlign:'center'}}>Department not found</div>;

            const dc = (DEPT_BRAND[group.name]?.color) || '#6b7280';
            const di = DEPT_BRAND[group.name]?.icon || group.icon || '👥';

            const members = (group.members || []).map(m => {
              const uid = String(m.user?._id || m.user);
              const emp = (employeePerformance || []).find(e => String(e.userId) === uid) || {};
              const projs = (m.memberships || []).filter(mm => mm.status === 'active').map(mm => mm.project?.name).filter(Boolean);
              const isQa = (m.user?.role || emp.role) === 'qa_tester';
              return {
                userId: uid, name: m.user?.name || emp.name || 'Unknown',
                role: m.user?.role || emp.role || '—', avatar: m.user?.avatar,
                projects: projs, projectCount: projs.length,
                assignedTasks: emp.assignedTasks || 0, completedTasks: emp.completedTasks || 0,
                overdueTasks: emp.overdueTasks || 0, taskCompletion: emp.taskCompletion || 0,
                sprintCompletion: emp.sprintCompletion || 0, participationScore: emp.participationScore || 0,
                testCasesAssigned: emp.testCasesAssigned || 0, testCasesPassed: emp.testCasesPassed || 0,
                testCasesFailed: emp.testCasesFailed || 0,
              };
            }).filter(m => m.name !== 'Unknown');

            const totM = members.length;
            const allProj = new Set(members.flatMap(m => m.projects));
            const getComp = m => m.role === 'qa_tester'
              ? (m.testCasesAssigned > 0 ? Math.round((m.testCasesPassed / m.testCasesAssigned) * 100) : 0)
              : m.taskCompletion;
            const getVel = m => m.role === 'qa_tester'
              ? (m.testCasesAssigned > 0 ? Math.round((m.testCasesPassed / m.testCasesAssigned) * 100) : 0)
              : m.sprintCompletion;
            const avgComp = totM > 0 ? Math.round(members.reduce((s,m) => s + getComp(m), 0) / totM) : 0;
            const avgVel = totM > 0 ? Math.round(members.reduce((s,m) => s + getVel(m), 0) / totM) : 0;
            const totDone = members.reduce((s,m) => s + (m.role === 'qa_tester' ? m.testCasesPassed : m.completedTasks), 0);
            const totAss = members.reduce((s,m) => s + (m.role === 'qa_tester' ? m.testCasesAssigned : m.assignedTasks), 0);

            const getDone = m => m.role === 'qa_tester' ? (m.testCasesPassed||0) : (m.completedTasks||0);
            const sortedByComp = [...members].sort((a,b) => (getComp(b) - getComp(a)) || (getDone(b) - getDone(a)));
            const topContribs = sortedByComp.slice(0, 5);

            const underutilized = members.filter(m => {
              if (m.role === 'qa_tester') return m.testCasesAssigned < 3 || (m.testCasesAssigned > 0 && m.testCasesPassed / m.testCasesAssigned < 0.5);
              return m.taskCompletion < 50 || m.assignedTasks < 3;
            }).sort((a,b) => getComp(a) - getComp(b));
            const overloaded = members.filter(m => {
              if (m.role === 'qa_tester') return m.testCasesAssigned > 10 || (m.testCasesAssigned > 0 && m.testCasesPassed / m.testCasesAssigned > 0.9);
              return (m.taskCompletion > 90 && m.assignedTasks > 8) || m.assignedTasks > 10;
            }).sort((a,b) => (b.assignedTasks - a.assignedTasks) || (b.taskCompletion - a.taskCompletion));

            const searchLower = deptSearchQ.toLowerCase();
            const filtered = members.filter(m => !deptSearchQ || m.name.toLowerCase().includes(searchLower) || m.role.toLowerCase().includes(searchLower));
            const sorted = [...filtered].sort((a,b) => {
              let c = 0;
              if (deptSortCol === 'name') c = a.name.localeCompare(b.name);
              else if (deptSortCol === 'role') c = a.role.localeCompare(b.role);
              else if (deptSortCol === 'completion') c = a.taskCompletion - b.taskCompletion;
              else if (deptSortCol === 'tasks') c = a.assignedTasks - b.assignedTasks;
              return deptSortDir === 'asc' ? c : -c;
            });
            const perPage = 10;
            const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
            const safePage = Math.min(deptPage, totalPages - 1);
            const paged = sorted.slice(safePage * perPage, (safePage + 1) * perPage);

            return (
              <>
                {/* Summary Cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:10}}>
                  {[
                    { title:'Total Members', value:totM, icon:'👥' },
                    { title:'Active Projects', value:allProj.size, icon:'📁' },
                    { title:'Avg Completion', value:avgComp+'%', icon:'✅' },
                    { title:'Dept Velocity', value:avgVel+'%', icon:'⚡' },
                  ].map(s => (
                    <div key={s.title} style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:8,background:dc+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.icon}</div>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:dc}}>{s.value}</div>
                        <div style={{fontSize:9,color:'#6b7280',marginTop:1}}>{s.title}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Contributors */}
                <div style={card}>
                  <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                    <span>🏆 Top Contributors</span>
                    <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· by completion rate</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {topContribs.length === 0 ? (
                      <div style={{fontSize:10,color:'#9ca3af',padding:8}}>No contributors data</div>
                    ) : topContribs.map((m, i) => {
                      const isQa = m.role === 'qa_tester';
                      const pct = isQa
                        ? (m.testCasesAssigned > 0 ? Math.round((m.testCasesPassed / m.testCasesAssigned) * 100) : 0)
                        : (m.assignedTasks > 0 ? Math.round((m.completedTasks / m.assignedTasks) * 100) : 0);
                      return (
                        <div key={m.userId} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'#f9fafb',borderRadius:8,border:'0.5px solid #e5e7eb'}}>
                          <span style={{fontSize:9,fontWeight:700,color:dc,minWidth:16}}>#{i+1}</span>
                          <div style={{width:22,height:22,borderRadius:'50%',background:dc,color:'white',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:600}}>{m.name.charAt(0)}</div>
                          <div style={{minWidth:0,flex:1}}>
                            <div style={{fontSize:10,fontWeight:600,color:'#111827'}}>{m.name}</div>
                            <div style={{fontSize:8,color:'#6b7280'}}>{m.role.replace(/_/g,' ')} · {m.projects.slice(0,2).join(', ')}{m.projects.length > 2 ? ` +${m.projects.length-2}` : ''}</div>
                          </div>
                          <div style={{textAlign:'right',minWidth:50}}>
                            <div style={{fontSize:10,fontWeight:600,color:dc}}>{pct}%</div>
                            <div style={{fontSize:8,color:'#6b7280'}}>{isQa ? `${m.testCasesPassed}/${m.testCasesAssigned}` : `${m.completedTasks}/${m.assignedTasks}`}</div>
                          </div>
                          <div style={{width:50,height:4,background:'#e5e7eb',borderRadius:2}}>
                            <div style={{height:4,borderRadius:2,background:dc,width:Math.min(pct,100)+'%'}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Underutilized & Overloaded */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div style={card}>
                    <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                      <span>⚠️ Underutilized</span>
                      <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· &lt; 50% or &lt; 3 tasks</span>
                    </div>
                    {underutilized.length === 0 ? (
                      <p style={{fontSize:10,color:'#9ca3af'}}>No underutilized members</p>
                    ) : underutilized.map(m => {
                      const uQa = m.role === 'qa_tester';
                      return (
                      <div key={m.userId} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                        <div style={{width:20,height:20,borderRadius:'50%',background:'#f59e0b',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{m.name.charAt(0)}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,fontWeight:500,color:'#374151'}}>{m.name}</div>
                          <div style={{fontSize:8,color:'#6b7280'}}>{m.role.replace(/_/g,' ')} · {uQa ? `${m.testCasesAssigned} tc` : `${m.assignedTasks} tasks`}</div>
                        </div>
                        <div style={{width:30,height:4,background:'#e5e7eb',borderRadius:2}}>
                          <div style={{height:4,borderRadius:2,background:'#f59e0b',width:Math.min(uQa ? (m.testCasesAssigned > 0 ? Math.round((m.testCasesPassed / m.testCasesAssigned) * 100) : 0) : m.taskCompletion,100)+'%'}} />
                        </div>
                        <span style={{fontSize:8,background:'#f59e0b',color:'white',padding:'2px 6px',borderRadius:4,fontWeight:600,cursor:'pointer'}}>Assign</span>
                      </div>
                      );
                    })}
                  </div>
                  <div style={card}>
                    <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                      <span>🔥 Overloaded</span>
                      <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· &gt; 90% or &gt; 10 tasks</span>
                    </div>
                    {overloaded.length === 0 ? (
                      <p style={{fontSize:10,color:'#9ca3af'}}>No overloaded members</p>
                    ) : overloaded.map(m => (
                      <div key={m.userId} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                        <div style={{width:20,height:20,borderRadius:'50%',background:'#ef4444',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{m.name.charAt(0)}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,fontWeight:500,color:'#374151'}}>{m.name}</div>
                          <div style={{fontSize:8,color:'#6b7280'}}>{m.role.replace(/_/g,' ')}</div>
                        </div>
                        <span style={{fontSize:8,background:'#fef2f2',color:'#ef4444',padding:'2px 5px',borderRadius:4,fontWeight:600}}>{m.role === 'qa_tester' ? `${m.testCasesAssigned} tc` : `${m.assignedTasks} tasks`}</span>
                        <span style={{fontSize:8,background:'#ef4444',color:'white',padding:'2px 6px',borderRadius:4,fontWeight:600,cursor:'pointer'}}>Rebalance</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Members */}
                <div style={card}>
                  <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                    <span>👥 All {DEPT_BRAND[group.name]?.short || group.name} Members</span>
                    <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· {members.length} total</span>
                  </div>
                  <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                    <input placeholder="Search by name or role..." value={deptSearchQ}
                      onChange={e => { setDeptSearchQ(e.target.value); setDeptPage(0); }}
                      style={{flex:1,padding:'6px 10px',borderRadius:6,border:'0.5px solid #d1d5db',fontSize:10,color:'#111827',background:'white',outline:'none'}} />
                    <span style={{fontSize:9,color:'#6b7280'}}>Page {safePage+1}/{totalPages}</span>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{borderBottom:'0.5px solid #e5e7eb'}}>
                          {[
                            { key:'name', label:'Member' }, { key:'role', label:'Role' },
                            { key:null, label:'Projects' }, { key:'tasks', label: members.every(m => m.role === 'qa_tester') ? 'Test Cases' : 'Tasks' },
                            { key:'completion', label:'Completion' }, { key:null, label:'Status' },
                          ].map(h => (
                            <th key={h.key || h.label} onClick={() => {
                              if (!h.key) return;
                              if (deptSortCol === h.key) setDeptSortDir(d => d === 'asc' ? 'desc' : 'asc');
                              else { setDeptSortCol(h.key); setDeptSortDir('asc'); }
                            }} style={{textAlign:'left',padding:'5px 6px',color:'#6b7280',fontWeight:500,cursor:h.key?'pointer':'default',userSelect:'none',whiteSpace:'nowrap'}}>
                              {h.label} {deptSortCol === h.key ? (deptSortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paged.flatMap(m => {
                          const isQa = m.role === 'qa_tester';
                          const pct = isQa
                            ? (m.testCasesAssigned > 0 ? Math.round((m.testCasesPassed / m.testCasesAssigned) * 100) : 0)
                            : (m.assignedTasks > 0 ? Math.round((m.completedTasks / m.assignedTasks) * 100) : 0);
                          const isExp = deptExpandedMember === m.userId;
                          let stLbl = 'On Track', stCol = '#22c55e', stBg = '#f0fdf4';
                          if (isQa) {
                            if (m.testCasesFailed > m.testCasesPassed) { stLbl = 'Overloaded'; stCol = '#ef4444'; stBg = '#fef2f2'; }
                            else if (pct > 0 && pct < 50) { stLbl = 'At Risk'; stCol = '#f97316'; stBg = '#fff7ed'; }
                            else if (m.testCasesAssigned === 0) { stLbl = 'Idle'; stCol = '#9ca3af'; stBg = '#f9fafb'; }
                          } else {
                            if (overloaded.includes(m)) { stLbl = 'Overloaded'; stCol = '#ef4444'; stBg = '#fef2f2'; }
                            else if (underutilized.includes(m)) { stLbl = 'Underutilized'; stCol = '#f59e0b'; stBg = '#fffbeb'; }
                            else if (m.taskCompletion > 0 && m.taskCompletion < 70) { stLbl = 'At Risk'; stCol = '#f97316'; stBg = '#fff7ed'; }
                          }
                          const rows = [
                            <tr key={m.userId} onClick={() => setDeptExpandedMember(isExp ? null : m.userId)}
                              style={{borderBottom:'0.5px solid #f3f4f6',cursor:'pointer',background:isExp?dc+'08':'transparent'}}>
                              <td style={{padding:'4px 6px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:5}}>
                                  <div style={{width:18,height:18,borderRadius:'50%',background:dc,color:'white',fontSize:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{m.name.charAt(0)}</div>
                                  <span style={{fontWeight:500,color:'#111827'}}>{m.name}</span>
                                </div>
                              </td>
                              <td style={{padding:'4px 6px'}}><span style={badge('#e0e7ff','#4338ca')}>{m.role.replace(/_/g,' ')}</span></td>
                              <td style={{padding:'4px 6px',fontSize:9,color:'#6b7280',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.projects.join(', ') || '—'}</td>
                              <td style={{padding:'4px 6px',fontWeight:500}}>{isQa ? `${m.testCasesPassed||0}/${m.testCasesAssigned||0}` : `${m.completedTasks}/${m.assignedTasks}`}</td>
                              <td style={{padding:'4px 6px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:4}}>
                                  <div style={{width:35,height:4,background:'#e5e7eb',borderRadius:2}}>
                                    <div style={{height:4,borderRadius:2,background:dc,width:Math.min(pct,100)+'%'}} />
                                  </div>
                                  <span style={{fontWeight:600,fontSize:9,color:dc}}>{pct}%</span>
                                </div>
                              </td>
                              <td style={{padding:'4px 6px'}}><span style={badge(stBg,stCol)}>{stLbl}</span></td>
                            </tr>
                          ];
                          if (isExp) rows.push(
                            <tr key={m.userId+'_det'}>
                              <td colSpan={6} style={{padding:'6px 10px',background:'#f9fafb',borderBottom:'0.5px solid #e5e7eb'}}>
                                <div style={{fontSize:9,color:'#374151',display:'flex',gap:12,flexWrap:'wrap'}}>
                                  <div><span style={{color:'#6b7280'}}>Role:</span> {m.role.replace(/_/g,' ')}</div>
                                  <div><span style={{color:'#6b7280'}}>Projects:</span> {m.projects.join(', ') || 'None'}</div>
                                  {isQa ? <>
                                    <div><span style={{color:'#6b7280'}}>Test Cases:</span> {m.testCasesPassed||0}/{m.testCasesAssigned||0} done</div>
                                    <div><span style={{color:'#6b7280'}}>Pass Rate:</span> {m.testCasesAssigned > 0 ? Math.round((m.testCasesPassed / m.testCasesAssigned) * 100) : 0}%</div>
                                    <div><span style={{color:'#6b7280'}}>Failed:</span> {m.testCasesFailed||0}</div>
                                  </> : <>
                                    <div><span style={{color:'#6b7280'}}>Tasks:</span> {m.completedTasks}/{m.assignedTasks} done</div>
                                    <div><span style={{color:'#6b7280'}}>Overdue:</span> {m.overdueTasks}</div>
                                    <div><span style={{color:'#6b7280'}}>Sprint Completion:</span> {m.sprintCompletion}%</div>
                                  </>}
                                  <div><span style={{color:'#6b7280'}}>Participation:</span> {m.participationScore}%</div>
                                </div>
                              </td>
                            </tr>
                          );
                          return rows;
                        })}
                        {paged.length === 0 && (
                          <tr><td colSpan={6} style={{padding:16,textAlign:'center',color:'#9ca3af',fontSize:10}}>No members found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:8}}>
                      {Array.from({length:totalPages}).map((_, i) => (
                        <span key={i} onClick={() => setDeptPage(i)}
                          style={{padding:'3px 8px',borderRadius:4,fontSize:9,cursor:'pointer',fontWeight:600,background:i===safePage?dc:'#f3f4f6',color:i===safePage?'white':'#374151'}}>{i+1}</span>
                      ))}
                    </div>
                  )}
                </div>


              </>
            );
          })()}

          {!selectedDept && domainGroups && (
            <div style={{textAlign:'center',padding:'32px 0',fontSize:11,color:'#9ca3af'}}>
              Select a department above to view analytics
            </div>
          )}
        </div>
      )}

      {/* ── Project Contribution Modal ── */}
      {selectedProject && (() => {
        const proj = projectParticipation.find(p => p.projectId === selectedProject.projectId);
        if (!proj) return null;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center" onClick={() => setSelectedProject(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-[500px] w-[90%] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <div className="text-base font-bold text-surface-900">{proj.name}</div>
                <button onClick={() => setSelectedProject(null)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-100 text-surface-400 hover:text-surface-600 cursor-pointer border-none text-sm leading-none">&times;</button>
              </div>
              <div className="text-[11px] text-surface-500 mb-2">
                Progress: {proj.taskCompletionRate}% · {proj.doneTasks}/{proj.totalTasks} tasks done
              </div>
              <div className="h-[6px] bg-surface-200 rounded-[3px] mb-3">
                <div className="h-[6px] rounded-[3px] bg-primary-600" style={{width:Math.min(proj.taskCompletionRate,100)+'%'}} />
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left px-[6px] py-[5px] text-surface-500 font-medium">Member</th>
                    <th className="text-center px-[6px] py-[5px] text-surface-500 font-medium">Tasks</th>
                    <th className="text-center px-[6px] py-[5px] text-surface-500 font-medium">Done</th>
                    <th className="text-center px-[6px] py-[5px] text-surface-500 font-medium">TC</th>
                    <th className="text-center px-[6px] py-[5px] text-surface-500 font-medium">Passed</th>
                    <th className="text-right px-[6px] py-[5px] text-surface-500 font-medium">Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {proj.members.map(m => (
                    <tr key={m.userId} className="border-b border-surface-100">
                      <td className="px-[6px] py-[4px] font-medium text-surface-600">{m.name}</td>
                      <td className={`px-[6px] py-[4px] text-center ${m.role==='qa_tester' ? 'text-surface-300' : 'text-surface-500'}`}>{m.role === 'qa_tester' ? '—' : m.tasksAssigned}</td>
                      <td className={`px-[6px] py-[4px] text-center ${m.role==='qa_tester' ? 'text-surface-300' : 'text-green-500'}`}>{m.role === 'qa_tester' ? '—' : m.tasksDone}</td>
                      <td className={`px-[6px] py-[4px] text-center ${m.role!=='qa_tester' ? 'text-surface-300' : 'text-surface-500'}`}>{m.role !== 'qa_tester' ? '—' : (m.testCasesAssigned||0)}</td>
                      <td className={`px-[6px] py-[4px] text-center ${m.role!=='qa_tester' ? 'text-surface-300' : 'text-green-500'}`}>{m.role !== 'qa_tester' ? '—' : (m.testCasesPassed||0)}</td>
                      <td className="px-[6px] py-[4px] text-right">
                        <div className="flex items-center gap-[6px] justify-end">
                          <div className="w-[60px] h-[4px] bg-surface-200 rounded-[2px]">
                            <div className="h-[4px] rounded-[2px]" style={{background:getParticipationColor(m.participation), width:Math.min(m.participation,100)+'%'}} />
                          </div>
                          <span className="font-bold text-[11px]" style={{color:getParticipationColor(m.participation)}}>{m.participation}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {proj.members.length > 0 && (
                <div className="flex items-center gap-2 mt-2 px-[8px] py-[6px] bg-primary-50 rounded-lg">
                  <span className="text-[10px] font-semibold text-primary-700">Total Contribution</span>
                  <div className="flex-1 h-[4px] bg-blue-100 rounded-[2px]">
                    <div className="h-[4px] rounded-[2px] bg-primary-600" style={{width:Math.min(Math.round(proj.members.reduce((s,m) => s + m.participation, 0) / proj.members.length), 100)+'%'}} />
                  </div>
                  <span className="font-bold text-[13px] text-primary-700">{Math.round(proj.members.reduce((s,m) => s + m.participation, 0) / proj.members.length)}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

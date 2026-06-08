import { useState, useEffect } from 'react';
import { analytics } from '../services/api';
import StatCard from '../components/StatCard';

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

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('workload');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    analytics.getCompany()
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"/></div>;
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
      const activeTasks = m.tasksAssigned - m.tasksDone;
      employeeProjectRows.push({
        employeeId: m.userId,
        employeeName: m.name,
        employeeRole: emp.role || '—',
        projectId: proj.projectId,
        projectName: proj.name,
        projectCompletion: proj.taskCompletionRate,
        participation: m.participation,
        tasksAssigned: m.tasksAssigned,
        tasksDone: m.tasksDone,
        activeTasks: Math.max(0, activeTasks),
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

  const tabs = [
    { key:'workload', label:'📊 Workload' },
    { key:'projects', label:'📋 Projects' },
    { key:'people', label:'👥 People' },
    { key:'overview', label:'📈 Overview' },
    { key:'insights', label:'🤖 Insights' },
  ];

  const C = ({ children, onClick, style }) => (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined, ...style }}>{children}</div>
  );

  return (
    <div style={{padding:'16px 20px',maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#111827',margin:0}}>Analytics</h1>
          <p style={{fontSize:11,color:'#6b7280',margin:'2px 0 0'}}>Project-based workload distribution & employee performance</p>
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
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Completed</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Active</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeProjectRows.length === 0 ? (
                    <tr><td colSpan={8} style={{padding:20,textAlign:'center',color:'#9ca3af'}}>No project participation data available</td></tr>
                  ) : employeeProjectRows.map((r, i) => (
                    <tr key={`${r.employeeId}-${r.projectId}`} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                      <td style={{padding:'5px 8px',fontWeight:500,color:'#111827'}}
                        onClick={() => setSelectedEmployee(r)}
                        title="Click for details">
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
                      <td style={{padding:'5px 8px',textAlign:'center',fontWeight:500}}>{r.tasksAssigned}</td>
                      <td style={{padding:'5px 8px',textAlign:'center',color:'#22c55e',fontWeight:500}}>{r.tasksDone}</td>
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
              <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· team size & effort distribution</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',fontSize:10,borderCollapse:'collapse',minWidth:550}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid #e5e7eb'}}>
                    <th style={{textAlign:'left',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Project</th>
                    <th style={{textAlign:'center',padding:'6px 8px',color:'#6b7280',fontWeight:500}}>Team Size</th>
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
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {tab === 'projects' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Project Contribution Breakdown */}
          <div style={card}>
            <div style={secTitle}>📋 Project Contribution Breakdown</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {projectParticipation.map(p => (
                <div key={p.projectId} style={{background:'#f9fafb',borderRadius:10,padding:12,border:'0.5px solid #e5e7eb'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#111827'}}


                    >{p.name}</span>
                    <span style={{fontSize:9,color:'#6b7280',fontWeight:500}}>{p.doneTasks}/{p.totalTasks} tasks · {p.taskCompletionRate}%</span>
                  </div>
                  {p.members.length === 0 ? (
                    <div style={{fontSize:9,color:'#9ca3af',padding:'4px 0'}}>No team member data</div>
                  ) : (
                    <>
                      <table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}>
                        <thead>
                          <tr style={{borderBottom:'0.5px solid #d1d5db'}}>
                            <th style={{textAlign:'left',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Team Member</th>
                            <th style={{textAlign:'center',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Tasks</th>
                            <th style={{textAlign:'center',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Done</th>
                            <th style={{textAlign:'right',padding:'3px 6px',color:'#6b7280',fontWeight:500}}>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.members.map(m => (
                            <tr key={m.userId} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                              <td style={{padding:'4px 6px',fontWeight:500,color:'#374151'}}>{m.name}</td>
                              <td style={{padding:'4px 6px',textAlign:'center',color:'#6b7280'}}>{m.tasksAssigned}</td>
                              <td style={{padding:'4px 6px',textAlign:'center',color:'#22c55e'}}>{m.tasksDone}</td>
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
                      {/* Total team contribution */}
                      {p.members.length > 0 && (
                        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,padding:'4px 6px',background:'white',borderRadius:6}}>
                          <span style={{fontSize:9,color:'#6b7280'}}>Total Team Contribution</span>
                          <div style={{flex:1,height:4,background:'#e5e7eb',borderRadius:2}}>
                            <div style={{height:4,borderRadius:2,background:'#2347e8',
                              width:Math.min(Math.round(p.members.reduce((s,m) => s + m.participation, 0) / p.members.length), 100)+'%'}} />
                          </div>
                          <span style={{fontSize:11,fontWeight:700,color:'#1d4ed8',minWidth:30,textAlign:'right'}}>
                            {Math.round(p.members.reduce((s,m) => s + m.participation, 0) / p.members.length)}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PEOPLE TAB ── */}
      {tab === 'people' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Selected Employee Detail */}
          {selectedEmployee && (() => {
            const emp = employeeMap[selectedEmployee.employeeId] || {};
            const empProjects = employeeProjectRows.filter(r => r.employeeId === selectedEmployee.employeeId);
            const avgParticipation = empProjects.length > 0 ? Math.round(empProjects.reduce((s, r) => s + r.participation, 0) / empProjects.length) : 0;
            return (
              <div style={{...card,borderLeft:'3px solid #2347e8'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
                      {emp.name?.charAt(0) || selectedEmployee.employeeName.charAt(0)}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#111827'}}


                      >{selectedEmployee.employeeName}</div>
                      <div style={{fontSize:9,color:'#6b7280'}}>{selectedEmployee.employeeRole.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEmployee(null)}
                    style={{fontSize:16,background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:'2px 6px'}}>&times;</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:6,marginBottom:8}}>
                  <StatCard title="Active Projects" value={empProjects.length} icon="📁" color="blue" />
                  <StatCard title="Participation Score" value={`${avgParticipation}%`} icon="⭐" color="purple" />
                  <StatCard title="Tasks Completed" value={emp.completedTasks || 0} icon="✅" color="green" />
                  <StatCard title="Sprints Done" value={emp.completedSprints || 0} icon="⚡" color="green" />
                  <StatCard title="Deadline Rate" value={`${emp.deadlineRate || 0}%`} icon="📅" color={emp.deadlineRate >= 80 ? 'green' : 'yellow'} />
                  <StatCard title="Overall Score" value={emp.participationScore || 0} icon="🏆" color="blue" />
                </div>
                <div style={{fontSize:11,fontWeight:600,color:'#111827',marginBottom:6}}>Project Breakdown</div>
                {empProjects.map((r, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                    <span style={{fontSize:10,fontWeight:500,color:'#1d4ed8',minWidth:120}}>{r.projectName}</span>
                    <span style={{fontSize:9,color:'#6b7280',minWidth:40}}>{r.tasksDone}/{r.tasksAssigned} tasks</span>
                    <div style={{flex:1,height:4,background:'#e5e7eb',borderRadius:2}}>
                      <div style={{height:4,borderRadius:2,background:getParticipationColor(r.participation),width:Math.min(r.participation,100)+'%'}} />
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:getParticipationColor(r.participation),minWidth:35,textAlign:'right'}}>{r.participation}%</span>
                  </div>
                ))}
                {empProjects.length > 0 && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#6b7280',marginTop:4}}>
                    <span>Average Participation</span>
                    <span style={{fontWeight:700,color:'#111827'}}>{avgParticipation}%</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Top Contributors */}
          <div style={card}>
            <div style={secTitle}>
              <span>🏆 Top Contributors</span>
              <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· highest participation scores</span>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {topContributors.map((u, i) => (
                <div key={u.userId} onClick={() => {
                  const row = employeeProjectRows.find(r => r.employeeId === u.userId);
                  if (row) setSelectedEmployee(row);
                }}
                  style={{display:'flex',alignItems:'center',gap:8,background:'#f9fafb',borderRadius:8,padding:'6px 10px',border:'0.5px solid #e5e7eb',cursor:'pointer',minWidth:150}}>
                  <div style={{position:'relative',width:28,height:28,flexShrink:0}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
                      {u.name.charAt(0)}
                    </div>
                    <span style={{position:'absolute',top:-4,right:-4,fontSize:10}}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.name}</div>
                    <div style={{fontSize:9,color:'#6b7280'}}>
                      Score: <span style={{fontWeight:700,color:getParticipationColor(u.participationScore)}}>{u.participationScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Underutilized & Overloaded */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                <span>⚠️ Underutilized Employees</span>
                <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· score &lt; 40%</span>
              </div>
              {underutilized.length === 0 ? (
                <p style={{fontSize:10,color:'#9ca3af'}}>No underutilized employees</p>
              ) : underutilized.map(u => (
                <div key={u.userId} onClick={() => {
                  const row = employeeProjectRows.find(r => r.employeeId === u.userId);
                  if (row) setSelectedEmployee(row);
                }}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',borderBottom:'0.5px solid #f3f4f6',cursor:'pointer'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'#f59e0b',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.charAt(0)}</div>
                  <span style={{fontSize:10,fontWeight:500,color:'#374151',flex:1}}>{u.name}</span>
                  <span style={{fontSize:9,color:'#f59e0b',fontWeight:600}}>{u.participationScore}%</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>
                <span>🔥 Overloaded Employees</span>
                <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· high task count</span>
              </div>
              {overloaded.length === 0 ? (
                <p style={{fontSize:10,color:'#9ca3af'}}>No overloaded employees</p>
              ) : overloaded.map(u => (
                <div key={u.userId} onClick={() => {
                  const row = employeeProjectRows.find(r => r.employeeId === u.userId);
                  if (row) setSelectedEmployee(row);
                }}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',borderBottom:'0.5px solid #f3f4f6',cursor:'pointer'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'#ef4444',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.charAt(0)}</div>
                  <span style={{fontSize:10,fontWeight:500,color:'#374151',flex:1}}>{u.name}</span>
                  <span style={{fontSize:9,color:'#ef4444',fontWeight:600}}>{u.assignedTasks} tasks</span>
                </div>
              ))}
            </div>
          </div>

          {/* All employees list */}
          <div style={card}>
            <div style={secTitle}>
              <span>👥 All Employees</span>
              <span style={{fontSize:9,fontWeight:400,color:'#6b7280'}}>· click for project breakdown</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid #e5e7eb'}}>
                    <th style={{textAlign:'left',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Name</th>
                    <th style={{textAlign:'left',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Role</th>
                    <th style={{textAlign:'center',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Participation</th>
                    <th style={{textAlign:'center',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Projects</th>
                    <th style={{textAlign:'center',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Tasks</th>
                    <th style={{textAlign:'center',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Done</th>
                    <th style={{textAlign:'center',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Sprints</th>
                    <th style={{textAlign:'center',padding:'5px 8px',color:'#6b7280',fontWeight:500}}>Score Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePerformance.map(e => {
                    const sc = e.participationScore;
                    return (
                      <tr key={e.userId} onClick={() => {
                        const row = employeeProjectRows.find(r => r.employeeId === e.userId);
                        if (row) setSelectedEmployee(row);
                      }} style={{borderBottom:'0.5px solid #f3f4f6',cursor:'pointer'}}>
                        <td style={{padding:'5px 8px',fontWeight:500,color:'#111827'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:20,height:20,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{e.name.charAt(0)}</div>
                            {e.name}
                          </div>
                        </td>
                        <td style={{padding:'5px 8px'}}><span style={badge('#e0e7ff','#4338ca')}>{e.role.replace(/_/g, ' ')}</span></td>
                        <td style={{padding:'5px 8px',textAlign:'center',fontWeight:700,color:getParticipationColor(sc)}}>{sc}</td>
                        <td style={{padding:'5px 8px',textAlign:'center'}}>{e.assignedProjects}</td>
                        <td style={{padding:'5px 8px',textAlign:'center'}}>{e.assignedTasks}</td>
                        <td style={{padding:'5px 8px',textAlign:'center',color:'#22c55e'}}>{e.completedTasks}</td>
                        <td style={{padding:'5px 8px',textAlign:'center'}}>{e.assignedSprints}</td>
                        <td style={{padding:'5px 8px',textAlign:'center'}}>
                          <div style={{width:50,height:4,background:'#e5e7eb',borderRadius:2,margin:'0 auto'}}>
                            <div style={{height:4,borderRadius:2,background:getParticipationColor(sc),width:Math.min(sc,100)+'%'}} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Health Score */}
          <div style={{...card,display:'flex',alignItems:'center',gap:14,background:healthColor+'08',borderColor:healthColor+'30'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:healthColor+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:18,fontWeight:700,color:healthColor}}>{healthScore}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:'#111827'}}>Company Health Score</div>
              <div style={{fontSize:11,color:'#6b7280'}}>
                {healthScore >= 70 ? '🟢 Healthy' : healthScore >= 40 ? '🟡 Warning' : '🔴 Critical'}
                {' · '}{company.completionRate}% completion · {taskCompletionRateAll}% task done
              </div>
            </div>
            <div style={{width:120,height:6,background:'#e5e7eb',borderRadius:3}}>
              <div style={{height:6,borderRadius:3,background:healthColor,width:healthScore+'%'}} />
            </div>
          </div>
          {/* Company stats */}
          <div style={card}>
            <div style={secTitle}>📊 Company Overview</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
              <StatCard title="Total Projects" value={company.totalProjects} icon="📁" color="blue" />
              <StatCard title="Active" value={company.activeProjects} icon="🟢" color="green" />
              <StatCard title="Completed" value={company.completedProjects} icon="✅" color="green" />
              <StatCard title="Blocked" value={company.blockedProjects} icon="🚫" color="red" />
              <StatCard title="Delayed" value={company.delayedProjects} icon="⏰" color="yellow" />
              <StatCard title="Completion Rate" value={`${company.completionRate}%`} icon="📈" color="purple" />
              <StatCard title="Avg Duration" value={`${company.avgDurationDays}d`} icon="📅" color="blue" />
              <StatCard title="Archived" value={company.archivedProjects} icon="🗄️" color="yellow" />
            </div>
          </div>
          {/* Sprint & Risk summary */}
          <div style={{...card,display:'flex',gap:16,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 200px'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:8}}>⚡ Sprint Summary</div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Total</span><span style={{fontWeight:600}}>{sprints.total}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Active</span><span style={{fontWeight:600,color:'#2347e8'}}>{sprints.active}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Completed</span><span style={{fontWeight:600,color:'#22c55e'}}>{sprints.completed}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Completion</span><span style={{fontWeight:600}}>{sprints.completionRate}%</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Velocity</span><span style={{fontWeight:600}}>{sprints.velocity} pts/sprint</span></div>
            </div>
            <div style={{flex:'1 1 200px'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:8}}>🚨 Risk Dashboard</div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Overdue Projects</span><span style={{fontWeight:600,color:risks.overdueProjects>0?'#ef4444':'#22c55e'}}>{risks.overdueProjects}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Near Deadline</span><span style={{fontWeight:600,color:risks.nearDeadline>0?'#f59e0b':'#22c55e'}}>{risks.nearDeadline}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Overdue Tasks</span><span style={{fontWeight:600,color:risks.overdueTasks>0?'#ef4444':'#22c55e'}}>{risks.overdueTasks}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Unassigned Tasks</span><span style={{fontWeight:600,color:risks.unassignedTasks>0?'#f59e0b':'#22c55e'}}>{risks.unassignedTasks}</span></div>
            </div>
            <div style={{flex:'1 1 200px'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:8}}>📁 Resources</div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Total</span><span style={{fontWeight:600}}>{resources.total}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Documents</span><span style={{fontWeight:600}}>{resources.documents}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>Repo Links</span><span style={{fontWeight:600}}>{resources.repoLinks}</span></div>
              <div style={statRow}><span style={{color:'#6b7280'}}>External URLs</span><span style={{fontWeight:600}}>{resources.externalUrls}</span></div>
            </div>
          </div>
          {/* Most Active */}
          <div style={card}>
            <div style={secTitle}>⭐ Most Active Employees</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {activity.mostActiveUsers.map((u,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,background:'#f9fafb',borderRadius:8,padding:'6px 10px'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>{u.name.charAt(0)}</div>
                  <div><div style={{fontSize:10,fontWeight:600,color:'#111827'}}>{u.name}</div><div style={{fontSize:9,color:'#6b7280'}}>Score: {u.participationScore}</div></div>
                </div>
              ))}
            </div>
          </div>
          {/* Recent activity */}
          <div style={card}>
            <div style={secTitle}>🕐 Recent Activity</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {activity.recentActions.slice(0,8).map((a,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#6b7280',padding:'3px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                  <span>{a.user?.name || 'System'} · {a.action || a.type || 'activity'}</span>
                  <span>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── INSIGHTS TAB ── */}
      {tab === 'insights' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={card}>
            <div style={secTitle}>🤖 AI-Generated Insights</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {insights.map((ins, i) => (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:11,color:'#374151',padding:'10px 12px',background:'#f9fafb',borderRadius:8,borderLeft:'3px solid #2347e8'}}>
                  <span style={{fontSize:14,flexShrink:0}}>💡</span>
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={secTitle}>📊 Executive Summary</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
              <StatCard title="Health Score" value={`${healthScore}/100`} icon="💚" color={healthScore>=70?'green':'yellow'} />
              <StatCard title="Avg Participation" value={`${Math.round(employeePerformance.reduce((s,e)=>s+e.participationScore,0)/Math.max(1,employeePerformance.length))}%`} icon="⭐" color="purple" />
              <StatCard title="Active Projects" value={company.activeProjects} icon="🟢" color="green" />
              <StatCard title="Urgent Projects" value={risks.urgentProjects} icon="🔴" color={risks.urgentProjects>0?'red':'green'} />
              <StatCard title="Overdue Tasks" value={risks.overdueTasks} icon="📋" color={risks.overdueTasks>0?'red':'green'} />
              <StatCard title="Unassigned Tasks" value={risks.unassignedTasks} icon="👤" color={risks.unassignedTasks>0?'yellow':'green'} />
            </div>
          </div>
          {/* Management insights summary */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>🏆 Top Contributors</div>
              {topContributors.map((u, i) => (
                <div key={u.userId} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                  <span style={{fontSize:9,minWidth:16}}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                  <div style={{width:18,height:18,borderRadius:'50%',background:'#2347e8',color:'white',fontSize:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.charAt(0)}</div>
                  <span style={{fontSize:10,fontWeight:500,color:'#374151',flex:1}}>{u.name}</span>
                  <span style={{fontSize:9,fontWeight:700,color:getParticipationColor(u.participationScore)}}>{u.participationScore}%</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{...secTitle,fontSize:13,marginBottom:8}}>⚠️ Needs Attention</div>
              {overloaded.length > 0 && <div style={{fontSize:9,color:'#ef4444',fontWeight:600,marginBottom:4}}>🔥 Overloaded ({overloaded.length})</div>}
              {overloaded.slice(0,3).map(u => (
                <div key={u.userId} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',fontSize:9,color:'#374151'}}>
                  <span style={{width:14,height:14,borderRadius:'50%',background:'#fef2f2',color:'#ef4444',fontSize:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.charAt(0)}</span>
                  {u.name} — {u.assignedTasks} tasks
                </div>
              ))}
              {underutilized.length > 0 && <div style={{fontSize:9,color:'#f59e0b',fontWeight:600,marginTop:4,marginBottom:4}}>⚠️ Underutilized ({underutilized.length})</div>}
              {underutilized.slice(0,3).map(u => (
                <div key={u.userId} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',fontSize:9,color:'#374151'}}>
                  <span style={{width:14,height:14,borderRadius:'50%',background:'#fffbeb',color:'#f59e0b',fontSize:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.charAt(0)}</span>
                  {u.name} — {u.participationScore}% score
                </div>
              ))}
              {overloaded.length === 0 && underutilized.length === 0 && (
                <div style={{fontSize:9,color:'#22c55e'}}>✅ Team is well balanced</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Project Contribution Modal ── */}
      {selectedProject && (() => {
        const proj = projectParticipation.find(p => p.projectId === selectedProject.projectId);
        if (!proj) return null;
        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setSelectedProject(null)}>
            <div style={{background:'white',borderRadius:12,padding:20,maxWidth:500,width:'90%',maxHeight:'80vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:700,color:'#111827'}}>{proj.name}</div>
                <button onClick={() => setSelectedProject(null)} style={{fontSize:20,background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:'0 4px'}}>&times;</button>
              </div>
              <div style={{fontSize:11,color:'#6b7280',marginBottom:8}}>
                Progress: {proj.taskCompletionRate}% · {proj.doneTasks}/{proj.totalTasks} tasks done
              </div>
              <div style={{height:6,background:'#e5e7eb',borderRadius:3,marginBottom:12}}>
                <div style={{height:6,borderRadius:3,background:'#2347e8',width:Math.min(proj.taskCompletionRate,100)+'%'}} />
              </div>
              <table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid #e5e7eb'}}>
                    <th style={{textAlign:'left',padding:'5px 6px',color:'#6b7280',fontWeight:500}}>Team Member</th>
                    <th style={{textAlign:'center',padding:'5px 6px',color:'#6b7280',fontWeight:500}}>Tasks</th>
                    <th style={{textAlign:'center',padding:'5px 6px',color:'#6b7280',fontWeight:500}}>Done</th>
                    <th style={{textAlign:'right',padding:'5px 6px',color:'#6b7280',fontWeight:500}}>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {proj.members.map(m => (
                    <tr key={m.userId} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                      <td style={{padding:'4px 6px',fontWeight:500,color:'#374151'}}>{m.name}</td>
                      <td style={{padding:'4px 6px',textAlign:'center',color:'#6b7280'}}>{m.tasksAssigned}</td>
                      <td style={{padding:'4px 6px',textAlign:'center',color:'#22c55e'}}>{m.tasksDone}</td>
                      <td style={{padding:'4px 6px',textAlign:'right'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                          <div style={{width:60,height:4,background:'#e5e7eb',borderRadius:2}}>
                            <div style={{height:4,borderRadius:2,background:getParticipationColor(m.participation),width:Math.min(m.participation,100)+'%'}} />
                          </div>
                          <span style={{fontWeight:700,fontSize:11,color:getParticipationColor(m.participation)}}>{m.participation}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {proj.members.length > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,padding:'6px 8px',background:'#f0f4ff',borderRadius:6}}>
                  <span style={{fontSize:10,color:'#1d4ed8',fontWeight:600}}>Total Team Contribution</span>
                  <div style={{flex:1,height:4,background:'#dbeafe',borderRadius:2}}>
                    <div style={{height:4,borderRadius:2,background:'#2347e8',
                      width:Math.min(Math.round(proj.members.reduce((s,m) => s + m.participation, 0) / proj.members.length), 100)+'%'}} />
                  </div>
                  <span style={{fontWeight:700,fontSize:13,color:'#1d4ed8'}}>{Math.round(proj.members.reduce((s,m) => s + m.participation, 0) / proj.members.length)}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

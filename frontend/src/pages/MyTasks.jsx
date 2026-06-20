import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { myTasks, projects, sprints } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  todo:'#6b7280', in_progress:'#3b82f6', review:'#f59e0b', done:'#22c55e',
  delayed:'#ef4444', draft:'#6b7280', ready:'#3b82f6', passed:'#22c55e',
  failed:'#ef4444', blocked:'#8b5cf6', skipped:'#6b7280', retesting:'#f59e0b',
};

const PRIORITY_ORDER = { critical:0, urgent:1, high:2, medium:3, low:4 };

export default function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [tasksRes, widgetsRes, analyticsRes] = await Promise.all([
          myTasks.getAll(), myTasks.getWidgets(), myTasks.getAnalytics(),
        ]);
        setData(tasksRes.data);
        setWidgets(widgetsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (e) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const isManager = ['admin','project_manager','manager','team_lead'].includes(user?.role);

  const roleIcons = { developer:'💻', qa_tester:'🧪', project_manager:'📋', manager:'📋', admin:'🏢' };

  if (loading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh',color:'#6b7280',fontSize:14}}>Loading your workspace...</div>;
  }

  return (
    <div style={{padding:'24px 32px'}}>
      {/* Header */}
      <div style={{marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:24}}>{roleIcons[user?.role] || '📊'}</span>
            <h1 style={{fontSize:22,fontWeight:700,color:'#111827',margin:0}}>{data?.view || 'My Workspace'}</h1>
          </div>
          <p style={{fontSize:12,color:'#6b7280',marginTop:2}}>
            {user?.name} · {user?.role?.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}
          </p>
        </div>
      </div>

      {/* Widget Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:24}}>
        {widgets.map(w => (
          <div key={w.id} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:20}}>{w.icon}</span>
              {w.type === 'ratio' && (
                <span style={{fontSize:10,color:'#6b7280',background:'#f3f4f6',padding:'2px 6px',borderRadius:4}}>This week</span>
              )}
            </div>
            <div style={{fontSize:11,color:'#6b7280',fontWeight:500,marginBottom:2}}>{w.title}</div>
            {w.type === 'count' && <div style={{fontSize:28,fontWeight:700,color:'#111827'}}>{w.data}</div>}
            {w.type === 'percent' && <div style={{fontSize:28,fontWeight:700,color:'#111827'}}>{w.data}%</div>}
            {w.type === 'hours' && <div style={{fontSize:28,fontWeight:700,color:'#111827'}}>{w.data}h</div>}
            {w.type === 'progress' && (
              <div>
                <div style={{fontSize:28,fontWeight:700,color:'#111827'}}>{w.data.done}/{w.data.total}</div>
                <div style={{height:4,background:'#e5e7eb',borderRadius:2,marginTop:4}}>
                  <div style={{height:'100%',background:'#22c55e',borderRadius:2,width:`${w.data.total > 0 ? Math.round((w.data.done/w.data.total)*100) : 0}%`}} />
                </div>
              </div>
            )}
            {w.type === 'ratio' && (
              <div style={{display:'flex',gap:12,alignItems:'center',marginTop:4}}>
                <div><span style={{fontSize:18,fontWeight:700,color:'#22c55e'}}>{w.data.pass}</span><span style={{fontSize:11,color:'#6b7280',marginLeft:4}}>passed</span></div>
                <div><span style={{fontSize:18,fontWeight:700,color:'#ef4444'}}>{w.data.fail}</span><span style={{fontSize:11,color:'#6b7280',marginLeft:4}}>failed</span></div>
              </div>
            )}
            {w.type === 'workload' && (
              <div style={{fontSize:12,color:'#6b7280'}}>
                <div>{w.data.memberCount} members · {w.data.totalTasks} tasks</div>
                <div style={{height:4,background:'#e5e7eb',borderRadius:2,marginTop:4}}>
                  <div style={{height:'100%',background:'#3b82f6',borderRadius:2,width:`${w.data.completionRate}%`}} />
                </div>
              </div>
            )}
            {w.type === 'list' && Array.isArray(w.data) && (
              <div style={{fontSize:11,color:'#6b7280'}}>
                {w.data.length === 0 ? 'No items' : w.data.slice(0,3).map((item,i) => (
                  <div key={i} style={{padding:'2px 0',borderBottom:i<2?'1px solid #f3f4f6':'none'}}>{item.title}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid #e5e7eb',marginBottom:20}}>
        {['tasks','analytics'].map(tab => (
          <button key={tab} data-voice={`tab-${tab}-view`} onClick={() => setActiveTab(tab)}
            style={{
              padding:'8px 20px',fontSize:13,fontWeight:600,
              color: activeTab === tab ? '#111827' : '#6b7280',
              background:'transparent',border:'none',borderBottom:`2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`,
              marginBottom:-2,cursor:'pointer',textTransform:'capitalize',
            }}>
            {tab === 'tasks' ? (data?.role === 'qa_tester' ? 'Testing Queue' : data?.role === 'developer' ? 'My Tasks' : data?.role === 'admin' ? 'All Tasks' : 'Team Tasks') : 'Analytics'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && data && <RoleSections data={data} user={user} navigate={navigate} />}
      {activeTab === 'analytics' && analytics && (
        <div style={{display:'grid',gap:20}}>
          <AnalyticsMetrics metrics={analytics.metrics} />
          <AnalyticsCharts charts={analytics.charts} />
          {analytics.alerts?.length > 0 && <AlertsPanel alerts={analytics.alerts} />}
        </div>
      )}
    </div>
  );
}

function RoleSections({ data, user, navigate }) {
  const role = data.role;

  if (role === 'developer') return <DeveloperView data={data} navigate={navigate} />;
  if (role === 'qa_tester') return <QAView data={data} navigate={navigate} />;
  if (['project_manager','manager','team_lead'].includes(role)) return <PMView data={data} navigate={navigate} />;
  if (role === 'admin') return <AdminView data={data} navigate={navigate} />;
  return <DeveloperView data={data} navigate={navigate} />;
}

/* ===== DEVELOPER VIEW ===== */
function DeveloperView({ data, navigate }) {
  const sections = [
    { title:'⚡ Active Sprint Tasks', items:data.sections.activeSprintTasks, empty:'No tasks in active sprints', sort:true },
    { title:'🐛 Bug Fixes Assigned', items:data.sections.bugFixes, empty:'No bugs assigned', badge:'bug' },
    { title:'👀 Pending Reviews', items:data.sections.pendingReviews, empty:'Nothing pending review' },
    { title:'✅ Completed This Sprint', items:data.sections.completedThisSprint, empty:'Nothing completed yet', done:true },
    { title:'📋 Other Tasks', items:data.sections.otherTasks, empty:'No other tasks' },
  ];
  return <SectionList sections={sections} navigate={navigate} />;
}

/* ===== QA VIEW ===== */
function QAView({ data, navigate }) {
  const sections = [
    { title:'🧪 Tests Ready to Run', items:data.sections.readyToRun, empty:'No tests ready', type:'test' },
    { title:'⚙️ Tests In Progress', items:data.sections.inProgress, empty:'No tests in progress', type:'test' },
    { title:'❌ Failed Tests', items:data.sections.failed, empty:'No failed tests', type:'test', failed:true },
    { title:'✅ Tests Passed', items:data.sections.passed, empty:'No passed tests', type:'test', passed:true },
    { title:'⛔ Blocked Tests', items:data.sections.blocked, empty:'No blocked tests', type:'test' },
  ];
  return <SectionList sections={sections} navigate={navigate} userRole="qa_tester" />;
}

/* ===== PM VIEW ===== */
function PMView({ data, navigate }) {
  const sections = [
    { title:'⚡ Active Sprints', sprints:data.sections.sprints, empty:'No active sprints', type:'sprint' },
    { title:'🚨 Blocked Items', items:data.sections.blocked, empty:'Nothing blocked' },
    { title:'📊 Recent Tasks', items:data.sections.recentTasks, empty:'No tasks yet' },
  ];

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12,marginBottom:16}}>
        <StatCard label="Projects" value={data.stats.totalProjects} />
        <StatCard label="Total Sprints" value={data.stats.totalSprints} />
        <StatCard label="Members" value={data.stats.memberCount} />
        <StatCard label="Completion Rate" value={`${data.stats.completionRate}%`} color="#22c55e" />
      </div>

      {sections.map((s, i) => (
        <SectionBlock key={i} title={s.title} empty={s.empty}>
          {s.type === 'sprint' ? (
            s.sprints?.length > 0 ? s.sprints.map(sp => (
              <div key={sp._id} onClick={() => navigate(`/sprints`)} style={{padding:'10px 14px',background:'#f9fafb',borderRadius:6,cursor:'pointer',marginBottom:6,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:13,fontWeight:600,color:'#111827'}}>{sp.name}</div>
                <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{sp.project?.name} · {sp.tasks?.length || 0} tasks</div>
                {sp.tasks?.length > 0 && (
                  <div style={{marginTop:6,display:'flex',gap:4,flexWrap:'wrap'}}>
                    {sp.tasks.slice(0,5).map(t => (
                      <span key={t._id} style={{fontSize:10,padding:'1px 6px',background:STATUS_COLORS[t.status] || '#6b7280',color:'white',borderRadius:3}}>{t.title?.slice(0,20)}</span>
                    ))}
                    {sp.tasks.length > 5 && <span style={{fontSize:10,color:'#6b7280'}}>+{sp.tasks.length-5} more</span>}
                  </div>
                )}
              </div>
            )) : <EmptyState msg={s.empty} />
          ) : (
            <TaskItems items={s.items} navigate={navigate} />
          )}
        </SectionBlock>
      ))}

      {/* Tasks by Team Member */}
      <SectionBlock title="👥 Tasks by Member" empty="No members with tasks">
        {Object.values(data.sections.tasksByMember || {}).filter(m => m.tasks.length > 0).map(({ user:u, tasks:ts }) => {
          const workload = ts.length > 8 ? 'overloaded' : ts.length > 3 ? 'normal' : 'underutilized';
          const workloadColor = workload === 'overloaded' ? '#ef4444' : workload === 'normal' ? '#22c55e' : '#f59e0b';
          return (
            <div key={u._id} style={{padding:'10px 14px',background:'#f9fafb',borderRadius:6,marginBottom:6,border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:600,color:'#111827'}}>{u.name}</div>
                <span style={{fontSize:10,color:'white',background:workloadColor,padding:'1px 6px',borderRadius:3}}>
                  {workload} ({ts.length})
                </span>
              </div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {ts.slice(0,6).map(t => (
                  <span key={t._id} style={{fontSize:10,padding:'1px 6px',background:(STATUS_COLORS[t.status] || '#6b7280')+'20',color:STATUS_COLORS[t.status]||'#6b7280',borderRadius:3}}>{t.title?.slice(0,18)}</span>
                ))}
                {ts.length > 6 && <span style={{fontSize:10,color:'#6b7280'}}>+{ts.length-6} more</span>}
              </div>
            </div>
          );
        })}
      </SectionBlock>
    </div>
  );
}

/* ===== ADMIN VIEW ===== */
function AdminView({ data, navigate }) {
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12,marginBottom:16}}>
        <StatCard label="Total Users" value={data.stats.totalUsers} />
        <StatCard label="Total Tasks" value={data.stats.totalTasks} />
        <StatCard label="Completion Rate" value={`${data.stats.completionRate}%`} color="#22c55e" />
        <StatCard label="Test Cases" value={data.stats.totalTestCases} />
      </div>

      {/* Alerts */}
      <div style={{display:'grid',gap:12,marginBottom:16}}>
        {data.stats.overdueCount > 0 && (
          <AlertBanner type="warning" message={`${data.stats.overdueCount} overdue tasks require attention`} />
        )}
        {data.stats.openBugsLongCount > 0 && (
          <AlertBanner type="warning" message={`${data.stats.openBugsLongCount} bugs open for more than 7 days`} />
        )}
      </div>

      <SectionBlock title="📋 All Tasks" empty="No tasks">
        <div style={{maxHeight:400,overflowY:'auto'}}>
          {data.sections.tasks.slice(0,50).map(t => (
            <div key={t._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid #f3f4f6'}}>
              <div>
                <span style={{fontSize:13,color:'#111827',fontWeight:500}}>{t.title}</span>
                <span style={{fontSize:11,color:'#6b7280',marginLeft:8}}>{t.project?.name || ''}</span>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:10,padding:'1px 6px',background:(STATUS_COLORS[t.status] || '#6b7280')+'20',color:STATUS_COLORS[t.status]||'#6b7280',borderRadius:3}}>{t.status}</span>
                {t.assignee && <span style={{fontSize:10,color:'#6b7280'}}>{t.assignee.name}</span>}
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="👥 User Workloads" empty="No users">
        {Object.values(data.sections.userWorkloads || {}).map(({ user:u, taskCount, doneCount, estimatedHours, loggedHours }) => (
          <div key={u._id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:28,height:28,borderRadius:14,background:'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:11,fontWeight:600}}>
              {u.name?.charAt(0)}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:'#111827'}}>{u.name}</div>
              <div style={{fontSize:11,color:'#6b7280'}}>{u.role?.replace('_',' ')}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#111827'}}>{taskCount} tasks</div>
              <div style={{fontSize:11,color:'#6b7280'}}>{doneCount} done · {loggedHours}h logged</div>
            </div>
          </div>
        ))}
      </SectionBlock>
    </div>
  );
}

/* ===== SHARED COMPONENTS ===== */

function SectionList({ sections, navigate }) {
  return sections.map((s, i) => (
    <SectionBlock key={i} title={s.title} empty={s.empty}>
      <TaskItems items={s.items} navigate={navigate} type={s.type} />
    </SectionBlock>
  ));
}

function SectionBlock({ title, empty, children }) {
  return (
    <div style={{background:'white',border:'1px solid #e5e7eb',borderRadius:10,marginBottom:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid #f3f4f6',fontSize:14,fontWeight:600,color:'#111827',background:'#fafafa'}}>{title}</div>
      <div style={{padding:'8px 16px'}}>
        {!children || (Array.isArray(children) && children.length === 0) ? <EmptyState msg={empty} /> : children}
      </div>
    </div>
  );
}

function TaskItems({ items, navigate, type }) {
  if (!items?.length) return null;
  return items.map(t => (
    <div key={t._id} onClick={() => navigate(type === 'test' ? '/test-cases' : '/tasks')} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #f3f4f6',cursor:'pointer',transition:'background 0.1s'}}
      onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:13,fontWeight:500,color:'#111827'}}>{t.title}</span>
          {t.priority && <PriorityBadge p={t.priority} />}
        </div>
        <div style={{display:'flex',gap:8,fontSize:11,color:'#6b7280',marginTop:2}}>
          {t.project?.name && <span>📁 {t.project.name}</span>}
          {t.sprint?.name && <span>⚡ {t.sprint.name}</span>}
          {t.feature && <span>🔖 {t.feature}</span>}
          {t.deadline && <span>📅 {new Date(t.deadline).toLocaleDateString()}</span>}
          {type === 'test' && t.type && <span>🔌 {t.type}</span>}
          {t.assignee?.name && <span>👤 {t.assignee.name}</span>}
          {t.executedBy?.name && <span>▶️ {t.executedBy.name}</span>}
          {t.linkedBug && <span style={{color:'#ef4444'}}>🐛 #{t.linkedBug.title?.slice(0,20)}</span>}
        </div>
      </div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        {t.type === 'bug' && <span style={{fontSize:9,background:'#fef2f2',color:'#ef4444',padding:'1px 5px',borderRadius:3,fontWeight:600}}>BUG</span>}
        <span style={{fontSize:10,padding:'2px 8px',background:(STATUS_COLORS[t.status] || '#6b7280')+'20',color:STATUS_COLORS[t.status]||'#6b7280',borderRadius:4,fontWeight:500,textTransform:'capitalize'}}>{t.status}</span>
      </div>
    </div>
  ));
}

function StatCard({ label, value, color }) {
  return (
    <div style={{background:'white',border:'1px solid #e5e7eb',borderRadius:10,padding:'14px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{fontSize:11,color:'#6b7280',fontWeight:500,marginBottom:2}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color:color || '#111827'}}>{value}</div>
    </div>
  );
}

function PriorityBadge({ p }) {
  const colors = { critical:'#ef4444', urgent:'#f59e0b', high:'#3b82f6', medium:'#6b7280', low:'#9ca3af' };
  return <span style={{fontSize:9,background:(colors[p]||'#6b7280')+'20',color:colors[p]||'#6b7280',padding:'1px 5px',borderRadius:3,fontWeight:600}}>{p}</span>;
}

function AlertBanner({ type, message }) {
  const colors = { warning:{bg:'#fffbeb',border:'#fde68a',color:'#92400e'}, error:{bg:'#fef2f2',border:'#fecaca',color:'#991b1b'}, info:{bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af'} };
  const c = colors[type] || colors.info;
  return (
    <div style={{padding:'10px 14px',background:c.bg,border:`1px solid ${c.border}`,borderRadius:8,fontSize:12,color:c.color,display:'flex',alignItems:'center',gap:8}}>
      <span>{type === 'warning' ? '⚠️' : type === 'error' ? '🚨' : 'ℹ️'}</span>
      {message}
    </div>
  );
}

function EmptyState({ msg }) {
  return <div style={{padding:'16px 0',textAlign:'center',fontSize:12,color:'#9ca3af'}}>{msg || 'No items'}</div>;
}

/* ===== ANALYTICS COMPONENTS ===== */

function AnalyticsMetrics({ metrics }) {
  if (!metrics?.length) return null;
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
      {metrics.map((m, i) => {
        const trendIcon = m.trend === 'up' ? '📈' : m.trend === 'down' ? '📉' : '➡️';
        const trendColor = m.trend === 'up' ? '#22c55e' : m.trend === 'down' ? '#ef4444' : '#6b7280';
        return (
          <div key={i} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:11,color:'#6b7280',fontWeight:500}}>{m.name}</span>
              <span style={{fontSize:14}}>{trendIcon}</span>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:'#111827'}}>{m.value}</div>
            <div style={{fontSize:10,color:trendColor,marginTop:2}}>Target: {m.target}</div>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsCharts({ charts }) {
  if (!charts?.length) return null;
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(350px,1fr))',gap:16}}>
      {charts.map((c, i) => (
        <div key={i} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#111827',marginBottom:12}}>{c.title}</div>
          {c.type === 'bar' && <BarChart labels={c.labels} data={c.data} />}
          {c.type === 'doughnut' && <DoughnutChart labels={c.labels} data={c.data} />}
        </div>
      ))}
    </div>
  );
}

function BarChart({ labels, data }) {
  const max = Math.max(...data, 1);
  const colors = ['#3b82f6','#22c55e','#ef4444','#f59e0b','#8b5cf6','#ec4899'];
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,padding:'10px 0'}}>
      {labels.map((l, i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',height:'100%',justifyContent:'flex-end'}}>
          <div style={{fontSize:10,color:'#6b7280',marginBottom:4}}>{data[i]}</div>
          <div style={{width:'100%',maxWidth:40,height:`${Math.max((data[i]/max)*100, 2)}%`,background:colors[i%colors.length],borderRadius:'4px 4px 0 0',transition:'height 0.3s'}} />
          <div style={{fontSize:9,color:'#9ca3af',marginTop:4,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',maxWidth:60,whiteSpace:'nowrap'}}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function DoughnutChart({ labels, data }) {
  const total = data.reduce((s, v) => s + v, 0) || 1;
  const colors = ['#3b82f6','#22c55e','#ef4444','#f59e0b','#8b5cf6','#ec4899'];
  let cumulative = 0;
  const segments = data.map((v, i) => {
    const start = cumulative;
    cumulative += v;
    return { start, end: cumulative, color: colors[i % colors.length], label: labels[i], value: v };
  });
  return (
    <div style={{display:'flex',alignItems:'center',gap:20}}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="16" />
        {segments.map((s, i) => {
          const pct = s.value / total;
          const angle = pct * 360;
          const startAngle = (s.start / total) * 360 - 90;
          const endAngle = startAngle + angle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 60 + 50 * Math.cos(startRad);
          const y1 = 60 + 50 * Math.sin(startRad);
          const x2 = 60 + 50 * Math.cos(endRad);
          const y2 = 60 + 50 * Math.sin(endRad);
          const largeArc = angle > 180 ? 1 : 0;
          if (pct <= 0.001) return null;
          return (
            <path key={i} d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={s.color} stroke="white" strokeWidth="1" />
          );
        })}
        <circle cx="60" cy="60" r="42" fill="white" />
        <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#111827">{total}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#6b7280">total</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}>
            <div style={{width:8,height:8,borderRadius:4,background:s.color}} />
            <span style={{color:'#374151'}}>{s.label}</span>
            <span style={{color:'#6b7280'}}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }) {
  return (
    <div style={{background:'white',border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid #f3f4f6',fontSize:14,fontWeight:600,color:'#111827',background:'#fafafa',display:'flex',alignItems:'center',gap:6}}>
        🚨 Alerts
      </div>
      <div style={{padding:'8px 16px'}}>
        {alerts.map((a, i) => {
          const colors = { high:{bg:'#fef2f2',color:'#991b1b',icon:'🔴'}, medium:{bg:'#fffbeb',color:'#92400e',icon:'🟡'}, low:{bg:'#eff6ff',color:'#1e40af',icon:'🔵'} };
          const c = colors[a.severity] || colors.low;
          return (
            <div key={i} style={{padding:'8px 0',display:'flex',alignItems:'center',gap:8,borderBottom:i<alerts.length-1?'1px solid #f3f4f6':'none'}}>
              <span>{c.icon}</span>
              <span style={{fontSize:12,color:c.color}}>{a.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

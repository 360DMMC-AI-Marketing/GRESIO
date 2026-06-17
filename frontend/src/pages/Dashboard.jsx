import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analytics, projects, companies, tasks } from '../services/api';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

const PLAN_INFO = {
  starter: { label: 'Starter', price: '$0', color: 'bg-neutral-200', textColor: 'text-neutral-600', users: 10, projects: 3 },
  team: { label: 'Team', price: '$29/mo', color: 'bg-blue-500', textColor: 'text-blue-700', users: 50, projects: Infinity },
  enterprise: { label: 'Enterprise', price: '$99/mo', color: 'bg-amber-500', textColor: 'text-amber-700', users: Infinity, projects: Infinity },
};

const STATUS_COLOR = {
  on_track: 'bg-success-50 text-success-700', at_risk: 'bg-warning-50 text-warning-700',
  delayed: 'bg-danger-50 text-danger-700', ready_to_test: 'bg-info-50 text-info-700',
  completed: 'bg-neutral-100 text-neutral-600',
};
const RISK_COLOR = { low:'bg-success-50 text-success-700', medium:'bg-warning-50 text-warning-700', high:'bg-danger-50 text-danger-700' };

function relativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

const ICON_BG = { brand:'bg-brand-50 text-brand-600', green:'bg-success-50 text-success-600', yellow:'bg-warning-50 text-warning-600', blue:'bg-info-50 text-info-600' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState(null);

  useEffect(() => {
    Promise.all([
      analytics.getDashboard(),
      projects.getAll(),
      companies.getAll().catch(() => []),
    ])
      .then(([aRes, pRes, compRes]) => {
        setStats(aRes.data);
        setProjectList(pRes.data.slice(0, 6));
        const comps = Array.isArray(compRes) ? compRes : compRes.data || [];
        setCompany(comps[0] || null);
        setTimeout(() => {
          analytics.getPredictions().then(r => setPredictions(r.data || [])).catch(() => {});
        }, 2000);
        tasks.getRiskForecast().then(r => setRiskData(r.data)).catch(() => {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const healthScore = stats?.healthScore || 0;
  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const highRisk = predictions.filter(p => p.risk === 'high');
  const mediumRisk = predictions.filter(p => p.risk === 'medium');

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-neutral-900">Dashboard</span>
            {company && (
              <span className="text-[11px] text-neutral-400" style={{marginTop:2}}>
                — {company.name}{company.domain ? ` (${company.domain})` : ''}
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            {user?.name && <span> · Welcome back, <strong>{user.name.split(' ')[0]}</strong></span>}
          </div>
        </div>
        <div className="health-pill">
          <span className="text-[11px] text-neutral-500">Company health</span>
          <span style={{fontSize:'16px',fontWeight:700,color:healthColor}}>{healthScore}%</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Active Projects" value={stats?.totalProjects || 0} icon="📁" color="brand"
          subtitle={`${stats?.inProgressProjects || 0} in progress`} />
        <StatCard title="Completed Projects" value={stats?.completedProjects || 0} icon="✅" color="blue"
          subtitle={`out of ${stats?.totalProjects || 0} total projects`} />
        <StatCard title="Blocked Projects" value={stats?.blockedProjects || 0} icon="⚠️" color="red"
          subtitle={`${stats?.atRiskProjects || 0} at risk · ${stats?.delayedProjects || 0} delayed`} />
        <StatCard title="Team Online" value={stats?.activeUsers || 0} icon="👥" color="green"
          subtitle={`${stats?.idleUsers || 0} idle · ${stats?.inactiveUsers || 0} offline`} />
      </div>

      {highRisk.length > 0 && (
        <div className="card" style={{marginBottom:12,padding:14,borderLeft:'3px solid #ef4444'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{fontSize:14}}>⚠️</span>
            <span style={{fontSize:12,fontWeight:600,color:'#dc2626'}}>High Risk Projects</span>
            <span className="status-badge bg-danger-50 text-danger-700">{highRisk.length} project{highRisk.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
            {highRisk.map(p => (
              <Link key={p.projectId} to={`/projects/${p.projectId}`} style={{textDecoration:'none',minWidth:200,padding:'8px 10px',background:'#fef2f2',borderRadius:8,border:'0.5px solid #fecaca',display:'block'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#991b1b'}}>{p.name}</div>
                <div style={{fontSize:10,color:'#b91c1c',marginTop:2}}>
                  {p.overdue > 0 && <span>{p.overdue} overdue task{p.overdue > 1 ? 's' : ''} · </span>}
                  {p.daysUntilDeadline !== null ? `${p.daysUntilDeadline}d remaining` : 'No deadline'}
                </div>
                <div style={{fontSize:10,color:'#b91c1c',marginTop:1}}>{p.completionRate}% complete</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {riskData && (
        <div className="card" style={{marginBottom:12,padding:14,borderLeft:'3px solid #f59e0b'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{fontSize:14}}>🔮</span>
            <span style={{fontSize:12,fontWeight:600,color:'#111827'}}>Risk Forecast</span>
            {riskData.atRisk?.length > 0 ? (
              <span className="status-badge bg-warning-50 text-warning-700">{riskData.atRisk.length} at-risk task{riskData.atRisk.length > 1 ? 's' : ''}</span>
            ) : (
              <span className="status-badge bg-success-50 text-success-700" style={{fontSize:9}}>All clear</span>
            )}
            <span style={{fontSize:10,color:'#9ca3af',marginLeft:'auto'}}>Analyzed {riskData.total} tasks</span>
          </div>
          {riskData.atRisk?.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:220,overflowY:'auto'}}>
              {riskData.atRisk.slice(0, 10).map(t => (
              <Link key={t._id} to={`/projects/${t.project?._id || '#'}`} style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:6,background:t.risk === 'critical' ? '#fef2f2' : '#fffbeb',border:'0.5px solid',borderColor:t.risk === 'critical' ? '#fecaca' : '#fde68a'}}>
                <span style={{fontSize:12}}>{t.risk === 'critical' ? '🔴' : '🟡'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                  <div style={{fontSize:8,color:'#6b7280',marginTop:1}}>
                    {t.project?.name}{t.sprint?.name ? ` · ${t.sprint.name}` : ''}{t.assignee ? ` · ${t.assignee.name}` : ''}
                  </div>
                </div>
                <div style={{fontSize:8,textAlign:'right',flexShrink:0}}>
                  {t.reasons.slice(0,2).map((r,i) => <div key={i} style={{color:'#b45309'}}>{r}</div>)}
                </div>
              </Link>
            ))}
            </div>
          ) : (
            <div style={{fontSize:10,color:'#6b7280',textAlign:'center',padding:'8px 0'}}>
              All tasks on track ✓
            </div>
          )}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:'12px'}}>
        <div className="card">
          <div className="card-header"><span className="card-title">Projects</span><Link to="/projects" className="card-link">View all →</Link></div>
          {projectList.length === 0 && <p className="text-center text-neutral-400 text-sm py-10">No projects yet</p>}
          {projectList.map(p => {
            const pred = predictions.find(pr => String(pr.projectId) === String(p._id));
            return (
              <Link to={`/projects/${p._id}`} key={p._id} className="proj-row">
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    {p.status === 'blocked' ? (
                      <span style={{fontSize:12}} title="Blocked">⚠️</span>
                    ) : pred && ['high','medium'].includes(pred.risk) ? (
                      <span style={{fontSize:10}} title={`${pred.risk} risk`}>
                        {pred.risk === 'high' ? '🔴' : '🟡'}
                      </span>
                    ) : null}
                    <span className="proj-name">{p.name}</span>
                    <span className={`status-badge ${STATUS_COLOR[p.status] || 'bg-neutral-100 text-neutral-600'}`}
                      style={{textTransform:'capitalize'}}>{(p.phase || 'planning').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
                    {p.projectType && <span style={{fontSize:8,marginLeft:4,color:'#6b7280',background:'#f3f4f6',padding:'1px 5px',borderRadius:3}}>{p.projectType}</span>}
                    {pred?.overdue > 0 && <span className="status-badge bg-danger-50 text-danger-700">{pred.overdue} overdue</span>}
                  </div>
                </div>
                <span className="prog-text">{p.progress}%</span>
              </Link>
            );
          })}
        </div>

        {company && (
          <div className="card">
            <div className="card-header"><span className="card-title">Plan</span>
              <Link to="/admin" className="card-link">Manage →</Link>
            </div>
            <div style={{padding:'8px 12px'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">Current plan</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_INFO[company.plan]?.textColor || 'text-neutral-600'} ${PLAN_INFO[company.plan]?.color || 'bg-neutral-200'}`}>
                  {PLAN_INFO[company.plan]?.label || 'Starter'}
                </span>
              </div>
              <div className="text-xs text-neutral-400 mb-1">{company.name}</div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-500">Users</span>
                <span className="text-neutral-700 font-medium">{company.usage?.userCount || 0}{(PLAN_INFO[company.plan]?.users || 0) !== Infinity ? ` / ${PLAN_INFO[company.plan]?.users || 10}` : ''}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Projects</span>
                <span className="text-neutral-700 font-medium">{company.usage?.projectCount || 0}{(PLAN_INFO[company.plan]?.projects || 0) !== Infinity ? ` / ${PLAN_INFO[company.plan]?.projects || 3}` : ''}</span>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

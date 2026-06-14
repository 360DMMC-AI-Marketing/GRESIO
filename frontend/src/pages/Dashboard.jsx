import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analytics, projects, companies } from '../services/api';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

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
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      analytics.getDashboard(),
      projects.getAll(),
      analytics.getPredictions().catch(() => []),
      companies.getAll().catch(() => []),
    ])
      .then(([aRes, pRes, predRes, compRes]) => {
        setStats(aRes.data);
        setProjectList(pRes.data.slice(0, 6));
        setPredictions(Array.isArray(predRes) ? predRes : predRes.data || []);
        const comps = Array.isArray(compRes) ? compRes : compRes.data || [];
        setCompany(comps[0] || null);
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
        <StatCard title="Blocked Projects" value={(stats?.atRiskProjects || 0) + (stats?.delayedProjects || 0)} icon="⚠️" color="red"
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
                    {pred && ['high','medium'].includes(pred.risk) && (
                      <span style={{fontSize:10}} title={`${pred.risk} risk`}>
                        {pred.risk === 'high' ? '🔴' : '🟡'}
                      </span>
                    )}
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

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          <div style={{padding:'8px 0'}}>
            {(stats?.recentActivity || []).length === 0 && <p className="text-center text-neutral-400 text-sm py-6">No activity yet</p>}
            {(stats?.recentActivity || []).slice(0, 8).map((a, i) => (
              <div key={i} style={{display:'flex',gap:8,padding:'6px 12px'}}>
                <div style={{width:24,height:24,background:'#f0f4ff',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#2347e8',flexShrink:0}}>
                  {a.user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{fontSize:10,color:'#374151'}}>{a.description}</div>
                  <div style={{fontSize:9,color:'#9ca3af',marginTop:1}}>{relativeTime(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

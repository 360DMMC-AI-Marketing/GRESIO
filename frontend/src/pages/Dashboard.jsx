import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { analytics, projects, companies } from '../services/api';
import StatCard from '../components/StatCard';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from 'recharts';

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

const DEFAULT_SECTIONS = {
  statsGrid: true, insights: true, atRisk: true, projects: true, plan: true, matrix: true,
};

function loadSections() {
  try { return { ...DEFAULT_SECTIONS, ...JSON.parse(localStorage.getItem('dash_sections')) }; }
  catch { return DEFAULT_SECTIONS; }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function calculateStreak(productivity) {
  if (!productivity || productivity.length === 0) return 0;
  const dateMap = {};
  productivity.forEach(d => { dateMap[d._id] = d.count; });
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (dateMap[key] > 0) streak++;
    else break;
  }
  return streak;
}

function getHealthTrend(productivity) {
  if (!productivity || productivity.length < 14) return { direction: '→', value: 0, label: 'Stable' };
  const sorted = [...productivity].sort((a, b) => a._id.localeCompare(b._id));
  const recent = sorted.slice(-7);
  const previous = sorted.slice(-14, -7);
  const recentAvg = recent.reduce((s, d) => s + (d.totalScore || d.count), 0) / recent.length;
  const prevAvg = previous.reduce((s, d) => s + (d.totalScore || d.count), 0) / previous.length;
  if (recentAvg > prevAvg * 1.05) return { direction: '↑', value: Math.round((recentAvg / prevAvg - 1) * 100), label: `Up ${Math.round((recentAvg / prevAvg - 1) * 100)}%` };
  if (recentAvg < prevAvg * 0.95) return { direction: '↓', value: Math.round((1 - recentAvg / prevAvg) * 100), label: `Down ${Math.round((1 - recentAvg / prevAvg) * 100)}%` };
  return { direction: '→', value: 0, label: 'Stable' };
}

function getWeeklyActivity(productivity) {
  if (!productivity || productivity.length === 0) return 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return productivity
    .filter(d => new Date(d._id) >= weekAgo)
    .reduce((s, d) => s + d.count, 0);
}

function computeInsights(predictions, companyAnalytics) {
  const cards = [];
  const dueSoon = predictions.filter(p => p.daysUntilDeadline !== null && p.daysUntilDeadline <= 7 && p.daysUntilDeadline >= 0);
  const overdue = predictions.filter(p => p.daysUntilDeadline !== null && p.daysUntilDeadline < 0);
  const totalConcerns = overdue.length + dueSoon.length;
  const parts = [];
  if (dueSoon.length > 0) parts.push(`${dueSoon.length} due in 7d`);
  if (overdue.length > 0) parts.push(`${overdue.length} overdue`);
  cards.push({
    title: 'Deadlines',
    value: totalConcerns,
    subtitle: totalConcerns > 0 ? parts.join(' · ') : 'All on track',
    icon: '🎯',
    color: overdue.length > 0 ? 'red' : dueSoon.length > 0 ? 'yellow' : 'green',
  });

  const sprints = companyAnalytics?.sprints;
  const velocity = sprints?.velocity || 0;
  const activeSprints = sprints?.active || 0;
  cards.push({
    title: 'Sprint Pulse',
    value: velocity,
    subtitle: sprints ? `${activeSprints} active · ${sprints.completionRate || 0}% finish` : 'No active sprints',
    icon: '⚡',
    color: 'blue',
  });

  return cards;
}

function MatrixTooltip({ active, payload }) {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11, maxWidth: 200 }}>
      <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
        <div>Completion: <span style={{ fontWeight: 600, color: '#111827' }}>{d.completionRate}%</span></div>
        <div>Deadline: <span style={{ fontWeight: 600, color: d.daysUntilDeadline <= 0 ? '#ef4444' : d.daysUntilDeadline <= 7 ? '#f59e0b' : '#111827' }}>{d.daysUntilDeadline > 0 ? `${d.daysUntilDeadline}d left` : `${Math.abs(d.daysUntilDeadline)}d overdue`}</span></div>
        <div>Tasks: <span style={{ fontWeight: 600, color: '#111827' }}>{d.done}/{d.total}</span></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [company, setCompany] = useState(null);
  const [productivity, setProductivity] = useState([]);
  const [workload, setWorkload] = useState({ workload: [], overloaded: [], avgActivityScore: 0 });
  const [companyAnalytics, setCompanyAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState(loadSections);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    Promise.all([
      analytics.getDashboard(),
      projects.getAll(),
      companies.getAll().catch(() => []),
      analytics.getProductivity({ days: 30 }).catch(() => []),
      analytics.getWorkload().catch(() => ({ workload: [], overloaded: [], avgActivityScore: 0 })),
      analytics.getCompany().catch(() => ({})),
    ])
      .then(([aRes, pRes, compRes, prodRes, workRes, compAnal]) => {
        setStats(aRes.data);
        setProjectList(pRes.data.slice(0, 6));
        const comps = Array.isArray(compRes) ? compRes : compRes.data || [];
        setCompany(comps[0] || null);
        setProductivity(Array.isArray(prodRes) ? prodRes : prodRes?.data || []);
        setWorkload(workRes?.data || workRes || { workload: [], overloaded: [], avgActivityScore: 0 });
        setCompanyAnalytics(compAnal?.data || compAnal || {});
        setTimeout(() => {
          analytics.getPredictions().then(r => setPredictions(r.data || [])).catch(() => {});
        }, 2000);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const streak = useMemo(() => calculateStreak(productivity), [productivity]);
  const healthTrend = useMemo(() => getHealthTrend(productivity), [productivity]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(productivity), [productivity]);
  const insightCards = useMemo(() => computeInsights(predictions, companyAnalytics), [predictions, companyAnalytics]);

  const matrixData = useMemo(() =>
    predictions
      .filter(p => p.total > 0 && p.daysUntilDeadline !== null)
      .map(p => ({ ...p, x: p.completionRate, y: Math.max(-30, Math.min(60, p.daysUntilDeadline)), z: p.total })),
    [predictions]
  );

  function toggleSection(key) {
    setSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dash_sections', JSON.stringify(next));
      return next;
    });
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton.PageHeader />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton.StatCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton.Chart />
        <Skeleton.Chart />
      </div>
      <Skeleton.Table rows={4} />
    </div>
  );

  const healthScore = stats?.healthScore || 0;
  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const highRisk = predictions.filter(p => p.risk === 'high');
  const mediumRisk = predictions.filter(p => p.risk === 'medium');

  return (
    <div>
      {/* ── Executive Briefing Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #eef2ff 50%, #f5f3ff 100%)', borderRadius: 12, border: '0.5px solid #e0e7ff', padding: '16px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 300, color: '#6b7280', letterSpacing: '-0.02em' }}>{getGreeting()},</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#1e40af', letterSpacing: '-0.03em' }}>{user?.name?.split(' ')[0] || 'there'}</span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 500 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {company && (
              <>
                <span style={{ color: '#d1d5db' }}>·</span>
                <span style={{ color: '#4f46e5', fontWeight: 600 }}>{company.name}</span>
                {company.domain && <span style={{ color: '#9ca3af' }}>({company.domain})</span>}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ fontSize: 15 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#c2410c' }}>{streak}d</span>
              <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 500 }}>streak</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 20, padding: '5px 14px' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              Health <span style={{ color: healthTrend.direction === '↓' ? '#ef4444' : healthTrend.direction === '↑' ? '#22c55e' : '#94a3b8', fontWeight: 700 }}>{healthTrend.direction}</span>
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: healthColor, lineHeight: 1 }}>{healthScore}%</span>
          </div>
           <div style={{ position: 'relative' }}>
            {user?.role === 'admin' && (
            <button onClick={() => setShowCustomize(!showCustomize)}
              style={{ background: showCustomize ? '#e0e7ff' : '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 20, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: showCustomize ? '#2347e8' : '#64748b', transition: 'all 0.15s' }}
              title="Customize dashboard"><span style={{fontSize:13}}>✎</span> Customize</button>
            )}
            {showCustomize && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowCustomize(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '10px 0', minWidth: 210 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '0 14px 8px', borderBottom: '0.5px solid #f3f4f6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customize Dashboard</div>
                  {[
                    { key: 'statsGrid', label: 'Stats Grid' },
                    { key: 'insights', label: "Today's Pulse" },
                    { key: 'atRisk', label: 'Projects at Risk' },
                    { key: 'projects', label: 'Projects' },
                    { key: 'plan', label: 'Plan' },
                    { key: 'matrix', label: 'Portfolio Matrix' },
                  ].map(item => (
                    <div key={item.key} onClick={() => toggleSection(item.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: '#374151', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid', borderColor: sections[item.key] ? '#2347e8' : '#d1d5db', background: sections[item.key] ? '#2347e8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                        {sections[item.key] && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </div>
                      {item.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      {sections.statsGrid && (
      <div className="stats-grid">
        <StatCard title="Active Projects" value={stats?.totalProjects || 0} icon="📁" color="brand"
          subtitle={`${stats?.inProgressProjects || 0} in progress`} />
        <StatCard title="Completed Projects" value={stats?.completedProjects || 0} icon="✅" color="blue"
          subtitle={`out of ${stats?.totalProjects || 0} total projects`} />
        <StatCard title="Blocked Projects" value={stats?.blockedProjects || 0} icon="⚠️" color="red"
          subtitle={`${stats?.atRiskProjects || 0} at risk · ${stats?.delayedProjects || 0} delayed`} />
        <div className="bg-white rounded-2xl shadow-card border border-neutral-200 p-6 hover:shadow-hover-lift hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500 font-medium">Team</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-neutral-900 tracking-tight">{stats?.activeUsers || 0}</span>
                <span className="text-sm text-success-600 font-medium">online</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs flex items-center gap-1"><span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/> {stats?.activeUsers || 0}</span>
                <span className="text-xs flex items-center gap-1"><span style={{width:6,height:6,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/> {stats?.idleUsers || 0}</span>
                <span className="text-xs flex items-center gap-1"><span style={{width:6,height:6,borderRadius:'50%',background:'#d1d5db',display:'inline-block'}}/> {stats?.inactiveUsers || 0}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-semibold text-neutral-700">{(workload?.overloaded?.length || 0) > 0 ? `${workload.overloaded.length} overloaded` : 'All balanced'}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-700">{workload?.workload?.filter(w => w.taskCount < 5 && w.status !== 'inactive').length || 0} available</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-700">{workload?.avgActivityScore ? `${Math.round(workload.avgActivityScore)}% avg` : ''}</span>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-success-50 text-success-600">👥</div>
          </div>
        </div>
      </div>
      )}

      {/* ── Today's Pulse — Insight Cards ── */}
      {sections.insights && (
      <div className="stats-grid">
        {insightCards.map((card, i) => (
          <StatCard key={i} title={card.title} value={card.value} icon={card.icon} color={card.color} subtitle={card.subtitle} />
        ))}
      </div>
      )}

      {/* ── Projects at Risk ── */}
      {sections.atRisk && predictions.filter(p => p.status !== 'completed' && p.status !== 'delivered').length > 0 && (
        <div className="card" style={{ marginBottom: 12, padding: 14, borderLeft: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Projects at Risk</span>
            <span className="status-badge bg-danger-50 text-danger-700" style={{ fontSize: 10 }}>{highRisk.length} high · {mediumRisk.length} medium</span>
            <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>{predictions.length} projects monitored</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, flexWrap: 'nowrap' }}>
            {predictions.filter(p => p.status !== 'completed' && p.status !== 'delivered').sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 };
              return (order[a.risk] || 3) - (order[b.risk] || 3);
            }).map(p => (
              <Link key={p.projectId} to={`/projects/${p.projectId}`} style={{ textDecoration: 'none', minWidth: 220, padding: '10px 12px', borderRadius: 10, background: p.risk === 'high' ? '#fef2f2' : p.risk === 'medium' ? '#fffbeb' : '#f9fafb', border: '0.5px solid', borderColor: p.risk === 'high' ? '#fecaca' : p.risk === 'medium' ? '#fde68a' : '#e5e7eb', display: 'block', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{p.risk === 'high' ? '🔴' : p.risk === 'medium' ? '🟡' : '🟢'}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.risk === 'high' ? '#991b1b' : p.risk === 'medium' ? '#92400e' : '#111827' }}>{p.name}</span>
                  <span style={{ fontSize: 8, color: '#6b7280', background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, textTransform: 'capitalize', marginLeft: 'auto' }}>{p.status}</span>
                </div>
                <div style={{ fontSize: 10, color: p.risk === 'high' ? '#b91c1c' : '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>{p.done}/{p.total} tasks</span>
                  {p.overdue > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>{p.overdue} overdue</span>}
                  {p.daysUntilDeadline !== null && <span style={{ color: p.daysUntilDeadline <= 7 ? '#ef4444' : '#6b7280' }}>{p.daysUntilDeadline}d left</span>}
                </div>
                {p.daysUntilDeadline !== null && p.daysUntilDeadline <= 3 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 9, color: 'white', background: '#ef4444', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>CRITICAL</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px' }}>
        {sections.projects && (
        <div className="card">
          <div className="card-header"><span className="card-title">Projects</span><Link to="/projects" className="card-link">View all →</Link></div>
          {projectList.length === 0 && <p className="text-center text-neutral-400 text-sm py-10">No projects yet</p>}
          {projectList.map(p => {
            const pred = predictions.find(pr => String(pr.projectId) === String(p._id));
            return (
              <Link to={`/projects/${p._id}`} key={p._id} className="proj-row">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {p.status === 'blocked' ? (
                      <span style={{ fontSize: 12 }} title="Blocked">⚠️</span>
                    ) : pred && ['high', 'medium'].includes(pred.risk) ? (
                      <span style={{ fontSize: 10 }} title={`${pred.risk} risk`}>
                        {pred.risk === 'high' ? '🔴' : '🟡'}
                      </span>
                    ) : null}
                    <span className="proj-name">{p.name}</span>
                    <span className={`status-badge ${STATUS_COLOR[p.status] || 'bg-neutral-100 text-neutral-600'}`}
                      style={{ textTransform: 'capitalize' }}>{(p.phase || 'planning').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    {p.projectType && <span style={{ fontSize: 8, marginLeft: 4, color: '#6b7280', background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{p.projectType}</span>}
                    {pred?.overdue > 0 && <span className="status-badge bg-danger-50 text-danger-700">{pred.overdue} overdue</span>}
                  </div>
                </div>
                <span className="prog-text">{p.progress}%</span>
              </Link>
            );
          })}
        </div>
        )}

        {sections.plan && company && (
          <div className="card">
            <div className="card-header"><span className="card-title">Plan</span>
              {user?.role === 'admin' && <Link to="/admin" className="card-link">Manage →</Link>}
            </div>
            <div style={{ padding: '8px 12px' }}>
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

      {/* ── Project Portfolio Matrix (end of page) ── */}
      {sections.matrix && matrixData.length > 0 && (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📊 Project Portfolio Matrix</span>
            <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 400 }}>· bubble size = tasks · color = risk</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="x" domain={[0, 100]} tickCount={6}
                label={{ value: 'Completion Rate (%)', position: 'bottom', style: { fontSize: 10, fill: '#9ca3af' } }}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <YAxis
                dataKey="y" domain={[-30, 60]} tickCount={7} reversed
                label={{ value: 'Days Until Deadline', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={v => v <= 0 ? `${Math.abs(v)}d overdue` : `${v}d`}
              />
              <ZAxis dataKey="z" range={[40, 300]} />
              <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={matrixData} shape="circle">
                {matrixData.map((entry, idx) => {
                  const color = entry.risk === 'high' ? '#ef4444' : entry.risk === 'medium' ? '#f59e0b' : '#22c55e';
                  return <Cell key={idx} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} />;
                })}
              </Scatter>
              <ReferenceLine x={50} stroke="#e5e7eb" strokeDasharray="4 4" />
              <ReferenceLine y={14} stroke="#e5e7eb" strokeDasharray="4 4" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

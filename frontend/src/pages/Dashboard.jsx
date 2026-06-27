import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { analytics, projects, companies } from '../services/api';
import { users as usersApi } from '../services/api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import GanttView from '../components/GanttView';
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

const PHASES = ['discovery', 'planning', 'development', 'testing', 'review', 'launch', 'delivered', 'report'];

function relativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

const ICON_BG = { brand:'bg-brand-50 text-brand-600', green:'bg-success-50 text-success-600', yellow:'bg-warning-50 text-warning-600', blue:'bg-info-50 text-info-600' };

const DEFAULT_SECTIONS = {
  statsGrid: true, insights: true, atRisk: true, projects: true, plan: true, matrix: true, capacity: true,
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
  const [draftSections, setDraftSections] = useState(null);
  const [viewMode, setViewMode] = useState('weeks');
  const [capacityData, setCapacityData] = useState(null);
  const [capacityLoading, setCapacityLoading] = useState(true);
  const [capacityError, setCapacityError] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState(null);
  const [projViewMode, setProjViewMode] = useState('list');

  const loadCapacity = useCallback(() => {
    setCapacityLoading(true);
    setCapacityError(null);
    usersApi.getCapacity().then(r => setCapacityData(r.data)).catch(e => { console.error('Capacity API error:', e); setCapacityError(e.message || 'Unknown error'); }).finally(() => setCapacityLoading(false));
  }, []);

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
        setProjectList(pRes.data.filter(p => !p.parentProject).slice(0, 6));
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
    loadCapacity();
    const interval = setInterval(loadCapacity, 30000);
    return () => clearInterval(interval);
  }, [loadCapacity]);

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

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-24 w-full rounded-[var(--radius-xl)]" />
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
      </div>
      <div className="skeleton h-64 rounded-[var(--radius-lg)]" />
    </div>
  );

  const healthScore = stats?.healthScore || 0;
  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const highRisk = predictions.filter(p => p.risk === 'high');
  const mediumRisk = predictions.filter(p => p.risk === 'medium');

  return (
    <div>
      {/* ── Executive Briefing Header ── */}
      <div className="glass-panel gradient-wave rounded-[var(--radius-xl)] p-4 sm:p-5 mb-4 flex items-center justify-between flex-wrap gap-3 dark:border-[var(--glass-border)]" style={{background: 'linear-gradient(135deg, #f0f4ff 0%, #eef2ff 50%, #f5f3ff 100%)', backgroundSize: '200% 200%'}}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span className="text-[22px] font-light text-neutral-500 dark:text-[var(--text-tertiary)] tracking-tight">{getGreeting()},</span>
            <span className="text-[26px] font-extrabold text-primary-700 dark:text-brand-400 tracking-tighter">{user?.name?.split(' ')[0] || 'there'}</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 px-2 py-0.5 rounded-full">
              <span className="live-dot" /> Live
            </span>
          </div>
          <div className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {company && (
              <>
                <span className="text-neutral-300 dark:text-[var(--border-primary)]">·</span>
                <span className="text-primary-600 dark:text-brand-400 font-semibold">{company.name}</span>
                {company.domain && <span className="text-neutral-400 dark:text-[var(--text-muted)]">({company.domain})</span>}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-amber-900/20 border border-orange-200 dark:border-amber-700/30 rounded-full px-3 py-1">
              <span className="text-sm">🔥</span>
              <span className="num-mono text-xs font-bold text-orange-700 dark:text-amber-400">{streak}d</span>
              <span className="text-[10px] text-orange-600 dark:text-amber-500 font-medium">streak</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-[var(--bg-tertiary)] border border-neutral-200 dark:border-[var(--border-primary)] rounded-full px-3.5 py-1">
            <span className="text-[11px] text-neutral-400 dark:text-[var(--text-muted)] font-medium">
              Health <span style={{ color: healthTrend.direction === '↓' ? '#ef4444' : healthTrend.direction === '↑' ? '#22c55e' : '#94a3b8', fontWeight: 700 }}>{healthTrend.direction}</span>
            </span>
            <span className="num-mono text-lg font-extrabold leading-none" style={{ color: healthColor }}>{healthScore}%</span>
          </div>
             <button data-voice="customize" onClick={() => {
               setDraftSections({ ...sections });
               setShowCustomize(true);
             }}
               className="flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold cursor-pointer border-none transition-all bg-neutral-50 dark:bg-[var(--bg-tertiary)] text-neutral-500 dark:text-[var(--text-tertiary)] hover:text-neutral-700 dark:hover:text-[var(--text-secondary)]">
               <span className="text-xs">✎</span> Customize</button>
        </div>
      </div>

      {showCustomize && draftSections && (
        <Modal open onClose={() => { setShowCustomize(false); setDraftSections(null); }} title="Customize Dashboard"
          footer={
            <>
              <button onClick={() => { setShowCustomize(false); setDraftSections(null); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all cursor-pointer border-none">Cancel</button>
              <button onClick={() => {
                setSections(draftSections);
                localStorage.setItem('dash_sections', JSON.stringify(draftSections));
                setShowCustomize(false);
                setDraftSections(null);
              }}
                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all cursor-pointer border-none btn-premium"
                style={{padding:'0.375rem 0.75rem'}}>Save</button>
            </>
          }>
          <div className="space-y-1">
            {[
              { key: 'statsGrid', label: 'Stats Grid' },
              { key: 'insights', label: "Today's Pulse" },
              { key: 'atRisk', label: 'Projects at Risk' },
              { key: 'projects', label: 'Projects' },
              { key: 'capacity', label: 'Department Workload' },
              { key: 'plan', label: 'Plan' },
              { key: 'matrix', label: 'Portfolio Matrix' },
            ].map(item => (
              <div key={item.key} onClick={() => setDraftSections(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-[var(--radius-lg)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${draftSections[item.key] ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--border-primary)] bg-transparent'}`}>
                  {draftSections[item.key] && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Company Profile ── */}
      {company && (
        <div className="card-premium bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--border-primary)] p-5 mb-4 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-gradient-to-br from-primary-500 to-primary-700 dark:from-brand-600 dark:to-brand-800 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
                {company.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-[var(--text-primary)]">{company.name}</h2>
                {company.tagline && (
                  <p className="text-sm text-neutral-500 dark:text-[var(--text-tertiary)] mt-0.5">{company.tagline}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {company.industry && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 dark:bg-brand-900/20 text-primary-700 dark:text-brand-400 font-medium">
                      {company.industry}
                    </span>
                  )}
                  {company.country && (
                    <span className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {company.country}
                    </span>
                  )}
                  {(company.domain || company.website) && (
                    <a href={`https://${company.domain || company.website}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary-600 dark:text-brand-400 hover:text-primary-700 dark:hover:text-brand-300 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      {company.domain || company.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Grid ── */}
      {sections.statsGrid && (
      <div className="stats-grid stagger">
        <StatCard title="Active Projects" value={stats?.totalProjects || 0} icon="📁" color="brand"
          subtitle={`${stats?.inProgressProjects || 0} in progress`} />
        <StatCard title="Completed Projects" value={stats?.completedProjects || 0} icon="✅" color="blue"
          subtitle={`out of ${stats?.totalProjects || 0} total projects`} />
        <StatCard title="Blocked Projects" value={stats?.blockedProjects || 0} icon="⚠️" color="red"
          subtitle={`${stats?.atRiskProjects || 0} at risk · ${stats?.delayedProjects || 0} delayed`} />
        <div className="card-premium bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--border-primary)] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-[var(--text-tertiary)] font-medium">Department</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-neutral-900 dark:text-[var(--text-primary)] tracking-tight">{stats?.activeUsers || 0}</span>
                  <span className="text-sm text-success-600 dark:text-success-400 font-medium">online</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs flex items-center gap-1"><span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/> {stats?.activeUsers || 0}</span>
                  <span className="text-xs flex items-center gap-1"><span style={{width:6,height:6,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/> {stats?.idleUsers || 0}</span>
                  <span className="text-xs flex items-center gap-1"><span style={{width:6,height:6,borderRadius:'50%',background:'#d1d5db',display:'inline-block'}}/> {stats?.inactiveUsers || 0}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-[var(--border-secondary)]">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-semibold text-neutral-700 dark:text-[var(--text-secondary)]">{(workload?.overloaded?.length || 0) > 0 ? `${workload.overloaded.length} overloaded` : 'All balanced'}</span>
                    <span className="text-neutral-300 dark:text-[var(--text-muted)]">·</span>
                    <span className="text-neutral-700 dark:text-[var(--text-secondary)]">{workload?.workload?.filter(w => w.taskCount < 5 && w.status !== 'inactive').length || 0} available</span>
                    <span className="text-neutral-300 dark:text-[var(--text-muted)]">·</span>
                    <span className="text-neutral-700 dark:text-[var(--text-secondary)]">{workload?.avgActivityScore ? `${Math.round(workload.avgActivityScore)}% avg` : ''}</span>
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center text-xl bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400">👥</div>
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
      {sections.atRisk && (highRisk.length > 0 || mediumRisk.length > 0) && (
        <div className="card" style={{ marginBottom: 12, padding: 14, borderLeft: '3px solid #ef4444', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Projects at Risk</span>
            <span className="status-badge" style={{ fontSize: 10, background: '#fef2f2', color: '#b91c1c' }}>
              <span className="num-mono">{highRisk.length}</span> high · <span className="num-mono">{mediumRisk.length}</span> medium
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>Scroll for more →</span>
          </div>
          <div className="stagger" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, flexWrap: 'nowrap' }}>
            {[...highRisk, ...mediumRisk].sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 };
              return (order[a.risk] || 3) - (order[b.risk] || 3);
            }).map(p => (
              <Link key={p.projectId} to={`/projects/${p.projectId}`} style={{ textDecoration: 'none', minWidth: 240, display: 'block', flexShrink: 0 }}>
                <div className="card-premium" style={{ padding: '12px 14px', background: p.risk === 'high' ? 'var(--danger-bg)' : p.risk === 'medium' ? 'var(--warning-bg)' : 'var(--bg-secondary)', border: '0.5px solid', borderColor: p.risk === 'high' ? 'var(--danger-border)' : p.risk === 'medium' ? 'var(--warning-border)' : 'var(--border-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{p.risk === 'high' ? '🔴' : p.risk === 'medium' ? '🟡' : '🟢'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: p.risk === 'high' ? 'var(--danger-text)' : p.risk === 'medium' ? 'var(--warning-text)' : 'var(--text-primary)' }}>{p.name}</span>
                    <span className="badge-pill" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', textTransform: 'capitalize', marginLeft: 'auto' }}>{p.status}</span>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 3, background: 'var(--bg-tertiary)', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.completionRate || 0}%`, borderRadius: 3, background: p.risk === 'high' ? '#ef4444' : p.risk === 'medium' ? '#f59e0b' : '#22c55e', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><span className="num-mono">{p.done}</span>/<span className="num-mono">{p.total}</span> tasks</span>
                    {p.overdue > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}><span className="num-mono">{p.overdue}</span> overdue</span>}
                    {p.daysUntilDeadline !== null && <span style={{ color: p.daysUntilDeadline <= 7 ? '#ef4444' : 'var(--text-tertiary)' }}><span className="num-mono">{p.daysUntilDeadline}</span>d left</span>}
                  </div>
                  {p.daysUntilDeadline !== null && p.daysUntilDeadline <= 3 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 9, color: 'white', background: '#ef4444', padding: '2px 10px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>CRITICAL</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px' }}>
        {sections.projects && (
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="card-header">
            <span className="card-title">Projects</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="view-toggle">
                <button onClick={() => setProjViewMode('list')}
                  className={`view-toggle-btn ${projViewMode === 'list' ? 'active' : ''}`}>
                  📋 List
                </button>
                <button onClick={() => setProjViewMode('timeline')}
                  className={`view-toggle-btn ${projViewMode === 'timeline' ? 'active' : ''}`}>
                  📊 Phase View
                </button>
              </div>
              <Link data-voice="view-all-projects" to="/projects" className="card-link">View all →</Link>
            </div>
          </div>
          {projViewMode === 'timeline' ? (
            <div style={{ padding: '8px 12px' }}>
              <GanttView projects={projectList} predictions={predictions} onBack={() => setProjViewMode('list')} />
            </div>
          ) : projectList.length === 0 ? (
            <p className="text-center text-neutral-400 text-sm py-10">No projects yet</p>
          ) : projectList.map(p => {
            const pred = predictions.find(pr => String(pr.projectId) === String(p._id));
            const phaseIdx = PHASES.indexOf(p.phase || 'planning');
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
                  <div className="mini-phase-strip">
                    {PHASES.map((phase, i) => (
                      <div key={phase} className={`mini-phase-seg ${i < phaseIdx ? 'done' : i === phaseIdx ? 'active' : 'future'}`} />
                    ))}
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
              {user?.role === 'admin' && <Link data-voice="manage" to="/admin" className="card-link">Manage →</Link>}
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

      {/* ── Team Workload ── */}
      {sections.capacity && (
        <div className="card" style={{ marginTop: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>📊</span> Department Workload
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>— Next 6 Weeks</span>
                {capacityData && (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                    · auto-refreshes every 30s
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Hover any week for task details · Click to expand
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button data-voice="refresh-workload" onClick={loadCapacity} disabled={capacityLoading}
                className="btn btn-gray" style={{ opacity: capacityLoading ? 0.5 : 1 }}>
                <span style={{ display: 'inline-block', animation: capacityLoading ? 'spin 1s linear infinite' : 'none', marginRight: 4 }}>⟳</span>
                {capacityLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              {(capacityData?.sprints?.length > 0) && (
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', padding: 2, borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-secondary)' }}>
                <button data-voice="view-weeks" onClick={() => setViewMode('weeks')}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: viewMode === 'weeks' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'weeks' ? 'var(--brand-primary)' : 'var(--text-tertiary)', boxShadow: viewMode === 'weeks' ? 'var(--elevation-low)' : 'none' }}>
                  Weeks
                </button>
                <button data-voice="view-sprints" onClick={() => setViewMode('sprints')}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: viewMode === 'sprints' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'sprints' ? 'var(--brand-primary)' : 'var(--text-tertiary)', boxShadow: viewMode === 'sprints' ? 'var(--elevation-low)' : 'none' }}>
                  Sprints
                </button>
              </div>
            )}
            </div>
          </div>

          {capacityLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : capacityData ? (
            <>
              {/* Column headers */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 18px', background: '#fafbfc', borderBottom: '0.5px solid #f3f4f6', gap: 6 }}>
                <div style={{ width: 170, flexShrink: 0, fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member</div>
                {capacityData.weekStarts?.map((ws, i) => (
                  <div key={ws} style={{ flex: 1, minWidth: 74, textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {new Date(ws).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>

              {/* User rows */}
              {capacityData.users?.map((u, ui) => {
                const allTasks = (u.periods || []).flatMap(p => p.tasks || []);
                const sprintHours = (capacityData.sprints || []).map(s => {
                  const st = allTasks.filter(t => t.sprint && t.sprint.toString() === s._id.toString());
                  return { ...s, totalHours: st.reduce((sum, t) => sum + (t.hours || t.estimatedHours || 0), 0), taskCount: st.length };
                }).filter(s => s.totalHours > 0 || s.taskCount > 0);

                return (
                  <div key={u._id} style={{ borderBottom: '0.5px solid #f3f4f6', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'stretch', padding: '10px 18px', gap: 6 }}>
                      <div style={{ width: 170, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#2347e8', flexShrink: 0 }}>
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.status === 'active' ? '#22c55e' : u.status === 'in_meeting' ? '#f59e0b' : '#d1d5db', flexShrink: 0 }} />
                            <span style={{ fontSize: 9, color: '#9ca3af', textTransform: 'capitalize' }}>{u.role?.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>

                      {u.periods?.map((p, i) => {
                        const h = p?.totalHours || 0;
                        const cap = p?.capacity || 40;
                        const ratio = cap > 0 ? h / cap : 0;
                        const barRatio = Math.min(ratio, 1);
                        let color = '#22c55e';
                        if (ratio >= 0.9) color = '#ef4444';
                        else if (ratio >= 0.7) color = '#f59e0b';
                        const bgOpacity = ratio >= 0.9 ? '#fef2f280' : ratio >= 0.7 ? '#fffbeb80' : '#f0fdf480';
                        const ws = capacityData.weekStarts?.[i];

                        return (
                          <div key={ws || i} style={{ flex: 1, minWidth: 74, padding: '4px 4px' }}>
                            <div
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                                setHoveredCell({ user: u, period: p, weekIdx: i, userIdx: ui });
                              }}
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => setSelectedCell({ user: u, period: p, weekIdx: i })}
                              style={{
                                background: bgOpacity,
                                borderRadius: 8,
                                padding: '6px 4px 4px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                border: '0.5px solid',
                                borderColor: ratio >= 0.9 ? '#fecaca' : ratio >= 0.7 ? '#fde68a' : '#bbf7d0',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.15s',
                              }}
                              className="capacity-cell"
                            >
                              <div style={{ height: 3, borderRadius: 2, background: '#e5e7eb', marginBottom: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round(barRatio * 100)}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.3s ease' }} />
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1.2 }}>{h}h</div>
                              <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>{(p?.tasks?.length || 0)} task{(p?.tasks?.length || 0) !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {sprintHours.length > 0 && (
                      <div style={{ padding: '0 18px 8px 182px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {sprintHours.map(sh => (
                          <div key={sh._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0f4ff', borderRadius: 6, padding: '2px 8px', border: '0.5px solid #e0e7ff' }}>
                            <span style={{ fontSize: 9, fontWeight: 600, color: '#2347e8' }}>{sh.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#2347e8' }}>{sh.totalHours}h</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Totals row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', gap: 6, background: '#fafbfc', borderTop: '0.5px solid #f3f4f6' }}>
                <div style={{ width: 170, flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#374151' }}>Department Total</div>
                {capacityData.weekStarts?.map((ws, i) => {
                  const totalH = capacityData.users?.reduce((s, u) => s + (u.periods?.[i]?.totalHours || 0), 0) || 0;
                  return (
                    <div key={ws} style={{ flex: 1, minWidth: 74, textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: totalH > 40 * (capacityData.users?.length || 1) ? '#ef4444' : totalH > 28 * (capacityData.users?.length || 1) ? '#f59e0b' : '#111827' }}>{totalH}h</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', fontSize: 12 }}>
              {capacityError || 'No data available'}
            </div>
          )}

          {/* Hover tooltip */}
          {hoveredCell && (
            <div className="fixed z-[1000] pointer-events-none tooltip-glass text-white min-w-[200px] max-w-[300px]"
              style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)', background: 'rgba(30,41,59,0.9)' }}>
              <div className="font-semibold mb-1.5 text-neutral-200">
                {hoveredCell.user.name} · {new Date(hoveredCell.period.start).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
              {hoveredCell.period.tasks?.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {hoveredCell.period.tasks.map(t => (
                    <div key={t._id} className="flex justify-between gap-2">
                      <span className="text-neutral-300 truncate">{t.title}</span>
                      <span className="font-semibold text-amber-300 shrink-0">{t.hours || t.estimatedHours || 0}h</span>
                    </div>
                  ))}
                  <div className="border-t border-neutral-700 mt-0.5 pt-0.5 flex justify-between text-[10px]">
                    <span className="text-neutral-400">Total</span>
                    <span className="font-bold text-amber-300">{hoveredCell.period.totalHours}h</span>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-500 italic">No tasks this week</div>
              )}
            </div>
          )}

          {/* Click modal */}
          {selectedCell && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center"
              onClick={() => setSelectedCell(null)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div onClick={e => e.stopPropagation()}
                className="relative bg-white dark:bg-[var(--bg-secondary)] rounded-[var(--radius-xl)] shadow-2xl max-w-[480px] w-[90%] max-h-[80vh] overflow-auto animate-scale-in">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-[var(--border-secondary)]">
                  <div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-[var(--text-primary)]">{selectedCell.user.name}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] mt-0.5">
                      Week of {new Date(selectedCell.period.start).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} · <span className="font-semibold" style={{color: selectedCell.period.totalHours > 40 ? '#ef4444' : selectedCell.period.totalHours > 28 ? '#f59e0b' : '#22c55e'}}>{selectedCell.period.totalHours}h</span> of {selectedCell.period.capacity}h
                    </div>
                  </div>
                  <button onClick={() => setSelectedCell(null)}
                    className="w-7 h-7 rounded-[var(--radius-md)] bg-neutral-100 dark:bg-[var(--bg-tertiary)] text-neutral-500 dark:text-[var(--text-tertiary)] hover:text-neutral-700 dark:hover:text-[var(--text-secondary)] flex items-center justify-center border-none cursor-pointer text-sm transition-colors">
                    ✕
                  </button>
                </div>
                <div className="px-5 py-3">
                  {selectedCell.period.tasks?.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-semibold text-neutral-400 dark:text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Assigned Tasks</div>
                      {selectedCell.period.tasks.map((t, i) => (
                        <div key={t._id || i}
                          className="flex items-center gap-2.5 p-2 rounded-[var(--radius-md)] border border-neutral-100 dark:border-[var(--border-secondary)]"
                          style={{background: i % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)'}}>
                          <div className="w-[3px] h-6 rounded-full shrink-0"
                            style={{background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#d1d5db'}} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-neutral-900 dark:text-[var(--text-primary)] truncate">{t.title}</div>
                            <div className="text-[10px] text-neutral-400 dark:text-[var(--text-muted)] mt-0.5">{t.project}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-neutral-900 dark:text-[var(--text-primary)]">{t.hours || t.estimatedHours || 0}h</div>
                            <div className="text-[9px] text-neutral-400 dark:text-[var(--text-muted)] capitalize">{t.status ? t.status.replace(/_/g, ' ') : t.category || 'worklog'}</div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center px-2.5 pt-2.5 mt-1 border-t border-neutral-100 dark:border-[var(--border-secondary)]">
                        <span className="text-[11px] font-semibold text-neutral-500 dark:text-[var(--text-tertiary)]">{selectedCell.period.tasks.length} tasks</span>
                        <span className="text-sm font-bold text-neutral-900 dark:text-[var(--text-primary)]">{selectedCell.period.totalHours}h total</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-neutral-400 dark:text-[var(--text-muted)]">
                      No tasks assigned this week
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <style>{`
            .capacity-cell:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .recharts-scatter-symbol circle {
              animation: matrix-dot 2s ease-in-out infinite;
              transform-origin: center;
            }
            @keyframes matrix-dot {
              0%, 100% { opacity: 0.75; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}

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

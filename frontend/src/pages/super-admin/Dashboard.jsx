import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle, Users, Activity, ArrowRight, Bell, DollarSign, TrendingUp, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import DashboardCard from '../../components/super-admin/DashboardCard';
import HighRiskCard from '../../components/super-admin/HighRiskCard';
import PlanBadge from '../../components/super-admin/PlanBadge';
import { api } from '../../services/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtCurrency(val) {
  if (!val && val !== 0) return '$0';
  return '$' + Number(val).toLocaleString();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [health, setHealth] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateTime, setDateTime] = useState({ date: '', time: '' });

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const opts = { weekday:'long', month:'long', day:'numeric', year:'numeric' };
      return { date: now.toLocaleDateString('en-US', opts), time: now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) };
    };
    setDateTime(fmt());
    const id = setInterval(() => setDateTime(fmt()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getCompanies(),
      api.getUsers(),
      api.getNotifications(),
      api.getRevenue('6m'),
      api.getHealth(),
      api.getGrowth('6m'),
    ]).then(([c, u, n, r, h, g]) => {
      setCompanies(c);
      setAdmins(u);
      setNotifications(n);
      setRevenue(r);
      setHealth(h);
      setGrowth(g);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active = companies.filter(c => c.isActive !== false);
  const atRisk = companies.filter(c => c.status === 'at_risk' || c.status === 'delayed' || (c.overdue || 0) > 0);
  const adminsOnly = admins.filter(u => u.role === 'admin');
  const onlineAdmins = adminsOnly.filter(a => a.status === 'active');
  const totalProjects = companies.reduce((sum, c) => sum + (c.projectCount || 0), 0);
  const totalMRR = revenue?.totals?.totalMRR || 0;
  const totalRevenue = revenue?.totals?.totalRevenue6m || 0;
  const revenueMonthly = revenue?.monthly || [];
  const maxMonthlyRevenue = Math.max(...revenueMonthly.map(m => m.total), 1);

  const highRiskCompanies = companies.filter(c => c.status === 'at_risk' || c.status === 'delayed' || (c.overdue || 0) > 0);

  const healthServices = health?.services || {};
  const healthCounts = { pass: 0, warn: 0, fail: 0 };
  Object.values(healthServices).forEach(s => { if (healthCounts[s.status] !== undefined) healthCounts[s.status]++; });
  const healthOverall = healthCounts.fail > 0 ? 'fail' : healthCounts.warn > 0 ? 'warn' : 'pass';

  const growthMonthly = growth?.monthly || [];
  const maxGrowth = Math.max(...growthMonthly.flatMap(m => [m.newCompanies, m.newUsers]), 1);

  const recentCompanies = [...companies].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const byPlan = revenue?.totals?.byPlan || {};
  const planColors = { starter: '#9ca3af', team: '#3b82f6', enterprise: '#f59e0b' };
  const planEntries = Object.entries(byPlan).sort(([,a], [,b]) => b - a);
  const totalPlanCounts = planEntries.reduce((s, [,c]) => s + c, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Super Dashboard</h1>
          <p className="text-xs text-surface-400 mt-0.5">{dateTime.date} · {dateTime.time}</p>
        </div>
        <button onClick={() => navigate('/super/health')}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${healthOverall === 'pass' ? 'bg-green-50 border-green-200 text-green-700' : healthOverall === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {healthOverall === 'pass' ? <CheckCircle size={14} /> : healthOverall === 'warn' ? <AlertCircle size={14} /> : <XCircle size={14} />}
          <span>{healthCounts.pass}/{Object.keys(healthServices).length} services</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <DashboardCard icon={Building2} label="Active Companies" value={String(active.length)} subtext={`${companies.length} total registered`} color="blue" />
        <DashboardCard icon={Users} label="Active Admins" value={String(onlineAdmins.length)} subtext={`${adminsOnly.length - onlineAdmins.length} offline`} color="purple" />
        <DashboardCard icon={Activity} label="Total Projects" value={String(totalProjects)} subtext="across all companies" color="green" />
        <DashboardCard icon={DollarSign} label="Total MRR" value={fmtCurrency(totalMRR)} subtext={`${fmtCurrency(totalRevenue)} last 6mo`} color="amber" />
      </div>



      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-surface-400" />
              <h2 className="text-sm font-semibold text-surface-900">Growth (6 months)</h2>
            </div>
            <button onClick={() => navigate('/super/analytics')}
              className="text-[10px] font-medium text-primary-600 hover:text-primary-700 bg-transparent border-none cursor-pointer">
              Full analytics <ArrowRight size={10} className="inline" />
            </button>
          </div>
          {growthMonthly.length === 0 ? (
            <div className="py-8 text-center text-xs text-surface-400">No data yet</div>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {growthMonthly.map(m => {
                const ch = maxGrowth > 0 ? (m.newCompanies / maxGrowth) * 80 : 0;
                const uh = maxGrowth > 0 ? (m.newUsers / maxGrowth) * 80 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full group min-w-0">
                    <div className="flex flex-col items-center mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-semibold text-surface-600 bg-surface-50 px-1 rounded">{m.newCompanies}c / {m.newUsers}u</span>
                    </div>
                    <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '80px' }}>
                      <div className="w-[35%] rounded-t transition-all duration-500" style={{ height: `${Math.max(ch, m.newCompanies > 0 ? 3 : 0)}px`, backgroundColor: '#3b82f6', opacity: 0.8 }} title={`${m.newCompanies} new companies`} />
                      <div className="w-[35%] rounded-t transition-all duration-500" style={{ height: `${Math.max(uh, m.newUsers > 0 ? 3 : 0)}px`, backgroundColor: '#8b5cf6', opacity: 0.8 }} title={`${m.newUsers} new users`} />
                    </div>
                    <span className="text-[9px] text-surface-400 mt-1">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-2 text-[9px] text-surface-400 border-t border-surface-100 pt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Companies</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500" /> Users</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-900">Plan Distribution</h2>
          </div>
          {planEntries.length === 0 ? (
            <div className="py-8 text-center text-xs text-surface-400">No data</div>
          ) : (
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 120 120" className="w-28 h-28 mb-3 -rotate-90">
                {(() => {
                  const total = totalPlanCounts || 1;
                  let cumPct = 0;
                  return planEntries.map(([plan, count]) => {
                    const pct = count / total;
                    const r = 45;
                    const circ = 2 * Math.PI * r;
                    const len = pct * circ;
                    const offset = -cumPct * circ;
                    cumPct += pct;
                    return (
                      <circle key={plan} cx="60" cy="60" r={r} fill="none" stroke={planColors[plan] || '#9ca3af'} strokeWidth="18" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={offset} strokeLinecap="round" opacity="0.85" />
                    );
                  });
                })()}
                <text x="60" y="58" textAnchor="middle" fill="#1e293b" fontSize="16" fontFamily="system-ui" fontWeight="700" transform="rotate(90, 60, 60)">{totalPlanCounts}</text>
                <text x="60" y="72" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="system-ui" transform="rotate(90, 60, 60)">companies</text>
              </svg>
              <div className="w-full space-y-1.5">
                {planEntries.map(([plan, count]) => {
                  const pct = totalPlanCounts > 0 ? (count / totalPlanCounts) * 100 : 0;
                  return (
                    <div key={plan} className="flex items-center gap-2 text-[10px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: planColors[plan] || '#9ca3af' }} />
                      <span className="text-surface-600 capitalize flex-1">{plan}</span>
                      <span className="font-semibold text-surface-800">{count}</span>
                      <span className="text-surface-400">({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-surface-400" />
              <h2 className="text-sm font-semibold text-surface-900">Recent Registrations</h2>
            </div>
            <button onClick={() => navigate('/super/companies')}
              className="text-[10px] font-medium text-primary-600 hover:text-primary-700 bg-transparent border-none cursor-pointer">
              View all <ArrowRight size={10} className="inline" />
            </button>
          </div>
          {recentCompanies.length === 0 ? (
            <div className="py-6 text-center text-xs text-surface-400">No recent registrations</div>
          ) : (
            <div className="space-y-1">
              {recentCompanies.map(c => (
                <div key={c._id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0 cursor-pointer hover:bg-surface-50/50 rounded-sm -mx-2 px-2 transition-colors" onClick={() => navigate(`/super/companies/${c._id}`)}>
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-surface-400">{timeAgo(c.createdAt)} · <PlanBadge plan={c.plan} /></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-900">Recent Activity</h2>
          </div>
          {loading ? (
            <div className="py-6 text-center text-xs text-surface-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center">
              <Bell size={20} className="mx-auto mb-1.5 text-surface-300" />
              <p className="text-xs text-surface-400">No recent activity</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.slice(0, 6).map((n) => (
                <div key={n._id} className="flex items-start gap-2.5 py-2 border-b border-surface-50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-primary-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-surface-900 leading-snug">{n.title}</p>
                    <p className="text-[10px] text-surface-400 mt-0.5 line-clamp-1">{n.message}</p>
                  </div>
                  <p className="text-[9px] text-surface-400 shrink-0 whitespace-nowrap">{n.createdAt ? timeAgo(n.createdAt) : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {highRiskCompanies.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-surface-900">High Risk Companies</h2>
            <span className="text-xs bg-red-100 text-red-700 rounded-md px-2 py-0.5 font-medium">{highRiskCompanies.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {highRiskCompanies.map((company) => (
              <div key={company._id} className="min-w-[220px] shrink-0">
                <HighRiskCard company={company} />
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="border-t border-surface-200 pt-4 pb-2 text-center text-xs text-surface-400">
        GRESIO | &copy; 2026 All rights reserved. | Consult@360DMMC.com | Powered by 360 DMMC
      </footer>
    </div>
  );
}

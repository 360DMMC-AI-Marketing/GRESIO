import { useState, useEffect } from 'react';
import { BarChart3, Building2, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { api } from '../../services/api';
import Skeleton from '../../components/Skeleton';

const planColors = {
  starter: '#9ca3af',
  team: '#3b82f6',
  enterprise: '#f59e0b',
};

const planLabels = {
  starter: 'Starter ($0)',
  team: 'Team ($29)',
  enterprise: 'Enterprise ($99)',
};

export default function Analytics() {
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6m');

  useEffect(() => {
    Promise.all([
      api.getCompanies(),
      api.getUsers(),
      api.getRevenue(period),
    ]).then(([c, u, r]) => {
      setCompanies(c);
      setAdmins(u);
      setRevenue(r);
    }).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  const totalCompanies = companies.length;
  const totalAdmins = admins.filter(u => u.role === 'admin').length;
  const totalMRR = revenue?.totals?.totalMRR || 0;
  const totalRevenuePeriod = revenue?.totals?.totalRevenue6m || 0;
  const byPlan = revenue?.totals?.byPlan || {};
  const monthly = revenue?.monthly || [];
  const maxMonthlyRevenue = Math.max(...monthly.map(m => m.total), 1);

  const periodLabel = period === '1m' ? '1mo' : period === '6m' ? '6mo' : '1y';

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton.StatCard key={i} />)}
        </div>
        <Skeleton.Chart />
        <Skeleton.Table rows={4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-surface-700" />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Revenue Analytics</h1>
            <p className="text-xs text-surface-400 mt-0.5">Platform-wide revenue and metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-surface-200 rounded-lg p-0.5">
          {['1m', '6m', '1y'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer border-none ${period === p ? 'bg-[#2347e8] text-white' : 'text-surface-500 hover:text-surface-700 bg-transparent'}`}>
              {p === '1m' ? '1 Month' : p === '6m' ? '6 Months' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Companies</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">{totalCompanies}</p>
            <p className="text-xs text-surface-400 mt-0.5">registered on platform</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Admins</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">{totalAdmins}</p>
            <p className="text-xs text-surface-400 mt-0.5">across all companies</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Monthly MRR</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">${totalMRR.toLocaleString()}</p>
            <p className="text-xs text-surface-400 mt-0.5">recurring revenue</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Revenue ({periodLabel})</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">${totalRevenuePeriod.toLocaleString()}</p>
            <p className="text-xs text-surface-400 mt-0.5">period total</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'team', label: 'Team', color: '#3b82f6', price: 29 },
              { key: 'enterprise', label: 'Enterprise', color: '#f59e0b', price: 99 },
              { key: 'starter', label: 'Starter', color: '#9ca3af', price: 0 },
            ].map(p => {
              const planTotal = monthly.reduce((s, m) => s + (m[p.key] || 0), 0);
              const planCount = byPlan[p.key] || 0;
              return (
                <div key={p.key} className="bg-white rounded-xl border border-surface-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-medium text-surface-600">{p.label}</span>
                    <span className="text-[10px] text-surface-400 ml-auto">${p.price}/mo</span>
                  </div>
                  <div className="text-2xl font-bold text-surface-900">${planTotal.toLocaleString()}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">{planCount} company{planCount !== 1 ? 'ies' : 'y'}</div>
                  <div className="mt-3 space-y-1">
                    {monthly.slice(-3).map(m => {
                      const val = m[p.key] || 0;
                      const pct = maxMonthlyRevenue > 0 ? (val / maxMonthlyRevenue) * 100 : 0;
                      return (
                        <div key={m.month} className="flex items-center gap-2">
                          <span className="text-[9px] text-surface-400 w-6 shrink-0">{m.month.slice(5)}</span>
                          <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color, opacity: 0.6 }} />
                          </div>
                          <span className="text-[9px] font-medium text-surface-500 w-8 text-right">${val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-surface-400" />
                <h2 className="text-sm font-semibold text-surface-900">Revenue Breakdown</h2>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-surface-400">
                <Calendar size={11} />
                {period === '1m' ? 'This month' : period === '6m' ? 'Last 6 months' : 'Last 12 months'}
              </div>
            </div>
            {monthly.length === 0 ? (
              <div className="py-8 text-center text-surface-400">
                <p className="text-sm">No revenue data yet</p>
                <p className="text-xs mt-1">Revenue appears when companies subscribe to paid plans</p>
              </div>
            ) : (
              <div className="space-y-0">
                <div className="flex items-center gap-3 pb-2 mb-2 border-b border-surface-100 text-[10px] text-surface-400 font-medium">
                  <div className="w-12">Month</div>
                  <div className="flex-1">Revenue</div>
                  <div className="w-16 text-right">Team</div>
                  <div className="w-20 text-right">Enterprise</div>
                  <div className="w-16 text-right">Total</div>
                </div>
                {monthly.map((m, i) => {
                  const maxVal = maxMonthlyRevenue;
                  return (
                    <div key={m.month} className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0 group hover:bg-surface-50/50 rounded-sm -mx-2 px-2 transition-colors">
                      <div className="w-12 text-xs font-medium text-surface-600">{m.month.slice(5)}</div>
                      <div className="flex-1 flex items-center gap-0.5 h-5">
                        {m.enterprise > 0 && (
                          <div className="h-full rounded-sm transition-all" style={{ width: `${(m.enterprise / maxVal) * 100}%`, backgroundColor: '#f59e0b', opacity: 0.7 }} title={`Enterprise: $${m.enterprise}`} />
                        )}
                        {m.team > 0 && (
                          <div className="h-full rounded-sm transition-all" style={{ width: `${(m.team / maxVal) * 100}%`, backgroundColor: '#3b82f6', opacity: 0.7 }} title={`Team: $${m.team}`} />
                        )}
                        {m.starter > 0 && (
                          <div className="h-full rounded-sm transition-all" style={{ width: `${(m.starter / maxVal) * 100}%`, backgroundColor: '#9ca3af', opacity: 0.5 }} title={`Starter: $${m.starter}`} />
                        )}
                      </div>
                      <div className="w-16 text-right text-xs text-surface-600 font-medium">${m.team}</div>
                      <div className="w-20 text-right text-xs text-surface-600 font-medium">${m.enterprise}</div>
                      <div className="w-16 text-right text-xs font-semibold text-surface-900">${m.total}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-surface-900 mb-4">Companies by Plan</h2>
            {Object.keys(byPlan).length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-4">No data</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byPlan)
                  .sort(([,a], [,b]) => b - a)
                  .map(([plan, count]) => {
                    const pct = totalCompanies > 0 ? (count / totalCompanies) * 100 : 0;
                    const maxCount = Math.max(...Object.values(byPlan), 1);
                    const barWidth = (count / maxCount) * 100;
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: planColors[plan] || '#9ca3af' }} />
                            <span className="text-xs font-medium text-surface-700 capitalize">{planLabels[plan] || plan}</span>
                          </div>
                          <span className="text-xs font-semibold text-surface-900">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, backgroundColor: planColors[plan] || '#9ca3af' }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-surface-900 mb-3">Plan Pricing</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-500">Starter</span>
                <span className="font-medium text-surface-700">$0/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-500">Team</span>
                <span className="font-medium text-surface-700">$29/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-500">Enterprise</span>
                <span className="font-medium text-surface-700">$99/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

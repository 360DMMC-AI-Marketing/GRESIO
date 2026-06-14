import { useState } from 'react';
import { BarChart3, DollarSign, Building2, Users, TrendingUp } from 'lucide-react';
import { companies } from '../data';

const ranges = ['7D', '30D', '90D', '1Y'];

const planColors = {
  trial: '#60a5fa',
  starter: '#a78bfa',
  pro: '#f59e0b',
  enterprise: '#22c55e',
};

const planLabels = {
  trial: 'Trial',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const monthlyData = [
  { month: 'Jan', companies: 3, revenue: 4200 },
  { month: 'Feb', companies: 4, revenue: 6800 },
  { month: 'Mar', companies: 5, revenue: 8400 },
  { month: 'Apr', companies: 6, revenue: 11200 },
  { month: 'May', companies: 7, revenue: 15800 },
  { month: 'Jun', companies: 8, revenue: 21000 },
];

export default function Analytics() {
  const [range, setRange] = useState('30D');

  const revenueByPlan = {};
  companies.forEach((c) => {
    const mrr = parseInt(c.mrr.replace(/[$,]/g, '')) || 0;
    revenueByPlan[c.plan] = (revenueByPlan[c.plan] || 0) + mrr;
  });

  const totalMRR = Object.values(revenueByPlan).reduce((s, v) => s + v, 0);
  const totalCompanies = companies.length;
  const totalAdmins = 6;

  const maxPlanRevenue = Math.max(...Object.values(revenueByPlan), 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-surface-700" />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Analytics</h1>
            <p className="text-xs text-surface-400 mt-0.5">Platform-wide metrics and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-surface-200 rounded-lg p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-[#2347e8] text-white'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total MRR</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">
              ${totalMRR.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Active Companies</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">{totalCompanies}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Admins</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">{totalAdmins}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-surface-900 mb-4">Revenue by Plan</h2>
          <div className="flex flex-col gap-3">
            {Object.entries(revenueByPlan).map(([plan, amount]) => {
              const pct = totalMRR > 0 ? (amount / totalMRR) * 100 : 0;
              const barWidth = totalMRR > 0 ? (amount / maxPlanRevenue) * 100 : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: planColors[plan] || '#9ca3af' }}
                      />
                      <span className="text-xs font-medium text-surface-700 capitalize">
                        {planLabels[plan] || plan}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-surface-900">
                      ${amount.toLocaleString()} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: planColors[plan] || '#9ca3af',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-surface-900 mb-4">Company Growth</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                {['Month', 'Companies', 'Revenue', 'Growth'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, i) => {
                const prevRevenue = i > 0 ? monthlyData[i - 1].revenue : row.revenue;
                const growth = prevRevenue > 0 ? ((row.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                return (
                  <tr
                    key={row.month}
                    className="border-b border-surface-100"
                  >
                    <td className="px-3 py-2.5 font-medium text-surface-900">{row.month}</td>
                    <td className="px-3 py-2.5 text-surface-600">{row.companies}</td>
                    <td className="px-3 py-2.5 text-surface-900 font-medium">
                      ${row.revenue.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <TrendingUp size={12} />
                        {growth >= 0 ? '+' : ''}
                        {growth.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

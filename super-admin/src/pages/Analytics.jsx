import { useState, useEffect } from 'react';
import { BarChart3, Building2, Users, Activity, CheckCircle } from 'lucide-react';
import { api } from '../api';

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

export default function Analytics() {
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getCompanies(),
      api.getUsers(),
    ]).then(([c, u]) => {
      setCompanies(c);
      setAdmins(u);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const byPlan = {};
  companies.forEach((c) => {
    const plan = c.plan || 'starter';
    byPlan[plan] = (byPlan[plan] || 0) + 1;
  });

  const totalCompanies = companies.length;
  const totalAdmins = admins.length;
  const maxPlanCount = Math.max(...Object.values(byPlan), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-surface-400 text-sm">
          <Activity size={16} className="animate-spin" />
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <BarChart3 size={20} className="text-surface-700" />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Analytics</h1>
          <p className="text-xs text-surface-400 mt-0.5">Platform-wide metrics and insights</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Active Companies</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">{totalCompanies}</p>
            <p className="text-xs text-surface-400 mt-0.5">on platform</p>
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
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Plan Diversity</p>
            <p className="text-3xl font-bold text-surface-900 mt-0.5">{Object.keys(byPlan).length}</p>
            <p className="text-xs text-surface-400 mt-0.5">different plans</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-surface-900 mb-4">Companies by Plan</h2>
        {Object.keys(byPlan).length === 0 ? (
          <div className="py-8 text-center text-xs text-surface-400">No data available</div>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(byPlan)
              .sort(([,a], [,b]) => b - a)
              .map(([plan, count]) => {
                const pct = totalCompanies > 0 ? (count / totalCompanies) * 100 : 0;
                const barWidth = totalCompanies > 0 ? (count / maxPlanCount) * 100 : 0;
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
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
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
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-surface-900 mb-4">Company List</h2>
        {companies.length === 0 ? (
          <div className="py-8 text-center text-xs text-surface-400">No companies registered</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                {['Name', 'Plan', 'Created', 'Status'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c._id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-surface-900">{c.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold capitalize" style={{ backgroundColor: (planColors[c.plan] || '#9ca3af') + '20', color: planColors[c.plan] || '#9ca3af' }}>{c.plan}</span>
                  </td>
                  <td className="px-3 py-2.5 text-surface-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.isActive !== false ? 'text-green-600' : 'text-surface-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.isActive !== false ? 'bg-green-500' : 'bg-surface-300'}`} />
                      {c.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

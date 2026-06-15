import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Activity, Building2, Calendar, CheckCircle, Loader } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import PlanBadge from '../components/PlanBadge';
import { api } from '../api';

const tabs = [
  { key:'overview', label:'Overview' },
  { key:'users', label:'Users' },
];

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    api.getCompany(id).then(setCompany).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-2 text-surface-400 text-sm">
        <Loader size={16} className="animate-spin" />
        Loading company...
      </div>
    </div>
  );

  if (!company) return (
    <div className="text-center py-16">
      <Building2 size={40} className="mx-auto mb-3 text-surface-300" />
      <p className="text-sm font-medium text-surface-500">Company not found</p>
      <button onClick={() => navigate('/companies')} className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer">Back to Companies</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate('/companies')}
        className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 bg-transparent border-none cursor-pointer w-fit">
        <ArrowLeft size={14} /> Back to Companies
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{company.name}</h1>
          <p className="text-xs text-surface-400 mt-0.5">{company.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={company.status || 'active'} />
          <PlanBadge plan={company.plan} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-surface-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors bg-transparent border-none cursor-pointer ${activeTab === t.key ? 'border-[#2347e8] text-[#2347e8]' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-primary-500" />
              <p className="text-xs text-surface-500 font-medium">Total Users</p>
            </div>
            <p className="text-2xl font-bold text-surface-900">{company.users?.length || company.userCount || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-xs text-surface-500 font-medium">Plan</p>
            </div>
            <p className="text-xl font-bold text-surface-900 mt-1 capitalize">{company.plan || '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-surface-400" />
              <p className="text-xs text-surface-500 font-medium">Created</p>
            </div>
            <p className="text-xl font-bold text-surface-900">{new Date(company.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-purple-500" />
              <p className="text-xs text-surface-500 font-medium">Status</p>
            </div>
            <p className="text-xl font-bold text-surface-900 capitalize">{company.isActive !== false ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-surface-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {(company.users || []).map(u => (
                <tr key={u._id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3 text-surface-900 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-surface-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-600 capitalize">{u.role}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status || 'active'} /></td>
                </tr>
              ))}
              {(!company.users || company.users.length === 0) && (
                <tr><td colSpan={4} className="text-center py-10 text-surface-400 text-sm">No users found for this company</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

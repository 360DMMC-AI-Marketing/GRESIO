import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FolderOpen, CreditCard, Activity, Paperclip } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import PlanBadge from '../components/PlanBadge';
import { api } from '../api';

const tabs = [
  { key:'overview', label:'Overview', icon:'📊' },
  { key:'users', label:'Users', icon:'👥' },
  { key:'projects', label:'Projects', icon:'📁' },
  { key:'activity', label:'Activity', icon:'📋' },
  { key:'billing', label:'Billing', icon:'💳' },
];

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.getCompany(id).then(setCompany).catch(console.error);
  }, [id]);

  if (!company) return <div className="text-center py-12 text-surface-400 text-sm">Loading...</div>;

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
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-4">
            <p className="text-xs text-surface-500">Total Users</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{company.users?.length || company.userCount || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-4">
            <p className="text-xs text-surface-500">Plan</p>
            <p className="text-xl font-bold text-surface-900 mt-1 capitalize">{company.plan}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-4">
            <p className="text-xs text-surface-500">Created</p>
            <p className="text-sm font-bold text-surface-900 mt-1">{new Date(company.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-4">
            <p className="text-xs text-surface-500">Status</p>
            <p className="text-sm font-bold text-surface-900 mt-1 capitalize">{company.isActive !== false ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#f9fafb]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {(company.users || []).map(u => (
                <tr key={u._id} className="border-t border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-2.5 text-surface-900 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 text-surface-500">{u.email}</td>
                  <td className="px-4 py-2.5 text-surface-700 capitalize">{u.role}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={u.status || 'active'} /></td>
                </tr>
              ))}
              {(!company.users || company.users.length === 0) && (
                <tr><td colSpan={4} className="text-center py-6 text-surface-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 text-center text-surface-400 text-xs">
          No projects data available yet.
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 text-center text-surface-400 text-xs">
          Activity feed coming soon.
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 text-center text-surface-400 text-xs">
          Billing information coming soon.
        </div>
      )}
    </div>
  );
}

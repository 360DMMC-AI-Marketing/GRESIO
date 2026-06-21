import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Activity, Building2, Calendar, CheckCircle, Loader, FolderKanban, DollarSign, CreditCard, Clock } from 'lucide-react';
import StatusBadge from '../../components/super-admin/StatusBadge';
import PlanBadge from '../../components/super-admin/PlanBadge';
import { api } from '../../services/api';

const tabs = [
  { key:'overview', label:'Overview' },
  { key:'projects', label:'Projects' },
  { key:'users', label:'Users' },
];

const PLAN_PRICES = { starter: 0, team: 29, enterprise: 99 };

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    api.getCompany(id).then(setCompany).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'projects') {
      setLoadingProjects(true);
      api.getCompanyProjects(id).then(p => setProjects(Array.isArray(p) ? p : p.data || [])).catch(console.error).finally(() => setLoadingProjects(false));
    }
  }, [id, activeTab]);

  const planPrice = PLAN_PRICES[company?.plan] || 0;
  const billingStatusColor = {
    active: 'text-green-600 bg-green-100',
    past_due: 'text-red-600 bg-red-100',
    cancelled: 'text-surface-500 bg-surface-100',
    trial: 'text-blue-600 bg-blue-100',
  };

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
      <button onClick={() => navigate('/super/companies')} className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer">Back to Companies</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <button data-voice="back-companies" onClick={() => navigate('/super/companies')}
        className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 bg-transparent border-none cursor-pointer w-fit">
        <ArrowLeft size={14} /> Back to Companies
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{company.name}</h1>
          <p className="text-xs text-surface-400 mt-0.5">{company.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={company.isActive !== false ? 'active' : 'inactive'} />
          <PlanBadge plan={company.plan} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-surface-200">
        {tabs.map(t => (
          <button key={t.key} data-voice={`tab-${t.key}`} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors bg-transparent border-none cursor-pointer ${activeTab === t.key ? 'border-[#2347e8] text-[#2347e8]' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
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
                <FolderKanban size={16} className="text-purple-500" />
                <p className="text-xs text-surface-500 font-medium">Total Projects</p>
              </div>
              <p className="text-2xl font-bold text-surface-900">{company.projectCount || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-green-500" />
                <p className="text-xs text-surface-500 font-medium">Monthly Revenue</p>
              </div>
              <p className="text-2xl font-bold text-surface-900">${planPrice}</p>
              <p className="text-xs text-surface-400 mt-0.5 capitalize">{company.plan} plan</p>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-amber-500" />
                <p className="text-xs text-surface-500 font-medium">Billing Status</p>
              </div>
              <p className={`text-sm font-bold px-2 py-1 rounded-md inline-block mt-1 capitalize ${billingStatusColor[company.billingStatus] || 'text-surface-500 bg-surface-100'}`}>
                {company.billingStatus || 'trial'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-surface-900 mb-4">Company Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-surface-400 font-medium">Name</p>
                <p className="text-surface-900 mt-0.5">{company.name}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Domain</p>
                <p className="text-surface-900 mt-0.5">{company.domain}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Plan</p>
                <p className="text-surface-900 mt-0.5 capitalize">{company.plan || 'starter'}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Created</p>
                <p className="text-surface-900 mt-0.5">{new Date(company.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Billing Email</p>
                <p className="text-surface-900 mt-0.5">{company.billingEmail || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Trial Ends</p>
                <p className="text-surface-900 mt-0.5">{company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">MRR</p>
                <p className="text-surface-900 mt-0.5">${planPrice}/mo</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Payment Failed At</p>
                <p className="text-surface-900 mt-0.5">{company.paymentFailedAt ? new Date(company.paymentFailedAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          {loadingProjects ? (
            <div className="flex items-center justify-center py-16">
              <Loader size={16} className="animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderKanban size={36} className="mx-auto mb-3 text-surface-300" />
              <p className="text-sm text-surface-500">No projects for this company</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-surface-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Phase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p._id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 text-surface-900 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                        p.status === 'on_track' ? 'bg-green-100 text-green-700' :
                        p.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                        p.status === 'delayed' ? 'bg-amber-100 text-amber-700' :
                        p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-surface-100 text-surface-600'
                      }`}>{p.status?.replace('_', ' ') || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-surface-500 capitalize">{p.phase || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-surface-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            p.progress >= 70 ? 'bg-green-500' : p.progress >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-medium text-surface-600">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

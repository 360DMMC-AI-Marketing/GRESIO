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
    cancelled: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]',
    trial: 'text-blue-600 bg-blue-100',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 animate-fade-in">
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
        <Loader size={16} className="animate-spin" />
        Loading company...
      </div>
    </div>
  );

  if (!company) return (
    <div className="text-center py-16 animate-fade-in">
      <Building2 size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
      <p className="text-sm font-medium text-[var(--text-tertiary)]">Company not found</p>
      <button onClick={() => navigate('/super/companies')} className="mt-3 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium bg-transparent border-none cursor-pointer">Back to Companies</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 page-enter">
      <button data-voice="back-companies" onClick={() => navigate('/super/companies')}
        className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer w-fit">
        <ArrowLeft size={14} /> Back to Companies
      </button>

      <div className="flex items-start justify-between glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{company.name}</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{company.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={company.isActive !== false ? 'active' : 'inactive'} />
          <PlanBadge plan={company.plan} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-primary)] dark:border-b dark:border-[var(--border-primary)]">
        {tabs.map(t => (
          <button key={t.key} data-voice={`tab-${t.key}`} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors bg-transparent border-none cursor-pointer ${activeTab === t.key ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-4 gap-4 animate-fade-in">
            <div className="card-premium glow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-[var(--brand-primary)]" />
                <p className="text-xs text-[var(--text-tertiary)] font-medium">Total Users</p>
              </div>
              <p className="num-mono text-2xl font-bold text-[var(--text-primary)]">{company.users?.length || company.userCount || 0}</p>
            </div>
            <div className="card-premium glow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <FolderKanban size={16} className="text-purple-500" />
                <p className="text-xs text-[var(--text-tertiary)] font-medium">Total Projects</p>
              </div>
              <p className="num-mono text-2xl font-bold text-[var(--text-primary)]">{company.projectCount || 0}</p>
            </div>
            <div className="card-premium glow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-green-500" />
                <p className="text-xs text-[var(--text-tertiary)] font-medium">Monthly Revenue</p>
              </div>
              <p className="num-mono text-2xl font-bold text-[var(--text-primary)]">${planPrice}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{company.plan} plan</p>
            </div>
            <div className="card-premium glow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-amber-500" />
                <p className="text-xs text-[var(--text-tertiary)] font-medium">Billing Status</p>
              </div>
              <p className={`text-sm font-bold px-2 py-1 rounded-[var(--radius-sm)] inline-block mt-1 capitalize ${billingStatusColor[company.billingStatus] || 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]'}`}>
                {company.billingStatus || 'trial'}
              </p>
            </div>
          </div>

          <div className="card-premium glow-card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Company Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Name</p>
                <p className="text-[var(--text-primary)] mt-0.5">{company.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Domain</p>
                <p className="text-[var(--text-primary)] mt-0.5">{company.domain}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Plan</p>
                <p className="text-[var(--text-primary)] mt-0.5 capitalize">{company.plan || 'starter'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Created</p>
                <p className="text-[var(--text-primary)] mt-0.5">{new Date(company.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Billing Email</p>
                <p className="text-[var(--text-primary)] mt-0.5">{company.billingEmail || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Trial Ends</p>
                <p className="text-[var(--text-primary)] mt-0.5">{company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">MRR</p>
                <p className="text-[var(--text-primary)] mt-0.5">${planPrice}/mo</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Payment Failed At</p>
                <p className="text-[var(--text-primary)] mt-0.5">{company.paymentFailedAt ? new Date(company.paymentFailedAt).toLocaleDateString() : '\u2014'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div className="card-premium glow-card overflow-hidden">
          {loadingProjects ? (
            <div className="flex items-center justify-center py-16">
              <Loader size={16} className="animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderKanban size={36} className="mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-tertiary)]">No projects for this company</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] dark:border-b dark:border-[var(--border-primary)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Phase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Progress</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p._id} className="border-b border-[var(--border-secondary)] dark:border-b dark:border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium capitalize ${
                        p.status === 'on_track' ? 'bg-green-100 text-green-700' :
                        p.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                        p.status === 'delayed' ? 'bg-amber-100 text-amber-700' :
                        p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}>{p.status?.replace('_', ' ') || '\u2014'}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] capitalize">{p.phase || '\u2014'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            p.progress >= 70 ? 'bg-green-500' : p.progress >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="num-mono text-xs font-medium text-[var(--text-secondary)]">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card-premium glow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] dark:border-b dark:border-[var(--border-primary)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {(company.users || []).map(u => (
                <tr key={u._id} className="border-b border-[var(--border-secondary)] dark:border-b dark:border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] capitalize">{u.role}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status || 'active'} /></td>
                </tr>
              ))}
              {(!company.users || company.users.length === 0) && (
                <tr><td colSpan={4} className="text-center py-10 text-[var(--text-muted)] text-sm">No users found for this company</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

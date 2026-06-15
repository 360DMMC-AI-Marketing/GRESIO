import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Loader } from 'lucide-react';
import DataTable from '../../components/super-admin/DataTable';
import StatusBadge from '../../components/super-admin/StatusBadge';
import PlanBadge from '../../components/super-admin/PlanBadge';
import Modal from '../../components/super-admin/Modal';
import { api } from '../../services/api';

export default function Companies() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [planFilter, setPlanFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', domain:'', plan:'starter', adminName:'', adminEmail:'', adminPassword:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const data = await api.getCompanies(); setCompanies(data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  const plans = [...new Set(companies.map(c => c.plan))];

  const filtered = companies.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter !== 'all' && c.plan !== planFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      await api.createCompany(form);
      setShowForm(false);
      setForm({ name:'', domain:'', plan:'starter', adminName:'', adminEmail:'', adminPassword:'' });
      await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="font-medium text-surface-900">{val}</span>
        </div>
      ),
    },
    { key: 'plan', label: 'Plan', render: (val) => <PlanBadge plan={val} /> },
    { key: 'userCount', label: 'Users' },
    { key: 'projectCount', label: 'Projects' },
    { key: 'mrr', label: 'MRR', render: (val) => <span className="text-xs font-medium text-surface-600">{val !== undefined && val !== null ? `$${Number(val).toLocaleString()}` : '$0'}</span> },
    { key: 'status', label: 'Status', render: (val, row) => <StatusBadge status={row.isActive !== false ? 'active' : 'inactive'} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Companies</h1>
          <p className="text-xs text-surface-400 mt-0.5">{filtered.length} companies</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors">
          <Plus size={14} /> Add Company
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-surface-200 rounded-lg placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-white border border-surface-200 rounded-lg text-surface-600 focus:outline-none">
          <option value="all">All Plans</option>
          {plans.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-surface-400 text-sm">
            <Loader size={16} className="animate-spin" />
            Loading companies...
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} onRowClick={(row) => navigate(`/super/companies/${row._id}`)} />
      )}

      {/* Add Company Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New Company">
        {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="s-label">Company Name</label>
              <input className="s-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="s-label">Domain</label>
              <input className="s-input" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} placeholder="acme.com" />
            </div>
          </div>
          <div>
            <label className="s-label">Plan</label>
            <select className="s-input" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
              <option value="starter">Starter</option>
              <option value="team">Team</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <hr className="border-surface-200" />
          <p className="text-xs font-semibold text-surface-700">Company Admin Account</p>
          <div>
            <label className="s-label">Admin Name</label>
            <input className="s-input" value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label className="s-label">Admin Email</label>
            <input className="s-input" type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="john@acme.com" />
          </div>
          <div>
            <label className="s-label">Admin Password</label>
            <input className="s-input" type="text" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min 6 characters" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer border-none">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-[#2347e8] text-white rounded-lg hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </Modal>
    </div>
  );
}


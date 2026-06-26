import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Loader } from 'lucide-react';
import DataTable from '../../components/super-admin/DataTable';
import StatusBadge from '../../components/super-admin/StatusBadge';
import PlanBadge from '../../components/super-admin/PlanBadge';
import Modal from '../../components/super-admin/Modal';
import Dropdown from '../../components/Dropdown';
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
          <span className="font-medium text-[var(--text-primary)]">{val}</span>
        </div>
      ),
    },
    { key: 'plan', label: 'Plan', render: (val) => <PlanBadge plan={val} /> },
    { key: 'userCount', label: 'Users' },
    { key: 'projectCount', label: 'Projects' },
    { key: 'mrr', label: 'MRR', render: (val) => <span className="num-mono text-xs font-medium text-[var(--text-secondary)]">{val !== undefined && val !== null ? `$${Number(val).toLocaleString()}` : '$0'}</span> },
    { key: 'status', label: 'Status', render: (val, row) => <StatusBadge status={row.isActive !== false ? 'active' : 'inactive'} /> },
  ];

  return (
    <div className="flex flex-col gap-5 page-enter">
      <div className="flex items-center justify-between glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Companies</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{filtered.length} companies</p>
        </div>
        <button data-voice="add-company" onClick={() => setShowForm(true)}
          className="btn-premium flex items-center gap-1.5 px-3 py-2 bg-[var(--brand-primary)] dark:bg-[var(--brand-primary)] text-white rounded-[var(--radius-lg)] text-xs font-semibold hover:bg-[var(--brand-secondary)] dark:hover:bg-[var(--brand-secondary)] transition-colors">
          <Plus size={14} /> Add Company
        </button>
      </div>

      <div className="flex items-center gap-3 stagger">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input data-voice="search-company" type="text" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] dark:border-[var(--border-primary)] rounded-[var(--radius-lg)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]" />
        </div>
        <Dropdown value={planFilter} onChange={v => setPlanFilter(v)}
          options={[{value:'all', label:'All Plans'}, ...plans.map(p => ({value:p, label:p}))]} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 animate-fade-in">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader size={16} className="animate-spin" />
            Loading companies...
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <DataTable columns={columns} data={filtered} onRowClick={(row) => navigate(`/super/companies/${row._id}`)} />
        </div>
      )}

      {/* Add Company Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New Company">
        {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] text-xs text-red-600">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="s-label">Company Name</label>
              <input className="select" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="s-label">Domain</label>
              <input className="select" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} placeholder="acme.com" />
            </div>
          </div>
          <div>
            <label className="s-label">Plan</label>
            <Dropdown value={form.plan} onChange={v => setForm({...form, plan:v})}
              options={[{value:'starter', label:'Starter'}, {value:'team', label:'Team'}, {value:'enterprise', label:'Enterprise'}]} />
          </div>
          <hr className="border-[var(--border-primary)]" />
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Company Admin Account</p>
          <div>
            <label className="s-label">Admin Name</label>
            <input className="select" value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label className="s-label">Admin Email</label>
            <input className="select" type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="john@acme.com" />
          </div>
          <div>
            <label className="s-label">Admin Password</label>
            <input className="select" type="text" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min 6 characters" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-none">Cancel</button>
          <button data-voice="create-company" onClick={handleCreate} disabled={saving}
            className="btn-premium px-3 py-1.5 text-xs font-medium bg-[var(--brand-primary)] dark:bg-[var(--brand-primary)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--brand-secondary)] dark:hover:bg-[var(--brand-secondary)] transition-colors cursor-pointer border-none disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

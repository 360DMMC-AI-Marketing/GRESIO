import { useState, useEffect } from 'react';
import { Search, Plus, Loader } from 'lucide-react';
import DataTable from '../../components/super-admin/DataTable';
import StatusBadge from '../../components/super-admin/StatusBadge';
import Modal from '../../components/super-admin/Modal';
import Dropdown from '../../components/Dropdown';
import { api } from '../../services/api';

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'admin', domain:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const data = await api.getUsers(); setAdmins(data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = admins.filter(a => {
    if (a.role !== 'admin') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      await api.createUser(form);
      setShowForm(false);
      setForm({ name:'', email:'', password:'', role:'admin', domain:'' });
      await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)] dark:bg-[var(--brand-primary)] flex items-center justify-center text-white text-[11px] font-semibold">
            {val ? val.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-[var(--text-primary)]">{val}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'role', label: 'Role',
      render: (val) => <span className="inline-block rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] capitalize">{val}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (val) => <StatusBadge status={val || 'active'} />,
    },
    {
      key: 'lastActive', label: 'Last Login',
      render: (val) => <span className="text-xs text-[var(--text-tertiary)]">{val ? new Date(val).toLocaleDateString() : '\u2014'}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 page-enter">
      <div className="flex items-center justify-between glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admins</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{filtered.length} admin accounts</p>
        </div>
        <button data-voice="invite-admin" onClick={() => setShowForm(true)}
          className="btn-premium flex items-center gap-1.5 px-3 py-2 bg-[var(--brand-primary)] dark:bg-[var(--brand-primary)] text-white rounded-[var(--radius-lg)] text-xs font-semibold hover:bg-[var(--brand-secondary)] dark:hover:bg-[var(--brand-secondary)] transition-colors">
          <Plus size={14} /> Invite Admin
        </button>
      </div>

      <div className="relative max-w-xs stagger">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input data-voice="search-admin" type="text" placeholder="Search admins..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] dark:border-[var(--border-primary)] rounded-[var(--radius-lg)] placeholder-[var(--text-muted)] focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 animate-fade-in">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader size={16} className="animate-spin" />
            Loading admins...
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <DataTable columns={columns} data={filtered} />
        </div>
      )}

      {/* Invite Admin Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Invite New Admin">
        {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] text-xs text-red-600">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="s-label">Name</label>
            <input className="select" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label className="s-label">Email</label>
            <input className="select" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@360dmmc.com" />
          </div>
          <div>
            <label className="s-label">Password</label>
            <input className="select" type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="s-label">Role</label>
            <Dropdown value={form.role} onChange={v => setForm({...form, role:v})}
              options={[{value:'admin', label:'Admin'}, {value:'support', label:'Support'}]} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-none">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="btn-premium px-3 py-1.5 text-xs font-medium bg-[var(--brand-primary)] dark:bg-[var(--brand-primary)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--brand-secondary)] dark:hover:bg-[var(--brand-secondary)] transition-colors cursor-pointer border-none disabled:opacity-50">
            {saving ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

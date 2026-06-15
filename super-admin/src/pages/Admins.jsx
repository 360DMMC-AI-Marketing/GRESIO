import { useState, useEffect } from 'react';
import { Search, Plus, Loader } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api';

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
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-[11px] font-semibold">
            {val ? val.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-surface-900">{val}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'role', label: 'Role',
      render: (val) => <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-600 capitalize">{val}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (val) => <StatusBadge status={val || 'active'} />,
    },
    {
      key: 'lastActive', label: 'Last Login',
      render: (val) => <span className="text-xs text-surface-500">{val ? new Date(val).toLocaleDateString() : '—'}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Admins</h1>
          <p className="text-xs text-surface-400 mt-0.5">{filtered.length} admin accounts</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors">
          <Plus size={14} /> Invite Admin
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input type="text" placeholder="Search admins..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-surface-200 rounded-lg placeholder-surface-400 focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-surface-400 text-sm">
            <Loader size={16} className="animate-spin" />
            Loading admins...
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      {/* Invite Admin Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Invite New Admin">
        {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="s-label">Name</label>
            <input className="s-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label className="s-label">Email</label>
            <input className="s-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@360dmmc.com" />
          </div>
          <div>
            <label className="s-label">Password</label>
            <input className="s-input" type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="s-label">Role</label>
            <select className="s-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="admin">Admin</option>
              <option value="support">Support</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer border-none">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-[#2347e8] text-white rounded-lg hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none disabled:opacity-50">
            {saving ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

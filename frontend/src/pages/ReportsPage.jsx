import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reportsService } from '../services/reports';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/Modal';

const CAN_VIEW = ['admin', 'project_manager', 'manager', 'team_lead'];

function ReportCard({ r, onDelete }) {
  const pName = r.project?.name || r.data?.project?.name || 'Unknown Project';
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'admin' ? 'bg-primary-100' : 'bg-surface-100'}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.type === 'admin' ? '#2347e8' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {r.type === 'admin' ? (
            <>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </>
          ) : (
            <>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
          )}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900 truncate">{pName}</p>
        <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
          <span className={`capitalize font-medium ${r.type === 'admin' ? 'text-primary-600' : 'text-surface-600'}`}>{r.type} report</span>
          <span className="w-1 h-1 rounded-full bg-surface-300" />
          <span>{new Date(r.generatedAt).toLocaleDateString()}</span>
          <span className="w-1 h-1 rounded-full bg-surface-300" />
          <span>by {r.generatedBy?.name || r.data?.generatedBy?.name || 'Unknown'}</span>
          {r.downloadCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-surface-300" />
              <span>{r.downloadCount} downloads</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/report/${r._id}`}
          className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
          View
        </Link>
        <button onClick={() => onDelete(r._id)}
          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('admin');

  useEffect(() => {
    reportsService.list()
      .then((res) => setReports(res.data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await reportsService.delete(deleteConfirmId);
      setReports((prev) => prev.filter((r) => r._id !== deleteConfirmId));
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (!CAN_VIEW.includes(user?.role)) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? reports.filter(r => (r.project?.name || r.data?.project?.name || '').toLowerCase().includes(q))
    : reports;
  const adminReports = filtered.filter(r => r.type === 'admin');
  const clientReports = filtered.filter(r => r.type === 'client');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Saved Reports</h1>
        <p className="text-sm text-surface-500 mt-1">All generated project reports, available for download anytime.</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-surface-900 mb-1">No reports yet</h3>
          <p className="text-sm text-surface-500">Generate a report from any completed project to see it here.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center border-b border-surface-200 mb-6">
            <button onClick={() => setTab('admin')}
              className={`relative px-4 py-2 text-sm font-medium transition-colors border-none bg-transparent cursor-pointer ${
                tab === 'admin' ? 'text-primary-600' : 'text-surface-500 hover:text-surface-700'
              }`}>
              Admin Reports
              {tab === 'admin' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
            </button>
            <button onClick={() => setTab('client')}
              className={`relative px-4 py-2 text-sm font-medium transition-colors border-none bg-transparent cursor-pointer ${
                tab === 'client' ? 'text-primary-600' : 'text-surface-500 hover:text-surface-700'
              }`}>
              Client Reports
              {tab === 'client' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
            </button>
            <div className="relative ml-auto pb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project..."
                className="w-44 pl-8 pr-6 py-1.5 text-xs border border-surface-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {tab === 'admin' ? (
            adminReports.length > 0 ? (
              <div className="space-y-2">{adminReports.map(r => <ReportCard key={r._id} r={r} onDelete={handleDelete} />)}</div>
            ) : (
              <div className="text-center py-12 text-surface-400">
                <p className="text-sm">{search ? `No admin reports match "${search}"` : 'No admin reports yet'}</p>
              </div>
            )
          ) : (
            clientReports.length > 0 ? (
              <div className="space-y-2">{clientReports.map(r => <ReportCard key={r._id} r={r} onDelete={handleDelete} />)}</div>
            ) : (
              <div className="text-center py-12 text-surface-400">
                <p className="text-sm">{search ? `No client reports match "${search}"` : 'No client reports yet'}</p>
              </div>
            )
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone."
        confirmText="Delete"
        confirmColor="#ef4444"
      />
    </div>
  );
}

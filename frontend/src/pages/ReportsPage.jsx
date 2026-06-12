import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsService } from '../services/reports';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.list()
      .then((res) => setReports(res.data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    try {
      await reportsService.delete(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Saved Reports</h1>
          <p className="text-sm text-surface-500 mt-1">All generated project reports, available for download anytime.</p>
        </div>
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
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'admin' ? 'bg-primary-100' : 'bg-surface-100'}`}>
                <span className="text-lg">{r.type === 'admin' ? '📋' : '🤝'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-900 truncate">{r.project?.name || 'Unknown Project'}</p>
                <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                  <span className={`capitalize font-medium ${r.type === 'admin' ? 'text-primary-600' : 'text-surface-600'}`}>{r.type} report</span>
                  <span className="w-1 h-1 rounded-full bg-surface-300" />
                  <span>{new Date(r.generatedAt).toLocaleDateString()}</span>
                  <span className="w-1 h-1 rounded-full bg-surface-300" />
                  <span>by {r.generatedBy?.name || 'Unknown'}</span>
                  {r.downloadCount > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-surface-300" />
                      <span>{r.downloadCount} downloads</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/report/${r._id}`}
                  className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(r._id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

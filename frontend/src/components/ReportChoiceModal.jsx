import { useState } from 'react';
import { reportsService } from '../services/reports';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function ReportChoiceModal({ projectId, projectName, onClose, onGenerated }) {
  const [generating, setGenerating] = useState(null);

  const handleGenerate = async (type) => {
    setGenerating(type);
    try {
      await reportsService.generate(projectId, type);
      toast.success(`${type === 'admin' ? 'Admin' : 'Client'} report generated!`);
      onGenerated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleBoth = async () => {
    setGenerating('both');
    try {
      await Promise.all([
        reportsService.generate(projectId, 'admin'),
        reportsService.generate(projectId, 'client'),
      ]);
      toast.success('Both reports generated!');
      onGenerated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to generate reports');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Modal open={true} onClose={onClose}>
      <div className="max-w-lg w-full mx-4 p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-600">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-surface-900">Generate Report</h2>
          <p className="text-sm text-surface-500 mt-1">Choose the type of report for <strong>{projectName}</strong></p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleGenerate('admin')}
            disabled={generating}
            className="w-full p-4 rounded-xl border-2 border-surface-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                <span className="text-lg">📋</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-surface-900">Admin Report</p>
                <p className="text-xs text-surface-500 mt-0.5">Detailed internal audit with full KPIs, tasks, sprints, testing, and team analytics</p>
              </div>
              {generating === 'admin' && <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />}
            </div>
          </button>

          <button
            onClick={() => handleGenerate('client')}
            disabled={generating}
            className="w-full p-4 rounded-xl border-2 border-surface-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                <span className="text-lg">🤝</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-surface-900">Client Report</p>
                <p className="text-xs text-surface-500 mt-0.5">Clean stakeholder summary with key outcomes, deliverables, and delivery notes</p>
              </div>
              {generating === 'client' && <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />}
            </div>
          </button>

          <button
            onClick={handleBoth}
            disabled={generating}
            className="w-full p-4 rounded-xl border-2 border-primary-500 bg-primary-50 hover:bg-primary-100 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-lg">📦</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary-700">Generate Both</p>
                <p className="text-xs text-primary-500 mt-0.5">Create both Admin and Client reports at once</p>
              </div>
              {generating === 'both' && <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />}
            </div>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            disabled={generating}
            className="text-sm text-surface-400 hover:text-surface-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
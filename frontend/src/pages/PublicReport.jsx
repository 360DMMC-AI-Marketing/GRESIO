import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Skeleton from '../components/Skeleton';

const SECTION_LABELS = {
  'executive-summary': 'Executive Summary',
  'project-overview': 'Project Overview',
  'what-was-delivered': 'What Was Delivered',
  'work-completed': 'Work Completed Chronology',
  'technical-details': 'Technical Details',
  'issues-resolutions': 'Issues & Resolutions',
  'testing-results': 'Testing Results',
  'deployment-info': 'Deployment Info',
  'documentation': 'Documentation',
  'training-handover': 'Training & Handover',
  'support-maintenance': 'Support & Maintenance',
  'financial-summary': 'Financial Summary',
  'client-feedback': 'Client Feedback',
  'next-steps': 'Next Steps',
  'appendices': 'Appendices',
};

export default function PublicReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState('');

  const load = async (pwd) => {
    setLoading(true);
    setError('');
    try {
      const params = pwd ? `?password=${encodeURIComponent(pwd)}` : '';
      const res = await fetch(`/api/shared-report/${token}${params}`);
      if (res.status === 401) { setNeedsPassword(true); setLoading(false); return; }
      if (!res.ok) { setError('Report not found or expired'); setLoading(false); return; }
      const data = await res.json();
      setReport(data);
      setNeedsPassword(false);
    } catch { setError('Error loading report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(''); }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-surface-50 p-8 space-y-6">
      <Skeleton.PageHeader />
      <Skeleton.Text lines={10} />
    </div>
  );

  if (needsPassword) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="bg-white rounded-xl border border-surface-200 p-6 w-full max-w-sm shadow-sm">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">🔒 Password Required</h2>
        <p className="text-xs text-surface-500 mb-4">This report is password-protected.</p>
        <input value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full text-sm border border-surface-200 rounded-lg px-3 py-2 mb-3 outline-none focus:border-[#2347e8]" />
        <button onClick={() => load(password)}
          className="w-full px-4 py-2 bg-[#2347e8] text-white rounded-lg text-sm font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none">
          View Report
        </button>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center">
        <p className="text-3xl mb-2">📄</p>
        <p className="text-surface-600 text-sm">{error}</p>
      </div>
    </div>
  );

  const sections = report?.sections || [];

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="bg-[#2347e8] px-6 py-4">
            <h1 className="text-lg font-bold text-white">Project Report</h1>
            {report?.projectName && <p className="text-white/80 text-xs mt-0.5">{report.projectName}</p>}
          </div>

          {report?.clientSummary && (
            <div className="px-6 py-4 border-b border-surface-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-surface-900">Executive Summary</span>
                {report.clientSummary.overallHealth && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                    report.clientSummary.overallHealth === 'green' ? 'bg-success-50 text-success-600' :
                    report.clientSummary.overallHealth === 'yellow' ? 'bg-warning-50 text-warning-600' :
                    'bg-danger-50 text-danger-600'
                  }`}>{report.clientSummary.overallHealth}</span>
                )}
              </div>
              {report.clientSummary.keyMilestones?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {report.clientSummary.keyMilestones.map((m, i) => (
                    <span key={i} className="text-[9px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded">{m}</span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-xs text-surface-600">
                {report.clientSummary.featureCount !== undefined && <div><strong>Features:</strong> {report.clientSummary.featureCount}</div>}
                {report.clientSummary.decisionCount !== undefined && <div><strong>Decisions:</strong> {report.clientSummary.decisionCount}</div>}
                {report.clientSummary.bugFixedCount !== undefined && <div><strong>Bugs Fixed:</strong> {report.clientSummary.bugFixedCount}/{report.clientSummary.bugTotalCount}</div>}
              </div>
            </div>
          )}

          {sections.map((section, i) => (
            <div key={i} className="px-6 py-4 border-b border-surface-100 last:border-0">
              <h2 className="text-sm font-bold text-surface-900 mb-2">{SECTION_LABELS[section.id] || section.id}</h2>
              <div className="text-xs text-surface-600 leading-relaxed whitespace-pre-wrap">
                {section.content || 'No content available.'}
              </div>
            </div>
          ))}

          <div className="px-6 py-3 bg-surface-50 text-[9px] text-surface-400 text-center">
            Generated by GRESIO — Project Intelligence Platform
          </div>
        </div>
      </div>
    </div>
  );
}

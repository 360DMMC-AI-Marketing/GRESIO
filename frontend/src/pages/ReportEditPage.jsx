import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader } from 'lucide-react';
import { reportsService } from '../services/reports';
import { reportDraftsService } from '../services/reportDrafts';
import SectionSelector from '../components/reports/SectionSelector';
import ReportEditor from '../components/reports/ReportEditor';
import ReportPreview from '../components/reports/ReportPreview';
import PdfGenerator from '../components/reports/PdfGenerator';
import FEATURES from '../config/featureFlags';

const CLIENT_SECTIONS = [
  { key: 'executive_summary', title: 'Executive Summary', visible: true, order: 0 },
  { key: 'key_achievements', title: 'Key Achievements', visible: true, order: 1 },
  { key: 'challenges', title: 'Challenges & Solutions', visible: true, order: 2 },
  { key: 'screenshots', title: 'Screenshots / Demo', visible: true, order: 3 },
  { key: 'team', title: 'Team Acknowledgment', visible: true, order: 4 },
  { key: 'client_feedback', title: 'Client Feedback', visible: true, order: 5 },
  { key: 'next_steps', title: 'Next Steps', visible: true, order: 6 },
  { key: 'thank_you', title: 'Thank You Note', visible: true, order: 7 },
];

const ADMIN_SECTIONS = [
  { key: 'executive_summary', title: 'Executive Summary', visible: true, order: 0 },
  { key: 'technical_details', title: 'Technical Details', visible: true, order: 1 },
  { key: 'performance_metrics', title: 'Performance Metrics', visible: true, order: 2 },
  { key: 'issues_blockers', title: 'Issues & Blockers', visible: true, order: 3 },
  { key: 'lessons_learned', title: 'Lessons Learned', visible: true, order: 4 },
  { key: 'recommendations', title: 'Recommendations', visible: true, order: 5 },
];

function buildSectionsFromData(data, type) {
  const template = type === 'admin' ? ADMIN_SECTIONS : CLIENT_SECTIONS;
  const p = data?.project || {};
  const tasks = data?.tasks || {};
  const sprints = data?.sprints || {};
  const testing = data?.testing || {};

  const contentMap = {
    executive_summary: `<p>Project <strong>${p.name || 'N/A'}</strong> (${p.type || 'N/A'}) — Phase: <strong>${p.phase || 'active'}</strong>, Progress: <strong>${p.progress || tasks.completionPct || 0}%</strong>. Tasks: ${tasks.total || 0} total, ${tasks.done || 0} completed.</p>`,
    key_achievements: '<p>List key achievements here...</p>',
    challenges: '<p>Describe challenges and solutions here...</p>',
    screenshots: '<p>Add screenshots or demo links here...</p>',
    team: `<p>Members: ${data?.team || 'N/A'}</p>`,
    client_feedback: '<p>Client feedback section...</p>',
    next_steps: `<p>Remaining tasks: ${tasks.byStatus?.todo || 0} todo, ${tasks.byStatus?.inProgress || 0} in progress.</p>`,
    thank_you: '<p>Thank you for your collaboration!</p>',
    technical_details: `<p><strong>Project:</strong> ${p.name || 'N/A'}<br/><strong>Type:</strong> ${p.type || 'N/A'}<br/><strong>Phase:</strong> ${p.phase || 'N/A'}<br/><strong>Tasks:</strong> ${tasks.total || 0} total, ${tasks.done || 0} completed<br/><strong>Sprint Velocity:</strong> ${sprints.velocity || 0} tasks/sprint<br/><strong>Test Pass Rate:</strong> ${testing.passRate || 0}%</p>`,
    performance_metrics: `<p><strong>Completion:</strong> ${tasks.completionPct || 0}%<br/><strong>Sprint Velocity:</strong> ${sprints.velocity || 0} tasks/sprint<br/><strong>Test Pass Rate:</strong> ${testing.passRate || 0}%<br/><strong>Bugs:</strong> ${testing.bugs || 0}</p>`,
    issues_blockers: `<p>Blocked tasks: ${tasks.byStatus?.blocked || 0}. Bugs: ${testing.bugs || 0}.</p>`,
    lessons_learned: '<p>Document lessons learned here...</p>',
    recommendations: '<p>Add recommendations here...</p>',
  };

  return template.map(s => ({
    ...s,
    content: contentMap[s.key] || '<p></p>',
  }));
}

export default function ReportEditPage() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pdfRef = useRef(null);

  const [type, setType] = useState(searchParams.get('type') || 'client');
  const [sections, setSections] = useState([]);
  const [currentKey, setCurrentKey] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedReportId, setSavedReportId] = useState(null);

  const currentSection = sections.find(s => s.key === currentKey);

  useEffect(() => {
    if (!FEATURES.customReportEditor) {
      navigate(`/projects/${projectId}`, { replace: true });
      return;
    }
    loadData();
  }, [projectId, type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [autoData, draftData] = await Promise.all([
        reportsService.getReportData(projectId, type).catch(() => null),
        reportDraftsService.getDraft(projectId, type).catch(() => null),
      ]);
      setProjectName(autoData?.project?.name || draftData?.autoData?.project?.name || 'Project');

      if (draftData?.draft?.sections?.length > 0) {
        setSections(draftData.draft.sections);
        setCurrentKey(draftData.draft.sections[0].key);
      } else {
        const built = buildSectionsFromData(autoData, type);
        setSections(built);
        setCurrentKey(built[0]?.key);
      }
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await reportDraftsService.saveReport(projectId, { type, sections });
      setSavedReportId(result.report._id);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSection = (key) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, visible: !s.visible } : s));
  };

  const handleReorder = (reordered) => {
    setSections(reordered);
  };

  const handleContentChange = (key, html) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, content: html } : s));
  };

  const currentSectionIndex = sections.findIndex(s => s.key === currentKey);
  const prevSection = currentSectionIndex > 0 ? sections[currentSectionIndex - 1] : null;
  const nextSection = currentSectionIndex < sections.length - 1 ? sections[currentSectionIndex + 1] : null;

  if (!FEATURES.customReportEditor) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={20} className="animate-spin text-surface-400" />
        <span className="ml-3 text-xs text-surface-400">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/projects/${projectId}`)}
            className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-900">Customize Report — {projectName}</h1>
            <p className="text-[10px] text-surface-400">Edit sections, then save to create the report</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface-100 rounded-lg p-0.5">
            <button onClick={() => setType('client')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border-none cursor-pointer ${type === 'client' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
              Client Report
            </button>
            <button onClick={() => setType('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border-none cursor-pointer ${type === 'admin' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
              Admin Report
            </button>
          </div>

          <button onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors border-none cursor-pointer">
            <Eye size={14} /> {previewMode ? 'Edit' : 'Preview'}
          </button>

          {savedReportId ? (
            <button onClick={() => navigate('/reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors border-none cursor-pointer">
              View in Reports →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2347e8] text-white rounded-lg hover:bg-[#1d3dcc] transition-colors border-none cursor-pointer disabled:opacity-50">
              <Save size={14} /> {saving ? 'Saving...' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      {previewMode ? (
        <div className="overflow-auto bg-surface-100 rounded-xl p-4" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="flex justify-center">
            <ReportPreview projectName={projectName} type={type} sections={sections} pdfRef={pdfRef} />
          </div>
          <div className="flex justify-center mt-4">
            <PdfGenerator pdfRef={pdfRef} projectName={projectName} />
          </div>
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="w-56 shrink-0 overflow-y-auto">
            <SectionSelector sections={sections} onToggle={handleToggleSection} onReorder={handleReorder} currentKey={currentKey} onSelect={setCurrentKey} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <ReportEditor section={currentSection} onChange={(html) => handleContentChange(currentKey, html)} />
            <div className="flex items-center justify-between mt-2">
              <div>
                {prevSection && (
                  <button onClick={() => setCurrentKey(prevSection.key)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors border-none cursor-pointer">
                    ← {prevSection.title}
                  </button>
                )}
              </div>
              <div>
                {nextSection && (
                  <button onClick={() => setCurrentKey(nextSection.key)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors border-none cursor-pointer">
                    {nextSection.title} →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

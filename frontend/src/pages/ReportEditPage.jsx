import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader, Palette, Layout, Type, FileText, ChevronDown, X } from 'lucide-react';
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

const THEMES = [
  { id: 'modern', name: 'Modern', primary: '#2347e8', style: 'Clean sans-serif with brand blue accent' },
  { id: 'executive', name: 'Executive', primary: '#0F172A', style: 'Dark, bold, corporate feel' },
  { id: 'minimal', name: 'Minimal', primary: '#6b7280', style: 'Light grays, subtle typography' },
  { id: 'branded', name: 'Branded', primary: '#7c3aed', style: 'Purple accent, creative vibe' },
];

const FONTS = [
  { id: 'Inter', name: 'Inter', stack: 'Inter, system-ui, sans-serif', category: 'Sans-serif' },
  { id: 'Roboto', name: 'Roboto', stack: 'Roboto, Arial, sans-serif', category: 'Sans-serif' },
  { id: 'Merriweather', name: 'Merriweather', stack: 'Merriweather, Georgia, serif', category: 'Serif' },
  { id: 'Poppins', name: 'Poppins', stack: 'Poppins, system-ui, sans-serif', category: 'Sans-serif' },
];

const COVER_STYLES = [
  { id: 'standard', name: 'Standard', desc: 'Solid brand color header' },
  { id: 'gradient', name: 'Gradient', desc: 'Smooth gradient background' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean white with thin border' },
  { id: 'bold', name: 'Bold', desc: 'Full-bleed dark background' },
];

const TEMPLATES = [
  { id: 'standard', name: 'Standard Report', desc: 'Executive summary + achievements + next steps' },
  { id: 'technical', name: 'Technical Review', desc: 'Deep-dive with performance metrics & blockers' },
  { id: 'sprint', name: 'Sprint Summary', desc: 'Sprint velocity, burndown, backlog review' },
  { id: 'launch', name: 'Launch Report', desc: 'Go-live checklist, release notes, handoff' },
];

const DEFAULT_DESIGN = {
  theme: 'modern',
  primaryColor: '#2347e8',
  font: 'Inter',
  coverStyle: 'standard',
};

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

function TemplateCard({ t, onSelect }) {
  return (
    <button onClick={() => onSelect(t.id)}
      className="text-left w-full px-3 py-2.5 text-xs hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors border-none bg-transparent cursor-pointer">
      <p className="font-semibold text-[var(--text-primary)]">{t.name}</p>
      <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{t.desc}</p>
    </button>
  );
}

function ColorSwatch({ color, selected, onSelect }) {
  return (
    <button onClick={onSelect}
      className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
      style={{ backgroundColor: color, borderColor: selected ? color : 'transparent', boxShadow: selected ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none' }} />
  );
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
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [showDesignPanel, setShowDesignPanel] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [coverTitle, setCoverTitle] = useState('');
  const [coverSubtitle, setCoverSubtitle] = useState('');

  const templateBtnRef = useRef(null);
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
      const pName = autoData?.project?.name || draftData?.autoData?.project?.name || 'Project';
      setProjectName(pName);
      setCoverTitle(pName);
      setCoverSubtitle(type === 'admin' ? 'Project Closure Report' : 'Project Summary');

      if (draftData?.draft?.sections?.length > 0) {
        setSections(draftData.draft.sections);
        setCurrentKey(draftData.draft.sections[0].key);
        if (draftData.draft.design) setDesign(draftData.draft.design);
        if (draftData.draft.cover) {
          setCoverTitle(draftData.draft.cover.title || pName);
          setCoverSubtitle(draftData.draft.cover.subtitle || '');
        }
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
      const result = await reportDraftsService.saveReport(projectId, {
        type,
        sections,
        design,
        cover: { title: coverTitle, subtitle: coverSubtitle },
      });
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

  const applyTemplate = (templateId) => {
    const templateMap = {
      standard: CLIENT_SECTIONS,
      technical: [
        { key: 'executive_summary', title: 'Executive Summary', visible: true, order: 0 },
        { key: 'technical_details', title: 'Technical Details', visible: true, order: 1 },
        { key: 'performance_metrics', title: 'Performance Metrics', visible: true, order: 2 },
        { key: 'issues_blockers', title: 'Issues & Blockers', visible: true, order: 3 },
        { key: 'recommendations', title: 'Recommendations', visible: true, order: 4 },
      ],
      sprint: [
        { key: 'executive_summary', title: 'Executive Summary', visible: true, order: 0 },
        { key: 'key_achievements', title: 'Sprint Achievements', visible: true, order: 1 },
        { key: 'performance_metrics', title: 'Sprint Velocity', visible: true, order: 2 },
        { key: 'challenges', title: 'Sprint Challenges', visible: true, order: 3 },
        { key: 'next_steps', title: 'Backlog & Next Steps', visible: true, order: 4 },
      ],
      launch: [
        { key: 'executive_summary', title: 'Launch Summary', visible: true, order: 0 },
        { key: 'key_achievements', title: 'Go-Live Checklist', visible: true, order: 1 },
        { key: 'technical_details', title: 'Release Notes', visible: true, order: 2 },
        { key: 'team', title: 'Handoff Notes', visible: true, order: 3 },
        { key: 'thank_you', title: 'Closing Note', visible: true, order: 4 },
      ],
    };
    const tmpl = templateMap[templateId] || CLIENT_SECTIONS;
    const merged = tmpl.map((t, i) => {
      const existing = sections.find(s => s.key === t.key);
      return {
        ...t,
        content: existing?.content || '<p></p>',
      };
    });
    setSections(merged);
    setCurrentKey(merged[0]?.key);
    setShowTemplatePicker(false);
  };

  const currentSectionIndex = sections.findIndex(s => s.key === currentKey);
  const prevSection = currentSectionIndex > 0 ? sections[currentSectionIndex - 1] : null;
  const nextSection = currentSectionIndex < sections.length - 1 ? sections[currentSectionIndex + 1] : null;

  const presetColors = ['#2347e8', '#0F172A', '#6b7280', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'];

  if (!FEATURES.customReportEditor) return null;

  if (loading) {
    return (
      <div className="page-enter flex items-center justify-center py-20">
        <Loader size={20} className="animate-spin text-[var(--text-muted)]" />
        <span className="ml-3 text-xs text-[var(--text-muted)]">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col gap-4 p-6 max-w-full">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button data-voice="back-project" onClick={() => navigate(`/projects/${projectId}`)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors bg-transparent border-none cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Customize Report — {projectName}</h1>
            <p className="text-[10px] text-[var(--text-muted)]">Edit sections, choose design, then save</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <button ref={templateBtnRef} onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border-none cursor-pointer">
              <Layout size={12} /> Templates <ChevronDown size={10} />
            </button>
          </div>

          <button onClick={() => setShowDesignPanel(!showDesignPanel)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border-none cursor-pointer">
            <Palette size={12} /> Design
          </button>

          <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-0.5">
            <button data-voice="type-client" onClick={() => setType('client')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border-none cursor-pointer ${type === 'client' ? 'bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              Client
            </button>
            <button data-voice="type-admin" onClick={() => setType('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border-none cursor-pointer ${type === 'admin' ? 'bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              Admin
            </button>
          </div>

          <button data-voice="preview-report" onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border-none cursor-pointer">
            <Eye size={14} /> {previewMode ? 'Edit' : 'Preview'}
          </button>

          {savedReportId ? (
            <button onClick={() => navigate('/reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors border-none cursor-pointer">
              View in Reports →
            </button>
          ) : (
            <button data-voice="save-report" onClick={handleSave} disabled={saving}
              className="btn-premium flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <Save size={14} /> {saving ? 'Saving...' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {/* Template picker (outside glass-panel to avoid backdrop-filter stacking context) */}
      {showTemplatePicker && templateBtnRef.current && (() => {
        const rect = templateBtnRef.current.getBoundingClientRect();
        return (
          <div className="fixed inset-0 z-[200]" onClick={() => setShowTemplatePicker(false)}>
            <div className="absolute" style={{ top: rect.bottom + 4, right: window.innerWidth - rect.right }}
              onClick={e => e.stopPropagation()}>
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-xl w-56 p-2">
                <p className="px-2 py-1 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Report Templates</p>
                {TEMPLATES.map(t => <TemplateCard key={t.id} t={t} onSelect={applyTemplate} />)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main content */}
      {previewMode ? (
        <div className="overflow-auto bg-[var(--bg-tertiary)] rounded-xl p-4 animate-fade-in" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="flex justify-center">
            <ReportPreview projectName={projectName} type={type} sections={sections} pdfRef={pdfRef} design={design} cover={{ title: coverTitle, subtitle: coverSubtitle }} />
          </div>
          <div className="flex justify-center mt-4">
            <PdfGenerator pdfRef={pdfRef} projectName={projectName} />
          </div>
        </div>
      ) : (
        <div className="flex gap-4 animate-fade-in" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Left: Sections */}
          <div className="w-56 shrink-0 overflow-y-auto card-premium">
            <SectionSelector sections={sections} onToggle={handleToggleSection} onReorder={handleReorder} currentKey={currentKey} onSelect={setCurrentKey} />
          </div>

          {/* Center: Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ReportEditor section={currentSection} onChange={(html) => handleContentChange(currentKey, html)} design={design} />
            <div className="flex items-center justify-between mt-2">
              <div>
                {prevSection && (
                  <button onClick={() => setCurrentKey(prevSection.key)}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border-none cursor-pointer">
                    ← {prevSection.title}
                  </button>
                )}
              </div>
              <div>
                {nextSection && (
                  <button onClick={() => setCurrentKey(nextSection.key)}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors border-none cursor-pointer">
                    {nextSection.title} →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Design Panel */}
          {showDesignPanel && (
            <div className="w-72 shrink-0 overflow-y-auto animate-fade-in">
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-primary)]">
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Palette size={12} /> Design Settings
                  </h3>
                </div>

                <div className="p-4 space-y-5">
                  {/* Theme */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Theme</p>
                    <div className="space-y-1">
                      {THEMES.map(t => (
                        <button key={t.id} onClick={() => setDesign(d => ({ ...d, theme: t.id, primaryColor: t.primary }))}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 text-xs rounded-lg border transition-all bg-transparent cursor-pointer ${
                            design.theme === t.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-transparent hover:bg-[var(--bg-tertiary)]'
                          }`}>
                          <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: t.primary }} />
                          <div className="text-left">
                            <p className="font-medium text-[var(--text-primary)]">{t.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{t.style}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Primary Color</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {presetColors.map(c => (
                        <ColorSwatch key={c} color={c} selected={design.primaryColor === c} onSelect={() => setDesign(d => ({ ...d, primaryColor: c }))} />
                      ))}
                      <input type="color" value={design.primaryColor} onChange={e => setDesign(d => ({ ...d, primaryColor: e.target.value }))}
                        className="w-7 h-7 rounded-full border-2 border-[var(--border-primary)] cursor-pointer p-0 overflow-hidden" />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input type="text" value={design.primaryColor} onChange={e => setDesign(d => ({ ...d, primaryColor: e.target.value }))}
                        className="flex-1 text-[10px] px-2 py-1 border border-[var(--border-primary)] rounded outline-none bg-transparent text-[var(--text-primary)] font-mono" />
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      <Type size={10} className="inline mr-1" />Font
                    </p>
                    <div className="space-y-1">
                      {FONTS.map(f => (
                        <button key={f.id} onClick={() => setDesign(d => ({ ...d, font: f.id }))}
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border transition-all bg-transparent cursor-pointer ${
                            design.font === f.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-transparent hover:bg-[var(--bg-tertiary)]'
                          }`}
                          style={{ fontFamily: design.font === f.id ? f.stack : undefined }}>
                          <span className="font-medium text-[var(--text-primary)]">{f.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{f.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cover Style */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      <FileText size={10} className="inline mr-1" />Cover Style
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {COVER_STYLES.map(cs => (
                        <button key={cs.id} onClick={() => setDesign(d => ({ ...d, coverStyle: cs.id }))}
                          className={`px-2.5 py-3 text-center text-[10px] rounded-lg border transition-all bg-transparent cursor-pointer ${
                            design.coverStyle === cs.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                          }`}>
                          <p className="font-semibold text-[var(--text-primary)]">{cs.name}</p>
                          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{cs.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cover Text */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Cover Text</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Title</label>
                        <input type="text" value={coverTitle} onChange={e => setCoverTitle(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-[var(--border-primary)] rounded-lg outline-none bg-transparent text-[var(--text-primary)]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Subtitle</label>
                        <input type="text" value={coverSubtitle} onChange={e => setCoverSubtitle(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-[var(--border-primary)] rounded-lg outline-none bg-transparent text-[var(--text-primary)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
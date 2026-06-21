import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { workDna } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Play, Search, FolderOpen, BookOpen, RefreshCw, X, Plus } from 'lucide-react';

export default function WorkDNA() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [analyses, setAnalyses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ refType: 'task', refId: '', decision: '', alternatives: '', rationale: '', outcome: '', tags: '' });
  const [dejaVu, setDejaVu] = useState(null);
  const [dejaVuSearch, setDejaVuSearch] = useState('');
  const [dejaVuResults, setDejaVuResults] = useState([]);
  const [dejaVuLoading, setDejaVuLoading] = useState(false);

  const canManage = ['admin', 'project_manager', 'team_lead', 'manager'].includes(user?.role);
  const canAnalyze = ['admin', 'project_manager', 'manager'].includes(user?.role);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [a, d] = await Promise.all([
        workDna.getAnalyses({ q: '' }),
        workDna.getDashboard().catch(() => ({ data: null })),
      ]);
      const items = Array.isArray(a.data) ? a.data : Array.isArray(a) ? a : [];
      setAnalyses(items);
      setDashboard(d?.data || d || null);
    } catch (e) { console.error('loadAll:', e); }
    finally { setLoading(false); }
  };

  const loadDecisions = async () => {
    try { const res = await workDna.getDecisions({}); setDecisions(res.data || []); }
    catch (e) { console.error(e); }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      const res = await workDna.analyzeAll();
      toast.success(res.data.message || `Analyzed ${res.data.count || 0} projects`);
      await loadAll();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
    finally { setAnalyzing(false); }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    try {
      const res = await workDna.getAnalyses({ q: q || '' });
      setAnalyses(res.data || []);
    } catch (e) { console.error(e); }
  };

  const handleCreateDecision = async (e) => {
    e.preventDefault();
    if (!form.refType || !form.refId || !form.decision) {
      toast.error('Ref type, ref ID, and decision are required');
      return;
    }
    try {
      await workDna.createDecision({
        refType: form.refType, refId: form.refId, decision: form.decision,
        alternatives: form.alternatives, rationale: form.rationale,
        outcome: form.outcome, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      toast.success('Decision logged');
      setShowForm(false);
      setForm({ refType: 'task', refId: '', decision: '', alternatives: '', rationale: '', outcome: '', tags: '' });
      loadDecisions();
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const handleDeleteDecision = async (id) => {
    try { await workDna.deleteDecision(id); toast.success('Deleted'); loadDecisions(); }
    catch (e) { toast.error(e.response?.data?.message || e.message); }
  };

  const handleDejaVuSearch = async () => {
    if (!dejaVuSearch || dejaVuSearch.length < 2) return toast.error('Enter at least 2 characters');
    setDejaVuLoading(true);
    try {
      const res = await workDna.searchDejaVu(dejaVuSearch);
      setDejaVuResults(res.data || { projects: [], decisions: [] });
      setDejaVu(null);
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
    finally { setDejaVuLoading(false); }
  };

  const handleDejaVu = async (projectId) => {
    if (!projectId) return toast.error('Select a project');
    try { const res = await workDna.getDejaVu(projectId); setDejaVu(res.data); }
    catch (e) { toast.error(e.response?.data?.message || e.message); }
  };

  const filteredAnalyses = useMemo(() => {
    if (!searchQuery) return analyses;
    const q = searchQuery.toLowerCase();
    return analyses.filter(a =>
      (a.projectName || '').toLowerCase().includes(q) ||
      (a.summary || '').toLowerCase().includes(q) ||
      (a.features || []).some(f => f.toLowerCase().includes(q)) ||
      (a.projectType || '').toLowerCase().includes(q)
    );
  }, [analyses, searchQuery]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (typeof analyses === 'undefined') return <div className="bg-white rounded-xl border border-surface-200 p-5 text-center text-xs text-surface-500">Loading analyses...</div>;

  const badgeClass = (bg, color) => `text-[9px] font-medium px-[7px] py-[1px] rounded-full ${bg} ${color}`;
  const sectionLabel = 'text-[10px] font-semibold text-surface-500 uppercase tracking-[0.5px] mb-1.5';

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <span className="text-[26px]">🧬</span> WorkDNA
            <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Company Brain</span>
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">Monthly project intelligence archive — analyzed and searchable</p>
        </div>
        {canAnalyze && (
          <button data-voice="monthly-analysis" onClick={handleAnalyzeAll} disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer border-none shadow-sm">
            {analyzing ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            {analyzing ? 'Analyzing...' : 'Monthly Analysis'}
          </button>
        )}
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
            <div className="text-2xl font-bold text-surface-900">{analyses.filter(a => a.status === 'done').length || dashboard?.stats?.totalProjects || 0}</div>
            <div className="text-[11px] text-surface-500 font-medium mt-0.5">Projects {analyses.length ? 'Analyzed' : 'Total'}</div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
            <div className="text-2xl font-bold text-surface-900">{dashboard.stats.totalDecisions}</div>
            <div className="text-[11px] text-surface-500 font-medium mt-0.5">Decisions Logged</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-0.5">
        {[
          {key: 'overview', label: 'Project Archive', icon: FolderOpen, voice: 'tab-archive'},
          {key: 'decisions', label: 'Decision Journal', icon: BookOpen, voice: 'tab-decisions'},
          {key: 'dejavu', label: 'Déjà Vu', icon: Search, voice: 'tab-dejavu'},
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} data-voice={t.voice} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border-none cursor-pointer transition-all ${tab === t.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-2">
          {filteredAnalyses.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
              <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={28} className="text-surface-400" />
              </div>
              <h3 className="text-base font-semibold text-surface-900 mb-1">No project archives yet</h3>
              <p className="text-sm text-surface-500">Click "Monthly Analysis" to scan and archive all projects.</p>
            </div>
          ) : (
            filteredAnalyses.map(a => (
              <div key={a._id} onClick={() => setSelected(selected?._id === a._id ? null : a)}
                className={`bg-white rounded-xl border ${selected?._id === a._id ? 'border-primary-400 shadow-sm' : 'border-surface-200'} p-4 cursor-pointer transition-all hover:shadow-sm`}>
                <div className="flex items-start justify-between mb-0.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">📁</span>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-surface-900 truncate">{a.projectName}</span>
                      <span className={badgeClass('bg-primary-50', 'text-primary-600') + ' ml-1.5'}>{a.projectType}</span>
                      <span className={badgeClass('bg-surface-100', 'text-surface-500') + ' ml-1'}>{a.analyzedMonth}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {a.risks?.filter(r => r.level === 'critical').length > 0 && (
                      <span className={badgeClass('bg-danger-50', 'text-danger-600')}>⚠️ {a.risks.filter(r => r.level === 'critical').length} critical</span>
                    )}
                    <span className="text-[10px] text-surface-400">{a.stats?.totalTasks || 0} tasks</span>
                  </div>
                </div>

                {selected?._id !== a._id && (a.features || []).length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {(a.features || []).slice(0, 4).map((f, i) => (
                      <span key={i} className="text-[9px] bg-surface-100 text-surface-600 px-[6px] py-[1px] rounded">{f}</span>
                    ))}
                    {(a.features || []).length > 4 && <span className="text-[9px] text-surface-400">+{a.features.length - 4} more</span>}
                  </div>
                )}

                {selected?._id === a._id && (
                  <div className="border-t border-surface-100 mt-3 pt-3 space-y-3">
                    {a.summary && (
                      <div className="text-xs text-surface-600 leading-relaxed p-2.5 bg-surface-50 rounded-lg border border-surface-100">
                        {a.summary}
                      </div>
                    )}

                    {a.features?.length > 0 && (
                      <div>
                        <div className={sectionLabel}>Features</div>
                        <div className="flex gap-1 flex-wrap">
                          {a.features.map((f, i) => (
                            <span key={i} className="text-[9px] bg-success-50 text-success-600 px-[6px] py-[1px] rounded border border-success-100">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {a.techStack?.length > 0 && (
                      <div>
                        <div className={sectionLabel}>Tech Stack</div>
                        <div className="flex gap-1 flex-wrap">
                          {a.techStack.map((t, i) => (
                            <span key={i} className="text-[9px] bg-[#f5f3ff] text-[#7c3aed] px-[6px] py-[1px] rounded border border-[#e9d5ff]">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {a.risks?.length > 0 && (
                      <div>
                        <div className={sectionLabel + ' text-danger-500'}>Risks</div>
                        <div className="space-y-0.5">
                          {a.risks.map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-surface-600 py-0.5 border-b border-surface-50 last:border-0">
                              <span className={`text-[8px] font-semibold px-[4px] py-[1px] rounded ${r.level === 'critical' ? 'bg-danger-50 text-danger-600' : r.level === 'high' ? 'bg-warning-50 text-warning-600' : 'bg-surface-100 text-surface-500'}`}>{r.level}</span>
                              {r.project && <strong>{r.project}:</strong>} {r.risk}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {a.projectDescription && (
                      <div className="text-[10px] text-surface-600 p-2 bg-surface-50 rounded-lg border border-surface-100">
                        <strong>Description:</strong> {a.projectDescription}
                      </div>
                    )}

                    {a.client && <div className="text-[10px] text-surface-600"><strong>Client:</strong> {a.client}</div>}

                    <div className="flex gap-1.5 flex-wrap">
                      {a.githubRepo && <span className="text-[9px] bg-surface-100 text-surface-600 px-2 py-[1px] rounded border border-surface-200">🐙 {a.githubRepo}</span>}
                      {a.technicalUrls?.frontendRepo && <span className="text-[9px] bg-success-50 text-success-600 px-2 py-[1px] rounded border border-success-200">🖥️ Frontend</span>}
                      {a.technicalUrls?.backendRepo && <span className="text-[9px] bg-warning-50 text-warning-600 px-2 py-[1px] rounded border border-warning-200">⚙️ Backend</span>}
                      {a.technicalUrls?.databaseRepo && <span className="text-[9px] bg-[#eef2ff] text-[#6366f1] px-2 py-[1px] rounded border border-[#c7d2fe]">🗄️ Database</span>}
                      {a.technicalUrls?.mobileRepo && <span className="text-[9px] bg-[#fdf2f8] text-[#db2777] px-2 py-[1px] rounded border border-[#fbcfe8]">📱 Mobile</span>}
                      {a.technicalUrls?.stagingUrl && <span className="text-[9px] bg-[#fff7ed] text-[#ea580c] px-2 py-[1px] rounded border border-[#fed7aa]">🧪 Staging</span>}
                      {a.technicalUrls?.productionUrl && <span className="text-[9px] bg-success-50 text-success-600 px-2 py-[1px] rounded border border-success-200">🚀 Production</span>}
                      {a.technicalUrls?.apiDocsUrl && <span className="text-[9px] bg-[#f5f3ff] text-[#7c3aed] px-2 py-[1px] rounded border border-[#e9d5ff]">📖 API Docs</span>}
                    </div>

                    {a.repositories?.length > 0 && (
                      <div>
                        <div className={sectionLabel}>Repositories</div>
                        {a.repositories.map((r, i) => (
                          <div key={i} className="text-[10px] text-primary-600 mb-0.5">🔗 {r.label || r.url} {r.url && <span className="text-surface-400">({r.url})</span>}</div>
                        ))}
                      </div>
                    )}

                    {a.documents?.length > 0 && (
                      <div>
                        <div className={sectionLabel}>Documents & Resources</div>
                        <div className="flex gap-1 flex-wrap">
                          {a.documents.map((d, i) => (
                            <span key={i} className="text-[9px] bg-surface-50 text-surface-600 px-[6px] py-[1px] rounded border border-surface-200">
                              {d.type === 'link' ? '🔗' : d.type === 'document' ? '📄' : d.type === 'figma' ? '🎨' : '📎'} {d.title || d.fileName || d.url?.slice(0, 30)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {a.stats && (
                      <div>
                        <div className={sectionLabel}>Stats</div>
                        <div className="flex gap-3 text-[10px] text-surface-600 flex-wrap">
                          <span>✅ {a.stats.doneTasks}/{a.stats.totalTasks} tasks done</span>
                          {a.stats.overdueTasks > 0 && <span className="text-danger-500">⚠️ {a.stats.overdueTasks} overdue</span>}
                          <span>📋 {a.stats.totalSprints} sprints</span>
                          <span>🐛 {a.stats.totalBugs} bugs</span>
                          <span>📝 {a.stats.totalDecisions} decisions</span>
                        </div>
                      </div>
                    )}

                    {a.keyDecisions?.length > 0 && (
                      <div>
                        <div className={sectionLabel}>Key Decisions</div>
                        {a.keyDecisions.slice(0, 3).map((d, i) => (
                          <div key={i} className="text-[10px] text-surface-600 py-1 border-b border-surface-50 last:border-0">
                            <strong>{d.decision}</strong>{d.rationale && <span> — {d.rationale}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Decision Journal ── */}
      {tab === 'decisions' && (
        <div>
          {decisions.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
              <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-surface-400" />
              </div>
              <h3 className="text-base font-semibold text-surface-900 mb-1">No decisions logged yet</h3>
              <p className="text-sm text-surface-500 mb-4">Record important project decisions to build your knowledge base.</p>
              {canManage && (
                <button data-voice="log-decision" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none">
                  <Plus size={13} /> Log First Decision
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.map(d => (
                <div key={d._id} className="bg-white rounded-xl border border-surface-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={badgeClass('bg-primary-50', 'text-primary-600') + ' capitalize'}>{d.refType}</span>
                        <span className="text-[9px] text-surface-400">#{d.refId?.slice(-6) || ''}</span>
                        {d.tags?.map(t => <span key={t} className="text-[8px] bg-surface-100 text-surface-500 px-[4px] py-[1px] rounded">{t}</span>)}
                      </div>
                      <div className="text-sm font-semibold text-surface-900 mb-0.5">{d.decision}</div>
                      {d.rationale && <div className="text-[10px] text-surface-600"><strong>Why:</strong> {d.rationale}</div>}
                      {d.alternatives && <div className="text-[10px] text-surface-600"><strong>Alternatives:</strong> {d.alternatives}</div>}
                      {d.outcome && <div className="text-[10px] text-surface-600"><strong>Outcome:</strong> {d.outcome}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-[22px] h-[22px] rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-[10px] font-bold">{d.createdBy?.name?.charAt(0) || '?'}</div>
                      {canManage && <X size={12} className="text-danger-400 cursor-pointer hover:text-danger-600" onClick={() => handleDeleteDecision(d._id)} />}
                    </div>
                  </div>
                  <div className="text-[9px] text-surface-300 mt-1">{new Date(d.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Déjà Vu ── */}
      {tab === 'dejavu' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <div className="text-sm font-bold text-surface-900 mb-1">🔍 Search Archived Projects</div>
            <p className="text-xs text-surface-500 mb-3">Search by feature, tech, or project name — then choose one to find similar projects.</p>
            <div className="flex gap-2">
              <input data-voice="search-dejavu" className="select flex-1 max-w-[350px] text-xs" value={dejaVuSearch}
                onChange={e => setDejaVuSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDejaVuSearch()}
                placeholder="e.g. payments, auth, API, dashboard..." />
              <button onClick={handleDejaVuSearch} disabled={dejaVuLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] disabled:opacity-50 transition-colors cursor-pointer border-none">
                {dejaVuLoading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                Search
              </button>
            </div>
          </div>

          {!dejaVu && (dejaVuResults.projects?.length > 0 || dejaVuResults.decisions?.length > 0) && (
            <div>
              <div className="text-[10px] text-surface-500 bg-surface-50 rounded-lg px-3 py-1.5 border border-surface-100 mb-2">
                {dejaVuResults.projects?.length || 0} project(s) · {dejaVuResults.decisions?.length || 0} decision(s) match "<strong>{dejaVuSearch}</strong>"
              </div>

              {dejaVuResults.projects?.map((r, i) => (
                <div key={r._id} onClick={() => navigate(`/projects/${r.projectId}`)}
                  className="bg-white rounded-xl border border-surface-200 p-3 mb-1.5 cursor-pointer border-l-[3px] border-l-primary-500 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">📁</span>
                    <span className="text-sm font-bold text-surface-900">{r.projectName}</span>
                    <span className={badgeClass('bg-primary-50', 'text-primary-600')}>{r.projectType}</span>
                    <span className={badgeClass('bg-surface-100', 'text-surface-500')}>{r.analyzedMonth}</span>
                  </div>
                  {r.features?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-1">
                      {r.features.slice(0, 5).map((f, j) => (
                        <span key={j} className="text-[9px] bg-success-50 text-success-600 px-[6px] py-[1px] rounded border border-success-100">{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-surface-400">{r.summary?.slice(0, 120)}</div>
                </div>
              ))}

              {dejaVuResults.decisions?.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-surface-900 mb-1.5 px-1">📝 Matching Decisions</div>
                  {dejaVuResults.decisions.map((d, i) => (
                    <div key={d._id} className="bg-white rounded-xl border border-surface-200 p-3 mb-1.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={badgeClass('bg-primary-50', 'text-primary-600') + ' capitalize'}>{d.refType}</span>
                        {d.tags?.map(t => <span key={t} className="text-[8px] bg-surface-100 text-surface-500 px-[4px] py-[1px] rounded">{t}</span>)}
                      </div>
                      <div className="text-sm font-semibold text-surface-900 mb-0.5">{d.decision}</div>
                      {d.rationale && <div className="text-[10px] text-surface-600"><strong>Why:</strong> {d.rationale}</div>}
                      {d.outcome && <div className="text-[10px] text-surface-600"><strong>Outcome:</strong> {d.outcome}</div>}
                      <div className="text-[9px] text-surface-400 mt-1">
                        {d.createdBy?.name && <span>by {d.createdBy.name} · </span>}
                        {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!dejaVu && dejaVuResults.projects?.length === 0 && dejaVuResults.decisions?.length === 0 && !dejaVuLoading && (
            <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
              <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-surface-400" />
              </div>
              <h3 className="text-base font-semibold text-surface-900 mb-1">Search to find similar projects</h3>
              <p className="text-sm text-surface-500">Enter a keyword to search archived projects and past decisions.</p>
            </div>
          )}

          {dejaVu && (
            <div>
              <div className="bg-white rounded-xl border border-surface-200 border-l-[3px] border-l-primary-500 p-4 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔄</span>
                  <span className="text-sm font-bold text-surface-900">{dejaVu.project}</span>
                  <span className={badgeClass('bg-primary-50', 'text-primary-600')}>{dejaVu.type}</span>
                </div>
                <p className="text-[10px] text-surface-500 mb-1">{dejaVu.similarProjects} archived projects · {dejaVu.lessons.length} similar</p>
                <span onClick={() => { setDejaVu(null); }} className="text-[10px] text-primary-600 cursor-pointer font-semibold">← Back to search</span>
              </div>
              {dejaVu.lessons.map((lesson, i) => (
                <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 mb-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base">📁</span>
                    <span className="text-sm font-bold text-surface-900">{lesson.projectName}</span>
                    <span className={badgeClass(lesson.projectStatus === 'completed' ? 'bg-success-50' : 'bg-warning-50', lesson.projectStatus === 'completed' ? 'text-success-600' : 'text-warning-600')}>{lesson.projectStatus}</span>
                    <span className={badgeClass('bg-primary-50', 'text-primary-600')}>{lesson.projectType}</span>
                    <span className={badgeClass('bg-surface-100', 'text-surface-500')}>{lesson.analyzedMonth}</span>
                  </div>
                  {lesson.summary && <div className="text-[10px] text-surface-600 leading-relaxed mb-1.5">{lesson.summary}</div>}
                  <div className="flex gap-3 text-[10px] text-surface-600 flex-wrap mb-1.5">
                    <span>✅ {lesson.completionRate}% done</span>
                    {lesson.overdueTasks > 0 && <span className="text-danger-500">⚠️ {lesson.overdueTasks} overdue</span>}
                    <span>📋 {lesson.totalSprints} sprints</span>
                    <span>🐛 {lesson.totalBugs} bugs</span>
                    <span>📝 {lesson.totalDecisions} decisions</span>
                  </div>
                  {lesson.features?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-1.5">
                      {lesson.features.map((f, j) => (
                        <span key={j} className="text-[9px] bg-success-50 text-success-600 px-[6px] py-[1px] rounded border border-success-100">{f}</span>
                      ))}
                    </div>
                  )}
                  {lesson.risks?.length > 0 && (
                    <div className="mb-1.5">
                      {lesson.risks.map((r, j) => (
                        <span key={j} className={`text-[8px] font-semibold px-[4px] py-[1px] rounded mr-1 ${r.level === 'critical' ? 'bg-danger-50 text-danger-600' : r.level === 'high' ? 'bg-warning-50 text-warning-600' : 'bg-surface-100 text-surface-500'}`}>⚠️ {r.risk}</span>
                      ))}
                    </div>
                  )}
                  {lesson.keyDecisions?.length > 0 && (
                    <div className="border-t border-surface-100 pt-1.5">
                      <div className={sectionLabel}>Key Decisions</div>
                      {lesson.keyDecisions.map((kd, j) => (
                        <div key={j} className="text-[10px] text-surface-600 py-0.5 border-b border-surface-50 last:border-0">
                          <strong>{kd.decision}</strong>{kd.rationale && <span> — {kd.rationale}</span>}
                          {kd.by && <span className="text-surface-400"> · by {kd.by}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Decision" icon="📝"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="btn btn-gray text-xs">Cancel</button>
            <button onClick={handleCreateDecision} className="btn btn-blue text-xs">Save Decision</button>
          </>
        }>
        <div className="grid gap-2">
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Ref Type</label>
            <select className="select w-full" value={form.refType} onChange={e => setForm({...form, refType: e.target.value})}>
              <option value="task">Task</option><option value="sprint">Sprint</option><option value="project">Project</option>
            </select></div>
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Ref ID *</label>
            <input className="select w-full" value={form.refId} onChange={e => setForm({...form, refId: e.target.value})} placeholder="e.g. 665abc..." required /></div>
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Decision *</label>
            <input className="select w-full" value={form.decision} onChange={e => setForm({...form, decision: e.target.value})} placeholder="What was decided?" required /></div>
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Alternatives</label>
            <input className="select w-full" value={form.alternatives} onChange={e => setForm({...form, alternatives: e.target.value})} placeholder="Other options considered" /></div>
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Rationale</label>
            <textarea className="select w-full min-h-[60px] resize-y" value={form.rationale} onChange={e => setForm({...form, rationale: e.target.value})} placeholder="Why?" /></div>
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Outcome</label>
            <textarea className="select w-full min-h-[60px] resize-y" value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} placeholder="Result?" /></div>
          <div><label className="text-[10px] font-semibold text-surface-700 block mb-0.5">Tags (comma)</label>
            <input className="select w-full" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="e.g. architecture, security" /></div>
        </div>
      </Modal>
    </div>
  );
}

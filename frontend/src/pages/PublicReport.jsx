import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

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
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-surface-500 text-sm">Loading report...</div>
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

  const d = report || {};

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-[#2347e8] px-6 py-5">
            <h1 className="text-lg font-bold text-white">Project Report</h1>
            <p className="text-white/80 text-xs mt-0.5">{d.projectName || d.project?.name || 'Project'}</p>
            {d.generatedAt && <p className="text-white/60 text-[10px] mt-1">Generated {new Date(d.generatedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>}
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* 1. Executive Summary */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Executive Summary</h3>
              <div className="bg-surface-50 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-surface-900">{d.project?.name || d.projectName}</h4>
                      {d.overallHealth && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white ${d.overallHealth === 'green' ? 'bg-green-500' : d.overallHealth === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`}>
                          {d.overallHealth === 'green' ? 'Healthy' : d.overallHealth === 'yellow' ? 'At Risk' : 'Critical'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500">
                      {d.project?.projectType && <span className="capitalize">{d.project.projectType}</span>}
                      {d.client && <><span className="mx-2">·</span>Client: {d.client}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary-600">{d.tasks?.completionRate || 0}%</p>
                    <p className="text-[10px] text-surface-400">Completion Rate</p>
                  </div>
                </div>
                <p className="text-sm text-surface-700 leading-relaxed mb-4">{d.clientSummary || `This report summarizes the delivery of ${d.project?.name || 'the project'}.`}</p>
                {d.keyMilestones?.length > 0 && (
                  <div className="border-t border-surface-200 pt-3">
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Key Milestones</p>
                    <div className="flex flex-wrap gap-2">
                      {d.keyMilestones.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-[10px] font-medium">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Project Overview */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Project Overview</h3>
              <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                {d.project?.description && (
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Objective</p>
                    <p className="text-sm text-surface-700">{d.project.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Scope</p>
                    <p className="text-sm text-surface-700">{d.tasks?.total || 0} total tasks · {d.tasks?.done || 0} completed · {d.featureCount || 0} features</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Timeline</p>
                    <p className="text-sm text-surface-700">
                      {d.project?.startDate ? new Date(d.project.startDate).toLocaleDateString() : 'N/A'}
                      {d.project?.deliveredAt ? <> → {new Date(d.project.deliveredAt).toLocaleDateString()}</> : d.project?.deadline ? <> → {new Date(d.project.deadline).toLocaleDateString()}</> : ''}
                    </p>
                  </div>
                </div>
                {d.team?.members?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Team ({d.team.totalMembers})</p>
                    <div className="flex flex-wrap gap-2">
                      {d.team.members.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-surface-200 rounded-md text-[11px] text-surface-700">
                          <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[8px] font-bold">{m.name?.charAt(0)?.toUpperCase()}</span>
                          {m.name}
                          <span className="text-surface-400">({m.role?.replace(/_/g, ' ')})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 3. What Was Delivered */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">What Was Delivered</h3>
              <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                {d.features?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Completed Features / Modules</p>
                    <div className="grid grid-cols-2 gap-2">
                      {d.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-surface-700">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border border-surface-100 p-3">
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Demo / Preview</p>
                    <div className="space-y-1">
                      {d.technicalUrls?.stagingUrl && <p className="text-xs text-surface-700">Staging: <span className="text-primary-600">{d.technicalUrls.stagingUrl}</span></p>}
                      {d.technicalUrls?.productionUrl && <p className="text-xs text-surface-700">Production: <span className="text-primary-600">{d.technicalUrls.productionUrl}</span></p>}
                      {!d.technicalUrls?.stagingUrl && !d.technicalUrls?.productionUrl && <p className="text-xs text-surface-400">No demo URLs available</p>}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-surface-100 p-3">
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Key Functionalities</p>
                    <p className="text-xs text-surface-600">{d.tasks?.done || 0} of {d.tasks?.total || 0} tasks completed ({d.tasks?.completionRate || 0}%)</p>
                    <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${d.tasks?.completionRate || 0}%` }} />
                    </div>
                  </div>
                </div>
                {d.analysisSummary && (
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Architecture Summary</p>
                    <p className="text-xs text-surface-600 leading-relaxed">{d.analysisSummary}</p>
                  </div>
                )}
              </div>
            </section>

            {/* 4. Work Completed — Chronology */}
            {d.phaseTimeline?.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Work Completed — Chronology</h3>
                <div className="bg-surface-50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-100 text-surface-500 text-left">
                        <th className="px-4 py-2 font-medium">Phase</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.phaseTimeline.map((p, i) => (
                        <tr key={i} className="border-t border-surface-200">
                          <td className="px-4 py-2 text-surface-800 font-medium capitalize">{p.label}</td>
                          <td className="px-4 py-2 text-surface-500">{p.description}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${p.completed ? 'bg-green-50 text-green-700' : p.current ? 'bg-amber-50 text-amber-700' : 'bg-surface-100 text-surface-400'}`}>
                              {p.completed ? 'Completed' : p.current ? 'In Progress' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 5. Technical Details */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Technical Details</h3>
              <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                {d.techStack?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Technology Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.techStack.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-surface-200 rounded-md text-[11px] font-medium text-surface-700">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border border-surface-100 p-3">
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Hosting / Platform</p>
                    <div className="space-y-1">
                      {d.technicalUrls?.productionUrl && <p className="text-xs text-surface-600">Production: {d.technicalUrls.productionUrl}</p>}
                      {d.technicalUrls?.stagingUrl && <p className="text-xs text-surface-600">Staging: {d.technicalUrls.stagingUrl}</p>}
                      {!d.technicalUrls?.productionUrl && !d.technicalUrls?.stagingUrl && <p className="text-xs text-surface-400">N/A</p>}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-surface-100 p-3">
                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">APIs & Integrations</p>
                    <p className="text-xs text-surface-600">{d.technicalUrls?.apiDocsUrl || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Issues & Resolutions */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Issues &amp; Resolutions</h3>
              <div className="bg-surface-50 rounded-xl p-5">
                {(d.risks?.length > 0 || d.blockers?.length > 0 || d.bugs?.items?.length > 0) ? (
                  <div className="space-y-3">
                    {d.risks?.length > 0 && <div><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Risks</p><div className="space-y-1">{d.risks.map((r, i) => <p key={i} className="text-xs text-surface-700 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{r}</p>)}</div></div>}
                    {d.blockers?.length > 0 && <div className="border-t border-surface-200 pt-3"><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Blockers</p><div className="space-y-1">{d.blockers.map((b, i) => <p key={i} className="text-xs text-surface-700 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{b}</p>)}</div></div>}
                    {d.bugs?.items?.length > 0 && (
                      <div className="border-t border-surface-200 pt-3">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Bugs ({d.bugs.total})</p>
                        <table className="w-full text-xs">
                          <thead><tr className="text-surface-500 text-left"><th className="pr-3 py-1 font-medium">Issue</th><th className="pr-3 py-1 font-medium">Severity</th><th className="py-1 font-medium">Status</th></tr></thead>
                          <tbody>{d.bugs.items.slice(0, 10).map((b, i) => (
                            <tr key={i} className="border-t border-surface-200"><td className="pr-3 py-1.5 text-surface-700">{b.title}</td><td className="pr-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${b.severity === 'critical' ? 'bg-red-50 text-red-700' : b.severity === 'high' ? 'bg-amber-50 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>{b.severity}</span></td><td className="py-1.5 text-surface-600 capitalize">{b.status}</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-surface-400 text-center py-4">No issues recorded during this project phase.</p>
                )}
              </div>
            </section>

            {/* 7. Testing Results */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Testing Results</h3>
              <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border border-surface-100 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{d.testing?.passRate || 0}%</p>
                    <p className="text-[10px] text-surface-400">Test Pass Rate</p>
                  </div>
                  <div className="bg-white rounded-lg border border-surface-100 p-4 text-center">
                    <p className="text-2xl font-bold text-surface-900">{d.testing?.total || 0}</p>
                    <p className="text-[10px] text-surface-400">Total Tests</p>
                  </div>
                  <div className="bg-white rounded-lg border border-surface-100 p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">{d.bugFixedCount || 0}/{d.bugTotalCount || 0}</p>
                    <p className="text-[10px] text-surface-400">Bugs Fixed</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. Key Decisions */}
            {d.keyDecisions?.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Key Decisions</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <table className="w-full text-xs">
                    <thead><tr className="text-surface-500 text-left"><th className="pb-2 pr-3 font-medium">Decision</th><th className="pb-2 pr-3 font-medium">Rationale</th><th className="pb-2 font-medium">Outcome</th></tr></thead>
                    <tbody>{d.keyDecisions.map((kd, i) => (
                      <tr key={i} className="border-t border-surface-200"><td className="py-2 pr-3 text-surface-700">{kd.decision || kd.title}</td><td className="py-2 pr-3 text-surface-500">{kd.rationale}</td><td className="py-2 text-surface-600">{kd.outcome}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 9. Documents */}
            {d.documents?.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Documents &amp; Resources</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="space-y-2">{d.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-surface-100 p-3">
                      <span className="text-lg">{doc.type === 'pdf' ? '📄' : doc.type === 'image' ? '🖼️' : '📎'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-surface-700 truncate">{doc.title || doc.fileName || 'Document'}</p>
                        {doc.url && <p className="text-[10px] text-primary-600 truncate">{doc.url}</p>}
                      </div>
                    </div>
                  ))}</div>
                </div>
              </section>
            )}

          </div>

          <div className="px-6 py-3 bg-surface-50 text-[9px] text-surface-400 text-center">
            Generated by GRESIO — Project Intelligence Platform
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsService } from '../services/reports';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import ShareReportModal from '../components/ShareReportModal';

export default function ReportPreviewPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    reportsService.getById(id)
      .then((res) => setReport(res.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      await reportsService.countDownload(id);
      pdf.save(`${report?.data?.project?.name || 'report'}_${report?.type}.pdf`);
      toast.success('PDF downloaded!');
    } catch (e) {
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-surface-500">Report not found.</p>
      </div>
    );
  }

  const d = report.data;
  const isAdmin = report.type === 'admin';
  const isCustom = d?.edited && d?.customSections?.length > 0;

  return (
    <div className="min-h-screen bg-surface-50">
      <PublicNavbar />
      <div className="pt-24 pb-8 px-5 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 font-medium">&larr; Back to Reports</Link>
            <h1 className="text-2xl font-bold text-surface-900 mt-1">{d?.title || d?.project?.name || 'Report'} {isCustom && <span className="text-[10px] font-normal text-surface-400 ml-2">(Custom)</span>}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button onClick={() => setShowShare(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 text-surface-700 font-medium rounded-lg hover:bg-surface-200 transition-colors text-sm cursor-pointer border-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share
              </button>
            )}
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm disabled:opacity-50 cursor-pointer border-none"
            >
              {exporting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating PDF...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF</>
              )}
            </button>
          </div>
        </div>
        <ShareReportModal open={showShare} onClose={() => setShowShare(false)} reportId={report?._id} />

        <div ref={reportRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* HEADER */}
          <div className={`px-10 py-8 ${isAdmin ? 'bg-primary-600' : 'bg-surface-900'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-white tracking-tight">GRESIO</span>
                  <span className="text-white/40 text-sm">|</span>
                  <span className="text-white/70 text-sm font-medium">Certified by 360 DMMC</span>
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${isAdmin ? 'bg-white/20 text-white' : 'bg-primary-500 text-white'}`}>
                  {isAdmin ? 'PROJECT CLOSURE REPORT — ADMIN' : 'DELIVERY REPORT — CLIENT'}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Generated</p>
                <p className="text-white font-medium text-sm">{new Date(d?.generatedAt || report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* PROJECT OVERVIEW */}
          <div className="px-10 py-6 border-b border-surface-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-surface-900">{d?.project?.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                  <span className="capitalize">{d?.project?.type}</span>
                  <span className="w-1 h-1 rounded-full bg-surface-300" />
                  <span className="capitalize">Status: {d?.project?.status}</span>
                  {d?.client && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-surface-300" />
                      <span>Client: {d.client}</span>
                    </>
                  )}
                  {d?.project?.duration && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-surface-300" />
                      <span>{d.project.duration} days</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary-600">{d?.tasks?.completionRate || 0}%</p>
                <p className="text-xs text-surface-400">Completion Rate</p>
              </div>
            </div>
            {d?.project?.description && (
              <p className="text-sm text-surface-500 mt-3">{d.project.description}</p>
            )}
          </div>

          {/* KEY METRICS ROW */}
          <div className="grid grid-cols-4 gap-px bg-surface-100">
            {(isAdmin ? [
              { label: 'Tasks', value: `${d?.tasks?.done || 0}/${d?.tasks?.total || 0}`, sub: 'Done' },
              { label: 'Test Pass Rate', value: `${d?.testing?.passRate || 0}%`, sub: `${d?.testing?.total || 0} tests` },
              { label: 'Sprints', value: `${d?.sprints?.completed || 0}`, sub: `${d?.sprints?.total || 0} total` },
              { label: 'Team', value: `${d?.team?.totalMembers || 0}`, sub: 'Members' },
            ] : [
              { label: 'Completion', value: `${d?.tasks?.completionRate || 0}%`, sub: `${d?.tasks?.done || 0}/${d?.tasks?.total || 0} tasks` },
              { label: 'Test Pass Rate', value: `${d?.testing?.passRate || 0}%`, sub: `${d?.testing?.total || 0} tests` },
              { label: d?.featureCount > 0 ? 'Features' : 'Duration', value: d?.featureCount > 0 ? `${d.featureCount}` : `${d?.project?.duration || 0}`, sub: d?.featureCount > 0 ? 'Delivered' : 'Days' },
              { label: 'Team', value: `${d?.team?.totalMembers || 0}`, sub: 'Members' },
            ]).map((m, i) => (
              <div key={i} className="bg-white px-6 py-4 text-center">
                <p className="text-xl font-bold text-surface-900">{m.value}</p>
                <p className="text-xs text-surface-500">{m.label}</p>
                <p className="text-[10px] text-surface-400">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="px-10 py-8 space-y-8">
            {isCustom ? (
              /* Custom report sections — same design as auto-generated */
              d.customSections.map((section, idx) => (
                <section key={section.key || idx}>
                  <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">{section.title}</h3>
                  <div className="bg-surface-50 rounded-xl p-5 report-html" dangerouslySetInnerHTML={{ __html: section.content || '' }} />
                </section>
              ))
            ) : (
              <>
              {isAdmin ? (<>
              {/* EXECUTIVE SUMMARY */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Executive Summary</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="space-y-3 text-sm text-surface-700">
                    <p><strong>{d?.project?.name}</strong> was a <strong>{d?.project?.type}</strong> project that ran for <strong>{d?.project?.duration || 'N/A'}</strong> days.</p>
                    <p>Task completion rate: <strong>{d?.tasks?.completionRate}%</strong> ({d?.tasks?.done}/{d?.tasks?.total} tasks completed). Test pass rate: <strong>{d?.testing?.passRate}%</strong> ({d?.testing?.passed}/{d?.testing?.total} tests passed).</p>
                    <p>Overdue tasks: <strong>{d?.tasks?.overdue || 0}</strong>. Delayed tasks: <strong>{d?.tasks?.delayed || 0}</strong>.</p>
                    {d?.project?.deliveryNotes && <p>Delivery notes: <em>{d.project.deliveryNotes}</em></p>}
                  </div>
                </div>
              </section>

              {/* TASK COMPLETION */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Task Completion</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-surface-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-surface-500">Done</span>
                      <span className="text-xs font-bold text-green-600">{d?.tasks?.done || 0}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${d?.tasks?.completionRate || 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-surface-400">
                      <span>In Progress: {d?.tasks?.inProgress || 0}</span>
                      <span>Todo: {d?.tasks?.todo || 0}</span>
                      <span>Delayed: {d?.tasks?.delayed || 0}</span>
                    </div>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-4">
                    <p className="text-xs text-surface-500 mb-2">Priority Distribution</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Urgent', count: d?.tasks?.byPriority?.urgent || 0, color: 'bg-red-500' },
                        { label: 'High', count: d?.tasks?.byPriority?.high || 0, color: 'bg-amber-500' },
                        { label: 'Medium', count: d?.tasks?.byPriority?.medium || 0, color: 'bg-blue-500' },
                        { label: 'Low', count: d?.tasks?.byPriority?.low || 0, color: 'bg-surface-400' },
                      ].map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color}`} />
                          <span className="text-xs text-surface-600 flex-1">{p.label}</span>
                          <span className="text-xs font-medium text-surface-800">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {d?.tasks?.byAssignee?.length > 0 && (
                  <div className="bg-surface-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-700 mb-2">Tasks by Assignee</p>
                    <div className="space-y-2">
                      {d.tasks.byAssignee.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="w-28 font-medium text-surface-700 truncate">{a.name}</span>
                          <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${a.total > 0 ? (a.done / a.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-surface-500 w-16 text-right">{a.done}/{a.total}</span>
                          <span className="text-surface-400 w-20 text-right">{a.logged}h / {a.estimated}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* SPRINT PERFORMANCE */}
              {d?.sprints?.velocity?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Sprint Performance</h3>
                  <div className="bg-surface-50 rounded-xl p-4">
                    <div className="space-y-2">
                      {d.sprints.velocity.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="w-40 font-medium text-surface-700 truncate">{s.name}</span>
                          <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.total > 0 ? (s.done / s.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-surface-500 w-16 text-right">{s.done}/{s.total} done</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* TESTING & QUALITY */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Testing &amp; Quality</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-50 rounded-xl p-4">
                    <p className="text-xs text-surface-500 mb-2">Test Case Results</p>
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{d?.testing?.passRate || 0}%</p>
                        <p className="text-[10px] text-surface-400">Pass Rate</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-green-500" /> Passed: {d?.testing?.passed || 0}</div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-red-500" /> Failed: {d?.testing?.failed || 0}</div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-amber-500" /> Blocked: {d?.testing?.blocked || 0}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-4">
                    <p className="text-xs text-surface-500 mb-2">By Type</p>
                    <div className="space-y-1.5">
                      {Object.entries(d?.testing?.byType || {}).filter(([, v]) => v > 0).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="capitalize text-surface-600 flex-1">{k}</span>
                          <span className="font-medium text-surface-800">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* TEAM */}
              {d?.team?.members?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Team Performance</h3>
                  <div className="bg-surface-50 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-surface-100 text-surface-500 text-left"><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Role</th></tr></thead>
                      <tbody>{d?.team?.members?.map((m, i) => (
                        <tr key={i} className="border-t border-surface-200"><td className="px-4 py-2 text-surface-800">{m.name}</td><td className="px-4 py-2 text-surface-500">{m.email}</td><td className="px-4 py-2 text-surface-600 capitalize">{m.role?.replace(/_/g, ' ')}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* EFFORT TRACKING */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Effort Tracking</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-surface-900">{d?.tasks?.estimatedHours || 0}h</p><p className="text-xs text-surface-500">Estimated</p></div>
                  <div className="bg-surface-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-primary-600">{d?.tasks?.loggedHours || 0}h</p><p className="text-xs text-surface-500">Logged</p></div>
                  <div className="bg-surface-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-600">{d?.tasks?.overdue || 0}</p><p className="text-xs text-surface-500">Overdue Tasks</p></div>
                </div>
              </section>

              {/* RESOURCES */}
              {d?.resources?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Resources</h3>
                  <div className="bg-surface-50 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-surface-100 text-surface-500 text-left"><th className="px-4 py-2 font-medium">Title</th><th className="px-4 py-2 font-medium">Category</th></tr></thead>
                      <tbody>{d.resources.map((r, i) => (
                        <tr key={i} className="border-t border-surface-200"><td className="px-4 py-2 text-surface-800">{r.title}</td><td className="px-4 py-2 text-surface-500 capitalize">{r.category}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}
              </>) : (<>
              {/* 1. EXECUTIVE SUMMARY */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Executive Summary</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold text-surface-900">{d?.project?.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white ${d?.overallHealth === 'green' ? 'bg-green-500' : d?.overallHealth === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`}>
                          {d?.overallHealth === 'green' ? 'Healthy' : d?.overallHealth === 'yellow' ? 'At Risk' : 'Critical'}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500">
                        {d?.project?.type && <span className="capitalize">{d.project.type}</span>}
                        {d?.client && <><span className="mx-2">·</span>Client: {d.client}</>}
                        <span className="mx-2">·</span>Report: {new Date(d?.generatedAt || report.generatedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary-600">{d?.tasks?.completionRate || 0}%</p>
                      <p className="text-[10px] text-surface-400">Completion Rate</p>
                    </div>
                  </div>
                  <p className="text-sm text-surface-700 leading-relaxed mb-4">{d?.clientSummary || `This report summarizes the delivery of ${d?.project?.name || 'the project'}.`}</p>
                  {d?.keyMilestones?.length > 0 && (
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

              {/* 2. PROJECT OVERVIEW */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Project Overview</h3>
                <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                  {d?.project?.description && (
                    <div>
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Objective</p>
                      <p className="text-sm text-surface-700">{d.project.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Scope</p>
                      <p className="text-sm text-surface-700">{d?.tasks?.total || 0} total tasks · {d?.tasks?.done || 0} completed · {d?.featureCount || 0} features</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Timeline</p>
                      <p className="text-sm text-surface-700">
                        {d?.project?.startDate ? new Date(d.project.startDate).toLocaleDateString() : 'N/A'}
                        {d?.project?.deliveredAt ? <> → {new Date(d.project.deliveredAt).toLocaleDateString()}</> : d?.project?.deadline ? <> → {new Date(d.project.deadline).toLocaleDateString()}</> : ''}
                        <span className="text-surface-400 ml-2">({d?.project?.duration || 0} days)</span>
                      </p>
                    </div>
                  </div>
                  {d?.team?.members?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Team ({d.team.totalMembers})</p>
                      <div className="flex flex-wrap gap-2">
                        {d.team.members.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-surface-200 rounded-md text-[11px] text-surface-700">
                            <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[8px] font-bold">{m.name.charAt(0).toUpperCase()}</span>
                            {m.name}
                            <span className="text-surface-400">({m.role.replace(/_/g, ' ')})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. WHAT WAS DELIVERED */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">What Was Delivered</h3>
                <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                  {d?.features?.length > 0 && (
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
                        {d?.technicalUrls?.stagingUrl && <p className="text-xs text-surface-700">Staging: <span className="text-primary-600">{d.technicalUrls.stagingUrl}</span></p>}
                        {d?.technicalUrls?.productionUrl && <p className="text-xs text-surface-700">Production: <span className="text-primary-600">{d.technicalUrls.productionUrl}</span></p>}
                        {!d?.technicalUrls?.stagingUrl && !d?.technicalUrls?.productionUrl && <p className="text-xs text-surface-400">No demo URLs available</p>}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Key Functionalities</p>
                      <p className="text-xs text-surface-600">{d?.tasks?.done || 0} of {d?.tasks?.total || 0} tasks completed ({d?.tasks?.completionRate || 0}%)</p>
                      <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${d?.tasks?.completionRate || 0}%` }} />
                      </div>
                    </div>
                  </div>
                  {d?.analysisSummary && (
                    <div>
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Architecture Summary</p>
                      <p className="text-xs text-surface-600 leading-relaxed">{d.analysisSummary}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* 4. WORK COMPLETED — CHRONOLOGY */}
              {d?.phaseTimeline?.length > 0 && (
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

              {/* 5. TECHNICAL DETAILS */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Technical Details</h3>
                <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                  {d?.techStack?.length > 0 && (
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
                        {d?.technicalUrls?.productionUrl && <p className="text-xs text-surface-600">Production: {d.technicalUrls.productionUrl}</p>}
                        {d?.technicalUrls?.stagingUrl && <p className="text-xs text-surface-600">Staging: {d.technicalUrls.stagingUrl}</p>}
                        {!d?.technicalUrls?.productionUrl && !d?.technicalUrls?.stagingUrl && <p className="text-xs text-surface-400">N/A</p>}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">APIs & Integrations</p>
                      <p className="text-xs text-surface-600">
                        {d?.technicalUrls?.apiDocsUrl ? <span>API Docs: {d.technicalUrls.apiDocsUrl}</span> : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Repositories</p>
                      <div className="space-y-1">
                        {d?.project?.repositories?.length > 0 ? d.project.repositories.map((r, i) => (
                          <p key={i} className="text-xs text-surface-600 truncate">{r.label || 'Repo'}: {r.url || 'N/A'}</p>
                        )) : <p className="text-xs text-surface-400">N/A</p>}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Security</p>
                      <p className="text-xs text-surface-600">{d?.testing?.byType?.security > 0 ? `${d.testing.byType.security} security tests passed` : 'Standard security measures applied'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. ISSUES & RESOLUTIONS */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Issues &amp; Resolutions</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  {(d?.risks?.length > 0 || d?.blockers?.length > 0 || d?.bugs?.items?.length > 0) ? (
                    <div className="space-y-3">
                      {d?.risks?.length > 0 && <div><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Risks</p><div className="space-y-1">{d.risks.map((r, i) => <p key={i} className="text-xs text-surface-700 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{r}</p>)}</div></div>}
                      {d?.blockers?.length > 0 && <div className="border-t border-surface-200 pt-3"><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Blockers</p><div className="space-y-1">{d.blockers.map((b, i) => <p key={i} className="text-xs text-surface-700 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{b}</p>)}</div></div>}
                      {d?.bugs?.items?.length > 0 && (
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

              {/* 7. TESTING RESULTS */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Testing Results</h3>
                <div className="bg-surface-50 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-surface-100 p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{d?.testing?.passRate || 0}%</p>
                      <p className="text-[10px] text-surface-400">Test Pass Rate</p>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-4 text-center">
                      <p className="text-2xl font-bold text-surface-900">{d?.testing?.total || 0}</p>
                      <p className="text-[10px] text-surface-400">Total Tests</p>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-4 text-center">
                      <p className="text-2xl font-bold text-primary-600">{d?.bugFixedCount || 0}/{d?.bugTotalCount || 0}</p>
                      <p className="text-[10px] text-surface-400">Bugs Fixed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Test Breakdown</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-green-500" /> Passed: {d?.testing?.passed || 0}</div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-red-500" /> Failed: {d?.testing?.failed || 0}</div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-amber-500" /> Blocked: {d?.testing?.blocked || 0}</div>
                      </div>
                    </div>
                    {Object.entries(d?.testing?.byType || {}).filter(([, v]) => v > 0).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">By Type</p>
                        <div className="space-y-1.5">
                          {Object.entries(d.testing.byType).filter(([, v]) => v > 0).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2 text-xs"><span className="capitalize text-surface-600 flex-1">{k}</span><span className="font-medium text-surface-800">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 8. DEPLOYMENT INFO */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Deployment Information</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Live URLs</p>
                      <div className="space-y-1">
                        {d?.technicalUrls?.productionUrl && <p className="text-xs text-surface-700">Production: <span className="text-primary-600">{d.technicalUrls.productionUrl}</span></p>}
                        {d?.technicalUrls?.stagingUrl && <p className="text-xs text-surface-700">Staging: <span className="text-primary-600">{d.technicalUrls.stagingUrl}</span></p>}
                        {!d?.technicalUrls?.productionUrl && !d?.technicalUrls?.stagingUrl && <p className="text-xs text-surface-400">Not specified</p>}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Hosting Details</p>
                      <div className="space-y-1">
                        {d?.technicalUrls?.frontendRepo && <p className="text-xs text-surface-600">Frontend: {d.technicalUrls.frontendRepo}</p>}
                        {d?.technicalUrls?.backendRepo && <p className="text-xs text-surface-600">Backend: {d.technicalUrls.backendRepo}</p>}
                        {d?.technicalUrls?.databaseRepo && <p className="text-xs text-surface-600">Database: {d.technicalUrls.databaseRepo}</p>}
                        {d?.technicalUrls?.mobileRepo && <p className="text-xs text-surface-600">Mobile: {d.technicalUrls.mobileRepo}</p>}
                        {!d?.technicalUrls?.frontendRepo && !d?.technicalUrls?.backendRepo && <p className="text-xs text-surface-400">Not specified</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 9. DOCUMENTATION */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Documentation</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  {d?.resources?.length > 0 || d?.documents?.length > 0 ? (
                    <div className="space-y-3">
                      {d?.resources?.length > 0 && <div><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Resources</p><div className="space-y-1">{d.resources.map((r, i) => <p key={i} className="text-xs text-surface-700 flex items-center gap-2"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{r.title} <span className="text-surface-400 capitalize">({r.category})</span></p>)}</div></div>}
                      {d?.documents?.length > 0 && <div className="border-t border-surface-200 pt-3"><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Documents</p><div className="space-y-1">{d.documents.map((doc, i) => <p key={i} className="text-xs text-surface-700 flex items-center gap-2"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{doc.title} <span className="text-surface-400 capitalize">({doc.type})</span></p>)}</div></div>}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400 text-center py-4">No documentation resources recorded.</p>
                  )}
                </div>
              </section>

              {/* 10. TRAINING & HANDOVER */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Training &amp; Handover</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <p className="text-xs text-surface-400 text-center py-4">Training sessions and handover documentation can be arranged upon request. Contact your GRESIO account manager for details.</p>
                </div>
              </section>

              {/* 11. SUPPORT & MAINTENANCE */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Support &amp; Maintenance</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Warranty Period</p>
                      <p className="text-xs text-surface-600">Standard 30-day post-delivery warranty included</p>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Support Channels</p>
                      <p className="text-xs text-surface-600">Email: support@gresio.com</p>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Response Time</p>
                      <p className="text-xs text-surface-600">Standard SLA: 24-48 business hours</p>
                    </div>
                    <div className="bg-white rounded-lg border border-surface-100 p-3">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Maintenance</p>
                      <p className="text-xs text-surface-600">Scheduled maintenance as per agreement</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 12. FINANCIAL SUMMARY */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Financial Summary</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <p className="text-xs text-surface-400 text-center py-4">Financial details are available in the original project proposal and contract. Contact your GRESIO account manager for a detailed financial breakdown.</p>
                </div>
              </section>

              {/* 13. CLIENT FEEDBACK */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Client Feedback</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <p className="text-xs text-surface-400 text-center py-4">Client satisfaction survey and feedback collection to follow. We value your input to continuously improve our services.</p>
                </div>
              </section>

              {/* 14. NEXT STEPS */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Next Steps &amp; Recommendations</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="space-y-3 text-sm text-surface-700">
                    {d?.project?.deliveryNotes ? (
                      <p className="leading-relaxed">{d.project.deliveryNotes}</p>
                    ) : (
                      <p className="leading-relaxed">The project has been successfully delivered. Consider the following next steps:</p>
                    )}
                    {d?.keyDecisions?.length > 0 && (
                      <div className="border-t border-surface-200 pt-3">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Recommended Actions</p>
                        <ul className="space-y-1">
                          {d.keyDecisions.slice(0, 5).map((dec, i) => (
                            <li key={i} className="text-xs text-surface-600 flex items-start gap-2">
                              <span className="text-primary-600 mt-0.5">→</span>
                              {dec.outcome || dec.decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="border-t border-surface-200 pt-3">
                      <div className="flex items-center gap-3 text-xs text-surface-500">
                        <span>support@gresio.com</span>
                        <span className="w-1 h-1 rounded-full bg-surface-300" />
                        <span>gresio.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 15. APPENDICES */}
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Appendices</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  {(d?.documents?.length > 0 || d?.resources?.length > 0) ? (
                    <div className="space-y-3">
                      {d?.documents?.length > 0 && <div><p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Documents & Resources</p><table className="w-full text-xs"><thead><tr className="text-surface-500 text-left"><th className="pr-3 py-1 font-medium">Title</th><th className="pr-3 py-1 font-medium">Type</th><th className="py-1 font-medium">URL</th></tr></thead><tbody>{[...(d.documents || []), ...(d.resources?.map(r => ({ title: r.title, type: r.category, url: r.url })) || [])].slice(0, 15).map((item, i) => (<tr key={i} className="border-t border-surface-200"><td className="pr-3 py-1.5 text-surface-700">{item.title}</td><td className="pr-3 py-1.5 text-surface-500 capitalize">{item.type || 'Resource'}</td><td className="py-1.5 text-primary-600">{item.url || '—'}</td></tr>))}</tbody></table></div>}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400 text-center py-4">No appendices attached.</p>
                  )}
                </div>
              </section>
              </>)}
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-surface-100 px-10 py-5">
            <div className="flex items-center justify-between text-xs text-surface-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-surface-600">GRESIO</span>
                <span>·</span>
                <span>Certified by <strong>360 DMMC</strong></span>
              </div>
              <span>Generated on {new Date(d?.generatedAt || report.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
      <style>{`
        .report-html p { margin: 4px 0; }
        .report-html ul, .report-html ol { margin: 4px 0; padding-left: 20px; }
        .report-html img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
        .report-html table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        .report-html td, .report-html th { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        .report-html th { background: #f9fafb; font-weight: 600; }
        .report-html a { color: #2347e8; }
        .report-html blockquote { border-left: 3px solid #2347e8; margin: 8px 0; padding: 4px 12px; color: #6b7280; font-style: italic; }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsService } from '../services/reports';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import ShareReportModal from '../components/ShareReportModal';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar, Legend,
} from 'recharts';

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
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-tertiary)]">Report not found.</p>
      </div>
    );
  }

  const d = report.data;
  const isAdmin = report.type === 'admin';
  const isCustom = d?.edited && d?.customSections?.length > 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] page-enter">
      <PublicNavbar />
      <div className="pt-24 pb-8 px-5 max-w-5xl mx-auto">
        <div className="glass-panel flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <Link to="/reports" className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium">&larr; Back to Reports</Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{d?.title || d?.project?.name || 'Report'} {isCustom && <span className="text-[10px] font-normal text-[var(--text-muted)] ml-2">(Custom)</span>}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button onClick={() => setShowShare(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium rounded-lg hover:bg-[var(--border-primary)] transition-colors text-sm cursor-pointer border-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share
              </button>
            )}
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="btn-premium flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
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

        <div ref={reportRef} className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--glass-border)] rounded-[var(--radius-xl)] shadow-elevation overflow-hidden animate-scale-in">
          {/* COVER PAGE */}
          <div className={`px-12 py-16 ${isAdmin ? 'bg-gradient-to-br from-[var(--brand-primary)] to-blue-900' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'}`}>
            <div className="flex flex-col items-start min-h-[300px] justify-between">
              <div>
                <Logo variant="textOnly" size="lg" inverted />
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-white/40 text-xs">|</span>
                  <span className="text-white/50 text-xs font-medium tracking-wider uppercase">Certified by 360 DMMC</span>
                </div>
              </div>
              <div className="mt-auto">
                <div className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider mb-4 ${isAdmin ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'}`}>
                  {isAdmin ? 'PROJECT CLOSURE REPORT' : 'CLIENT DELIVERY REPORT'}
                </div>
                <h1 className="text-4xl font-bold text-white leading-tight mb-2">{d?.project?.name || 'Project Report'}</h1>
                <p className="text-white/60 text-sm max-w-xl">
                  {isAdmin
                    ? `Comprehensive project performance analysis — ${d?.project?.type || 'project'} engagement`
                    : `Final delivery report for ${d?.client || d?.project?.client || 'client'} — detailed account of work completed, milestones achieved, and quality metrics`}
                </p>
                <div className="flex items-center gap-4 mt-6 text-white/50 text-xs">
                  <span>Prepared: {new Date(d?.generatedAt || report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  {d?.project?.duration && (
                    <>
                      <span className="w-px h-3 bg-white/20" />
                      <span>Duration: {d.project.duration} days</span>
                    </>
                  )}
                  {d?.team?.totalMembers > 0 && (
                    <>
                      <span className="w-px h-3 bg-white/20" />
                      <span>Team: {d.team.totalMembers} members</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HEADER */}
          <div className={`px-10 py-5 ${isAdmin ? 'bg-[var(--brand-primary)]/5' : 'bg-[var(--bg-primary)]'} border-b border-[var(--border-primary)]`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Logo variant="textOnly" size="md" />
                  <span className="text-[var(--text-muted)] text-sm">|</span>
                  <span className="text-[var(--text-muted)] text-sm font-medium">Certified by 360 DMMC</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[var(--text-muted)] text-xs">Generated</p>
                <p className="text-[var(--text-primary)] font-medium text-sm">{new Date(d?.generatedAt || report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* PROJECT OVERVIEW */}
          <div className="px-10 py-6 border-b border-[var(--border-primary)]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{d?.project?.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-tertiary)]">
                  <span className="capitalize">{d?.project?.type}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                  <span className="capitalize">Status: {d?.project?.status}</span>
                  {d?.client && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                      <span>Client: {d.client}</span>
                    </>
                  )}
                  {d?.project?.duration && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                      <span><span className="num-mono">{d.project.duration}</span> days</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-[var(--brand-primary)] num-mono">{d?.tasks?.completionRate || 0}%</p>
                <p className="text-xs text-[var(--text-muted)]">Completion Rate</p>
              </div>
            </div>
            {d?.project?.description && (
              <p className="text-sm text-[var(--text-tertiary)] mt-3">{d.project.description}</p>
            )}
          </div>

          {/* KEY METRICS ROW */}
          <div className="grid grid-cols-4 gap-px bg-[var(--border-primary)]">
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
              <div key={i} className="bg-white dark:bg-[var(--bg-secondary)] px-6 py-4 text-center">
                <p className="text-xl font-bold text-[var(--text-primary)] num-mono">{m.value}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{m.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="px-10 py-8 space-y-8">
            {isCustom ? (
              d.customSections.map((section, idx) => (
                <section key={section.key || idx}>
                  <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">{section.title}</h3>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5 report-html" dangerouslySetInnerHTML={{ __html: section.content || '' }} />
                </section>
              ))
            ) : (
              <>
              {isAdmin ? (<>
              {/* EXECUTIVE SUMMARY */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Executive Summary</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                    <p><strong>{d?.project?.name}</strong> was a <strong>{d?.project?.type}</strong> project that ran for <strong><span className="num-mono">{d?.project?.duration || 'N/A'}</span></strong> days.</p>
                    <p>Task completion rate: <strong><span className="num-mono">{d?.tasks?.completionRate}%</span></strong> (<span className="num-mono">{d?.tasks?.done}</span>/<span className="num-mono">{d?.tasks?.total}</span> tasks completed). Test pass rate: <strong><span className="num-mono">{d?.testing?.passRate}%</span></strong> (<span className="num-mono">{d?.testing?.passed}</span>/<span className="num-mono">{d?.testing?.total}</span> tests passed).</p>
                    <p>Overdue tasks: <strong><span className="num-mono">{d?.tasks?.overdue || 0}</span></strong>. Delayed tasks: <strong><span className="num-mono">{d?.tasks?.delayed || 0}</span></strong>.</p>
                    {d?.project?.deliveryNotes && <p>Delivery notes: <em>{d.project.deliveryNotes}</em></p>}
                  </div>
                </div>
              </section>

              {/* TASK COMPLETION */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Task Completion</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-3">Status Distribution</p>
                    <div className="flex items-center gap-4">
                      <div className="w-28 h-28 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[
                              { name: 'Done', value: d?.tasks?.done || 0, color: '#10b981' },
                              { name: 'In Progress', value: d?.tasks?.inProgress || 0, color: '#3b82f6' },
                              { name: 'Todo', value: d?.tasks?.todo || 0, color: '#6b7280' },
                              { name: 'Delayed', value: d?.tasks?.delayed || 0, color: '#f59e0b' },
                            ].filter(i => i.value > 0)} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="value" startAngle={90} endAngle={-270}>
                              {[].map((_, i) => <Cell key={i} />)}
                              {['#10b981','#3b82f6','#6b7280','#f59e0b'].slice(0, (['Done','In Progress','Todo','Delayed'].filter((_,i) => [d?.tasks?.done||0,d?.tasks?.inProgress||0,d?.tasks?.todo||0,d?.tasks?.delayed||0][i]>0).length)).map((c, i) => <Cell key={i} fill={c} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Done', count: d?.tasks?.done || 0, color: '#10b981' },
                          { label: 'In Progress', count: d?.tasks?.inProgress || 0, color: '#3b82f6' },
                          { label: 'Todo', count: d?.tasks?.todo || 0, color: '#6b7280' },
                          { label: 'Delayed', count: d?.tasks?.delayed || 0, color: '#f59e0b' },
                        ].filter(i => i.count > 0).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-[var(--text-secondary)]">{p.label}</span>
                            <span className="font-medium text-[var(--text-primary)] num-mono">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-2">Priority Distribution</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Urgent', count: d?.tasks?.byPriority?.urgent || 0, color: 'bg-red-500' },
                        { label: 'High', count: d?.tasks?.byPriority?.high || 0, color: 'bg-amber-500' },
                        { label: 'Medium', count: d?.tasks?.byPriority?.medium || 0, color: 'bg-blue-500' },
                        { label: 'Low', count: d?.tasks?.byPriority?.low || 0, color: 'bg-[var(--text-muted)]' },
                      ].map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color}`} />
                          <span className="text-xs text-[var(--text-secondary)] flex-1">{p.label}</span>
                          <span className="text-xs font-medium text-[var(--text-primary)] num-mono">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {d?.tasks?.byAssignee?.length > 0 && (
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Tasks by Assignee</p>
                    <div className="space-y-2">
                      {d.tasks.byAssignee.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="w-28 font-medium text-[var(--text-secondary)] truncate">{a.name}</span>
                          <div className="flex-1 h-2 bg-[var(--border-primary)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--brand-primary)] rounded-full" style={{ width: `${a.total > 0 ? (a.done / a.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[var(--text-tertiary)] w-16 text-right num-mono">{a.done}/{a.total}</span>
                          <span className="text-[var(--text-muted)] w-20 text-right num-mono">{a.logged}h / {a.estimated}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* SPRINT PERFORMANCE */}
              {d?.sprints?.velocity?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Sprint Performance</h3>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={d.sprints.velocity} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-primary)' }} />
                          <Bar dataKey="done" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              )}

              {/* TESTING & QUALITY */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Testing &amp; Quality</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-2">Test Case Results</p>
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 num-mono">{d?.testing?.passRate || 0}%</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Pass Rate</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-green-500" /> Passed: <span className="num-mono">{d?.testing?.passed || 0}</span></div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-red-500" /> Failed: <span className="num-mono">{d?.testing?.failed || 0}</span></div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-amber-500" /> Blocked: <span className="num-mono">{d?.testing?.blocked || 0}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-2">By Type</p>
                    <div className="space-y-1.5">
                      {Object.entries(d?.testing?.byType || {}).filter(([, v]) => v > 0).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="capitalize text-[var(--text-secondary)] flex-1">{k}</span>
                          <span className="font-medium text-[var(--text-primary)] num-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* TEAM */}
              {d?.team?.members?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Team Performance</h3>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-left"><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Role</th></tr></thead>
                      <tbody>{d?.team?.members?.map((m, i) => (
                        <tr key={i} className="border-t border-[var(--border-primary)]"><td className="px-4 py-2 text-[var(--text-primary)]">{m.name}</td><td className="px-4 py-2 text-[var(--text-tertiary)]">{m.email}</td><td className="px-4 py-2 text-[var(--text-secondary)] capitalize">{m.role?.replace(/_/g, ' ')}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* EFFORT TRACKING */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Effort Tracking</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4 text-center"><p className="text-2xl font-bold text-[var(--text-primary)] num-mono">{d?.tasks?.estimatedHours || 0}h</p><p className="text-xs text-[var(--text-tertiary)]">Estimated</p></div>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4 text-center"><p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{d?.tasks?.loggedHours || 0}h</p><p className="text-xs text-[var(--text-tertiary)]">Logged</p></div>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4 text-center"><p className="text-2xl font-bold text-amber-600 num-mono">{d?.tasks?.overdue || 0}</p><p className="text-xs text-[var(--text-tertiary)]">Overdue Tasks</p></div>
                </div>
              </section>

              {/* RESOURCES */}
              {d?.resources?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Resources</h3>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-left"><th className="px-4 py-2 font-medium">Title</th><th className="px-4 py-2 font-medium">Category</th></tr></thead>
                      <tbody>{d.resources.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--border-primary)]"><td className="px-4 py-2 text-[var(--text-primary)]">{r.title}</td><td className="px-4 py-2 text-[var(--text-tertiary)] capitalize">{r.category}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}
              </>) : (<>
              {/* 1. EXECUTIVE SUMMARY */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Executive Summary</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold text-[var(--text-primary)]">{d?.project?.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white ${d?.overallHealth === 'green' ? 'bg-green-500' : d?.overallHealth === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`}>
                          {d?.overallHealth === 'green' ? 'Healthy' : d?.overallHealth === 'yellow' ? 'At Risk' : 'Critical'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {d?.project?.type && <span className="capitalize">{d.project.type}</span>}
                        {d?.client && <><span className="mx-2">·</span>Client: {d.client}</>}
                        <span className="mx-2">·</span>Report: {new Date(d?.generatedAt || report.generatedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-[var(--brand-primary)] num-mono">{d?.tasks?.completionRate || 0}%</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Completion Rate</p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{d?.clientSummary || `This report summarizes the delivery of ${d?.project?.name || 'the project'}.`}</p>
                  {d?.keyMilestones?.length > 0 && (
                    <div className="border-t border-[var(--border-primary)] pt-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Key Milestones</p>
                      <div className="flex flex-wrap gap-2">
                        {d.keyMilestones.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-md text-[10px] font-medium">
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
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Project Overview</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5 space-y-4">
                  {d?.project?.description && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Objective</p>
                      <p className="text-sm text-[var(--text-secondary)]">{d.project.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Scope</p>
                      <p className="text-sm text-[var(--text-secondary)]"><span className="num-mono">{d?.tasks?.total || 0}</span> total tasks · <span className="num-mono">{d?.tasks?.done || 0}</span> completed · <span className="num-mono">{d?.featureCount || 0}</span> features</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Timeline</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {d?.project?.startDate ? new Date(d.project.startDate).toLocaleDateString() : 'N/A'}
                        {d?.project?.deliveredAt ? <> → {new Date(d.project.deliveredAt).toLocaleDateString()}</> : d?.project?.deadline ? <> → {new Date(d.project.deadline).toLocaleDateString()}</> : ''}
                        <span className="text-[var(--text-muted)] ml-2">(<span className="num-mono">{d?.project?.duration || 0}</span> days)</span>
                      </p>
                    </div>
                  </div>
                  {d?.team?.members?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Team (<span className="num-mono">{d.team.totalMembers}</span>)</p>
                      <div className="flex flex-wrap gap-2">
                        {d.team.members.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[11px] text-[var(--text-secondary)]">
                            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] flex items-center justify-center text-[8px] font-bold">{m.name.charAt(0).toUpperCase()}</span>
                            {m.name}
                            <span className="text-[var(--text-muted)]">({m.role.replace(/_/g, ' ')})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. WHAT WAS DELIVERED */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">What Was Delivered</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5 space-y-4">
                  {d?.features?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Completed Features / Modules</p>
                      <div className="grid grid-cols-2 gap-2">
                        {d.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Demo / Preview</p>
                      <div className="space-y-1">
                        {d?.technicalUrls?.stagingUrl && <p className="text-xs text-[var(--text-secondary)]">Staging: <span className="text-[var(--brand-primary)]">{d.technicalUrls.stagingUrl}</span></p>}
                        {d?.technicalUrls?.productionUrl && <p className="text-xs text-[var(--text-secondary)]">Production: <span className="text-[var(--brand-primary)]">{d.technicalUrls.productionUrl}</span></p>}
                        {!d?.technicalUrls?.stagingUrl && !d?.technicalUrls?.productionUrl && <p className="text-xs text-[var(--text-muted)]">No demo URLs available</p>}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Key Functionalities</p>
                      <p className="text-xs text-[var(--text-secondary)]"><span className="num-mono">{d?.tasks?.done || 0}</span> of <span className="num-mono">{d?.tasks?.total || 0}</span> tasks completed (<span className="num-mono">{d?.tasks?.completionRate || 0}%</span>)</p>
                      <div className="w-full h-1.5 bg-[var(--border-primary)] rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${d?.tasks?.completionRate || 0}%` }} />
                      </div>
                    </div>
                  </div>
                  {d?.analysisSummary && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Architecture Summary</p>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{d.analysisSummary}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* 4. WORK COMPLETED — CHRONOLOGY */}
              {d?.phaseTimeline?.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Work Completed — Chronology</h3>
                  <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-left">
                          <th className="px-4 py-2 font-medium">Phase</th>
                          <th className="px-4 py-2 font-medium">Description</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.phaseTimeline.map((p, i) => (
                          <tr key={i} className="border-t border-[var(--border-primary)]">
                            <td className="px-4 py-2 text-[var(--text-primary)] font-medium capitalize">{p.label}</td>
                            <td className="px-4 py-2 text-[var(--text-tertiary)]">{p.description}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${p.completed ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : p.current ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
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
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Technical Details</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5 space-y-4">
                  {d?.techStack?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Technology Stack</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.techStack.map((t, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[11px] font-medium text-[var(--text-secondary)]">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Hosting / Platform</p>
                      <div className="space-y-1">
                        {d?.technicalUrls?.productionUrl && <p className="text-xs text-[var(--text-secondary)]">Production: {d.technicalUrls.productionUrl}</p>}
                        {d?.technicalUrls?.stagingUrl && <p className="text-xs text-[var(--text-secondary)]">Staging: {d.technicalUrls.stagingUrl}</p>}
                        {!d?.technicalUrls?.productionUrl && !d?.technicalUrls?.stagingUrl && <p className="text-xs text-[var(--text-muted)]">N/A</p>}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">APIs & Integrations</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {d?.technicalUrls?.apiDocsUrl ? <span>API Docs: {d.technicalUrls.apiDocsUrl}</span> : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Repositories</p>
                      <div className="space-y-1">
                        {d?.project?.repositories?.length > 0 ? d.project.repositories.map((r, i) => (
                          <p key={i} className="text-xs text-[var(--text-secondary)] truncate">{r.label || 'Repo'}: {r.url || 'N/A'}</p>
                        )) : <p className="text-xs text-[var(--text-muted)]">N/A</p>}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Security</p>
                      <p className="text-xs text-[var(--text-secondary)]">{d?.testing?.byType?.security > 0 ? `${d.testing.byType.security} security tests passed` : 'Standard security measures applied'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. ISSUES & RESOLUTIONS */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Issues &amp; Resolutions</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  {(d?.risks?.length > 0 || d?.blockers?.length > 0 || d?.bugs?.items?.length > 0) ? (
                    <div className="space-y-3">
                      {d?.risks?.length > 0 && <div><p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Risks</p><div className="space-y-1">{d.risks.map((r, i) => <p key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{r}</p>)}</div></div>}
                      {d?.blockers?.length > 0 && <div className="border-t border-[var(--border-primary)] pt-3"><p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Blockers</p><div className="space-y-1">{d.blockers.map((b, i) => <p key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{b}</p>)}</div></div>}
                      {d?.bugs?.items?.length > 0 && (
                        <div className="border-t border-[var(--border-primary)] pt-3">
                          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Bugs (<span className="num-mono">{d.bugs.total}</span>)</p>
                          <table className="w-full text-xs">
                            <thead><tr className="text-[var(--text-tertiary)] text-left"><th className="pr-3 py-1 font-medium">Issue</th><th className="pr-3 py-1 font-medium">Severity</th><th className="py-1 font-medium">Status</th></tr></thead>
                            <tbody>{d.bugs.items.slice(0, 10).map((b, i) => (
                              <tr key={i} className="border-t border-[var(--border-primary)]"><td className="pr-3 py-1.5 text-[var(--text-secondary)]">{b.title}</td><td className="pr-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${b.severity === 'critical' ? 'bg-red-50 text-red-700 dark:bg-red-900/20' : b.severity === 'high' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>{b.severity}</span></td><td className="py-1.5 text-[var(--text-secondary)] capitalize">{b.status}</td></tr>
                            ))}</tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No issues recorded during this project phase.</p>
                  )}
                </div>
              </section>

              {/* 7. TESTING RESULTS */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Testing Results</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className="text-2xl font-bold text-green-600 num-mono">{d?.testing?.passRate || 0}%</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Test Pass Rate</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className="text-2xl font-bold text-[var(--text-primary)] num-mono">{d?.testing?.total || 0}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Total Tests</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{d?.bugFixedCount || 0}/{d?.bugTotalCount || 0}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Bugs Fixed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Test Breakdown</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-green-500" /> Passed: <span className="num-mono">{d?.testing?.passed || 0}</span></div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-red-500" /> Failed: <span className="num-mono">{d?.testing?.failed || 0}</span></div>
                        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-amber-500" /> Blocked: <span className="num-mono">{d?.testing?.blocked || 0}</span></div>
                      </div>
                    </div>
                    {Object.entries(d?.testing?.byType || {}).filter(([, v]) => v > 0).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">By Type</p>
                        <div className="space-y-1.5">
                          {Object.entries(d.testing.byType).filter(([, v]) => v > 0).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2 text-xs"><span className="capitalize text-[var(--text-secondary)] flex-1">{k}</span><span className="font-medium text-[var(--text-primary)] num-mono">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 8. DEPLOYMENT INFO */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Deployment Information</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Live URLs</p>
                      <div className="space-y-1">
                        {d?.technicalUrls?.productionUrl && <p className="text-xs text-[var(--text-secondary)]">Production: <span className="text-[var(--brand-primary)]">{d.technicalUrls.productionUrl}</span></p>}
                        {d?.technicalUrls?.stagingUrl && <p className="text-xs text-[var(--text-secondary)]">Staging: <span className="text-[var(--brand-primary)]">{d.technicalUrls.stagingUrl}</span></p>}
                        {!d?.technicalUrls?.productionUrl && !d?.technicalUrls?.stagingUrl && <p className="text-xs text-[var(--text-muted)]">Not specified</p>}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Hosting Details</p>
                      <div className="space-y-1">
                        {d?.technicalUrls?.frontendRepo && <p className="text-xs text-[var(--text-secondary)]">Frontend: {d.technicalUrls.frontendRepo}</p>}
                        {d?.technicalUrls?.backendRepo && <p className="text-xs text-[var(--text-secondary)]">Backend: {d.technicalUrls.backendRepo}</p>}
                        {d?.technicalUrls?.databaseRepo && <p className="text-xs text-[var(--text-secondary)]">Database: {d.technicalUrls.databaseRepo}</p>}
                        {d?.technicalUrls?.mobileRepo && <p className="text-xs text-[var(--text-secondary)]">Mobile: {d.technicalUrls.mobileRepo}</p>}
                        {!d?.technicalUrls?.frontendRepo && !d?.technicalUrls?.backendRepo && <p className="text-xs text-[var(--text-muted)]">Not specified</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 9. DOCUMENTATION */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Documentation</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  {d?.resources?.length > 0 || d?.documents?.length > 0 ? (
                    <div className="space-y-3">
                      {d?.resources?.length > 0 && <div><p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Resources</p><div className="space-y-1">{d.resources.map((r, i) => <p key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{r.title} <span className="text-[var(--text-muted)] capitalize">({r.category})</span></p>)}</div></div>}
                      {d?.documents?.length > 0 && <div className="border-t border-[var(--border-primary)] pt-3"><p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Documents</p><div className="space-y-1">{d.documents.map((doc, i) => <p key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{doc.title} <span className="text-[var(--text-muted)] capitalize">({doc.type})</span></p>)}</div></div>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No documentation resources recorded.</p>
                  )}
                </div>
              </section>

              {/* 10. TRAINING & HANDOVER */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Training &amp; Handover</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">Training sessions and handover documentation can be arranged upon request. Contact your GRESIO account manager for details.</p>
                </div>
              </section>

              {/* 11. SUPPORT & MAINTENANCE */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Support &amp; Maintenance</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Warranty Period</p>
                      <p className="text-xs text-[var(--text-secondary)]">Standard 30-day post-delivery warranty included</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Support Channels</p>
                      <p className="text-xs text-[var(--text-secondary)]">Email: support@gresio.com</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Response Time</p>
                      <p className="text-xs text-[var(--text-secondary)]">Standard SLA: 24-48 business hours</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Maintenance</p>
                      <p className="text-xs text-[var(--text-secondary)]">Scheduled maintenance as per agreement</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 12. FINANCIAL SUMMARY */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Financial Summary</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className="text-2xl font-bold text-[var(--brand-primary)] num-mono">{d?.tasks?.loggedHours || 0}h</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Total Hours Invested</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className="text-2xl font-bold text-[var(--text-primary)] num-mono">{d?.tasks?.estimatedHours || 0}h</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Hours Estimated</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className={`text-2xl font-bold num-mono ${(d?.effortVariance || 0) > 10 ? 'text-amber-600' : 'text-green-600'}`}>
                        {d?.effortVariance > 0 ? '+' : ''}{d?.effortVariance || 0}%
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">Effort Variance</p>
                    </div>
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 text-center">
                      <p className="text-2xl font-bold text-[var(--text-primary)] num-mono">{d?.avgHoursPerTask || 0}h</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Avg Hours / Task</p>
                    </div>
                  </div>
                  {d?.effortVariance !== undefined && (
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Effort Breakdown</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Estimated</span>
                          <span className="font-medium text-[var(--text-primary)] num-mono">{d?.tasks?.estimatedHours || 0}h</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Actual (Logged)</span>
                          <span className="font-medium text-[var(--brand-primary)] num-mono">{d?.tasks?.loggedHours || 0}h</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--border-primary)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((d?.tasks?.loggedHours || 0) / Math.max(d?.tasks?.estimatedHours || 1, 1) * 100, 100)}%`, backgroundColor: (d?.effortVariance || 0) > 10 ? '#f59e0b' : '#10b981' }} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {d.effortVariance > 0
                            ? `${d.effortVariance}% over the estimated baseline — ${d.effortVariance > 20 ? 'scope may have expanded during development.' : 'within acceptable tolerance.'}`
                            : d.effortVariance < 0
                              ? `${Math.abs(d.effortVariance)}% under the estimated baseline — delivered efficiently.`
                              : 'On target with estimates.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 13. CLIENT FEEDBACK */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Client Feedback</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">Client satisfaction survey and feedback collection to follow. We value your input to continuously improve our services.</p>
                </div>
              </section>

              {/* 14. NEXT STEPS */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Next Steps &amp; Recommendations</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                    {d?.project?.deliveryNotes ? (
                      <p className="leading-relaxed">{d.project.deliveryNotes}</p>
                    ) : (
                      <p className="leading-relaxed">The project has been successfully delivered. Consider the following next steps:</p>
                    )}
                    {d?.keyDecisions?.length > 0 && (
                      <div className="border-t border-[var(--border-primary)] pt-3">
                        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Recommended Actions</p>
                        <ul className="space-y-1">
                          {d.keyDecisions.slice(0, 5).map((dec, i) => (
                            <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                              <span className="text-[var(--brand-primary)] mt-0.5">→</span>
                              {dec.outcome || dec.decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="border-t border-[var(--border-primary)] pt-3">
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span>support@gresio.com</span>
                        <span className="w-1 h-1 rounded-full bg-[var(--border-secondary)]" />
                        <span>gresio.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 15. APPENDICES */}
              <section>
                <h3 className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Appendices</h3>
                <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-5">
                  {(d?.documents?.length > 0 || d?.resources?.length > 0) ? (
                    <div className="space-y-3">
                      {d?.documents?.length > 0 && <div><p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Documents & Resources</p><table className="w-full text-xs"><thead><tr className="text-[var(--text-tertiary)] text-left"><th className="pr-3 py-1 font-medium">Title</th><th className="pr-3 py-1 font-medium">Type</th><th className="py-1 font-medium">URL</th></tr></thead><tbody>{[...(d.documents || []), ...(d.resources?.map(r => ({ title: r.title, type: r.category, url: r.url })) || [])].slice(0, 15).map((item, i) => (<tr key={i} className="border-t border-[var(--border-primary)]"><td className="pr-3 py-1.5 text-[var(--text-secondary)]">{item.title}</td><td className="pr-3 py-1.5 text-[var(--text-tertiary)] capitalize">{item.type || 'Resource'}</td><td className="py-1.5 text-[var(--brand-primary)]">{item.url || '—'}</td></tr>))}</tbody></table></div>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No appendices attached.</p>
                  )}
                </div>
              </section>
              </>)}
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-[var(--border-primary)] px-10 py-5">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <Logo variant="textOnly" size="sm" />
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
        .report-html td, .report-html th { border: 1px solid var(--border-primary); padding: 6px 8px; text-align: left; }
        .report-html th { background: var(--bg-secondary); font-weight: 600; }
        .report-html a { color: var(--brand-primary); }
        .report-html blockquote { border-left: 3px solid var(--brand-primary); margin: 8px 0; padding: 4px 12px; color: var(--text-tertiary); font-style: italic; }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsService } from '../services/reports';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

export default function ReportPreviewPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  return (
    <div className="min-h-screen bg-surface-50">
      <PublicNavbar />
      <div className="pt-24 pb-8 px-5 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 font-medium">&larr; Back to Reports</Link>
            <h1 className="text-2xl font-bold text-surface-900 mt-1">{d?.title || 'Report'}</h1>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm disabled:opacity-50"
          >
            {exporting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating PDF...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF</>
            )}
          </button>
        </div>

        <div ref={reportRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* HEADER */}
          <div className={`px-10 py-8 ${isAdmin ? 'bg-primary-600' : 'bg-surface-900'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-white tracking-tight">CIOS</span>
                  <span className="text-white/40 text-sm">|</span>
                  <span className="text-white/70 text-sm font-medium">Certified by 360 DMMC</span>
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${isAdmin ? 'bg-white/20 text-white' : 'bg-primary-500 text-white'}`}>
                  {isAdmin ? 'PROJECT CLOSURE REPORT — ADMIN' : 'PROJECT SUMMARY — CLIENT'}
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
            {[
              { label: 'Tasks', value: `${d?.tasks?.done || 0}/${d?.tasks?.total || 0}`, sub: 'Done' },
              { label: 'Test Pass Rate', value: `${d?.testing?.passRate || 0}%`, sub: `${d?.testing?.total || 0} tests` },
              { label: 'Sprints', value: `${d?.sprints?.completed || 0}`, sub: `${d?.sprints?.total || 0} total` },
              { label: 'Team', value: `${d?.team?.totalMembers || 0}`, sub: 'Members' },
            ].map((m, i) => (
              <div key={i} className="bg-white px-6 py-4 text-center">
                <p className="text-xl font-bold text-surface-900">{m.value}</p>
                <p className="text-xs text-surface-500">{m.label}</p>
                <p className="text-[10px] text-surface-400">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="px-10 py-8 space-y-8">
            {/* EXECUTIVE SUMMARY */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Executive Summary</h3>
              <div className="bg-surface-50 rounded-xl p-5">
                {isAdmin ? (
                  <div className="space-y-3 text-sm text-surface-700">
                    <p><strong>{d?.project?.name}</strong> was a <strong>{d?.project?.type}</strong> project that ran for <strong>{d?.project?.duration || 'N/A'}</strong> days.</p>
                    <p>Task completion rate: <strong>{d?.tasks?.completionRate}%</strong> ({d?.tasks?.done}/{d?.tasks?.total} tasks completed). Test pass rate: <strong>{d?.testing?.passRate}%</strong> ({d?.testing?.passed}/{d?.testing?.total} tests passed).</p>
                    <p>Overdue tasks: <strong>{d?.tasks?.overdue || 0}</strong>. Delayed tasks: <strong>{d?.tasks?.delayed || 0}</strong>.</p>
                    {d?.project?.deliveryNotes && <p>Delivery notes: <em>{d.project.deliveryNotes}</em></p>}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-surface-700">
                    <p className="leading-relaxed"><strong>CIOS</strong> (Comprehensive Internal Operating System) is a full-featured project lifecycle management platform built with <strong>React</strong>, <strong>Node.js</strong>, and <strong>MongoDB</strong>. It delivers end-to-end project tracking with intelligent automation, role-based access, and real-time collaboration.</p>
                    <p className="leading-relaxed">The platform follows a structured <strong>8-phase methodology</strong> — Discovery → Planning → Development → Testing → Review → Launch → Delivered → Report — with automated phase transitions and manual approval gates for critical milestones.</p>
                  </div>
                )}
              </div>
            </section>

            {/* TASK COMPLETION / FEATURES */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">{isAdmin ? 'Task Completion' : 'Platform Features'}</h3>
              {isAdmin ? (
                <>
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
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: '🗂️', title: 'Project Lifecycle', desc: '8-phase automated workflow with smart phase transitions and manual approval gates for critical milestones.' },
                    { icon: '👥', title: 'Role-Based Access', desc: '8 user roles (Admin, PM, Team Lead, Manager, QA, Developer, Intern, Other) with 27+ granular permissions.' },
                    { icon: '📊', title: 'Analytics Dashboard', desc: 'Real-time company health score, velocity tracking, workload analysis, and participation scoring across teams.' },
                    { icon: '🧪', title: 'Testing Suite', desc: 'Built-in test case management with auto-creation of bug tasks from failed tests and multi-type test support.' },
                    { icon: '📋', title: 'Kanban Boards', desc: 'Drag-and-drop task management with sprint planning, burndown charts, and real-time progress tracking.' },
                    { icon: '🔗', title: 'Integrations', desc: 'Azure AD / Microsoft 365 import, GitHub, Microsoft Teams, and Outlook integration for seamless workflows.' },
                  ].map((f, i) => (
                    <div key={i} className="bg-surface-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{f.icon}</span>
                        <p className="text-sm font-semibold text-surface-800">{f.title}</p>
                      </div>
                      <p className="text-xs text-surface-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SPRINT PERFORMANCE (Admin only) */}
            {isAdmin && d?.sprints?.velocity?.length > 0 && (
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

            {/* TESTING & QUALITY / DESIGN & VISUALS */}
            <section>
              <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">{isAdmin ? 'Testing &amp; Quality' : 'Design &amp; Visual Experience'}</h3>
              {isAdmin ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-xs text-surface-500 mb-2">Test Case Results</p>
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{d?.testing?.passRate || 0}%</p>
                      <p className="text-[10px] text-surface-400">Pass Rate</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Passed: {d?.testing?.passed || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Failed: {d?.testing?.failed || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Blocked: {d?.testing?.blocked || 0}</span>
                      </div>
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
              ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🎨', title: 'Tailwind CSS UI', desc: 'Modern utility-first styling with a cohesive surface/primary color palette, smooth transitions, and responsive breakpoints.' },
                  { icon: '📱', title: 'Fully Responsive', desc: 'Fluid layout adapts from mobile to desktop with a collapsible sidebar, hamburger navigation, and optimized touch targets.' },
                  { icon: '🌙', title: 'Dark Mode Ready', desc: 'Deep navy sidebar (#0F172A) contrasts with clean white content areas. Surface color tokens support future theme switching.' },
                  { icon: '⚡', title: 'Real-Time Updates', desc: 'Socket.io-powered live notifications, online user indicators, and instant UI updates without page refreshes.' },
                  { icon: '🎯', title: 'Micro-Interactions', desc: 'Loading skeletons, animated spinners, toast notifications, hover scale effects, and phase progression animations throughout.' },
                  { icon: '📐', title: 'Data Visualizations', desc: 'Burndown charts, completion bars, priority distribution graphs, health score indicators, and color-coded performance metrics.' },
                ].map((f, i) => (
                  <div key={i} className="bg-surface-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{f.icon}</span>
                      <p className="text-sm font-semibold text-surface-800">{f.title}</p>
                    </div>
                    <p className="text-xs text-surface-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
              )}
            </section>

            {/* METHODOLOGY (Client only) */}
            {!isAdmin && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">CIOS Methodology</h3>
                <div className="bg-surface-50 rounded-xl p-5">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { num: 1, name: 'Discovery', color: 'bg-primary-600' },
                      { num: 2, name: 'Planning', color: 'bg-primary-600' },
                      { num: 3, name: 'Execution', color: 'bg-primary-600' },
                      { num: 4, name: 'Testing', color: 'bg-primary-600' },
                      { num: 5, name: 'Review', color: 'bg-amber-500' },
                      { num: 6, name: 'Launch', color: 'bg-surface-800' },
                      { num: 7, name: 'Delivered', color: 'bg-surface-300' },
                      { num: 8, name: 'Report', color: 'bg-surface-300' },
                    ].map((p, i) => (
                      <div key={i} className="flex flex-col items-center text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.color} mb-1`}>{p.num}</div>
                        <span className="text-[10px] font-medium text-surface-600">{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-surface-500 leading-relaxed">Projects flow through 8 phases with automated transitions for the first 4 phases. Phases 5–8 require manual approval by authorized roles. Each project type (Software, Design, Business, Content, Research) has adapted phase names while following the same underlying logic.</p>
                </div>
              </section>
            )}

            {/* TEAM */}
            {isAdmin && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Team Performance</h3>
                <div className="bg-surface-50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-100 text-surface-500 text-left">
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d?.team?.members?.map((m, i) => (
                        <tr key={i} className="border-t border-surface-200">
                          <td className="px-4 py-2 text-surface-800">{m.name}</td>
                          <td className="px-4 py-2 text-surface-500">{m.email}</td>
                          <td className="px-4 py-2 text-surface-600 capitalize">{m.role?.replace(/_/g, ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* EFFORT (Admin only) */}
            {isAdmin && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Effort Tracking</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-surface-900">{d?.tasks?.estimatedHours || 0}h</p>
                    <p className="text-xs text-surface-500">Estimated</p>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">{d?.tasks?.loggedHours || 0}h</p>
                    <p className="text-xs text-surface-500">Logged</p>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{d?.tasks?.overdue || 0}</p>
                    <p className="text-xs text-surface-500">Overdue Tasks</p>
                  </div>
                </div>
              </section>
            )}

            {/* RESOURCES */}
            {isAdmin && d?.resources?.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-3">Resources</h3>
                <div className="bg-surface-50 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-100 text-surface-500 text-left">
                        <th className="px-4 py-2 font-medium">Title</th>
                        <th className="px-4 py-2 font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.resources.map((r, i) => (
                        <tr key={i} className="border-t border-surface-200">
                          <td className="px-4 py-2 text-surface-800">{r.title}</td>
                          <td className="px-4 py-2 text-surface-500 capitalize">{r.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-surface-100 px-10 py-5">
            <div className="flex items-center justify-between text-xs text-surface-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-surface-600">CIOS</span>
                <span>·</span>
                <span>Certified by <strong>360 DMMC</strong></span>
              </div>
              <span>Generated on {new Date(d?.generatedAt || report.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

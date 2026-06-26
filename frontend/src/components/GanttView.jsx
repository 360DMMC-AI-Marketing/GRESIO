const PHASES = ['discovery', 'planning', 'development', 'testing', 'review', 'launch', 'delivered', 'report'];

const PHASE_LABELS = {
  discovery: 'Discovery',
  planning: 'Planning',
  development: 'Development',
  testing: 'Testing',
  review: 'Review',
  launch: 'Launch',
  delivered: 'Delivered',
  report: 'Report',
};

const PHASE_COLORS = {
  discovery: { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1' },
  planning: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  development: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  testing: { bg: '#fefce8', text: '#a16207', dot: '#eab308' },
  review: { bg: '#f5f3ff', text: '#6d28d9', dot: '#8b5cf6' },
  launch: { bg: '#fff1f2', text: '#be123c', dot: '#ef4444' },
  delivered: { bg: '#f0fdf4', text: '#15803d', dot: '#10b981' },
  report: { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
};

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTimelineBar(startDate, deadline) {
  if (!startDate && !deadline) return null;

  const start = startDate ? new Date(startDate) : new Date();
  const end = deadline ? new Date(deadline) : new Date(start.getTime() + 30 * 86400000);
  const today = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = today.getTime() - start.getTime();
  const remainingMs = end.getTime() - today.getTime();
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100)) : 0;
  const daysLeft = Math.ceil(remainingMs / 86400000);

  return { start, end, pct, daysLeft };
}

export default function GanttView({ projects, predictions, onBack }) {
  if (!projects || projects.length === 0) {
    return <div className="text-center py-10 text-xs" style={{ color: 'var(--text-muted)' }}>No projects to show</div>;
  }

  const grouped = {};
  PHASES.forEach(ph => grouped[ph] = []);
  projects.forEach(p => {
    const phase = p.phase || 'planning';
    if (grouped[phase]) grouped[phase].push(p);
    else grouped.planning.push(p);
  });

  return (
    <div>
      {onBack && (
        <button onClick={onBack} className="pt-back-btn">
          ← Back to Dashboard
        </button>
      )}
      <div className="phase-timeline-scroll">
        <div className="phase-timeline-grid">
          {PHASES.map(phase => {
            const col = PHASE_COLORS[phase];
            const phaseProjects = grouped[phase] || [];
            return (
              <div key={phase} className="pt-column">
                <div className="pt-header" style={{ background: col.bg, color: col.text }}>
                  <span className="pt-dot" style={{ background: col.dot }} />
                  <span className="pt-label">{PHASE_LABELS[phase]}</span>
                  <span className="pt-count">{phaseProjects.length}</span>
                </div>
                <div className="pt-body">
                  {phaseProjects.length === 0 ? (
                    <div className="pt-empty">—</div>
                  ) : phaseProjects.map(p => {
                    const pred = predictions?.find(pr => String(pr.projectId) === String(p._id));
                    const riskColor = pred?.risk === 'high' ? '#ef4444' : pred?.risk === 'medium' ? '#f59e0b' : '';
                    const tl = getTimelineBar(p.startDate, pred?.deadline || p.deadline);
                    return (
                      <a key={p._id} href={`/projects/${p._id}`} className="pt-card" style={{ textDecoration: 'none' }}>
                        <div className="pt-card-top">
                          <span className="pt-card-name">{p.name}</span>
                          {p.projectType && <span className="pt-type">{p.projectType}</span>}
                        </div>

                        {tl && (
                          <div className="pt-timeline-row">
                            <span className="pt-tl-date">{fmtDate(tl.start)}</span>
                            <div className="pt-tl-track" title={`${tl.daysLeft}d remaining`}>
                              <div className="pt-tl-fill" style={{
                                width: `${tl.pct}%`,
                                background: tl.daysLeft <= 0 ? '#ef4444' : tl.daysLeft <= 7 ? '#f59e0b' : 'var(--brand-primary)'
                              }} />
                              <div className="pt-tl-now" style={{ left: `${tl.pct}%` }} />
                            </div>
                            <span className="pt-tl-date">{fmtDate(tl.end)}</span>
                          </div>
                        )}

                        {(!tl) && (
                          <div className="pt-card-prog">
                            <div className="pt-prog-track">
                              <div className="pt-prog-fill" style={{ width: `${p.progress || 0}%` }} />
                            </div>
                            <span className="pt-prog-text">{p.progress || 0}%</span>
                          </div>
                        )}

                        {tl && tl.daysLeft <= 7 && (
                          <div className="pt-deadline-warn" style={{ color: tl.daysLeft <= 0 ? '#ef4444' : '#f59e0b' }}>
                            {tl.daysLeft <= 0 ? `🔴 ${Math.abs(tl.daysLeft)}d overdue` : `🟡 ${tl.daysLeft}d left`}
                          </div>
                        )}

                        {riskColor && (
                          <div className="pt-risk" style={{ color: riskColor }}>
                            {pred.risk === 'high' ? '🔴' : '🟡'} {pred.risk}
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

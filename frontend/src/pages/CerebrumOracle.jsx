import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cerebrum } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Activity, TrendingUp, TrendingDown, Skull, AlertTriangle, CheckCircle, DollarSign, BrainCircuit, ArrowLeft, ChevronRight, AlertOctagon, BarChart3, ExternalLink } from 'lucide-react';

const SOURCE_CONFIG = {
  clickup: { label: 'ClickUp', color: '#7b68ee' },
  jira: { label: 'Jira', color: '#2684ff' },
  github: { label: 'GitHub', color: '#6e40c9' },
  stripe: { label: 'Stripe', color: '#635bff' },
  teams: { label: 'Teams', color: '#6264a7' },
  outlook: { label: 'Outlook', color: '#0078d4' },
  internal: { label: 'System', color: '#64748b' },
};

function SourceBadge({ source, count }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.internal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600,
      background: `${cfg.color}14`, color: cfg.color, border: `1px solid ${cfg.color}22`,
      letterSpacing: '0.02em',
    }}>
      {cfg.label}{count !== undefined && <span style={{ opacity: 0.7 }}>·{count}</span>}
    </span>
  );
}

function ViabilityGauge({ score, size = 60, showLabel = true, animated = true }) {
  const r = size === 60 ? 26 : 46;
  const stroke = size === 60 ? 5 : 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score > 70 ? '#22c55e' : score > 45 ? '#eab308' : score > 25 ? '#f97316' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={animated ? offset : circ} transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.3s ease' }} />
        <text x={size/2} y={size/2 + 6} textAnchor="middle" fill="white" fontSize={size === 60 ? 16 : 24} fontWeight="700">{score}</text>
      </svg>
      {showLabel && (
        <span style={{ fontSize: 9, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {score > 70 ? 'Healthy' : score > 45 ? 'Caution' : score > 25 ? 'At Risk' : 'Critical'}
        </span>
      )}
    </div>
  );
}

function TrendSparkline({ history, width = 120, height = 28 }) {
  if (!history || history.length < 2) return null;
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = sorted.map(h => h.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const trend = lastVal - firstVal;
  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#64748b';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
      <span style={{ fontSize: 10, color: trendColor, fontWeight: 600 }}>
        {trend > 0 ? '+' : ''}{trend}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <Icon size={13} color="#64748b" />
      <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>{title}</span>
      {action}
    </div>
  );
}

function EvidenceSourceBreakdown({ earlySignals }) {
  if (!earlySignals || earlySignals.length === 0) return null;
  const bySource = {};
  for (const s of earlySignals) {
    const src = s.source || 'internal';
    bySource[src] = (bySource[src] || 0) + 1;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {Object.entries(bySource).map(([source, count]) => (
        <SourceBadge key={source} source={source} count={count} />
      ))}
    </div>
  );
}

function RiskFactorsGrouped({ riskFactors }) {
  if (!riskFactors || riskFactors.length === 0) return null;
  const bySource = {};
  for (const rf of riskFactors) {
    const src = rf.category || 'internal';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(rf);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(bySource).map(([source, factors]) => (
        <div key={source}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <SourceBadge source={source} />
            <span style={{ fontSize: 9, color: '#475569' }}>{factors.length} factor{factors.length > 1 ? 's' : ''}</span>
          </div>
          {factors.map((rf, i) => {
            const rfColor = rf.impact > 70 ? '#ef4444' : rf.impact > 40 ? '#eab308' : '#22c55e';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ flex: 1, fontSize: 11, color: '#cbd5e1', lineHeight: 1.3 }}>{rf.factor}</span>
                <div style={{ width: 80, height: 3, borderRadius: 2, background: 'rgba(148,163,184,0.08)', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: rfColor, width: `${Math.min(100, rf.impact)}%`, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 10, color: rfColor, fontWeight: 600, width: 28, textAlign: 'right', flexShrink: 0 }}>{rf.impact}%</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EarlySignalList({ earlySignals }) {
  if (!earlySignals || earlySignals.length === 0) {
    return <div style={{ padding: '10px 14px', background: 'rgba(148,163,184,0.03)', borderRadius: 6, fontSize: 11, color: '#64748b' }}>No early warning signals detected.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {earlySignals.slice(0, 8).map((s, i) => {
        const sevColor = s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f97316' : s.severity === 'medium' ? '#eab308' : '#22c55e';
        const src = s.source || 'internal';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '6px 10px', borderRadius: 5,
            background: s.resolved ? 'rgba(34,197,94,0.03)' : `${sevColor}08`,
            border: `1px solid ${s.resolved ? 'rgba(34,197,94,0.08)' : `${sevColor}15`}`,
            opacity: s.resolved ? 0.5 : 1,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.resolved ? '#22c55e' : sevColor, marginTop: 4, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.3 }}>{s.message}</span>
                {s.resolved && <span style={{ fontSize: 8, color: '#22c55e', padding: '1px 4px', borderRadius: 3, background: 'rgba(34,197,94,0.1)' }}>RESOLVED</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <SourceBadge source={src} />
                <span style={{ fontSize: 9, color: sevColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{s.severity}</span>
                {s.timestamp && <span style={{ fontSize: 9, color: '#475569' }}>{new Date(s.timestamp).toLocaleDateString()}</span>}
                {s.reference && <span style={{ fontSize: 9, color: '#475569', display: 'flex', alignItems: 'center', gap: 2 }}><ExternalLink size={8} /> ref</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatternMatchList({ patternMatches }) {
  if (!patternMatches || patternMatches.length === 0) {
    return <div style={{ padding: '10px 14px', background: 'rgba(148,163,184,0.03)', borderRadius: 6, fontSize: 11, color: '#64748b' }}>Not enough project history to detect pattern matches yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {patternMatches.slice(0, 5).map((m, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 10px', borderRadius: 6,
          background: m.outcome === 'Failed' ? 'rgba(239,68,68,0.04)' : m.outcome === 'Success' ? 'rgba(34,197,94,0.04)' : 'rgba(234,179,8,0.04)',
          border: `1px solid ${m.outcome === 'Failed' ? 'rgba(239,68,68,0.1)' : m.outcome === 'Success' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)'}`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: m.outcome === 'Failed' ? '#ef4444' : m.outcome === 'Success' ? '#22c55e' : '#eab308' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{m.name}</div>
            {m.warnings?.length > 0 && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{m.warnings.slice(0, 2).join(', ')}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>{m.similarity}% match</span>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '1px 7px', borderRadius: 3,
              background: m.outcome === 'Failed' ? 'rgba(239,68,68,0.15)' : m.outcome === 'Success' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
              color: m.outcome === 'Failed' ? '#ef4444' : m.outcome === 'Success' ? '#22c55e' : '#eab308',
            }}>{m.outcome}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialImpact({ projectedSavings, score, riskFactors }) {
  if (!projectedSavings && projectedSavings !== 0) return null;
  if (projectedSavings === 0 && score > 60) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(34,197,94,0.04)', borderRadius: 6 }}>
        <CheckCircle size={13} color="#22c55e" />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>No significant financial risk — project is on track.</span>
      </div>
    );
  }
  const highImpact = (riskFactors || []).filter(r => r.impact > 60).length;

  return (
    <div style={{ padding: '10px 14px', borderRadius: 7, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <DollarSign size={14} color="#ef4444" />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>${(projectedSavings || 0).toLocaleString()}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>projected loss if continued</span>
      </div>
      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
        Based on estimated daily project cost of $5,000, remaining timeline risk, and current viability score of {score}/100.
        {highImpact > 0 && ` ${highImpact} high-impact risk factor${highImpact > 1 ? 's' : ''} identified across ${(riskFactors || []).length} monitored dimensions.`}
      </div>
    </div>
  );
}

export default function CerebrumOracle() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState([]);
  const [stats, setStats] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [killRec, setKillRec] = useState(null);
  const [animationReady, setAnimationReady] = useState(false);

  useEffect(() => {
    fetchBoard();
    setTimeout(() => setAnimationReady(true), 100);
  }, []);

  useEffect(() => {
    if (projectId && board.length > 0) {
      setExpandedProject(projectId);
      fetchKillRec(projectId);
    }
  }, [projectId, board]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await cerebrum.getOracle();
      setBoard(res.data.projects || []);
      setStats(res.data.stats || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load Cerebrum Oracle');
    } finally {
      setLoading(false);
    }
  };

  const fetchKillRec = async (id) => {
    try {
      setDetailLoading(true);
      const res = await cerebrum.killRecommendation(id);
      setKillRec(res.data);
    } catch (err) {
      setKillRec(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading Cerebrum Oracle...</div>
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchBoard} />;

  const hasProjectParam = !!projectId;
  const detail = hasProjectParam ? board.find(v => v.projectId?._id?.toString() === projectId) : null;

  if (hasProjectParam && !detail) {
    return (
      <div>
        <button onClick={() => navigate('/cerebrum/oracle')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          <ArrowLeft size={14} /> Back to Oracle Board
        </button>
        <ErrorState message="Project not found in Oracle" onRetry={() => navigate('/cerebrum/oracle')} />
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto' }}>
      {!hasProjectParam && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#6366f1" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Viability Oracle</h2>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Project diagnostic — scores, evidence trails & kill analysis</p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={fetchBoard} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)', cursor: 'pointer', background: 'transparent', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease' }}
                onMouseEnter={e => { e.target.style.background = 'rgba(148,163,184,0.05)'; e.target.style.color = '#cbd5e1'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8'; }}>
                <Activity size={12} /> Refresh
              </button>
            </div>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Total Projects', value: stats.total, color: '#6366f1' },
                { label: 'At Risk', value: stats.atRisk, color: '#eab308' },
                { label: 'Recommended Kill', value: stats.recommendedKill, color: '#ef4444' },
                { label: 'Avg Viability', value: `${stats.averageScore}%`, color: '#22c55e' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(148,163,184,0.04)', borderRadius: 8, padding: '14px 18px', border: '1px solid rgba(148,163,184,0.06)' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasProjectParam && detail && (
        <div>
          <button onClick={() => navigate('/cerebrum/oracle')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
            <ArrowLeft size={14} /> Back to all projects
          </button>

          <div style={{ background: 'rgba(148,163,184,0.03)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.06)', padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              <ViabilityGauge score={detail.score} size={100} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{detail.projectId?.name || 'Unknown Project'}</h2>
                  <span style={{ padding: '1px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, background: detail.recommendation === 'go' ? 'rgba(34,197,94,0.1)' : detail.recommendation === 'kill' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)', color: detail.recommendation === 'go' ? '#22c55e' : detail.recommendation === 'kill' ? '#ef4444' : '#eab308' }}>
                    {detail.recommendation === 'go' ? 'GO' : detail.recommendation === 'kill' ? 'KILL' : 'ADJUST'}
                  </span>
                  {detail.trajectory === 'rising' && <TrendingUp size={14} color="#22c55e" />}
                  {detail.trajectory === 'falling' && <TrendingDown size={14} color="#f97316" />}
                  {detail.trajectory === 'crash' && <TrendingDown size={14} color="#ef4444" />}
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {detail.projectId?.status || 'Active'} · {detail.projectId?.progress || 0}% complete
                  {detail.projectId?.phase && ` · Phase: ${detail.projectId.phase}`}
                </p>

                <EarlySignalList earlySignals={detail.earlySignals} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(148,163,184,0.06)' }}>
              <div>
                <SectionHeader icon={AlertOctagon} title="Risk Factors by Source" />
                <RiskFactorsGrouped riskFactors={detail.riskFactors} />
              </div>
              <div>
                <SectionHeader icon={BarChart3} title="Pattern Matches" />
                <PatternMatchList patternMatches={detail.patternMatches} />

                {detail.history?.length > 1 && (
                  <div style={{ marginTop: 14 }}>
                    <SectionHeader icon={Activity} title="Viability Trend" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(148,163,184,0.03)', borderRadius: 6 }}>
                      <TrendSparkline history={detail.history} width={160} height={32} />
                      <span style={{ fontSize: 10, color: '#64748b' }}>{detail.history.length} data points</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(148,163,184,0.06)' }}>
              <SectionHeader icon={Skull} title="Kill Analysis" />

              {killRec?.reasons?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                  {killRec.reasons.slice(0, 5).map((reason, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.04)', borderRadius: 5 }}>
                      <AlertTriangle size={11} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#cbd5e1' }}>{reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.04)', borderRadius: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={13} color="#22c55e" />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>No kill triggers detected.</span>
                </div>
              )}

              <FinancialImpact projectedSavings={killRec?.projectedSavings || detail.projectedSavings} score={detail.score} riskFactors={detail.riskFactors} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {board.map((v, i) => {
          const p = v.projectId || {};
          const score = v.score;
          const color = score > 70 ? '#22c55e' : score > 45 ? '#eab308' : score > 25 ? '#f97316' : '#ef4444';
          const isExpanded = expandedProject === p._id?.toString();
          const activeSignals = (v.earlySignals || []).filter(s => !s.resolved);

          return (
            <div key={p._id || i}
              style={{
                background: isExpanded ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.02)',
                borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.06)',
                borderLeft: `3px solid ${color}`,
                opacity: animationReady ? 1 : 0,
                transform: animationReady ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.2s ease',
                transitionDelay: `${i * 30}ms`,
                overflow: 'hidden',
              }}>
              <div
                onClick={() => {
                  if (!hasProjectParam) {
                    if (isExpanded) { setExpandedProject(null); setKillRec(null); }
                    else { setExpandedProject(p._id?.toString()); fetchKillRec(p._id); }
                  }
                }}
                style={{ cursor: hasProjectParam ? 'default' : 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(148,163,184,0.02)'; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                  <ViabilityGauge score={score} size={48} showLabel={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }} className="truncate">{p.name || 'Unknown Project'}</span>
                      <span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 600, borderRadius: 3, background: v.recommendation === 'go' ? 'rgba(34,197,94,0.1)' : v.recommendation === 'kill' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)', color: v.recommendation === 'go' ? '#22c55e' : v.recommendation === 'kill' ? '#ef4444' : '#eab308' }}>
                        {v.recommendation === 'go' ? 'GO' : v.recommendation === 'kill' ? 'KILL' : 'ADJUST'}
                      </span>
                      {v.trajectory === 'rising' && <TrendingUp size={12} color="#22c55e" />}
                      {v.trajectory === 'falling' && <TrendingDown size={12} color="#f97316" />}
                      {v.trajectory === 'crash' && <TrendingDown size={12} color="#ef4444" />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{p.status || 'unknown'}</span>
                      {p.progress !== undefined && <span style={{ fontSize: 10, color: '#64748b' }}>{p.progress}% complete</span>}
                      {activeSignals.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#f97316' }}>
                          <AlertTriangle size={10} /> {activeSignals.length} warning{activeSignals.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <EvidenceSourceBreakdown earlySignals={v.earlySignals} />
                    </div>
                  </div>
                  {v.recommendation === 'kill' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.08)' }}>
                      <Skull size={13} color="#ef4444" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>${(v.projectedSavings || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {!hasProjectParam && <ChevronRight size={14} color="#475569" style={{ transition: 'transform 0.15s ease', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }} />}
                </div>

                {v.history?.length > 1 && !hasProjectParam && (
                  <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendSparkline history={v.history} width={80} height={20} />
                  </div>
                )}
              </div>

              {isExpanded && killRec && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(148,163,184,0.06)' }}>
                  <div style={{ paddingTop: 10 }}>
                    {killRec.reasons?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                        {killRec.reasons.slice(0, 5).map((reason, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                            <AlertTriangle size={10} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <EvidenceSourceBreakdown earlySignals={v.earlySignals} />
                      {(v.riskFactors || []).length > 0 && (
                        <span style={{ fontSize: 10, color: '#64748b' }}>{(v.riskFactors || []).length} risk factor{(v.riskFactors || []).length > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/cerebrum/oracle/${p._id}`); }}
                        style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, borderRadius: 5, border: '1px solid rgba(148,163,184,0.15)', cursor: 'pointer', background: 'transparent', color: '#94a3b8', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 4 }}
                        onMouseEnter={e => { e.target.style.background = 'rgba(148,163,184,0.05)'; e.target.style.color = '#cbd5e1'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8'; }}>
                        <BarChart3 size={11} /> Full Diagnostic
                      </button>
                      {v.recommendation === 'kill' && (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/cerebrum/decisions`); }}
                          style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, borderRadius: 5, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', background: 'transparent', color: '#ef4444', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 4 }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.08)'; }}
                          onMouseLeave={e => { e.target.style.background = 'transparent'; }}>
                          <Skull size={11} /> Kill Engine
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isExpanded && !killRec && detailLoading && (
                <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(148,163,184,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>Analyzing...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {board.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(148,163,184,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <BrainCircuit size={20} color="#475569" />
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>No projects with viability data yet</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Create projects and work on them to generate data</div>
        </div>
      )}
    </div>
  );
}

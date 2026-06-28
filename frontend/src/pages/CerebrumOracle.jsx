import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cerebrum, projects } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Activity, TrendingUp, TrendingDown, TrendingDown as TrendingCrash, Skull, AlertTriangle, CheckCircle, DollarSign, BrainCircuit, ArrowLeft, Zap, Shield, AlertOctagon } from 'lucide-react';

function ViabilityGauge({ score, size = 60 }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score > 70 ? '#22c55e' : score > 45 ? '#eab308' : score > 25 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className="shrink-0">
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 30 30)"
        style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }} />
      <text x="30" y="35" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{score}</text>
    </svg>
  );
}

function TrajectoryIcon({ trajectory }) {
  if (trajectory === 'rising') return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (trajectory === 'falling') return <TrendingDown className="w-4 h-4 text-orange-400" />;
  if (trajectory === 'crash') return <TrendingCrash className="w-4 h-4 text-red-400" />;
  return <TrendingUp className="w-4 h-4 text-slate-500" />;
}

function RecommendationBadge({ recommendation }) {
  if (recommendation === 'go') return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-500/15 text-green-400 border border-green-500/20">GO</span>;
  if (recommendation === 'adjust') return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">ADJUST</span>;
  if (recommendation === 'kill') return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/15 text-red-400 border border-red-500/20">KILL</span>;
  return null;
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
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
          <div className="text-sm text-slate-400">Loading Cerebrum Oracle...</div>
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchBoard} />;

  const filtered = expandedProject ? board.filter(v => v.projectId?._id?.toString() === expandedProject) : board;
  const detail = filtered[0];
  const hasProjectParam = !!projectId;

  if (hasProjectParam && !detail) {
    return (
      <div className="page-enter" style={{ padding: '24px' }}>
        <button onClick={() => navigate('/cerebrum/oracle')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 bg-transparent border-none cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Oracle Board
        </button>
        <ErrorState message="Project not found in Oracle" onRetry={() => navigate('/cerebrum/oracle')} />
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--brand-primary), #a78bfa)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">Viability Oracle</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Cerebrum project viability & early warning system</div>
            </div>
          </div>
        </div>
        <button onClick={fetchBoard} className="text-xs text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> Refresh
        </button>
      </div>

      {!hasProjectParam && stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="glass-panel rounded-xl p-4" style={{ borderLeft: '3px solid var(--brand-primary)' }}>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Total Projects</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="glass-panel rounded-xl p-4" style={{ borderLeft: '3px solid #eab308' }}>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">At Risk</div>
            <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.atRisk}</div>
          </div>
          <div className="glass-panel rounded-xl p-4" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Recommended Kill</div>
            <div className="text-2xl font-bold text-red-400 mt-1">{stats.recommendedKill}</div>
          </div>
          <div className="glass-panel rounded-xl p-4" style={{ borderLeft: '3px solid #22c55e' }}>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Avg Viability</div>
            <div className="text-2xl font-bold text-green-400 mt-1">{stats.averageScore}%</div>
          </div>
        </div>
      )}

      {hasProjectParam && detail && (
        <button onClick={() => navigate('/cerebrum/oracle')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 bg-transparent border-none cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Oracle Board
        </button>
      )}

      {hasProjectParam && detail && (
        <div className="glass-panel rounded-xl p-6 mb-6">
          <div className="flex items-start gap-6">
            <ViabilityGauge score={detail.score} size={100} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-white">{detail.projectId?.name || 'Unknown Project'}</h2>
                <RecommendationBadge recommendation={detail.recommendation} />
                <TrajectoryIcon trajectory={detail.trajectory} />
              </div>
              {killRec?.reasons?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kill Analysis</div>
                  {killRec.reasons.slice(0, 4).map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}
              {killRec?.projectedSavings > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold">Projected savings: ${killRec.projectedSavings.toLocaleString()}</span>
                  <span className="text-slate-500 text-xs">if killed now</span>
                </div>
              )}
            </div>
          </div>

          {detail.patternMatches?.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pattern Matches</div>
              <div className="space-y-2">
                {detail.patternMatches.slice(0, 4).map((match, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${match.outcome === 'Failed' ? 'bg-red-400' : match.outcome === 'Success' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <span className="text-sm text-slate-300 flex-1">{match.name}</span>
                    <span className="text-xs text-slate-500">{match.similarity}% similar</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${match.outcome === 'Failed' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{match.outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.riskFactors?.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Risk Factors</div>
              <div className="space-y-2">
                {detail.riskFactors.map((rf, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 text-sm text-slate-300">{rf.factor}</div>
                    <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rf.impact}%`, background: rf.impact > 70 ? '#ef4444' : rf.impact > 40 ? '#eab308' : '#22c55e' }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{rf.impact}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {board.map((v, i) => {
          const p = v.projectId || {};
          const score = v.score;
          const color = score > 70 ? '#22c55e' : score > 45 ? '#eab308' : score > 25 ? '#f97316' : '#ef4444';
          const isExpanded = expandedProject === p._id?.toString();

          return (
            <div key={p._id || i}
              className="glass-panel rounded-xl overflow-hidden transition-all duration-300"
              style={{ opacity: animationReady ? 1 : 0, transform: animationReady ? 'translateY(0)' : 'translateY(10px)', transitionDelay: `${i * 40}ms`, borderLeft: `3px solid ${color}` }}>
              <div
                onClick={() => {
                  if (!hasProjectParam) {
                    if (isExpanded) { setExpandedProject(null); setKillRec(null); }
                    else { setExpandedProject(p._id?.toString()); fetchKillRec(p._id); }
                  }
                }}
                className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors">
                <ViabilityGauge score={score} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{p.name || 'Unknown Project'}</span>
                    <RecommendationBadge recommendation={v.recommendation} />
                    <TrajectoryIcon trajectory={v.trajectory} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500">{p.status || 'unknown'}</span>
                    {p.progress !== undefined && <span className="text-[10px] text-slate-500">{p.progress}% complete</span>}
                    {v.earlySignals?.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-400">
                        <AlertTriangle className="w-3 h-3" /> {v.earlySignals.filter(s => !s.resolved).length} warnings
                      </span>
                    )}
                  </div>
                </div>
                {v.recommendation === 'kill' && <Skull className="w-5 h-5 text-red-400 animate-pulse" />}
                <div className="text-xs text-slate-500">{v.projectedSavings > 0 && `$${v.projectedSavings.toLocaleString()}`}</div>
              </div>

              {isExpanded && killRec && (
                <div className="px-4 pb-4 pt-0 border-t border-white/[0.04]" style={{ animation: 'fadeIn 0.2s ease' }}>
                  {killRec.reasons?.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {killRec.reasons.slice(0, 4).map((reason, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs text-slate-400">
                          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => navigate(`/cerebrum/oracle/${p._id}`)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border-none cursor-pointer">
                      Full Analysis
                    </button>
                    <button onClick={() => navigate('/cerebrum/memory')}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border-none cursor-pointer">
                      Search Memory
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {board.length === 0 && (
        <div className="text-center py-20">
          <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <div className="text-slate-400 text-sm">No projects with viability data yet</div>
          <div className="text-slate-600 text-xs mt-1">Create projects and work on them to generate data</div>
        </div>
      )}
    </div>
  );
}

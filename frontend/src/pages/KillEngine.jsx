import { useState, useEffect } from 'react';
import { cerebrum, projects } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Skull, AlertTriangle, DollarSign, CheckCircle, Undo2, ArrowRight, TrendingDown, Activity } from 'lucide-react';

export default function KillEngine() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState([]);
  const [killResult, setKillResult] = useState(null);
  const [executing, setExecuting] = useState(null);
  const [undoMsg, setUndoMsg] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [killRec, setKillRec] = useState(null);
  const [killReason, setKillReason] = useState('');

  useEffect(() => { fetchKillCandidates(); }, []);

  const fetchKillCandidates = async () => {
    try {
      setLoading(true);
      const res = await cerebrum.getOracle();
      const candidates = (res.data.projects || []).filter(p => p.recommendation === 'kill' || p.score < 40);
      setBoard(candidates);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally { setLoading(false); }
  };

  const fetchKillRec = async (id) => {
    try { setSelectedProject(id); const res = await cerebrum.killRecommendation(id); setKillRec(res.data); } catch (err) { setKillRec(null); }
  };

  const executeKill = async (projectId) => {
    try {
      setExecuting(projectId); setKillResult(null); setUndoMsg(null);
      const res = await cerebrum.executeKill(projectId, killReason);
      setKillResult(res.data); setSelectedProject(null); setKillRec(null); setKillReason('');
      fetchKillCandidates();
      setTimeout(() => setUndoMsg(projectId), 500);
    } catch (err) { setKillResult({ error: err.response?.data?.error || 'Failed to execute kill' }); } finally { setExecuting(null); }
  };

  const undoKill = async (projectId) => {
    try { await cerebrum.undoKill(projectId); setUndoMsg(null); setKillResult(null); } catch (err) { alert(err.response?.data?.error || 'Failed to undo'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchKillCandidates} />;

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto' }}>
      {killResult && !killResult.error && (
        <div style={{ background: 'rgba(34,197,94,0.04)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid rgba(34,197,94,0.1)', animation: 'fadeIn 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <CheckCircle size={16} color="#22c55e" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>Project Killed Successfully</span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>{killResult.message}</p>
              {killResult.projectedSavings > 0 && <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginTop: 4 }}>${killResult.projectedSavings.toLocaleString()} saved</div>}
            </div>
            {undoMsg && (
              <button onClick={() => undoKill(undoMsg)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(234,179,8,0.2)', cursor: 'pointer', background: 'rgba(234,179,8,0.06)', color: '#eab308', transition: 'all 0.15s ease' }}
                onMouseEnter={e => { e.target.style.background = 'rgba(234,179,8,0.12)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(234,179,8,0.06)'; }}>
                <Undo2 size={13} /> Undo (30s)
              </button>
            )}
          </div>
        </div>
      )}

      {killResult?.error && (
        <div style={{ background: 'rgba(239,68,68,0.04)', borderRadius: 8, padding: 12, marginBottom: 16, border: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef4444' }}>
          <AlertTriangle size={14} /> {killResult.error}
        </div>
      )}

      {board.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircle size={20} color="rgba(34,197,94,0.4)" />
          </div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>No projects need killing right now</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>All projects are above viability thresholds</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, color: '#64748b' }}>
            <Skull size={14} color="#ef4444" />
            <span>{board.length} project{board.length > 1 ? 's' : ''} recommended for termination</span>
          </div>
          {board.map(p => {
            const pId = p.projectId?._id;
            const isSelected = selectedProject === pId;
            return (
              <div key={pId} style={{ background: 'rgba(148,163,184,0.02)', borderRadius: 10, border: isSelected ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(148,163,184,0.06)', overflow: 'hidden', transition: 'all 0.15s ease' }}>
                <div style={{ padding: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <TrendingDown size={14} color="#ef4444" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{p.projectId?.name || 'Unknown'}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>Score: {p.score}/100</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Activity size={10} /> {p.trajectory === 'crash' ? 'Crashing' : p.trajectory}</span>
                      {p.projectedSavings > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#22c55e' }}><DollarSign size={10} /> Saves ~${p.projectedSavings.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => fetchKillRec(pId)}
                      style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)', cursor: 'pointer', background: 'transparent', color: '#94a3b8', transition: 'all 0.15s ease' }}
                      onMouseEnter={e => { e.target.style.background = 'rgba(148,163,184,0.05)'; e.target.style.color = '#cbd5e1'; }}
                      onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8'; }}>
                      Analyze
                    </button>
                    <button onClick={() => executeKill(pId)} disabled={executing === pId}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', cursor: executing === pId ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.06)', color: '#ef4444', opacity: executing === pId ? 0.5 : 1, transition: 'all 0.15s ease' }}
                      onMouseEnter={e => { if (executing !== pId) e.target.style.background = 'rgba(239,68,68,0.12)'; }}
                      onMouseLeave={e => { if (executing !== pId) e.target.style.background = 'rgba(239,68,68,0.06)'; }}>
                      {executing === pId ? '...' : <><Skull size={13} /> Kill</>}
                    </button>
                  </div>
                </div>
                {isSelected && killRec && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(148,163,184,0.06)', animation: 'fadeIn 0.15s ease' }}>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {killRec.reasons?.slice(0, 4).map((reason, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, padding: '4px 8px', background: 'rgba(239,68,68,0.03)', borderRadius: 4 }}>
                          <AlertTriangle size={10} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{reason}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <textarea value={killReason} onChange={e => setKillReason(e.target.value)} placeholder="Optional: reason for killing..."
                        style={{ width: '100%', padding: '8px 12px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(148,163,184,0.1)', background: 'rgba(148,163,184,0.02)', color: '#cbd5e1', outline: 'none', resize: 'none' }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(148,163,184,0.1)'; }}
                        rows={2} />
                      <button onClick={() => executeKill(pId)} disabled={executing === pId}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '6px 14px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', cursor: executing === pId ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.08)', color: '#ef4444', transition: 'all 0.15s ease' }}
                        onMouseEnter={e => { if (executing !== pId) e.target.style.background = 'rgba(239,68,68,0.15)'; }}
                        onMouseLeave={e => { if (executing !== pId) e.target.style.background = 'rgba(239,68,68,0.08)'; }}>
                        {executing === pId ? 'Archiving...' : 'Confirm Kill'} <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { cerebrum } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { BarChart3, Target, TrendingUp, AlertTriangle, CheckCircle, Plus, DollarSign, Zap, Shield, Layers, Flag, Lightbulb, ArrowRight, Gauge } from 'lucide-react';
import Modal from '../components/Modal';

function StatBox({ label, value }) {
  return (
    <div style={{ background: 'rgba(148,163,184,0.03)', borderRadius: 8, padding: '14px 18px', border: '1px solid rgba(148,163,184,0.06)' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{value}</div>
    </div>
  );
}

function GoalCard({ goal, index }) {
  const barColor = goal.alignmentPercentage > 50 ? '#22c55e' : goal.alignmentPercentage > 25 ? '#eab308' : '#ef4444';
  return (
    <div style={{ background: 'rgba(148,163,184,0.02)', borderRadius: 10, padding: 16, border: '1px solid rgba(148,163,184,0.06)', borderLeft: `2px solid ${barColor}`, transition: 'all 0.15s ease', animation: `fadeIn 0.2s ease ${index * 20}ms both` }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.035)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.02)'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={14} color="#6366f1" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{goal.title}</span>
          {goal.category && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.05)', color: '#64748b' }}>{goal.category}</span>}
        </div>
        <span style={{ fontSize: 11, color: '#64748b' }}>Weight: {goal.weight}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${goal.alignmentPercentage}%`, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: 11, color: barColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{goal.alignedTasks}/{goal.totalTasks} ({goal.alignmentPercentage}%)</span>
      </div>
      {goal.kpis?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {goal.kpis.map((kpi, j) => (
            <div key={j} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: 'rgba(148,163,184,0.03)', color: '#64748b' }}>
              {kpi.name}: <span style={{ color: 'white', fontWeight: 600 }}>{kpi.current}/{kpi.target}</span>
              {kpi.unit && <> {kpi.unit}</>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CerebrumStrategy() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [rebalance, setRebalance] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: '', weight: 50, kpis: [] });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { loadData(); }, [refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alignRes, rebRes] = await Promise.all([cerebrum.getAlignment(), cerebrum.getRebalance()]);
      setAlignment(alignRes.data || { message: 'No strategic goals defined yet. Set your first goal to start tracking alignment.' });
      setRebalance(rebRes.data.recommendations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load strategy data');
    } finally { setLoading(false); }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title) return;
    try {
      await cerebrum.createGoal(newGoal);
      setShowGoalModal(false);
      setNewGoal({ title: '', description: '', category: '', weight: 50, kpis: [] });
      setRefresh(r => r + 1);
    } catch (err) { console.error('Failed to create goal', err); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} color="#22c55e" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Strategy Bridge</h2>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Connect leadership vision to execution reality</p>
          </div>
        </div>
        <button onClick={() => setShowGoalModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#818cf8', transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.2)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(99,102,241,0.1)'; }}>
          <Plus size={14} /> New Goal
        </button>
      </div>

      {alignment?.message && (
        <div style={{ background: 'rgba(148,163,184,0.02)', borderRadius: 10, padding: 28, textAlign: 'center', border: '1px solid rgba(148,163,184,0.06)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(148,163,184,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Target size={20} color="#475569" />
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{alignment.message}</p>
          <button onClick={() => setShowGoalModal(true)}
            style={{ padding: '8px 18px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#818cf8', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.2)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(99,102,241,0.1)'; }}>
            Set Your First Strategic Goal
          </button>
        </div>
      )}

      {alignment && !alignment.message && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            <StatBox label="Alignment Score" value={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Gauge size={16} color={alignment.alignment > 70 ? '#22c55e' : alignment.alignment > 40 ? '#eab308' : '#ef4444'} />{alignment.alignment}%</span>} />
            <StatBox label="Total Tasks" value={alignment.totalTasks} />
            <StatBox label="Active Projects" value={alignment.totalProjects} />
          </div>

          {alignment.gapAnalysis && alignment.gapAnalysis.unalignedPercentage > 30 && (
            <div style={{ background: 'rgba(249,115,22,0.04)', borderRadius: 10, padding: 14, marginBottom: 20, border: '1px solid rgba(249,115,22,0.1)', borderLeft: '2px solid #f97316' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <AlertTriangle size={14} color="#f97316" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>Strategy Gap Detected</span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                {alignment.gapAnalysis.unalignedPercentage}% of tasks ({alignment.gapAnalysis.unalignedTasks}) are not aligned with any strategic goal.
              </p>
              {alignment.gapAnalysis.recommendedRebalance?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {alignment.gapAnalysis.recommendedRebalance.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Lightbulb size={11} color="#eab308" style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Flag size={14} color="#64748b" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goals & Alignment</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alignment.goals?.map((goal, i) => <GoalCard key={goal.goalId || i} goal={goal} index={i} />)}
            </div>
          </div>

          {rebalance.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Layers size={14} color="#64748b" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Rebalancing</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rebalance.map((rec, i) => (
                  <div key={i} style={{ background: 'rgba(148,163,184,0.02)', borderRadius: 10, padding: 14, border: '1px solid rgba(148,163,184,0.06)', borderLeft: '2px solid #a78bfa' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(167,139,250,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Layers size={12} color="#a78bfa" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>{rec.goal}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{rec.suggestedAction}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: '#475569' }}>
                          <span>Current: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{rec.currentAlignment}%</span></span>
                          <ArrowRight size={9} color="#475569" />
                          <span>Target: <span style={{ color: '#22c55e', fontWeight: 600 }}>{rec.targetAlignment}%</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title="New Strategic Goal" icon="🎯">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Goal Title</label>
            <input type="text" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/[0.08] bg-white/[0.03] text-white focus:outline-none focus:border-[var(--brand-primary)]/30" placeholder="e.g. Improve customer retention" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/[0.08] bg-white/[0.03] text-white focus:outline-none focus:border-[var(--brand-primary)]/30" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Category</label>
              <input type="text" value={newGoal.category} onChange={e => setNewGoal({ ...newGoal, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-white/[0.08] bg-white/[0.03] text-white focus:outline-none focus:border-[var(--brand-primary)]/30" placeholder="e.g. Growth" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Weight (1-100)</label>
              <input type="number" min="1" max="100" value={newGoal.weight} onChange={e => setNewGoal({ ...newGoal, weight: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-white/[0.08] bg-white/[0.03] text-white focus:outline-none focus:border-[var(--brand-primary)]/30" />
            </div>
          </div>
          <button onClick={handleCreateGoal} disabled={!newGoal.title}
            className="w-full py-2.5 text-sm font-medium rounded-lg text-white border-none cursor-pointer disabled:opacity-40 transition-all"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
            Create Goal
          </button>
        </div>
      </Modal>
    </div>
  );
}

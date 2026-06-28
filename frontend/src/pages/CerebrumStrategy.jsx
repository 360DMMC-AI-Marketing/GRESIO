import { useState, useEffect } from 'react';
import { cerebrum } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { BarChart3, Target, TrendingUp, AlertTriangle, CheckCircle, Plus, X, DollarSign, Zap, Shield, Layers } from 'lucide-react';
import Modal from '../components/Modal';

function AlignmentGauge({ value }) {
  const color = value > 70 ? '#22c55e' : value > 40 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray="175.92" strokeDashoffset={175.92 - (value / 100) * 175.92}
            transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
          <text x="32" y="38" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">{Math.round(value)}</text>
        </svg>
      </div>
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Alignment</div>
        <div className="text-lg font-bold text-white">{value}%</div>
      </div>
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

  useEffect(() => {
    loadData();
  }, [refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alignRes, rebRes] = await Promise.all([
        cerebrum.getAlignment(),
        cerebrum.getRebalance(),
      ]);
      setAlignment(alignRes.data);
      setRebalance(rebRes.data.recommendations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title) return;
    try {
      await cerebrum.createGoal(newGoal);
      setShowGoalModal(false);
      setNewGoal({ title: '', description: '', category: '', weight: 50, kpis: [] });
      setRefresh(r => r + 1);
    } catch (err) {
      console.error('Failed to create goal', err);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">Strategy Bridge</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Connect leadership vision to execution reality</div>
          </div>
        </div>
        <button onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-white border-none cursor-pointer transition-all"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)' }}>
          <Plus className="w-3 h-3" /> New Goal
        </button>
      </div>

      {alignment?.message && (
        <div className="glass-panel rounded-xl p-6 mb-6 text-center">
          <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">{alignment.message}</div>
          <button onClick={() => setShowGoalModal(true)}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg text-white border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)' }}>
            Set Your First Strategic Goal
          </button>
        </div>
      )}

      {alignment && !alignment.message && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-panel rounded-xl p-4">
              <AlignmentGauge value={alignment.alignment} />
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Tasks</div>
              <div className="text-2xl font-bold text-white">{alignment.totalTasks}</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Active Projects</div>
              <div className="text-2xl font-bold text-white">{alignment.totalProjects}</div>
            </div>
          </div>

          {alignment.gapAnalysis && alignment.gapAnalysis.unalignedPercentage > 30 && (
            <div className="glass-panel rounded-xl p-4 mb-6" style={{ borderLeft: '3px solid #f97316' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-orange-400">Gap Detected</span>
              </div>
              <div className="text-xs text-slate-400">
                {alignment.gapAnalysis.unalignedPercentage}% of tasks ({alignment.gapAnalysis.unalignedTasks}) are not aligned with any strategic goal.
              </div>
              {alignment.gapAnalysis.recommendedRebalance?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {alignment.gapAnalysis.recommendedRebalance.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Zap className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Goals & Alignment</div>
            <div className="space-y-3">
              {alignment.goals?.map((goal, i) => (
                <div key={goal.goalId || i} className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="text-sm font-semibold text-white">{goal.title}</span>
                      {goal.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500">{goal.category}</span>}
                    </div>
                    <span className="text-xs text-slate-500">Weight: {goal.weight}%</span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${goal.alignmentPercentage}%`,
                        background: goal.alignmentPercentage > 50 ? '#22c55e' : goal.alignmentPercentage > 25 ? '#eab308' : '#ef4444'
                      }} />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{goal.alignedTasks}/{goal.totalTasks} tasks ({goal.alignmentPercentage}%)</span>
                  </div>

                  {goal.kpis?.length > 0 && (
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {goal.kpis.map((kpi, j) => (
                        <div key={j} className="text-[10px] px-2 py-1 rounded bg-white/[0.03] text-slate-400">
                          {kpi.name}: <span className="text-white font-medium">{kpi.current}/{kpi.target}</span> {kpi.unit}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {rebalance.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recommended Rebalancing</div>
              <div className="space-y-2">
                {rebalance.map((rec, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4" style={{ borderLeft: '3px solid #a78bfa' }}>
                    <div className="flex items-start gap-2">
                      <Layers className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-white mb-1">{rec.goal}</div>
                        <div className="text-xs text-slate-400">{rec.suggestedAction}</div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                          <span>Current: {rec.currentAlignment}%</span>
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          <span>Target: {rec.targetAlignment}%</span>
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
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)' }}>
            Create Goal
          </button>
        </div>
      </Modal>
    </div>
  );
}

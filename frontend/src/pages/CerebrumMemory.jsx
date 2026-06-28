import { useState, useEffect, useRef } from 'react';
import { cerebrum } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Search, BrainCircuit, BookOpen, GitCompare, UserCheck, AlertTriangle, Clock, ArrowRight, Tag, FileText } from 'lucide-react';

const TYPE_ICONS = {
  decision: BookOpen,
  outcome: GitCompare,
  pattern: AlertTriangle,
  expertise: UserCheck,
  lesson: FileText,
};

const TYPE_COLORS = {
  decision: '#6366f1',
  outcome: '#22c55e',
  pattern: '#f97316',
  expertise: '#3b82f6',
  lesson: '#a78bfa',
};

export default function CerebrumMemory() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [expertise, setExpertise] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [memRes, expRes] = await Promise.all([
        cerebrum.searchMemory(''),
        cerebrum.getExpertise(),
      ]);
      setResults(memRes.data.results || []);
      setExpertise(expRes.data.expertise || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load memory');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);
      const res = await cerebrum.searchMemory(query);
      setResults(res.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const filtered = typeFilter === 'all' ? results : results.filter(r => r.type === typeFilter);

  if (loading && results.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadInitial} />;

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a78bfa, #6366f1)' }}>
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xl font-bold text-white">Corporate Memory</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Search every decision, pattern, and lesson learned</div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input ref={inputRef} type="text" placeholder="Ask Cerebrum anything... (e.g. 'why did we choose microservices?', 'who knows authentication?')"
          value={query} onChange={e => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 text-sm rounded-xl border border-white/[0.08] bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]/30 text-white placeholder-slate-600 transition-all" />
        <button type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-all border-none cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)' }}>
          Search
        </button>
      </form>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['all', 'decision', 'pattern', 'lesson', 'expertise'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
              typeFilter === t
                ? 'border-[var(--brand-primary)]/30 text-white bg-[var(--brand-primary)]/10'
                : 'border-white/[0.06] text-slate-500 hover:text-slate-300 bg-transparent'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((item, i) => {
          const Icon = TYPE_ICONS[item.type] || FileText;
          const color = TYPE_COLORS[item.type] || '#6366f1';
          return (
            <div key={item._id || i} className="glass-panel rounded-xl p-4 transition-all duration-200 hover:bg-white/[0.03]"
              style={{ borderLeft: `3px solid ${color}`, animation: `fadeIn 0.3s ease ${i * 30}ms both` }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">{item.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{item.type}</span>
                  </div>
                  {item.body && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{item.body}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    {item.projectName && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{item.projectName}</span>}
                    {item.createdBy?.name && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{item.createdBy.name}</span>}
                    {item.outcome && (
                      <span className={`${item.outcome === 'success' ? 'text-green-400' : item.outcome === 'failure' ? 'text-red-400' : 'text-slate-500'}`}>
                        {item.outcome}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  {item.tags?.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {item.tags.slice(0, 4).map((tag, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <div className="text-slate-400 text-sm">No memories found</div>
          <div className="text-slate-600 text-xs mt-1">{query ? 'Try a different search term' : 'Decisions and lessons will appear here as your team works'}</div>
        </div>
      )}

      {expertise.length > 0 && typeFilter === 'all' && !query && (
        <div className="mt-8">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Expertise Map</div>
          <div className="grid grid-cols-2 gap-3">
            {expertise.slice(0, 6).map((exp, i) => (
              <div key={i} className="glass-panel rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    {exp.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{exp.user?.name || 'Unknown'}</div>
                    <div className="text-[10px] text-slate-500">{exp.projects} projects · {exp.decisions} decisions</div>
                  </div>
                </div>
                {exp.topTags?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {exp.topTags.map((tag, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">{tag.tag} ({tag.count})</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

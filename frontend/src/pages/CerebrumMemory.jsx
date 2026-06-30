import { useState, useEffect, useRef } from 'react';
import { cerebrum } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Search, BrainCircuit, BookOpen, GitCompare, UserCheck, AlertTriangle, Clock, Tag, FileText, ChevronDown, ChevronUp, Star, Users, Lightbulb, Hash } from 'lucide-react';

const TYPE_CONFIG = {
  decision: { icon: BookOpen, color: '#6366f1', label: 'Decision' },
  outcome: { icon: GitCompare, color: '#22c55e', label: 'Outcome' },
  pattern: { icon: AlertTriangle, color: '#f97316', label: 'Pattern' },
  expertise: { icon: UserCheck, color: '#3b82f6', label: 'Expertise' },
  lesson: { icon: Lightbulb, color: '#a78bfa', label: 'Lesson' },
};

function MemoryCard({ item, index, isExpanded, onToggle }) {
  const config = TYPE_CONFIG[item.type] || { icon: FileText, color: '#6366f1', label: item.type };

  return (
    <div
      onClick={onToggle}
      style={{
        background: 'rgba(148,163,184,0.02)',
        borderRadius: 10,
        border: isExpanded ? `1px solid ${config.color}15` : '1px solid rgba(148,163,184,0.06)',
        borderLeft: `2px solid ${config.color}`,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        animation: `fadeIn 0.2s ease ${index * 20}ms both`,
      }}
      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(148,163,184,0.035)'; }}
      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(148,163,184,0.02)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${config.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <config.icon size={16} color={config.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }} className="truncate">{item.title}</span>
            <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: `${config.color}10`, color: config.color }}>{config.label}</span>
            <div style={{ marginLeft: 'auto' }}>
              {isExpanded ? <ChevronUp size={12} color="#475569" /> : <ChevronDown size={12} color="#475569" />}
            </div>
          </div>

          {item.body && (
            <p style={{
              fontSize: 12, lineHeight: 1.5, color: '#94a3b8', marginBottom: 10,
              display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{item.body}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#64748b', flexWrap: 'wrap' }}>
            {item.projectName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FileText size={9} /> {item.projectName}</span>}
            {item.createdBy?.name && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><UserCheck size={9} /> {item.createdBy.name}</span>}
            {item.outcome && (
              <span style={{ color: item.outcome === 'success' ? '#22c55e' : item.outcome === 'failure' ? '#ef4444' : '#64748b' }}>
                {item.outcome}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} /> {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>

          {item.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {(isExpanded ? item.tags : item.tags.slice(0, 4)).map((tag, j) => (
                <span key={j} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.04)', color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Hash size={7} />{tag}
                </span>
              ))}
              {!isExpanded && item.tags.length > 4 && <span style={{ fontSize: 9, color: '#475569' }}>+{item.tags.length - 4}</span>}
            </div>
          )}

          {isExpanded && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(148,163,184,0.06)', fontSize: 10, color: '#475569' }}>
              Click to collapse
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CerebrumMemory() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [expertise, setExpertise] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const inputRef = useRef(null);

  const filterBtns = [
    { id: 'all', label: 'All' },
    ...Object.entries(TYPE_CONFIG).map(([id, c]) => ({ id, label: c.label })),
  ];

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
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrainCircuit size={20} color="#a78bfa" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Corporate Memory</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Search every decision, pattern, and lesson learned</p>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input ref={inputRef} type="text" placeholder="Ask Cerebrum anything..."
          value={query} onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 38px 10px 42px', fontSize: 13,
            borderRadius: 8, border: '1px solid rgba(148,163,184,0.12)',
            background: 'rgba(148,163,184,0.03)', color: 'white',
            outline: 'none', transition: 'border 0.15s ease',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.25)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(148,163,184,0.12)'; }} />
        <button type="submit"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '6px 14px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#818cf8', transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.2)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(99,102,241,0.1)'; }}>
          Search
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterBtns.map(t => {
          const isActive = typeFilter === t.id;
          const fColor = TYPE_CONFIG[t.id]?.color || '#6366f1';
          return (
            <button key={t.id} onClick={() => setTypeFilter(t.id)}
              style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(148,163,184,0.1)', cursor: 'pointer', transition: 'all 0.15s ease', background: isActive ? `${fColor}10` : 'transparent', color: isActive ? 'white' : '#64748b' }}
              onMouseEnter={e => { if (!isActive) { e.target.style.color = '#cbd5e1'; e.target.style.borderColor = 'rgba(148,163,184,0.2)'; } }}
              onMouseLeave={e => { if (!isActive) { e.target.style.color = '#64748b'; e.target.style.borderColor = 'rgba(148,163,184,0.1)'; } }}>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((item, i) => (
          <MemoryCard
            key={item._id || i}
            item={item}
            index={i}
            isExpanded={expandedId === (item._id || i)}
            onToggle={() => setExpandedId(expandedId === (item._id || i) ? null : (item._id || i))}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(148,163,184,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <BrainCircuit size={20} color="#475569" />
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>No memories found</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
            {query ? 'Try a different search term' : 'Decisions and lessons will appear here as your team works'}
          </div>
        </div>
      )}

      {expertise.length > 0 && typeFilter === 'all' && !query && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Users size={14} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expertise Map</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {expertise.slice(0, 6).map((exp, i) => (
              <div key={i} style={{ background: 'rgba(148,163,184,0.02)', borderRadius: 10, padding: 14, border: '1px solid rgba(148,163,184,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                    {exp.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{exp.user?.name || 'Unknown'}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{exp.projects} projects &middot; {exp.decisions} decisions</div>
                  </div>
                </div>
                {exp.topTags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {exp.topTags.map((tag, j) => (
                      <span key={j} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.04)', color: '#64748b' }}>
                        {tag.tag} ({tag.count})
                      </span>
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

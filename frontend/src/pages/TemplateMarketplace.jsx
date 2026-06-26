import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TYPE_COLORS = {
  software: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300',
  design: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300',
  business: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300',
  content: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300',
  research: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-300',
};

const CAN_CREATE = ['admin', 'project_manager', 'team_lead', 'manager'];

export default function TemplateMarketplace() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [sort, setSort] = useState('downloads');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (sort) params.set('sort', sort);
    fetch(`/api/templates?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
    }).then(r => r.json())
      .then(d => setTemplates(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, sort]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 page-enter">
      <div className="glass-panel flex items-center justify-between mb-4 p-4 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-[var(--text-primary)]">Template Marketplace</h1>
          <p className="text-xs text-surface-500 dark:text-[var(--text-muted)] mt-0.5">Use pre-built templates to start projects faster</p>
        </div>
        {CAN_CREATE.includes(user?.role) && (
          <Link data-voice="create-template" to="/templates/create"
            className="btn-premium text-xs">
            + Create Template
          </Link>
        )}
      </div>

      <div className="glass-panel flex gap-2 mb-4 flex-wrap p-3 rounded-lg">
        {['', 'software', 'design', 'business', 'content', 'research'].map(t => (
          <button key={t} data-voice={`filter-type-${t || 'all'}`} onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border-none ${
              type === t ? 'bg-[var(--brand-primary)] text-white' : 'bg-surface-100 dark:bg-[var(--bg-tertiary)] text-surface-600 dark:text-[var(--text-secondary)] hover:bg-surface-200 dark:hover:bg-[var(--bg-secondary)]'
            }`}>
            {t || 'All'}
          </button>
        ))}
        <select data-voice="sort-by" value={sort} onChange={e => setSort(e.target.value)}
          className="ml-auto text-xs border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-1.5 outline-none bg-white dark:bg-[var(--bg-primary)]">
          <option value="downloads">Most Downloaded</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
          <option value="price">Price: Low to High</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white dark:bg-[var(--bg-primary)] rounded-xl border border-surface-200 dark:border-[var(--border-primary)] p-4 animate-pulse">
              <div className="h-4 bg-surface-200 dark:bg-[var(--bg-tertiary)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-100 dark:bg-[var(--bg-tertiary)] rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface-100 dark:bg-[var(--bg-tertiary)] rounded w-full" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-surface-400 dark:text-[var(--text-muted)] animate-fade-in">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">No templates yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 stagger">
          {templates.map(t => (
            <Link key={t._id} to={`/templates/${t._id}`}
              className="card-premium glow-card p-4 block">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">📋</span>
                <span className="text-sm font-bold text-surface-900 dark:text-[var(--text-primary)] truncate">{t.name}</span>
                {t.price > 0 && <span className="text-[9px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold num-mono">${t.price}</span>}
              </div>
              <div className="flex gap-1 mb-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${TYPE_COLORS[t.projectType] || 'bg-surface-100 dark:bg-[var(--bg-tertiary)] text-surface-500 dark:text-[var(--text-muted)]'}`}>{t.projectType}</span>
                {t.category && <span className="text-[9px] bg-surface-100 dark:bg-[var(--bg-tertiary)] text-surface-500 dark:text-[var(--text-muted)] px-1.5 py-0.5 rounded">{t.category}</span>}
              </div>
              <p className="text-[10px] text-surface-500 dark:text-[var(--text-muted)] line-clamp-2 mb-2">{t.description}</p>
              <div className="flex items-center gap-3 text-[9px] text-surface-400 dark:text-[var(--text-muted)]">
                <span className="num-mono">⬇ {t.downloads}</span>
                <span className="num-mono">★ {t.rating || '-'} ({t.ratingCount})</span>
                <span className="num-mono">{t.phases?.length || 0} phases</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

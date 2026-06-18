import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TYPE_COLORS = {
  software: 'bg-primary-50 text-primary-600',
  design: 'bg-amber-50 text-amber-600',
  business: 'bg-emerald-50 text-emerald-600',
  content: 'bg-purple-50 text-purple-600',
  research: 'bg-cyan-50 text-cyan-600',
};

export default function TemplateMarketplace() {
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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Template Marketplace</h1>
          <p className="text-xs text-surface-500 mt-0.5">Use pre-built templates to start projects faster</p>
        </div>
        <Link to="/templates/create"
          className="px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors">
          + Create Template
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'software', 'design', 'business', 'content', 'research'].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border-none ${
              type === t ? 'bg-[#2347e8] text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}>
            {t || 'All'}
          </button>
        ))}
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="ml-auto text-xs border border-surface-200 rounded-lg px-3 py-1.5 outline-none bg-white">
          <option value="downloads">Most Downloaded</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
          <option value="price">Price: Low to High</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 animate-pulse">
              <div className="h-4 bg-surface-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-surface-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">No templates yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {templates.map(t => (
            <Link key={t._id} to={`/templates/${t._id}`}
              className="bg-white rounded-xl border border-surface-200 p-4 hover:shadow-sm transition-shadow block">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">📋</span>
                <span className="text-sm font-bold text-surface-900 truncate">{t.name}</span>
                {t.price > 0 && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-semibold">${t.price}</span>}
              </div>
              <div className="flex gap-1 mb-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${TYPE_COLORS[t.projectType] || 'bg-surface-100 text-surface-500'}`}>{t.projectType}</span>
                {t.category && <span className="text-[9px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded">{t.category}</span>}
              </div>
              <p className="text-[10px] text-surface-500 line-clamp-2 mb-2">{t.description}</p>
              <div className="flex items-center gap-3 text-[9px] text-surface-400">
                <span>⬇ {t.downloads}</span>
                <span>★ {t.rating || '-'} ({t.ratingCount})</span>
                <span>{t.phases?.length || 0} phases</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

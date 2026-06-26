import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);
  const [rating, setRating] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetch(`/api/templates/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
    }).then(r => r.json())
      .then(d => setTemplate(d.data))
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false));
  }, [id]);

  const rateTemplate = async (star) => {
    setRating(true);
    try {
      const res = await fetch(`/api/templates/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
        body: JSON.stringify({ rating: star }),
      });
      const d = await res.json();
      if (d.data) {
        setTemplate(prev => ({ ...prev, rating: d.data.rating, ratingCount: d.data.ratingCount }));
        toast.success(`Rated ${star}/5!`);
      }
    } catch (e) { toast.error('Failed to rate'); }
    finally { setRating(false); }
  };

  const useTemplate = async () => {
    setUsing(true);
    try {
      const res = await fetch(`/api/templates/${id}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      });
      const d = await res.json();
      if (d.data) {
        toast.success(`Project "${d.data.name}" created with ${d.data.tasks?.length || 0} tasks across ${d.data.sprints?.length || 0} sprints!`);
        navigate(`/projects/${d.data._id}`);
      } else {
        toast.error(d.error || 'Failed to apply template');
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally { setUsing(false); }
  };

  if (loading) return <div className="p-8 text-center text-surface-500 dark:text-[var(--text-muted)] text-sm">Loading...</div>;
  if (!template) return <div className="p-8 text-center text-surface-500 dark:text-[var(--text-muted)] text-sm">Template not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 page-enter">
      <button data-voice="back-marketplace" onClick={() => navigate(-1)}
        className="text-xs text-primary-600 font-semibold mb-4 hover:underline cursor-pointer bg-transparent border-none">
        ← Back to marketplace
      </button>

      <div className="card-premium glow-card p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-[var(--text-primary)]">{template.name}</h1>
            <p className="text-xs text-surface-500 dark:text-[var(--text-muted)] mt-1">{template.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded font-semibold">{template.projectType}</span>
              {template.tags?.map(t => <span key={t} className="text-[9px] bg-surface-100 dark:bg-[var(--bg-tertiary)] text-surface-500 dark:text-[var(--text-muted)] px-1.5 py-0.5 rounded">{t}</span>)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-surface-900 dark:text-[var(--text-primary)] num-mono">{template.price > 0 ? `$${template.price}` : 'Free'}</div>
            <div className="flex items-center justify-end gap-1 mt-1">
              {[1,2,3,4,5].map(star => (
                <button key={star} data-voice={`rate-template-${star}`} onClick={() => rateTemplate(star)} disabled={rating}
                  onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                  className={`text-sm cursor-pointer border-none bg-transparent p-0 leading-none transition-colors ${star <= (hoverRating || template.rating) ? 'text-amber-400' : 'text-surface-300 dark:text-[var(--text-muted)]'} disabled:opacity-50`}>
                  ★
                </button>
              ))}
              <span className="text-[10px] text-surface-400 dark:text-[var(--text-muted)] ml-1">({template.ratingCount})</span>
            </div>
            <div className="text-[10px] text-surface-400 dark:text-[var(--text-muted)] mt-0.5 num-mono">⬇ {template.downloads}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button data-voice="use-template" onClick={useTemplate} disabled={using}
            className="btn-premium text-sm disabled:opacity-50">
            {using ? 'Creating...' : 'Use This Template'}
          </button>
        </div>

        <div className="space-y-4">
          {template.phases?.map((phase, i) => (
            <div key={i} className="card-premium glow-card overflow-hidden">
              <div className="bg-surface-50 dark:bg-[var(--bg-tertiary)] px-4 py-2 font-semibold text-sm text-surface-800 dark:text-[var(--text-primary)] border-b border-surface-200 dark:border-[var(--border-primary)]">
                Phase {i + 1}: {phase.name}
              </div>
              <div className="divide-y divide-surface-100 dark:divide-[var(--border-secondary)]">
                {phase.tasks?.map((task, j) => (
                  <div key={j} className="px-4 py-2 text-xs text-surface-600 dark:text-[var(--text-secondary)] flex items-center justify-between">
                    <span>{task.title}</span>
                    <span className="text-[9px] text-surface-400 dark:text-[var(--text-muted)] num-mono">{task.estimatedHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

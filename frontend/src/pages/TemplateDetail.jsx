import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);

  useEffect(() => {
    fetch(`/api/templates/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
    }).then(r => r.json())
      .then(d => setTemplate(d.data))
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false));
  }, [id]);

  const useTemplate = async () => {
    setUsing(true);
    try {
      const res = await fetch(`/api/templates/${id}/download`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      });
      const d = await res.json();
      if (d.data) {
        const ph = d.data;
        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
          body: JSON.stringify({
            name: ph.name,
            description: ph.description,
            projectType: ph.projectType,
          }),
        });
        const projectData = await projectRes.json();
        toast.success('Project created from template!');
        navigate(`/projects/${projectData._id}`);
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally { setUsing(false); }
  };

  if (loading) return <div className="p-8 text-center text-surface-500 text-sm">Loading...</div>;
  if (!template) return <div className="p-8 text-center text-surface-500 text-sm">Template not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)}
        className="text-xs text-primary-600 font-semibold mb-4 hover:underline cursor-pointer bg-transparent border-none">
        ← Back to marketplace
      </button>

      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-surface-900">{template.name}</h1>
            <p className="text-xs text-surface-500 mt-1">{template.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-semibold">{template.projectType}</span>
              {template.tags?.map(t => <span key={t} className="text-[9px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded">{t}</span>)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-surface-900">{template.price > 0 ? `$${template.price}` : 'Free'}</div>
            <div className="text-[10px] text-surface-400 mt-1">
              ⬇ {template.downloads} · ★ {template.rating} ({template.ratingCount})
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={useTemplate} disabled={using}
            className="px-5 py-2 bg-[#2347e8] text-white rounded-lg text-sm font-semibold hover:bg-[#1d3dcc] disabled:opacity-50 transition-colors cursor-pointer border-none">
            {using ? 'Creating...' : 'Use This Template'}
          </button>
        </div>

        <div className="space-y-4">
          {template.phases?.map((phase, i) => (
            <div key={i} className="border border-surface-200 rounded-lg overflow-hidden">
              <div className="bg-surface-50 px-4 py-2 font-semibold text-sm text-surface-800 border-b border-surface-200">
                Phase {i + 1}: {phase.name}
              </div>
              <div className="divide-y divide-surface-100">
                {phase.tasks?.map((task, j) => (
                  <div key={j} className="px-4 py-2 text-xs text-surface-600 flex items-center justify-between">
                    <span>{task.title}</span>
                    <span className="text-[9px] text-surface-400">{task.estimatedHours}h</span>
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

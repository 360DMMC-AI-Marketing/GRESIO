import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CreateTemplate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', description: '', projectType: 'software', category: 'general', price: 0,
    phases: [{ name: '', tasks: [{ title: '', description: '', estimatedHours: 4 }] }],
    tags: '',
  });

  const addPhase = () => setForm({ ...form, phases: [...form.phases, { name: '', tasks: [{ title: '', description: '', estimatedHours: 4 }] }] });

  const removePhase = (i) => {
    if (form.phases.length <= 1) return;
    setForm({ ...form, phases: form.phases.filter((_, idx) => idx !== i) });
  };

  const updatePhase = (i, field, value) => {
    const phases = [...form.phases];
    phases[i] = { ...phases[i], [field]: value };
    setForm({ ...form, phases });
  };

  const addTask = (phaseIdx) => {
    const phases = [...form.phases];
    phases[phaseIdx].tasks.push({ title: '', description: '', estimatedHours: 4 });
    setForm({ ...form, phases });
  };

  const updateTask = (phaseIdx, taskIdx, field, value) => {
    const phases = [...form.phases];
    phases[phaseIdx].tasks[taskIdx] = { ...phases[phaseIdx].tasks[taskIdx], [field]: value };
    setForm({ ...form, phases });
  };

  const removeTask = (phaseIdx, taskIdx) => {
    const phases = [...form.phases];
    if (phases[phaseIdx].tasks.length <= 1) return;
    phases[phaseIdx].tasks = phases[phaseIdx].tasks.filter((_, idx) => idx !== taskIdx);
    setForm({ ...form, phases });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phases[0].name) { toast.error('Name and at least one phase required'); return; }
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.data) {
        toast.success('Template created!');
        navigate(`/templates/${data.data._id}`);
      } else {
        toast.error(data.error || 'Failed to create');
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 page-enter">
      <h1 className="text-xl font-bold text-surface-900 dark:text-[var(--text-primary)] mb-4">Create Template</h1>
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-surface-700 dark:text-[var(--text-secondary)] mb-1 block">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full text-sm border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-primary)]" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-surface-700 dark:text-[var(--text-secondary)] mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full text-sm border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-primary)]" rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-700 dark:text-[var(--text-secondary)] mb-1 block">Project Type</label>
            <select value={form.projectType} onChange={e => setForm({ ...form, projectType: e.target.value })}
              className="w-full text-sm border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none bg-white dark:bg-[var(--bg-primary)]">
              <option value="software">Software</option>
              <option value="design">Design</option>
              <option value="business">Business</option>
              <option value="content">Content</option>
              <option value="research">Research</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-700 dark:text-[var(--text-secondary)] mb-1 block">Price ($)</label>
            <input type="number" min="0" step="1" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
              className="w-full text-sm border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-primary)] num-mono" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-surface-700 dark:text-[var(--text-secondary)] mb-1 block">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="react, api, fullstack"
              className="w-full text-sm border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-primary)]" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass-panel flex items-center justify-between p-3 rounded-lg">
            <h2 className="text-sm font-bold text-surface-900 dark:text-[var(--text-primary)]">Phases & Tasks</h2>
            <button data-voice="add-phase" type="button" onClick={addPhase}
              className="px-3 py-1.5 bg-surface-100 dark:bg-[var(--bg-tertiary)] text-surface-700 dark:text-[var(--text-secondary)] rounded-lg text-xs font-semibold hover:bg-surface-200 dark:hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer border-none">
              + Add Phase
            </button>
          </div>

          {form.phases.map((phase, phaseIdx) => (
            <div key={phaseIdx} className="card-premium glow-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <input value={phase.name} onChange={e => updatePhase(phaseIdx, 'name', e.target.value)}
                  placeholder={`Phase ${phaseIdx + 1} name`}
                  className="flex-1 text-sm border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--brand-primary)]" />
                <button type="button" onClick={() => removePhase(phaseIdx)}
                  className="text-danger-500 text-xs hover:underline cursor-pointer bg-transparent border-none">Remove</button>
              </div>

              <div className="space-y-1.5">
                {phase.tasks.map((task, taskIdx) => (
                  <div key={taskIdx} className="flex items-center gap-2">
                    <input data-voice="field-task-title" value={task.title} onChange={e => updateTask(phaseIdx, taskIdx, 'title', e.target.value)}
                      placeholder="Task title"
                      className="flex-1 text-xs border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--brand-primary)]" />
                    <input type="number" min="1" value={task.estimatedHours} onChange={e => updateTask(phaseIdx, taskIdx, 'estimatedHours', Number(e.target.value))}
                      className="w-16 text-xs border border-surface-200 dark:border-[var(--border-primary)] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--brand-primary)] num-mono" />
                    <span className="text-[9px] text-surface-400 dark:text-[var(--text-muted)] w-10">hours</span>
                    <button type="button" onClick={() => removeTask(phaseIdx, taskIdx)}
                      className="text-danger-400 text-[10px] hover:underline cursor-pointer bg-transparent border-none">✕</button>
                  </div>
                ))}
              </div>

              <button data-voice="add-task" type="button" onClick={() => addTask(phaseIdx)}
                className="mt-2 text-[10px] text-primary-600 font-semibold hover:underline cursor-pointer bg-transparent border-none">
                + Add Task
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button data-voice="publish-template" type="submit"
            className="btn-premium text-sm">
            Publish Template
          </button>
          <button data-voice="cancel-create" type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 bg-surface-100 dark:bg-[var(--bg-tertiary)] text-surface-700 dark:text-[var(--text-secondary)] rounded-lg text-sm font-semibold hover:bg-surface-200 dark:hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer border-none">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

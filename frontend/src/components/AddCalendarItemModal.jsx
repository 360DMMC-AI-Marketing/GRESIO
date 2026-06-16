import { useState, useEffect } from 'react';
import { calendarEvents, projects, integrations } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TYPES = [
  { value: 'event', label: 'Event', icon: '\u25CF' },
  { value: 'milestone', label: 'Milestone', icon: '\u25C6' },
  { value: 'reminder', label: 'Reminder', icon: '\u23F0' },
];

export default function AddCalendarItemModal({ defaultDate, onClose, onCreated }) {
  const { user } = useAuth();
  const [type, setType] = useState('event');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate ? defaultDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState('');
  const [link, setLink] = useState('');
  const [project, setProject] = useState('');
  const [description, setDescription] = useState('');
  const [projectList, setProjectList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    projects.getAll()
      .then(r => setProjectList(r.data || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!title.trim()) { setError('Enter a title first'); return; }
    setGenerating(true);
    setError('');
    try {
      const startISO = new Date(date).toISOString();
      const endISO = endDate ? new Date(endDate).toISOString() : new Date(Date.parse(startISO) + 3600000).toISOString();
      const res = await integrations.createMeeting({
        subject: title.trim(),
        startDateTime: startISO,
        endDateTime: endISO,
        userEmail: user?.email,
      });
      if (res.data?.joinUrl) {
        setLink(res.data.joinUrl);
      } else {
        setError('Failed to generate meeting — no join URL returned');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate meeting');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await calendarEvents.create({
        title: title.trim(),
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : undefined,
        type,
        link: link.trim() || undefined,
        project: project || undefined,
        description,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Add to Calendar</h2>
          <button onClick={onClose}
            className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 bg-transparent border-none cursor-pointer p-0.5 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Type</label>
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex-1 text-[11px] font-semibold py-2 rounded-lg border transition-colors cursor-pointer ${
                    type === t.value
                      ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Enter title..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Start *</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">End</label>
              <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Project</label>
            <select value={project} onChange={e => setProject(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors">
              <option value="">No project</option>
              {projectList.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {(type === 'event' || type === 'milestone') && (
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Meeting link</label>
              <div className="flex gap-2">
                <input type="text" value={link} onChange={e => setLink(e.target.value)}
                  placeholder="https://meet.google.com/... or https://teams.microsoft.com/..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors" />
                <button type="button" onClick={handleGenerate} disabled={generating}
                  className="text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer border-none whitespace-nowrap">
                  {generating ? '...' : '🎥 Generate'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Optional..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors resize-none" />
          </div>

          {error && <p className="text-[11px] text-danger-600 dark:text-danger-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 text-xs font-semibold py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors cursor-pointer border-none">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 text-xs font-semibold py-2 rounded-lg bg-brand-600 dark:bg-brand-500 text-white hover:bg-brand-700 dark:hover:bg-brand-600 disabled:opacity-50 transition-colors cursor-pointer border-none">
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

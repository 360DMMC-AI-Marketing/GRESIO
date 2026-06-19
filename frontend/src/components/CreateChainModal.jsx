import { useState, useEffect } from 'react';

export default function CreateChainModal({ projects, initial, onSave, onClose }) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setSelectedIds((initial.projects || []).map(p => p._id));
    }
  }, [initial]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProject = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveUp = (id) => {
    const idx = selectedIds.indexOf(id);
    if (idx <= 0) return;
    const copy = [...selectedIds];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    setSelectedIds(copy);
  };

  const moveDown = (id) => {
    const idx = selectedIds.indexOf(id);
    if (idx === -1 || idx >= selectedIds.length - 1) return;
    const copy = [...selectedIds];
    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
    setSelectedIds(copy);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), projects: selectedIds });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-surface-900 mb-1">
          {initial ? 'Edit Chain' : 'New Chain'}
        </h3>
        <p className="text-[10px] text-surface-400 mb-4">
          {initial ? 'Update the chain name and project order.' : 'Create a project pipeline chain.'}
        </p>

        <div className="mb-3">
          <label className="block text-[10px] font-semibold text-surface-700 mb-1">Chain name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Winter Campaign Flow"
            className="w-full px-2.5 py-1.5 text-[11px] border border-surface-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all box-border"
            autoFocus
          />
        </div>

        <div className="mb-2">
          <label className="block text-[10px] font-semibold text-surface-700 mb-1">Projects (in order)</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full px-2 py-1 text-[10px] border border-surface-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all mb-1.5"
          />
          <div className="max-h-[240px] overflow-y-auto border border-surface-200 rounded-lg">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-surface-400">No projects found</div>
            ) : (
              filtered.map(p => {
                const checked = selectedIds.includes(p._id);
                const idx = selectedIds.indexOf(p._id);
                return (
                  <div key={p._id}
                    className={`flex items-center gap-1.5 px-2 py-1 text-[10px] cursor-pointer ${checked ? 'bg-primary-50' : ''} border-b border-surface-100 last:border-b-0 hover:bg-surface-50 transition-colors`}
                    onClick={() => toggleProject(p._id)}
                  >
                    <input type="checkbox" checked={checked} readOnly
                      className="accent-primary-600 m-0" />
                    <span className={`flex-1 ${checked ? 'font-semibold text-surface-900' : 'text-surface-700'}`}>{p.name}</span>
                    {p.projectType && <span className="text-[8px] text-surface-400">{p.projectType}</span>}
                    {checked && (
                      <span className="flex gap-0.5 ml-auto items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveUp(p._id); }}
                          disabled={idx === 0}
                          className={`px-1 py-0.5 text-[10px] bg-surface-100 border-none rounded cursor-pointer text-surface-700 ${idx === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-200'}`}
                        >↑</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveDown(p._id); }}
                          disabled={idx === selectedIds.length - 1}
                          className={`px-1 py-0.5 text-[10px] bg-surface-100 border-none rounded cursor-pointer text-surface-700 ${idx === selectedIds.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-200'}`}
                        >↓</button>
                        <span className="text-[9px] text-primary-600 font-semibold ml-1">#{idx + 1}</span>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="mt-1.5 text-[9px] text-surface-400">
              {selectedIds.length} project{selectedIds.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 justify-end mt-4">
          <button onClick={onClose}
            className="px-3.5 py-1.5 bg-surface-100 text-surface-700 rounded-lg text-[10px] border-none cursor-pointer font-medium hover:bg-surface-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            disabled={!name.trim()}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] border-none font-semibold transition-colors ${
              name.trim()
                ? 'bg-primary-600 text-white cursor-pointer hover:bg-primary-700'
                : 'bg-surface-200 text-surface-400 cursor-not-allowed'
            }`}>
            {initial ? 'Save Changes' : 'Create Chain'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { GripVertical, Eye, EyeOff } from 'lucide-react';

export default function SectionSelector({ sections, onToggle, onReorder, currentKey, onSelect }) {
  const visible = sections.filter(s => s.visible);
  const hidden = sections.filter(s => !s.visible);

  const moveUp = (index) => {
    if (index === 0) return;
    const arr = [...visible];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    onReorder(arr.concat(hidden));
  };

  const moveDown = (index) => {
    if (index >= visible.length - 1) return;
    const arr = [...visible];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    onReorder(arr.concat(hidden));
  };

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-100">
        <h3 className="text-xs font-semibold text-surface-900">Sections</h3>
      </div>
      <div className="p-2 space-y-0.5">
        {sections.map((s, i) => (
          <div key={s.key}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${currentKey === s.key ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-600 hover:bg-surface-50'}`}
            onClick={() => onSelect(s.key)}>
            <GripVertical size={12} className="text-surface-300 cursor-grab shrink-0" />
            <span className="flex-1 truncate">{s.title}</span>
            <button onClick={(e) => { e.stopPropagation(); onToggle(s.key); }}
              className="p-0.5 text-surface-300 hover:text-surface-500 bg-transparent border-none cursor-pointer">
              {s.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
        ))}
      </div>
      {sections.length === 0 && (
        <div className="px-4 py-6 text-center text-xs text-surface-400">No sections</div>
      )}
    </div>
  );
}

import { Eye, EyeOff, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSection({ section, isActive, onToggle, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
        isActive ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
      }`}
      onClick={() => onSelect(section.key)}>
      <button {...attributes} {...listeners}
        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing bg-transparent border-none shrink-0"
        onClick={(e) => e.stopPropagation()}>
        <GripVertical size={12} />
      </button>
      <span className="flex-1 truncate">{section.title}</span>
      <button onClick={(e) => { e.stopPropagation(); onToggle(section.key); }}
        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer shrink-0">
        {section.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
    </div>
  );
}

export default function SectionSelector({ sections, onToggle, onReorder, currentKey, onSelect }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.key === active.id);
      const newIndex = sections.findIndex(s => s.key === over.id);
      onReorder(arrayMove(sections, oldIndex, newIndex));
    }
  };

  return (
    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-primary)]">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Sections</h3>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Drag to reorder</p>
      </div>
      <div className="p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {sections.map((s) => (
                <SortableSection key={s.key} section={s} isActive={currentKey === s.key} onToggle={onToggle} onSelect={onSelect} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      {sections.length === 0 && (
        <div className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">No sections</div>
      )}
    </div>
  );
}
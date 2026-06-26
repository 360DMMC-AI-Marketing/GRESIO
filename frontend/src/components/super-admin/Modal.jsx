import { useEffect } from 'react';

export default function Modal({ open, onClose, title, icon, children, footer, style }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`glass-panel bg-[var(--bg-secondary)] border border-[var(--glass-border)] shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto animate-scale-in ${style?.boxClass || ''}`} onClick={(e) => e.stopPropagation()} style={style?.boxStyle || {}}>
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {icon ? <span className="mr-2">{icon}</span> : null}{title}
          </span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)] transition-all cursor-pointer border-none text-xs">
            ✕
          </button>
        </div>
        <div className="px-6 py-4 text-xs text-[var(--text-secondary)] leading-relaxed">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-6">{footer}</div>}
      </div>
    </div>
  );
}
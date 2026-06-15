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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto ${style?.boxClass || ''}`} onClick={(e) => e.stopPropagation()} style={style?.boxStyle || {}}>
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <span className="text-sm font-semibold text-surface-900">
            {icon ? <span className="mr-2">{icon}</span> : null}{title}
          </span>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-100 text-surface-400 hover:text-surface-600 hover:bg-surface-200 transition-colors cursor-pointer border-none text-xs">
            ✕
          </button>
        </div>
        <div className="px-6 py-4 text-xs text-surface-600 leading-relaxed">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pb-6">{footer}</div>}
      </div>
    </div>
  );
}

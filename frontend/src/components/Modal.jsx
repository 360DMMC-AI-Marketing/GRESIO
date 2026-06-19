import { useEffect } from 'react';
import Dropdown from './Dropdown';

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

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText, confirmColor, icon }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirm'}
      icon={icon || '⚠️'}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer border-none">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors cursor-pointer border-none" style={{background: confirmColor || '#ef4444'}}>
            {confirmText || 'Delete'}
          </button>
        </>
      }
    >
      <p className="m-0 text-xs text-surface-500">{message}</p>
    </Modal>
  );
}

export function AlertModal({ open, onClose, title, message, type }) {
  const color = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#2347e8';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info')}
      icon={type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
      footer={<button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors cursor-pointer border-none" style={{background: color}}>OK</button>}
    >
      <p className="m-0 text-xs" style={{color}}>{message}</p>
    </Modal>
  );
}

export function InputModal({ open, onClose, onSubmit, title, icon, fields, submitText, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer border-none">Cancel</button>
          <button onClick={onSubmit} className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors cursor-pointer border-none">{submitText || 'Save'}</button>
        </>
      }
    >
      {fields.map(f => (
        <label key={f.key} className="block text-xs font-medium text-surface-700 mt-3 first:mt-0">
          {f.label}
          {f.type === 'select' ? (
            <Dropdown className="mt-1" value={f.value} onChange={f.onChange}
              options={f.options} />
          ) : f.type === 'textarea' ? (
            <textarea className="w-full px-2.5 py-1.5 text-xs border border-surface-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 mt-1 resize-vertical min-h-[60px]" value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
          ) : (
            <input className="w-full px-2.5 py-1.5 text-xs border border-surface-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 mt-1" type={f.type||'text'} value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
          )}
        </label>
      ))}
      {children}
    </Modal>
  );
}

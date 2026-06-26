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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-[var(--elevation-high)] max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto animate-scale-in rounded-[var(--radius-lg)] ${style?.boxClass || ''}`} onClick={(e) => e.stopPropagation()} style={style?.boxStyle || {}}>
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

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText, confirmColor, icon }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirm'}
      icon={icon || '⚠️'}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all cursor-pointer border-none">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all cursor-pointer border-none" style={{background: confirmColor || 'var(--danger-text, #ef4444)'}}>
            {confirmText || 'Delete'}
          </button>
        </>
      }
    >
      <p className="m-0 text-xs text-[var(--text-tertiary)]">{message}</p>
    </Modal>
  );
}

export function AlertModal({ open, onClose, title, message, type }) {
  const isError = type === 'error';
  const isSuccess = type === 'success';
  const palette = isError
    ? { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger-text)' }
    : isSuccess
      ? { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success-text)' }
      : { bg: 'var(--info-bg)', border: 'var(--brand-primary)', color: 'var(--brand-primary)' };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || (isError ? 'Error' : isSuccess ? 'Success' : 'Info')}
      icon={isError ? '❌' : isSuccess ? '✅' : 'ℹ️'}
      footer={<button onClick={onClose} className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border-none" style={{background: palette.bg, color: palette.color, border: `0.5px solid ${palette.border}`}}>OK</button>}
    >
      <p className="m-0 text-xs" style={{color: palette.color}}>{message}</p>
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
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all cursor-pointer border-none">Cancel</button>
          <button onClick={onSubmit} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all cursor-pointer border-none btn-premium">{submitText || 'Save'}</button>
        </>
      }
    >
      {fields.map(f => (
        <label key={f.key} className="block text-xs font-medium text-[var(--text-secondary)] mt-3 first:mt-0">
          {f.label}
          {f.type === 'select' ? (
            <Dropdown className="mt-1" value={f.value} onChange={f.onChange}
              options={f.options} />
          ) : f.type === 'textarea' ? (
            <textarea className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] mt-1 resize-vertical min-h-[60px]" value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
          ) : (
            <input className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-primary)] rounded-[var(--radius-lg)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)] mt-1" type={f.type||'text'} value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
          )}
        </label>
      ))}
      {children}
    </Modal>
  );
}
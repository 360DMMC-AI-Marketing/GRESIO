import { useEffect } from 'react';

const MODAL_STYLES = {
  backdrop: {
    position:'fixed',top:0,left:0,width:'100vw',height:'100vh',
    background:'rgba(0,0,0,0.45)',zIndex:9999,
    display:'flex',alignItems:'center',justifyContent:'center',
  },
  box: {
    background:'white',borderRadius:12,
    boxShadow:'0 20px 60px rgba(0,0,0,0.15)',
    width:'90%',maxWidth:420,
    maxHeight:'80vh',overflow:'auto',
  },
  header: {
    display:'flex',alignItems:'center',justifyContent:'space-between',
    padding:'14px 16px 0',fontSize:13,fontWeight:600,color:'#111827',
  },
  body: { padding:'12px 16px',fontSize:11,color:'#374151' },
  footer: {
    display:'flex',justifyContent:'flex-end',gap:6,
    padding:'0 16px 14px',
  },
  closeBtn: {
    cursor:'pointer',fontSize:15,color:'#9ca3af',lineHeight:1,border:'none',background:'none',padding:'2px 6px',
  },
  input: {
    width:'100%',padding:'6px 10px',fontSize:11,border:'0.5px solid #d1d5db',borderRadius:6,
    outline:'none',boxSizing:'border-box',marginTop:4,
  },
  label: { display:'block',fontSize:10,fontWeight:500,color:'#374151',marginTop:8 },
};

export default function Modal({ open, onClose, title, icon, children, footer, style }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={MODAL_STYLES.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{...MODAL_STYLES.box, ...style}} onClick={(e) => e.stopPropagation()}>
        <div style={MODAL_STYLES.header}>
          <span>{icon ? icon + ' ' : ''}{title}</span>
          <button style={MODAL_STYLES.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={MODAL_STYLES.body}>{children}</div>
        {footer && <div style={MODAL_STYLES.footer}>{footer}</div>}
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
          <button className="btn btn-gray" onClick={onClose} style={{fontSize:10,padding:'5px 12px'}}>Cancel</button>
          <button className="btn btn-red" onClick={() => { onConfirm(); onClose(); }} style={{fontSize:10,padding:'5px 12px',background:confirmColor||'#ef4444',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}>
            {confirmText || 'Delete'}
          </button>
        </>
      }
    >
      <p style={{margin:0,fontSize:11,color:'#6b7280'}}>{message}</p>
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
      footer={<button className="btn btn-blue" onClick={onClose} style={{fontSize:10,padding:'5px 12px'}}>OK</button>}
    >
      <p style={{margin:0,fontSize:11,color}}>{message}</p>
    </Modal>
  );
}

export function InputModal({ open, onClose, onSubmit, title, icon, fields, submitText }) {
  // fields: [{ key, label, type, placeholder, value, onChange, required }]
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      footer={
        <>
          <button className="btn btn-gray" onClick={onClose} style={{fontSize:10,padding:'5px 12px'}}>Cancel</button>
          <button className="btn btn-blue" onClick={onSubmit} style={{fontSize:10,padding:'5px 12px'}}>{submitText || 'Save'}</button>
        </>
      }
    >
      {fields.map(f => (
        <label key={f.key} style={MODAL_STYLES.label}>
          {f.label}
          {f.type === 'select' ? (
            <select style={{...MODAL_STYLES.input,appearance:'auto'}} value={f.value} onChange={f.onChange}>
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea style={{...MODAL_STYLES.input,resize:'vertical',minHeight:60}} value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
          ) : (
            <input style={MODAL_STYLES.input} type={f.type||'text'} value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
          )}
        </label>
      ))}
    </Modal>
  );
}

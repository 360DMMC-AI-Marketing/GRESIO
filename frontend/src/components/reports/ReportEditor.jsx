import { useState, useRef, useCallback } from 'react';
import { Bold, Italic, List, ListOrdered, Heading, Link, Image as ImageIcon, LayoutGrid, AlertCircle, Minus, Plus, GripVertical } from 'lucide-react';

const BLOCK_TEMPLATES = {
  metrics: `<div class="report-metrics-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">
  <div class="metric-card" style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;border:1px solid #e5e7eb">
    <p class="metric-value" style="font-size:24px;font-weight:700;color:#0f172a;margin:0">85%</p>
    <p class="metric-label" style="font-size:11px;color:#6b7280;margin:4px 0 0">Completion Rate</p>
  </div>
  <div class="metric-card" style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;border:1px solid #e5e7eb">
    <p class="metric-value" style="font-size:24px;font-weight:700;color:#0f172a;margin:0">240h</p>
    <p class="metric-label" style="font-size:11px;color:#6b7280;margin:4px 0 0">Total Hours</p>
  </div>
  <div class="metric-card" style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;border:1px solid #e5e7eb">
    <p class="metric-value" style="font-size:24px;font-weight:700;color:#0f172a;margin:0">98%</p>
    <p class="metric-label" style="font-size:11px;color:#6b7280;margin:4px 0 0">Test Pass Rate</p>
  </div>
  <div class="metric-card" style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;border:1px solid #e5e7eb">
    <p class="metric-value" style="font-size:24px;font-weight:700;color:#0f172a;margin:0">12</p>
    <p class="metric-label" style="font-size:11px;color:#6b7280;margin:4px 0 0">Team Members</p>
  </div>
</div>`,
  callout_info: `<div class="report-callout" style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:12px 16px;margin:12px 0">
  <div style="display:flex;align-items:flex-start;gap:8px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="margin-top:2px;shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    <div><p style="margin:0;font-size:13px;color:#1e40af;font-weight:600">Note</p><p style="margin:4px 0 0;font-size:12px;color:#3b82f6">Add important information here for the client.</p></div>
  </div>
</div>`,
  callout_success: `<div class="report-callout" style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:8px;padding:12px 16px;margin:12px 0">
  <div style="display:flex;align-items:flex-start;gap:8px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="margin-top:2px;shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <div><p style="margin:0;font-size:13px;color:#166534;font-weight:600">Success</p><p style="margin:4px 0 0;font-size:12px;color:#10b981">Key achievement or milestone reached.</p></div>
  </div>
</div>`,
  callout_warning: `<div class="report-callout" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:12px 0">
  <div style="display:flex;align-items:flex-start;gap:8px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="margin-top:2px;shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <div><p style="margin:0;font-size:13px;color:#92400e;font-weight:600">Attention Required</p><p style="margin:4px 0 0;font-size:12px;color:#f59e0b">Highlight risks or items needing client attention.</p></div>
  </div>
</div>`,
  divider: `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />`,
};

export default function ReportEditor({ section, onChange, design }) {
  const editorRef = useRef(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showBlockPicker, setShowBlockPicker] = useState(false);

  const exec = useCallback((cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) editorRef.current.focus();
  }, []);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertBlock = (type) => {
    const html = BLOCK_TEMPLATES[type];
    if (!html) return;
    if (editorRef.current) {
      document.execCommand('insertHTML', false, html);
      if (onChange) onChange(editorRef.current.innerHTML);
    }
    setShowBlockPicker(false);
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result;
        if (editorRef.current) {
          document.execCommand('insertImage', false, url);
          if (onChange) onChange(editorRef.current.innerHTML);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const insertLink = () => {
    if (linkUrl) {
      exec('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  if (!section) {
    return (
      <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-sm p-8 text-center text-[var(--text-muted)] text-xs">
        Select a section from the left panel to edit
      </div>
    );
  }

  const themeColor = design?.primaryColor || '#2347e8';

  return (
    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: themeColor }}>{section.title}</h3>
        <span className="text-[10px] text-[var(--text-muted)]">{section.visible ? 'Visible' : 'Hidden'}</span>
      </div>

      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex-wrap">
        <button onClick={() => exec('bold')} className="toolbar-btn" title="Bold"><Bold size={14} /></button>
        <button onClick={() => exec('italic')} className="toolbar-btn" title="Italic"><Italic size={14} /></button>
        <span className="w-px h-4 bg-[var(--border-primary)] mx-1" />
        <button onClick={() => exec('formatBlock', '<h3>')} className="toolbar-btn" title="Heading"><Heading size={14} /></button>
        <button onClick={() => exec('insertUnorderedList')} className="toolbar-btn" title="Bullet List"><List size={14} /></button>
        <button onClick={() => exec('insertOrderedList')} className="toolbar-btn" title="Numbered List"><ListOrdered size={14} /></button>
        <span className="w-px h-4 bg-[var(--border-primary)] mx-1" />
        <button onClick={() => setShowLinkInput(!showLinkInput)} className="toolbar-btn" title="Link"><Link size={14} /></button>
        <button onClick={handleImageUpload} className="toolbar-btn" title="Image"><ImageIcon size={14} /></button>
        <span className="w-px h-4 bg-[var(--border-primary)] mx-1" />
        <div className="relative">
          <button onClick={() => setShowBlockPicker(!showBlockPicker)}
            className="toolbar-btn flex items-center gap-1 px-2 text-[10px] font-medium bg-transparent border-none cursor-pointer" style={{ width: 'auto', color: themeColor }}>
            <Plus size={12} /> Block
          </button>
          {showBlockPicker && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-xl z-50 p-1.5 space-y-0.5">
              <p className="px-2 py-1 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Add Block</p>
              <button onClick={() => insertBlock('metrics')}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg bg-transparent border-none cursor-pointer text-left">
                <LayoutGrid size={12} /> Metrics Grid
              </button>
              <button onClick={() => insertBlock('callout_info')}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg bg-transparent border-none cursor-pointer text-left">
                <AlertCircle size={12} /> Info Callout
              </button>
              <button onClick={() => insertBlock('callout_success')}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg bg-transparent border-none cursor-pointer text-left">
                <AlertCircle size={12} /> Success Callout
              </button>
              <button onClick={() => insertBlock('callout_warning')}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg bg-transparent border-none cursor-pointer text-left">
                <AlertCircle size={12} /> Warning Callout
              </button>
              <button onClick={() => insertBlock('divider')}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg bg-transparent border-none cursor-pointer text-left">
                <Minus size={12} /> Divider
              </button>
            </div>
          )}
        </div>
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
          <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
            className="flex-1 px-2 py-1 text-xs border border-[var(--border-primary)] rounded bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)]" />
          <button onClick={insertLink}
            className="px-2 py-1 text-xs font-medium text-white rounded border-none cursor-pointer" style={{ backgroundColor: themeColor }}>Add</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-tertiary)]">
        <div
          ref={editorRef}
          className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl p-5 text-sm text-[var(--text-primary)] leading-relaxed outline-none min-h-[300px] editor-html"
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: section.content || '' }}
          onInput={handleInput}
        />
      </div>

      <style>{`
        .toolbar-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:6px; cursor:pointer; }
        .toolbar-btn:hover { background:var(--bg-secondary); color:var(--text-primary); }
        .editor-html p { margin: 4px 0; }
        .editor-html ul, .editor-html ol { margin: 4px 0; padding-left: 20px; }
        .editor-html img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
        .editor-html table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        .editor-html td, .editor-html th { border: 1px solid var(--border-primary); padding: 6px 8px; text-align: left; }
        .editor-html th { background: var(--bg-tertiary); font-weight: 600; }
        .editor-html a { color: ${themeColor}; }
        .editor-html blockquote { border-left: 3px solid ${themeColor}; margin: 8px 0; padding: 4px 12px; color: var(--text-tertiary); font-style: italic; }
        .editor-html h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 8px 0 4px; }
        .editor-html h4 { font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 6px 0 4px; }
        .editor-html .report-metrics-grid .metric-card { transition: transform 0.15s; }
        .editor-html .report-metrics-grid .metric-card:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
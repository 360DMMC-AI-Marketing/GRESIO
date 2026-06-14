import { useState, useRef, useCallback } from 'react';
import { Bold, Italic, List, ListOrdered, Heading, Link, Image as ImageIcon } from 'lucide-react';

export default function ReportEditor({ section, onChange }) {
  const editorRef = useRef(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const exec = useCallback((cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) editorRef.current.focus();
  }, []);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
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
          exec('insertImage', url);
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
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-8 text-center text-surface-400 text-xs">
        Select a section from the left panel to edit
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider">{section.title}</h3>
        <span className="text-[10px] text-surface-400">{section.visible ? 'Visible' : 'Hidden'}</span>
      </div>

      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-surface-100 bg-surface-50 flex-wrap">
        <button onClick={() => exec('bold')} className="toolbar-btn" title="Bold"><Bold size={14} /></button>
        <button onClick={() => exec('italic')} className="toolbar-btn" title="Italic"><Italic size={14} /></button>
        <span className="w-px h-4 bg-surface-200 mx-1" />
        <button onClick={() => exec('formatBlock', '<h3>')} className="toolbar-btn" title="Heading"><Heading size={14} /></button>
        <button onClick={() => exec('insertUnorderedList')} className="toolbar-btn" title="Bullet List"><List size={14} /></button>
        <button onClick={() => exec('insertOrderedList')} className="toolbar-btn" title="Numbered List"><ListOrdered size={14} /></button>
        <span className="w-px h-4 bg-surface-200 mx-1" />
        <button onClick={() => setShowLinkInput(!showLinkInput)} className="toolbar-btn" title="Link"><Link size={14} /></button>
        <button onClick={handleImageUpload} className="toolbar-btn" title="Image"><ImageIcon size={14} /></button>
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-100 bg-surface-50">
          <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="flex-1 px-2 py-1 text-xs border border-surface-200 rounded" />
          <button onClick={insertLink} className="px-2 py-1 text-xs font-medium bg-[#2347e8] text-white rounded hover:bg-[#1d3dcc] border-none cursor-pointer">Add</button>
        </div>
      )}

      {/* Editor content — styled like the auto-generated report's bg-surface-50 cards */}
      <div className="flex-1 overflow-y-auto p-4 bg-surface-50">
        <div
          ref={editorRef}
          className="bg-white rounded-xl p-5 text-sm text-surface-700 leading-relaxed outline-none min-h-[300px] editor-html"
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: section.content || '' }}
          onInput={handleInput}
        />
      </div>

      <style>{`
        .toolbar-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border:none; background:transparent; color:#6b7280; border-radius:6px; cursor:pointer; }
        .toolbar-btn:hover { background:#e5e7eb; color:#374151; }
        .editor-html p { margin: 4px 0; }
        .editor-html ul, .editor-html ol { margin: 4px 0; padding-left: 20px; }
        .editor-html img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
        .editor-html table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        .editor-html td, .editor-html th { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        .editor-html th { background: #f9fafb; font-weight: 600; }
        .editor-html a { color: #2347e8; }
        .editor-html blockquote { border-left: 3px solid #2347e8; margin: 8px 0; padding: 4px 12px; color: #6b7280; font-style: italic; }
        .editor-html h3 { font-size: 14px; font-weight: 600; color: #0f172a; margin: 8px 0 4px; }
        .editor-html h4 { font-size: 13px; font-weight: 600; color: #0f172a; margin: 6px 0 4px; }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { wiki } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Plus, Search, ArrowLeft, Edit3, Trash2, Clock, User, Upload, FileText, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Wiki() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('list');
  const [currentPage, setCurrentPage] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const canManage = ['admin', 'project_manager', 'team_lead', 'manager'].includes(user?.role);
  const canEdit = user && ['admin','team_lead','project_manager','manager','qa_tester','developer','intern','other'].includes(user.role);

  useEffect(() => { loadPages(); }, []);

  const loadPages = async () => {
    try {
      const res = await wiki.getAll({});
      setPages(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openPage = async (id) => {
    try {
      const res = await wiki.getById(id);
      setCurrentPage(res.data);
      setView('view');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load page');
    }
  };

  const startEdit = () => {
    setEditTitle(currentPage.title);
    setEditContent(currentPage.content);
    setView('edit');
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const res = await wiki.update(currentPage._id, { title: editTitle.trim(), content: editContent });
      setCurrentPage(res.data);
      setView('view');
      toast.success('Page updated');
      loadPages();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (id) => {
    if (!confirm('Delete this page?')) return;
    try {
      await wiki.delete(id);
      toast.success('Page deleted');
      if (currentPage?._id === id) {
        setCurrentPage(null);
        setView('list');
      }
      loadPages();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to delete');
    }
  };

  const createPage = async () => {
    if (!newTitle.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const res = await wiki.create({ title: newTitle.trim(), content: newContent });
      setNewTitle('');
      setNewContent('');
      setShowCreate(false);
      toast.success('Page created');
      loadPages();
      openPage(res.data._id);
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || e.message || 'Failed to create';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await wiki.uploadFile(currentPage._id, file);
      setCurrentPage(res.data);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Remove this file?')) return;
    try {
      const res = await wiki.deleteFile(currentPage._id, fileId);
      setCurrentPage(res.data);
      toast.success('File removed');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove file');
    }
  };

  const filtered = pages.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-[#2347e8]" /> Wiki
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">Company knowledge base</p>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text" placeholder="Search pages..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/20 focus:border-[#2347e8]"
              />
            </div>
            {canManage && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none shadow-sm">
                <Plus className="w-4 h-4" /> New Page
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
              <div className="w-14 h-14 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-surface-400" />
              </div>
              <h3 className="text-base font-semibold text-surface-900 mb-1">No pages yet</h3>
              <p className="text-sm text-surface-500 mb-4">
                {searchQuery ? 'No pages match your search' : 'Create the first wiki page to document your processes'}
              </p>
              {canManage && !searchQuery && (
                <button onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none">
                  + Create First Page
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(page => (
                <div key={page._id}
                  onClick={() => openPage(page._id)}
                  className="bg-white rounded-xl border border-surface-200 p-4 hover:border-surface-300 transition-colors cursor-pointer">
                  <h3 className="text-sm font-semibold text-surface-900">{page.title}</h3>
                  {page.content && (
                    <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                      {page.content.replace(/[#*`\[\]]/g, '').slice(0, 200)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                    {page.updatedBy && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {page.updatedBy.name}
                      </span>
                    )}
                    {page.files?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {page.files.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'view' && currentPage && (
        <div className="bg-white rounded-xl border border-surface-200">
          <div className="flex items-center justify-between p-4 border-b border-surface-100">
            <button onClick={() => { setCurrentPage(null); setView('list'); }}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 transition-colors cursor-pointer bg-transparent border-none">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <button onClick={startEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-surface-600 hover:text-[#2347e8] bg-transparent border border-surface-200 rounded-lg hover:border-[#2347e8]/30 transition-colors cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              {canManage && (
                <button onClick={() => deletePage(currentPage._id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-transparent border border-red-200 rounded-lg hover:border-red-300 transition-colors cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <h1 className="text-xl font-bold text-surface-900 mb-4">{currentPage.title}</h1>
            <div className="prose prose-sm max-w-none text-surface-700">
              <Markdown remarkPlugins={[remarkGfm]}>
                {currentPage.content || '*No content*'}
              </Markdown>
            </div>
          </div>

          {/* Attached files */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-3 pt-4 border-t border-surface-100">
              <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Attached Files
                {currentPage.files?.length > 0 && (
                  <span className="text-xs font-normal text-surface-400">({currentPage.files.length})</span>
                )}
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#2347e8] bg-transparent border border-[#2347e8]/30 rounded-lg hover:bg-[#2347e8]/5 transition-colors cursor-pointer disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
            {(!currentPage.files || currentPage.files.length === 0) ? (
              <p className="text-xs text-surface-400">No files attached</p>
            ) : (
              <div className="space-y-1.5">
                {currentPage.files.map(f => (
                  <div key={f._id}
                    className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-surface-400 shrink-0" />
                      <span className="text-xs font-medium text-surface-700 truncate">{f.originalName}</span>
                      <span className="text-xs text-surface-400 shrink-0">({formatSize(f.size)})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <a href={`/uploads/${f.filename}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 px-2 py-1 text-xs text-surface-500 hover:text-[#2347e8] bg-transparent border border-surface-200 rounded-md hover:border-[#2347e8]/30 transition-colors no-underline">
                        <Download className="w-3 h-3" />
                      </a>
                      {canManage && (
                        <button onClick={() => handleDeleteFile(f._id)}
                          className="flex items-center justify-center w-6 h-6 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer bg-transparent border-none">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contributors */}
          {currentPage.contributors?.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 pt-4 border-t border-surface-100">
                <User className="w-4 h-4 text-surface-400" />
                <span className="text-xs font-medium text-surface-500">Contributors:</span>
                {currentPage.contributors.map((c, i) => (
                  <span key={i} className="text-xs text-surface-600 bg-surface-50 px-2 py-0.5 rounded-full border border-surface-100">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-6 pb-4 text-xs text-surface-400">
            <span>Updated {new Date(currentPage.updatedAt).toLocaleDateString()}</span>
            {currentPage.updatedBy && <span>by {currentPage.updatedBy.name}</span>}
          </div>
        </div>
      )}

      {view === 'edit' && currentPage && (
        <div className="bg-white rounded-xl border border-surface-200">
          <div className="flex items-center justify-between p-4 border-b border-surface-100">
            <button onClick={() => { setView('view'); }}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 transition-colors cursor-pointer bg-transparent border-none">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
            <button onClick={saveEdit} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div className="p-4 space-y-4">
            <input
              type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
              placeholder="Page title"
              className="w-full px-4 py-2.5 text-lg font-semibold border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/20 focus:border-[#2347e8]"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Markdown</label>
                <textarea
                  value={editContent} onChange={e => setEditContent(e.target.value)}
                  placeholder="Write in markdown..."
                  rows={20}
                  className="w-full px-4 py-3 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/20 focus:border-[#2347e8] font-mono resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Preview</label>
                <div className="w-full px-4 py-3 text-sm border border-surface-200 rounded-lg bg-white min-h-[400px] prose prose-sm max-w-none overflow-auto">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {editContent || '*Nothing to preview*'}
                  </Markdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-100">
              <h2 className="text-base font-semibold text-surface-900">New Wiki Page</h2>
              <button onClick={() => setShowCreate(false)}
                className="text-surface-400 hover:text-surface-600 cursor-pointer bg-transparent border-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Page title"
                className="w-full px-4 py-2.5 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/20 focus:border-[#2347e8]"
                autoFocus
              />
              <textarea
                value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Page content (markdown)..."
                rows={8}
                className="w-full px-4 py-3 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/20 focus:border-[#2347e8] font-mono resize-y"
              />
              <div className="text-xs text-surface-400 border border-surface-100 rounded-lg p-3 bg-surface-50">
                <strong>Markdown supported:</strong> # headings, **bold**, `code`, - lists, [links](url), etc.
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-xs font-medium text-surface-600 bg-transparent border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={createPage} disabled={saving || !newTitle.trim()}
                className="px-4 py-2 bg-[#2347e8] text-white rounded-lg text-xs font-semibold hover:bg-[#1d3dcc] transition-colors cursor-pointer border-none shadow-sm disabled:opacity-50">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

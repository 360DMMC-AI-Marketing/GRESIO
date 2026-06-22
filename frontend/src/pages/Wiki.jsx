import { useState, useEffect, useRef } from 'react';
import { wiki, companies } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Plus, Search, ArrowLeft, Edit3, Trash2, Clock, User, Upload, FileText, Download, X, FileUp, Calendar, Hash, Eye, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_DEPARTMENTS = ['General', 'Engineering', 'Product', 'Design', 'QA', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'];

const DEPT_COLORS = {
  General: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', gradient: 'from-slate-400 to-slate-500' },
  Engineering: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', gradient: 'from-blue-400 to-blue-600' },
  Product: { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700', gradient: 'from-violet-400 to-violet-600' },
  Design: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600', badge: 'bg-pink-100 text-pink-700', gradient: 'from-pink-400 to-pink-600' },
  QA: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', gradient: 'from-emerald-400 to-emerald-600' },
  HR: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', gradient: 'from-orange-400 to-orange-600' },
  Finance: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-700', gradient: 'from-teal-400 to-teal-600' },
  Marketing: { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', gradient: 'from-rose-400 to-rose-600' },
  Sales: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', gradient: 'from-amber-400 to-amber-600' },
  Operations: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', gradient: 'from-indigo-400 to-indigo-600' },
};

function getDeptColor(dept) {
  return DEPT_COLORS[dept] || DEPT_COLORS.General;
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Wiki() {
  const { user, company, updateCompany } = useAuth();
  const fileInputRef = useRef(null);
  const importRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('list');
  const [currentPage, setCurrentPage] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDepartment, setNewDepartment] = useState('General');
  const [newHighlights, setNewHighlights] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editHighlights, setEditHighlights] = useState('');
  const [activeDepartment, setActiveDepartment] = useState('All');

  const departments = [...new Set([...DEFAULT_DEPARTMENTS, ...(company?.wikiDepartments || [])])];

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
    setEditDepartment(currentPage.department || 'General');
    setEditHighlights((currentPage.highlights || []).join('\n'));
    setView('edit');
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const res = await wiki.update(currentPage._id, { title: editTitle.trim(), content: editContent, department: editDepartment, highlights: editHighlights.split('\n').filter(Boolean).map(s => s.trim()) });
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
      const res = await wiki.create({ title: newTitle.trim(), content: newContent, department: newDepartment, highlights: newHighlights.split('\n').filter(Boolean).map(s => s.trim()) });
      setNewTitle('');
      setNewContent('');
      setNewDepartment('General');
      setNewHighlights('');
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

  const handleAddDepartment = async () => {
    const name = prompt('Enter new department name:');
    if (!name || !name.trim()) return;
    if (!company?._id) return toast.error('Company data not loaded');
    try {
      const res = await companies.addWikiDepartment(company._id, name.trim());
      updateCompany(res.data);
      toast.success(`Department "${name.trim()}" added`);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to add department');
    }
  };

  const handleImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImporting(true);
    let imported = 0, failed = 0;
    const toastId = toast.loading(`Importing ${files.length} file(s)...`);
    for (const file of files) {
      try {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Untitled';
        await wiki.create({ title: name, content: text, department: newDepartment });
        imported++;
      } catch {
        failed++;
      }
    }
    toast.dismiss(toastId);
    if (failed === 0) {
      toast.success(`Imported ${imported} page(s)`);
    } else {
      toast(`${imported} imported, ${failed} failed`);
    }
    setImporting(false);
    if (importRef.current) importRef.current.value = '';
    loadPages();
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

  const handleRate = async (value) => {
    try {
      const res = await wiki.rate(currentPage._id, value);
      setCurrentPage(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to rate');
    }
  };

  const filtered = pages.filter(p => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeDepartment !== 'All' && p.department !== activeDepartment) return false;
    return true;
  }).sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

  const displayPages = activeDepartment === 'All' && !searchQuery ? filtered.slice(0, 8) : filtered;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-[#2347e8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-surface-400 font-medium">Loading wiki...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2347e8] to-[#1d3dcc] flex items-center justify-center shadow-lg shadow-[#2347e8]/20">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Knowledge Base</h1>
            </div>
            <p className="text-sm text-surface-400 ml-[52px]">Company wiki & documentation</p>
                </div>
              </div>
            </div>

      {view === 'list' && (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-surface-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text" placeholder="Search articles..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all placeholder:text-surface-400"
                />
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <input ref={importRef} type="file" multiple accept=".md,.txt" onChange={handleImport} className="hidden" />
                  <button onClick={() => importRef.current?.click()} disabled={importing}
                    className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-surface-600 bg-surface-50 border border-surface-200 rounded-xl hover:bg-surface-100 hover:border-surface-300 transition-all cursor-pointer disabled:opacity-50">
                    <FileUp className="w-4 h-4" /> {importing ? 'Importing...' : 'Import'}
                  </button>
                  <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2347e8] to-[#1d3dcc] text-white rounded-xl text-xs font-bold hover:from-[#1d3dcc] hover:to-[#1a37b8] transition-all cursor-pointer border-none shadow-md shadow-[#2347e8]/20">
                    <Plus className="w-4 h-4" /> New Article
                  </button>
                </div>
              )}
            </div>

            {/* Department filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-4 pt-3 border-t border-surface-100">
              <button onClick={() => setActiveDepartment('All')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  activeDepartment === 'All'
                    ? 'bg-surface-900 text-white border-surface-900 shadow-sm'
                    : 'bg-white text-surface-500 border-surface-200 hover:border-surface-300 hover:text-surface-700'
                }`}>
                All
              </button>
              {departments.map(d => {
                const c = getDeptColor(d);
                return (
                  <button key={d} onClick={() => setActiveDepartment(d)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeDepartment === d
                        ? `${c.bg} text-white border-transparent shadow-sm`
                        : 'bg-white text-surface-500 border-surface-200 hover:border-surface-300'
                    }`}>
                    {activeDepartment !== d && <span className={`w-1.5 h-1.5 rounded-full ${c.bg}`} />}
                    {d}
                  </button>
                );
              })}
              {canManage && (
                <button onClick={handleAddDepartment}
                  className="px-3 py-2 text-xs font-medium text-[#2347e8] bg-transparent border border-dashed border-[#2347e8]/30 rounded-xl hover:bg-[#2347e8]/5 transition-all cursor-pointer flex items-center gap-1 ml-1">
                  <Plus className="w-3 h-3" /> New
                </button>
              )}
            </div>
          </div>

          {/* Page count */}
          <div className="flex items-center gap-2 mb-4 px-1">
            <Hash className="w-3.5 h-3.5 text-surface-400" />
            <span className="text-xs font-medium text-surface-400">{displayPages.length} article{displayPages.length !== 1 ? 's' : ''}</span>
            {activeDepartment !== 'All' && (
              <span className="text-xs text-surface-300">in <span className="font-semibold text-surface-400">{activeDepartment}</span></span>
            )}
          </div>

          {/* Blog-style cards */}
          {displayPages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-surface-200 p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-surface-100 to-surface-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">No articles yet</h3>
              <p className="text-sm text-surface-400 max-w-sm mx-auto mb-6">
                {searchQuery
                  ? 'No articles match your search. Try a different keyword.'
                  : activeDepartment !== 'All'
                    ? `No articles in ${activeDepartment} yet.`
                    : 'Create the first wiki article to build your company knowledge base.'}
              </p>
              {canManage && !searchQuery && activeDepartment === 'All' && (
                <button onClick={() => setShowCreate(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#2347e8] to-[#1d3dcc] text-white rounded-xl text-xs font-bold hover:from-[#1d3dcc] hover:to-[#1a37b8] transition-all cursor-pointer border-none shadow-md shadow-[#2347e8]/20">
                  <Plus className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Create First Article
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayPages.map(page => {
                const c = getDeptColor(page.department);
                return (
                  <article key={page._id}
                    onClick={() => openPage(page._id)}
                    className="group bg-white rounded-2xl border border-surface-200 overflow-hidden hover:border-surface-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                    {/* Color accent bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${c.gradient}`} />
                    <div className="p-5">
                      {/* Top row: badge left, rating right */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {page.department && (
                            <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${c.badge}`}>
                              {page.department}
                            </span>
                          )}
                          {page.files?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-surface-400 font-medium">
                              <FileText className="w-3 h-3" />
                              {page.files.length}
                            </span>
                          )}
                        </div>
                        {/* Rating badge - top right */}
                        {page.ratings?.length > 0 && (
                          <div className="flex items-center gap-1 bg-surface-50 rounded-lg px-2 py-1 border border-surface-100 shrink-0">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-[10px] font-bold text-surface-600">{page.averageRating}</span>
                            <span className="text-[9px] text-surface-400">({page.ratings.length})</span>
                          </div>
                        )}
                      </div>

                      {/* Title - most prominent */}
                      <h3 className="text-xl font-black text-surface-900 leading-tight mb-1 group-hover:text-[#2347e8] transition-colors">
                        {page.title}
                      </h3>

                      {/* Highlights - bullet points */}
                      {page.highlights?.length > 0 && (
                        <div className="mb-4">
                          <ul className="space-y-1">
                            {page.highlights.slice(0, 3).map((h, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-surface-500 leading-relaxed">
                                <span className="w-1 h-1 rounded-full bg-surface-400 mt-1.5 shrink-0" />
                                <span className="line-clamp-1">{h}</span>
                              </li>
                            ))}
                            {page.highlights.length > 3 && (
                              <li className="text-[10px] text-surface-400 font-medium ml-3">+{page.highlights.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Footer - creator */}
                      <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${c.light} flex items-center justify-center`}>
                            <span className={`text-[10px] font-bold ${c.text}`}>
                              {page.createdBy?.name ? getInitials(page.createdBy.name) : '?'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-surface-700 leading-tight">
                              {page.createdBy?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-surface-400 leading-tight">
                              Created {new Date(page.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-surface-300">
                          <ArrowLeft className="w-4 h-4 -rotate-135 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* View - Blog article layout */}
      {view === 'currentPage' && currentPage}
      {view === 'view' && currentPage && (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
          {/* Article header - clean minimal */}
          <div className={`relative bg-gradient-to-br ${getDeptColor(currentPage.department).gradient} px-8 pt-12 pb-20 text-center`}>
            <button onClick={() => { setCurrentPage(null); setView('list'); }}
              className="absolute top-4 left-4 flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl px-3.5 py-2 border border-white/10 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {/* Professional rating badge - top right */}
            {currentPage.ratings?.length > 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/10">
                <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span className="text-xs font-bold text-white/90">{currentPage.averageRating}</span>
                <span className="text-[10px] text-white/50">({currentPage.ratings.length})</span>
              </div>
            )}
            <div className="max-w-4xl mx-auto">
              {currentPage.department && (
                <span className={`inline-flex items-center px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-white/20 text-white backdrop-blur-sm mb-6`}>
                  {currentPage.department}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mt-3 mb-6">
                {currentPage.title}
              </h1>
              <div className="flex items-center justify-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-xs font-bold text-white">
                      {currentPage.createdBy?.name ? getInitials(currentPage.createdBy.name) : '?'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/90">{currentPage.createdBy?.name || 'Unknown'}</span>
                    <div className="flex items-center gap-2 text-[11px] text-white/60">
                      <span>Created {new Date(currentPage.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 backdrop-blur-sm transition-all cursor-pointer disabled:opacity-50">
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Attach'}
              </button>
              <button onClick={startEdit}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 backdrop-blur-sm transition-all cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              {canManage && (
                <button onClick={() => deletePage(currentPage._id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/10 backdrop-blur-sm transition-all cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Highlights section */}
          {currentPage.highlights?.length > 0 && (
            <div className="px-8 pt-8">
              <div className="max-w-3xl mx-auto">
                <div className="bg-surface-50 rounded-2xl border border-surface-200 p-6">
                  <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-4">Highlights</h3>
                  <ul className="space-y-3">
                    {currentPage.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-surface-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2347e8] mt-2 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Article content */}
          <div className="px-8 py-8">
            <div className="max-w-3xl mx-auto">
              <div className="prose prose-sm md:prose-base max-w-none prose-headings:text-surface-900 prose-headings:font-bold prose-a:text-[#2347e8] prose-code:text-[#2347e8] prose-code:bg-surface-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-surface-900 prose-pre:text-surface-100 prose-pre:rounded-xl prose-img:rounded-xl prose-blockquote:border-l-[#2347e8] prose-blockquote:text-surface-600">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {currentPage.content || '*No content*'}
                </Markdown>
              </div>
            </div>
          </div>

          {/* Attached files */}
          {currentPage.files?.length > 0 && (
            <div className="px-8 pb-8">
              <div className="max-w-3xl mx-auto pt-8 border-t border-surface-100">
                <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-surface-400" />
                  Attachments ({currentPage.files.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {currentPage.files.map(f => (
                    <div key={f._id}
                      className="flex items-center justify-between px-4 py-3 bg-surface-50 rounded-xl border border-surface-100 hover:border-surface-200 hover:bg-white transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-white border border-surface-200 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-surface-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-surface-700 truncate">{f.originalName}</p>
                          <p className="text-[10px] text-surface-400">{formatSize(f.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <a href={`/uploads/${f.filename}`} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center w-8 h-8 text-surface-400 hover:text-[#2347e8] hover:bg-[#2347e8]/5 rounded-lg transition-all no-underline">
                          <Download className="w-4 h-4" />
                        </a>
                        {canManage && (
                          <button onClick={() => handleDeleteFile(f._id)}
                            className="flex items-center justify-center w-8 h-8 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer bg-transparent border-none">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contributors */}
          {currentPage.contributors?.length > 0 && (
            <div className="px-8 pb-8">
              <div className="max-w-3xl mx-auto pt-6 border-t border-surface-100">
                <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-surface-400" />
                  Contributors ({currentPage.contributors.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentPage.contributors.map((c, i) => (
                    <div key={i}
                      className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 rounded-xl border border-surface-100">
                      <div className="w-6 h-6 rounded-full bg-[#2347e8]/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-[#2347e8]">{getInitials(c.name)}</span>
                      </div>
                      <span className="text-xs font-medium text-surface-600">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer meta */}
          <div className="px-8 pb-8">
            <div className="max-w-3xl mx-auto pt-4 border-t border-surface-100 flex items-center gap-4 text-xs text-surface-400">
              {currentPage.department && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${getDeptColor(currentPage.department).badge}`}>
                  {currentPage.department}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Updated {new Date(currentPage.updatedAt).toLocaleDateString()}
              </span>
              {currentPage.updatedBy && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {currentPage.updatedBy.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit - Split pane with modern styling */}
      {view === 'edit' && currentPage && (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
            <button onClick={() => { setView('view'); }}
              className="flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-surface-700 transition-colors cursor-pointer bg-transparent border-none">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400 font-medium">Editing: {currentPage.title}</span>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#2347e8] to-[#1d3dcc] text-white rounded-xl text-xs font-bold hover:from-[#1d3dcc] hover:to-[#1a37b8] transition-all cursor-pointer border-none shadow-md shadow-[#2347e8]/20 disabled:opacity-50">
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  placeholder="Article title"
                  className="w-full px-5 py-3 text-xl font-bold border border-surface-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] transition-all placeholder:text-surface-300"
                />
              </div>
              <select
                value={editDepartment} onChange={e => setEditDepartment(e.target.value)}
                className="px-5 py-3 text-sm font-medium border border-surface-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] transition-all cursor-pointer min-w-[160px]"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <textarea
              value={editHighlights} onChange={e => setEditHighlights(e.target.value)}
              placeholder="Highlights (one per line)"
              rows={3}
              className="w-full px-5 py-3 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all font-mono resize-y placeholder:text-surface-300"
            />
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-2 uppercase tracking-wider">Markdown</label>
                <textarea
                  value={editContent} onChange={e => setEditContent(e.target.value)}
                  placeholder="Write in markdown..."
                  rows={24}
                  className="w-full px-5 py-4 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all font-mono resize-y placeholder:text-surface-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-2 uppercase tracking-wider">Preview</label>
                <div className="w-full px-5 py-4 text-sm border border-surface-200 rounded-xl bg-white min-h-[600px] prose prose-sm max-w-none overflow-auto">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {editContent || '*Nothing to preview*'}
                  </Markdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-surface-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2347e8] to-[#1d3dcc] flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                New Article
              </h2>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-all cursor-pointer bg-transparent border-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Article title"
                className="w-full px-5 py-3 text-lg font-bold border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all placeholder:text-surface-300"
                autoFocus
              />
              <select
                value={newDepartment} onChange={e => setNewDepartment(e.target.value)}
                className="w-full px-5 py-3 text-sm font-medium border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all cursor-pointer"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <textarea
                value={newHighlights} onChange={e => setNewHighlights(e.target.value)}
                placeholder="Highlights (one per line)&#10;e.g.&#10;User authentication with JWT&#10;Role-based access control&#10;Real-time notifications"
                rows={3}
                className="w-full px-5 py-3 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all font-mono resize-y placeholder:text-surface-300"
              />
              <textarea
                value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Write your article content in markdown..."
                rows={12}
                className="w-full px-5 py-4 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-[#2347e8]/15 focus:border-[#2347e8] focus:bg-white transition-all font-mono resize-y placeholder:text-surface-300"
              />
              <div className="flex items-center gap-3 text-xs text-surface-400 bg-surface-50 rounded-xl px-4 py-3 border border-surface-100">
                <span className="font-semibold text-surface-500">Markdown:</span>
                <code className="text-[#2347e8] bg-white px-1.5 py-0.5 rounded border border-surface-200"># Heading</code>
                <code className="text-[#2347e8] bg-white px-1.5 py-0.5 rounded border border-surface-200">**bold**</code>
                <code className="text-[#2347e8] bg-white px-1.5 py-0.5 rounded border border-surface-200">`code`</code>
                <code className="text-[#2347e8] bg-white px-1.5 py-0.5 rounded border border-surface-200">[link](url)</code>
                <code className="text-[#2347e8] bg-white px-1.5 py-0.5 rounded border border-surface-200">- list</code>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-100">
              <button onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 text-xs font-semibold text-surface-600 bg-transparent border border-surface-200 rounded-xl hover:bg-surface-50 hover:border-surface-300 transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={createPage} disabled={saving || !newTitle.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-[#2347e8] to-[#1d3dcc] text-white rounded-xl text-xs font-bold hover:from-[#1d3dcc] hover:to-[#1a37b8] transition-all cursor-pointer border-none shadow-md shadow-[#2347e8]/20 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

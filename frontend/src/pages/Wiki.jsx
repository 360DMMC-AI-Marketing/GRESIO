import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { wiki, companies } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Plus, Search, ArrowLeft, Edit3, Trash2, Clock, User, Upload, FileText, Download, X, FileUp, Calendar, Hash, Eye, Star, Folder, Library, ChevronRight, Filter } from 'lucide-react';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [showDeptFilter, setShowDeptFilter] = useState(false);

  const departments = [...new Set([...DEFAULT_DEPARTMENTS, ...(company?.wikiDepartments || [])])];

  const canManage = ['admin', 'project_manager', 'team_lead', 'manager'].includes(user?.role);
  const canEdit = user && ['admin','team_lead','project_manager','manager','qa_tester','developer','intern','other'].includes(user.role);

  const loadPages = async () => {
    try {
      const res = await wiki.getAll();
      setPages(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to load wiki pages:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
    const articleId = searchParams.get('article');
    if (articleId) {
      openPage(articleId);
    }
  }, []);

  useEffect(() => {
    const articleId = searchParams.get('article');
    if (!articleId && view !== 'list') {
      setCurrentPage(null);
      setView('list');
    }
  }, [searchParams]);

  const openPage = async (id) => {
    try {
      const res = await wiki.getById(id);
      setCurrentPage(res.data);
      setView('view');
      navigate('?article=' + id, { replace: true });
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
      setPages(prev => prev.map(p => p._id === res.data._id ? res.data : p));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to rate');
    }
  };

  const filtered = pages.filter(p => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeDepartment !== 'All' && p.department !== activeDepartment) return false;
    return true;
  }).sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

  const displayPages = filtered;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm dark:text-[var(--text-muted)] font-medium">Loading wiki...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto page-enter">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-primary)]">
                <Library className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <h1 className="text-2xl font-bold dark:text-[var(--text-primary)] tracking-tight">Project Library</h1>
            </div>
            <p className="text-sm dark:text-[var(--text-muted)] ml-[52px]">Company documentation & knowledge archive</p>
          </div>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-lg)] p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text" placeholder="Search articles..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                />
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <input ref={importRef} type="file" multiple accept=".md,.txt" onChange={handleImport} className="hidden" />
                  <button onClick={() => importRef.current?.click()} disabled={importing}
                    className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer disabled:opacity-50">
                    <FileUp className="w-4 h-4" /> {importing ? 'Importing...' : 'Import'}
                  </button>
                  <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-md)] transition-all cursor-pointer border-none">
                    <Plus className="w-4 h-4" /> New Article
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border-primary)]">
              <div className="relative">
                <button onClick={() => setShowDeptFilter(!showDeptFilter)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer">
                  <Filter className="w-3.5 h-3.5" />
                  {activeDepartment === 'All' ? 'All Sections' : activeDepartment}
                  <ChevronRight className={`w-3 h-3 transition-transform ${showDeptFilter ? 'rotate-90' : ''}`} />
                </button>
                {showDeptFilter && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-[var(--radius-md)] shadow-lg z-20 py-1 animate-fade-in">
                    <button onClick={() => { setActiveDepartment('All'); setShowDeptFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer bg-transparent border-none ${activeDepartment === 'All' ? 'text-[var(--brand-primary)] font-semibold bg-[var(--brand-primary)]/5' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                      All Sections
                    </button>
                    <div className="h-px bg-[var(--border-primary)] mx-3 my-1" />
                    {departments.map(d => (
                      <button key={d} onClick={() => { setActiveDepartment(d); setShowDeptFilter(false); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer bg-transparent border-none flex items-center gap-2 ${activeDepartment === d ? 'text-[var(--brand-primary)] font-semibold bg-[var(--brand-primary)]/5' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                        <span className={`w-2 h-2 rounded-full ${getDeptColor(d).bg}`} />
                        {d}
                      </button>
                    ))}
                    {canManage && (
                      <>
                        <div className="h-px bg-[var(--border-primary)] mx-3 my-1" />
                        <button onClick={() => { handleAddDepartment(); setShowDeptFilter(false); }}
                          className="w-full text-left px-4 py-2 text-xs text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-colors cursor-pointer bg-transparent border-none flex items-center gap-1.5">
                          <Plus className="w-3 h-3" /> Add Section
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] ml-auto">
                <Hash className="w-3 h-3" />
                <span className="font-medium"><span className="num-mono">{displayPages.length}</span> article{displayPages.length !== 1 ? 's' : ''}</span>
                {activeDepartment !== 'All' && (
                  <span>in <span className="font-semibold text-[var(--text-secondary)]">{activeDepartment}</span></span>
                )}
              </div>
            </div>
          </div>

          {displayPages.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-lg)] p-16 text-center animate-fade-in">
              <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No articles yet</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-6">
                {searchQuery
                  ? 'No articles match your search. Try a different keyword.'
                  : activeDepartment !== 'All'
                    ? `No articles in ${activeDepartment} yet.`
                    : 'Create the first wiki article to build your company knowledge base.'}
              </p>
              {canManage && !searchQuery && activeDepartment === 'All' && (
                <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-md)] transition-all cursor-pointer border-none">
                  <Plus className="w-4 h-4" /> Create First Article
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayPages.map((page, idx) => {
                const c = getDeptColor(page.department);
                return (
                  <div key={page._id}
                    onClick={() => openPage(page._id)}
                    className="group flex items-center gap-4 px-5 py-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--brand-primary)]/30 cursor-pointer transition-all animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className={`w-1 h-10 rounded-full shrink-0 ${c.bg}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {page.department && (
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${c.badge}`}>
                            {page.department}
                          </span>
                        )}
                        {page.files?.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                            <FileText className="w-3 h-3" />
                            <span className="num-mono">{page.files.length}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors leading-tight truncate">
                        {page.title}
                      </h3>
                      {page.highlights?.[0] && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{page.highlights[0]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] rounded px-1.5 py-1 border border-[var(--border-primary)]">
                        <Star className={`w-3 h-3 ${(page.averageRating || 0) > 0 ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-tertiary)]'}`} />
                        <span className="num-mono font-semibold text-[var(--text-secondary)]">{page.averageRating || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        <User className="w-3 h-3" />
                        <span>{page.createdBy?.name ? getInitials(page.createdBy.name) : '?'}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'currentPage' && currentPage}
      {view === 'view' && currentPage && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-lg)] overflow-hidden animate-fade-in">
          <div className="border-b border-[var(--border-primary)] px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <button onClick={() => { setCurrentPage(null); setView('list'); navigate('/wiki', { replace: true }); }}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer bg-transparent border-none mb-3">
                  <ArrowLeft className="w-4 h-4" /> Back to Library
                </button>
                <div className="flex items-center gap-2 mb-2">
                  {currentPage.department && (
                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-medium rounded ${getDeptColor(currentPage.department).badge}`}>
                      {currentPage.department}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight">
                  {currentPage.title}
                </h1>
                <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {currentPage.createdBy?.name || 'Unknown'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {new Date(currentPage.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span>Updated {new Date(currentPage.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] px-2.5 py-1.5 border border-[var(--border-primary)]">
                  {[1, 2, 3, 4, 5].map(s => {
                    const userRating = currentPage.ratings?.find(r => r.user === user?._id)?.value || 0;
                    return (
                      <button key={s} onClick={() => handleRate(s)}
                        className="p-0 bg-transparent border-none cursor-pointer transition-transform hover:scale-110">
                        <Star className={`w-3.5 h-3.5 ${s <= (userRating || Math.round(currentPage.averageRating || 0)) ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-tertiary)]'}`} />
                      </button>
                    );
                  })}
                  <span className="text-xs font-semibold text-[var(--text-secondary)] ml-1 num-mono">{currentPage.averageRating || 0}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">(<span className="num-mono">{currentPage.ratings?.length || 0}</span>)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-primary)]">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer disabled:opacity-50">
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Attach'}
              </button>
              <button onClick={startEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-md)] transition-all cursor-pointer border-none">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              {canManage && (
                <button onClick={() => deletePage(currentPage._id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 rounded-[var(--radius-md)] border border-red-200 dark:border-red-900/50 transition-all cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          {currentPage.highlights?.length > 0 && (
            <div className="px-8 pt-8">
              <div className="max-w-3xl mx-auto">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[var(--radius-md)] p-5">
                  <h3 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Key Points</h3>
                  <ul className="space-y-2">
                    {currentPage.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                        <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)] mt-2 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="px-8 py-8">
            <div className="max-w-3xl mx-auto">
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-headings:text-[var(--text-primary)] prose-headings:font-bold prose-a:text-[var(--brand-primary)] prose-code:text-[var(--brand-primary)] prose-code:bg-surface-100 dark:prose-code:bg-[var(--bg-tertiary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-surface-900 dark:prose-pre:bg-[var(--bg-primary)] dark:prose-pre:text-[var(--text-primary)] prose-pre:rounded-xl prose-img:rounded-xl prose-blockquote:border-l-[var(--brand-primary)] dark:prose-blockquote:text-[var(--text-secondary)]">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {currentPage.content || '*No content*'}
                </Markdown>
              </div>
            </div>
          </div>

          {currentPage.files?.length > 0 && (
            <div className="px-8 pb-8">
              <div className="max-w-3xl mx-auto pt-6 border-t border-[var(--border-primary)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Attachments (<span className="num-mono">{currentPage.files.length}</span>)
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {currentPage.files.map(f => (
                    <div key={f._id}
                      className="flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)] rounded-[var(--radius-md)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{f.originalName}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{formatSize(f.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <a href={`/uploads/${f.filename}`} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center w-8 h-8 text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 rounded-[var(--radius-md)] transition-all no-underline">
                          <Download className="w-4 h-4" />
                        </a>
                        {canManage && (
                          <button onClick={() => handleDeleteFile(f._id)}
                            className="flex items-center justify-center w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-[var(--radius-md)] transition-all cursor-pointer bg-transparent border-none">
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

          {currentPage.contributors?.length > 0 && (
            <div className="px-8 pb-8">
              <div className="max-w-3xl mx-auto pt-6 border-t border-[var(--border-primary)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Contributors (<span className="num-mono">{currentPage.contributors.length}</span>)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentPage.contributors.map((c, i) => (
                    <div key={i}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-primary)] rounded-[var(--radius-md)] border border-[var(--border-primary)]">
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-[var(--brand-primary)]">{getInitials(c.name)}</span>
                      </div>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="px-8 pb-6">
            <div className="max-w-3xl mx-auto pt-4 border-t border-[var(--border-primary)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
              {currentPage.department && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded ${getDeptColor(currentPage.department).badge}`}>
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

      {view === 'edit' && currentPage && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-lg)] overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
            <button onClick={() => { setView('view'); }}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer bg-transparent border-none">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">Editing: {currentPage.title}</span>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-md)] transition-all cursor-pointer border-none disabled:opacity-50">
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
                  className="w-full px-5 py-3 text-lg font-bold border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                />
              </div>
              <select
                value={editDepartment} onChange={e => setEditDepartment(e.target.value)}
                className="px-5 py-3 text-sm font-medium border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all cursor-pointer min-w-[160px] text-[var(--text-primary)]"
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
              className="w-full px-5 py-3 text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all font-mono resize-y placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
            />
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Markdown</label>
                <textarea
                  value={editContent} onChange={e => setEditContent(e.target.value)}
                  placeholder="Write in markdown..."
                  rows={24}
                  className="w-full px-5 py-4 text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all font-mono resize-y placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Preview</label>
                <div className="w-full px-5 py-4 text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] min-h-[600px] prose prose-sm max-w-none overflow-auto text-[var(--text-primary)]">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center animate-fade-in" style={{paddingTop:'10vh'}} onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-[var(--elevation-high)] w-full max-w-2xl mx-4 rounded-[var(--radius-lg)] animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)]">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
                New Article
              </h2>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] transition-all cursor-pointer bg-transparent border-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Article title"
                className="w-full px-5 py-3 text-lg font-bold border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                autoFocus
              />
              <select
                value={newDepartment} onChange={e => setNewDepartment(e.target.value)}
                className="w-full px-5 py-3 text-sm font-medium border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all cursor-pointer text-[var(--text-primary)]"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <textarea
                value={newHighlights} onChange={e => setNewHighlights(e.target.value)}
                placeholder="Highlights (one per line)&#10;e.g.&#10;User authentication with JWT&#10;Role-based access control&#10;Real-time notifications"
                rows={3}
                className="w-full px-5 py-3 text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all font-mono resize-y placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              />
              <textarea
                value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Write your article content in markdown..."
                rows={12}
                className="w-full px-5 py-4 text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)] transition-all font-mono resize-y placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              />
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-[var(--radius-md)] px-4 py-3 border border-[var(--border-primary)]">
                <span className="font-semibold text-[var(--text-tertiary)]">Markdown:</span>
                <code className="text-[var(--brand-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]"># Heading</code>
                <code className="text-[var(--brand-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">**bold**</code>
                <code className="text-[var(--brand-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">`code`</code>
                <code className="text-[var(--brand-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">[link](url)</code>
                <code className="text-[var(--brand-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">- list</code>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border-primary)]">
              <button onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] bg-transparent border border-[var(--border-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={createPage} disabled={saving || !newTitle.trim()}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-md)] transition-all cursor-pointer border-none disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

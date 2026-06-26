import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CONTENT_INDEX from '../data/contentIndex';
import Logo from './Logo';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const SEARCH_ICONS = {
  Wiki: { icon: '📄', color: '#7C3AED' },
  Template: { icon: '📋', color: '#DC2626' },
};

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [backendResults, setBackendResults] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setBackendResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/search/public`, { params: { q: query.trim() } });
        setBackendResults(res.data.results || []);
      } catch { setBackendResults([]); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSearchOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  const results = query.trim()
    ? CONTENT_INDEX.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = (to) => {
    setSearchOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass-panel' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between">
        <Link to="/">
          <Logo size="lg" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {[
            { to: '/features', label: 'Features' },
            { to: '/how-it-works', label: 'How It Works' },
            { to: '/pricing', label: 'Pricing' },
            { to: '/contact', label: 'Contact' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="relative py-1 group">
              <span className={`transition-colors ${location.pathname === to ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'}`}>
                {label}
              </span>
              {location.pathname === to && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-brand-600" />
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2" ref={containerRef}>
          <div className="relative">
            {searchOpen ? (
              <div className="flex items-center gap-2.5 bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl px-3.5 py-2 border border-[var(--glass-border)] shadow-[var(--glass-shadow)] transition-all min-w-[240px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)] shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input ref={inputRef} type="text" placeholder="Search..." value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-transparent" />
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">ESC</span>
                {query.trim() && (results.length > 0 || backendResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                    {results.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Pages & Content</div>
                        {results.map((item, i) => (
                          <button key={`page-${i}`} onClick={() => handleSelect(item.url)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer bg-transparent border-none">
                            <span className="text-base shrink-0">{item.icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                              <p className="text-[11px] text-[var(--text-tertiary)] leading-snug line-clamp-1">{item.desc}</p>
                              <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">{item.page}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {backendResults.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-t border-[var(--border-primary)]">Knowledge Base</div>
                        {backendResults.map((item, i) => {
                          const meta = SEARCH_ICONS[item.type] || { icon: '📄', color: '#6B7280' };
                          return (
                            <button key={`be-${i}`} onClick={() => handleSelect(item.to)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer bg-transparent border-none">
                              <span className="text-base shrink-0">{meta.icon}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.label}</p>
                                <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{item.type}</p>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
                {query.trim() && results.length === 0 && backendResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl p-6 text-center">
                    <span className="text-2xl block mb-2">🔍</span>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">No results for "{query}"</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer bg-transparent border-none"
                aria-label="Search">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </button>
            )}
          </div>
          <Link to="/login" className="btn-premium inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}

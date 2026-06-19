import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const SEARCH_INDEX = [
  { to: '/', title: 'Home', desc: 'Welcome to GRESIO — platform overview and getting started', icon: '🏠' },
  { to: '/features', title: 'Features', desc: 'Explore all 180+ features across project management, sprints, testing, analytics, and more', icon: '🚀' },
  { to: '/how-it-works', title: 'How It Works', desc: 'Understand the 8-phase lifecycle, auto status flow, and 5 project types', icon: '⚙️' },
  { to: '/pricing', title: 'Pricing', desc: 'View plans — Starter (free), Team, and Enterprise', icon: '💳' },
  { to: '/contact', title: 'Contact', desc: 'Get in touch with our team for support and inquiries', icon: '✉️' },
  { to: '/about', title: 'About', desc: 'Learn about GRESIO, 360 DMMC, and our mission', icon: 'ℹ️' },
  { to: '/blog', title: 'Blog', desc: 'Read the latest updates, articles, and product news', icon: '📝' },
  { to: '/faq', title: 'FAQ', desc: 'Find answers to frequently asked questions about the platform', icon: '❓' },
  { to: '/guides', title: 'Guides', desc: 'Step-by-step tutorials and documentation for getting the most out of GRESIO', icon: '📖' },
  { to: '/privacy', title: 'Privacy Policy', desc: 'Our commitment to data protection, GDPR compliance, and security', icon: '🔒' },
  { to: '/careers', title: 'Careers', desc: 'Join our team — current openings and hiring information', icon: '💼' },
];

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

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
    ? SEARCH_INDEX.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (to) => {
    setSearchOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-surface-200' : 'bg-white/0'}`}>
      <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <span className="text-3xl font-bold text-surface-900 tracking-tight">GRESIO</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {[
            { to: '/features', label: 'Features' },
            { to: '/how-it-works', label: 'How It Works' },
            { to: '/pricing', label: 'Pricing' },
            { to: '/contact', label: 'Contact' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="relative py-1 group">
              <span className={`transition-colors ${location.pathname === to ? 'text-surface-900 font-semibold' : 'text-surface-500 group-hover:text-surface-900'}`}>
                {label}
              </span>
              {location.pathname === to && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary-600" />
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2" ref={containerRef}>
          <div className="relative">
            {searchOpen ? (
              <div className="flex items-center gap-2.5 bg-surface-100/80 backdrop-blur-sm rounded-xl px-3.5 py-2 border border-surface-200 shadow-sm transition-all min-w-[240px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400 shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input ref={inputRef} type="text" placeholder="Search..." value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 border-none outline-none text-sm text-surface-900 placeholder:text-surface-400 bg-transparent" />
                <span className="text-[10px] font-medium text-surface-300 bg-surface-200/60 px-1.5 py-0.5 rounded">ESC</span>
                {query.trim() && results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-black/5 border border-surface-200 overflow-hidden max-h-80 overflow-y-auto">
                    <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-400">Pages</div>
                    {results.map((item, i) => (
                      <button key={i} onClick={() => handleSelect(item.to)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left cursor-pointer bg-transparent border-none">
                        <span className="text-base shrink-0">{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-surface-900">{item.title}</p>
                          <p className="text-[11px] text-surface-400 leading-snug line-clamp-1">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() && results.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-black/5 border border-surface-200 p-6 text-center">
                    <span className="text-2xl block mb-2">🔍</span>
                    <p className="text-sm font-medium text-surface-700 mb-0.5">No results for "{query}"</p>
                    <p className="text-xs text-surface-400">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-surface-400 hover:text-surface-900 hover:bg-surface-100 transition-all cursor-pointer bg-transparent border-none"
                aria-label="Search">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </button>
            )}
          </div>
          <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-surface-600 hover:text-surface-900 px-4 py-2 rounded-lg hover:bg-surface-100 transition-colors">
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

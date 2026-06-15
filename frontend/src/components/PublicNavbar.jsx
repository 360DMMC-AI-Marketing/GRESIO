import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        <div className="flex items-center gap-2">
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

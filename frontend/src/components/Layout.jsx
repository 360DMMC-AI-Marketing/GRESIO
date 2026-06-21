import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import VoiceController from './VoiceController';
import AiAssistantPanel from './AiAssistantPanel';

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 64;
const BREAKPOINT = 768;

export default function Layout() {
  const { user, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);
    const handler = (e) => {
      setIsMobile(e.matches);
      if (e.matches) {
        setMobileOpen(false);
        setSidebarCollapsed(true);
      }
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-neutral-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'super_admin') return <Navigate to="/super/dashboard" replace />;

  const sidebarWidth = (isMobile && !mobileOpen) ? 0 : (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />
      <Topbar
        sidebarWidth={sidebarWidth}
        showHamburger={isMobile}
        onHamburgerClick={() => setMobileOpen(true)}
      />
      <main style={{ paddingLeft: isMobile ? 0 : sidebarWidth }} className="pt-14 transition-all duration-300 ease-in-out pb-10">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <VoiceController />
      <AiAssistantPanel />
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-surface-200 z-20" style={{ paddingLeft: isMobile ? 0 : sidebarWidth }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 max-w-7xl mx-auto text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-surface-600">GRESIO</span>
            <span className="text-surface-300">|</span>
            <span className="text-surface-400">&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <a href="mailto:Consult@360DMMC.com" className="text-surface-400 hover:text-primary-600 transition-colors flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Consult@360DMMC.com
            </a>
            <span className="w-px h-3.5 bg-surface-200"></span>
            <a href="https://360dmmc.com/" target="_blank" rel="noopener noreferrer" className="text-surface-400 hover:text-primary-600 transition-colors font-medium">
              Powered by 360 DMMC
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

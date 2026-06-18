import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { path: '/dashboard', icon: '▦', label: 'Dashboard' },
  { path: '/projects', icon: '📁', label: 'Projects' },
  { path: '/tasks', icon: '✓', label: 'Tasks' },
  { path: '/calendar', icon: '📅', label: 'Calendar' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map(tab => {
          const active = location.pathname.startsWith(tab.path);
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 cursor-pointer bg-transparent border-none ${
                active ? 'text-[#2347e8]' : 'text-surface-400'
              }`}>
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className={`text-[9px] font-semibold ${active ? 'text-[#2347e8]' : 'text-surface-400'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

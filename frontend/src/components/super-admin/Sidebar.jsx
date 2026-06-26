import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Shield, BarChart3, Activity, Settings,
} from 'lucide-react';
import Logo from '../Logo';

const navItems = [
  { to: '/super/dashboard', label: 'Super Dashboard', icon: LayoutDashboard },
  { to: '/super/companies', label: 'Companies', icon: Building2 },
  { to: '/super/admins', label: 'Admins', icon: Shield },
  { to: '/super/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/super/health', label: 'System Health', icon: Activity },
  { to: '/super/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen flex flex-col overflow-y-auto fixed left-0 top-0 bg-[#0F172A] z-50">
      <div className="px-5 pt-6 pb-8">
        <Logo size="sm" showTagline tagline="Internal OS" />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1e293b] text-primary-600 border-l-[3px] border-primary-600 rounded-l-none'
                  : 'text-surface-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

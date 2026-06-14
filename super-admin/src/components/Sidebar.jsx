import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Shield, BarChart3, Activity, Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Super Dashboard', icon: LayoutDashboard },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/admins', label: 'Admins', icon: Shield },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/health', label: 'System Health', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen flex flex-col overflow-y-auto fixed left-0 top-0 bg-[#0F172A] z-50">
      <div className="px-5 pt-6 pb-8">
        <h1 className="text-white text-[20px] font-bold tracking-tight">CIOS</h1>
        <p className="text-surface-400 text-[10px] mt-0.5">Internal OS</p>
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

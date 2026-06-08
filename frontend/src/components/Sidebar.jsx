import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ROLE_LABELS = {
  admin: 'Admin', team_lead: 'Team Lead', project_manager: 'Proj. Manager',
  manager: 'Manager', qa_tester: 'QA Tester', developer: 'Developer',
  intern: 'Intern', other: 'Other',
};

const ALL = ['admin','team_lead','project_manager','manager','qa_tester','developer','intern','other'];
const MANAGERS = ['admin','team_lead','project_manager','manager'];

const mainNavItems = [
  { to:'/dashboard', label:'Dashboard', icon:'📊', roles: ALL },
  { to:'/projects',  label:'Projects',  icon:'📁', roles: ALL },
  { to:'/sprints',   label:'Sprints',   icon:'⚡', roles: ALL },
  { to:'/tasks',     label:'Tasks',     icon:'✅', roles: ALL },
  { to:'/users',     label:'Team',      icon:'👥', roles: MANAGERS },
  { to:'/work-logs', label:'Work Log',  icon:'📋', roles: ALL },
  { to:'/analytics', label:'Analytics', icon:'📈', roles: MANAGERS },
  { to:'/onboarding-guide', label:'Onboarding Guide', icon:'📖', roles: ALL },
];

const adminSubItems = [
  { to:'/admin',     label:'Settings',  icon:'⚙️', roles: ['admin'] },
];

export default function Sidebar({ user, collapsed, onToggle }) {
  const filteredMain = mainNavItems.filter(i => i.roles.includes(user?.role));
  const filteredAdmin = adminSubItems.filter(i => i.roles.includes(user?.role));

  return (
    <aside className={`bg-[#030712] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[56px]' : 'w-[200px]'}`}>
      {/* Logo + Toggle */}
      <div className={`flex items-center border-b border-white/[0.08] ${collapsed ? 'justify-center px-0 py-3' : 'px-4 py-4 justify-between'}`}>
        <NavLink to="/dashboard" className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">C</div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-white font-bold text-[13px] leading-tight">CIOS</div>
              <div className="text-neutral-500 text-[9px] leading-tight">Internal OS</div>
            </div>
          )}
        </NavLink>
        {!collapsed && (
          <button onClick={onToggle}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08] text-neutral-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2.5 flex flex-col gap-[1px] overflow-y-auto">
        {filteredMain.map(item => (
          <NavLink key={item.to} to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-xs font-medium transition-all ${
                collapsed
                  ? 'justify-center px-0 py-2'
                  : 'gap-2.5 px-2.5 py-1.5'
              } ${
                isActive ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
              }`}>
            <span className="text-center text-[13px] leading-none">{item.icon}</span>
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin Section */}
      {filteredAdmin.length > 0 && !collapsed && (
        <div className="px-2 py-2.5 border-t border-white/[0.08]">
          {filteredAdmin.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                }`}>
              <span className="w-4 text-center text-[13px] leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Collapse toggle at bottom when already collapsed */}
      {collapsed && (
        <div className="px-2 py-2 border-t border-white/[0.08]">
          <button onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer bg-transparent border-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}

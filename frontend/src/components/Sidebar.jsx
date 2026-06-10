import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Folder, Users, BookOpen, Settings,
  ChevronDown, FolderOpen, Zap, CheckSquare, FlaskConical,
  Group, Clock, BarChart3,
} from 'lucide-react';

export const ROLE_LABELS = {
  admin: 'Admin', team_lead: 'Team Lead', project_manager: 'Proj. Manager',
  manager: 'Manager', qa_tester: 'QA Tester', developer: 'Developer',
  intern: 'Intern', other: 'Other',
};

const ALL = ['admin','team_lead','project_manager','manager','qa_tester','developer','intern','other'];
const MANAGERS = ['admin','team_lead','project_manager','manager'];

const sidebarGroups = [
  {
    id: 'projects',
    label: 'Projects',
    icon: Folder,
    items: [
      { id: 'projects', label: 'Projects List', icon: FolderOpen, path: '/projects', roles: ALL },
      { id: 'sprints', label: 'Sprints', icon: Zap, path: '/sprints', roles: ALL },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks', roles: ALL },
      { id: 'tests', label: 'Tests', icon: FlaskConical, path: '/test-cases', roles: ALL },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Users,
    items: [
      { id: 'team', label: 'Team', icon: Group, path: '/users', roles: MANAGERS },
      { id: 'worklog', label: 'Work Log', icon: Clock, path: '/work-logs', roles: ALL },
    ],
  },
];

const standaloneItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ALL },
];

const bottomItems = [
  { id: 'onboarding', label: 'Onboarding Guide', icon: BookOpen, path: '/onboarding-guide', roles: ALL },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin', roles: ['admin'] },
];

function SidebarGroup({ group, isOpen, onToggle, user }) {
  const location = useLocation();
  const filteredItems = group.items.filter(i => i.roles?.includes(user?.role));
  if (filteredItems.length === 0) return null;
  const active = filteredItems.some(i => location.pathname === i.path);

  return (
    <div>
      <button
        onClick={() => onToggle(group.id)}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer bg-transparent border-none ${
          isOpen ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
        }`}
      >
        <group.icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${active ? 'text-blue-400' : 'text-slate-500'}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? 400 : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div className="pb-1 pt-0.5">
          {filteredItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 pl-10 pr-4 py-2 text-xs font-medium transition-all border-l-2 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-l-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ user, collapsed, onToggle }) {
  const [openGroup, setOpenGroup] = useState(() => {
    try {
      return localStorage.getItem('sidebarOpenGroup') || '';
    } catch { return ''; }
  });

  useEffect(() => {
    try { localStorage.setItem('sidebarOpenGroup', openGroup); } catch {}
  }, [openGroup]);

  const handleToggle = (id) => {
    setOpenGroup(prev => prev === id ? '' : id);
  };

  const filteredStandalone = standaloneItems.filter(i => i.roles?.includes(user?.role));
  const filteredBottom = bottomItems.filter(i => i.roles?.includes(user?.role));

  if (collapsed) {
    return (
      <aside className="bg-[#030712] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out w-[56px]">
        <div className="flex items-center justify-center px-0 py-3 border-b border-white/[0.08]">
          <NavLink to="/dashboard" className="flex items-center justify-center">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">C</div>
          </NavLink>
        </div>
        <nav className="flex-1 px-2 py-2.5 flex flex-col gap-[1px] overflow-y-auto">
          {filteredStandalone.map(item => (
            <NavLink key={item.id} to={item.path} title={item.label}
              className={({ isActive }) =>
                `flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                }`}>
              <item.icon className="w-5 h-5" />
            </NavLink>
          ))}
          {sidebarGroups.map(group => {
            const hasAccess = group.items.some(i => i.roles?.includes(user?.role));
            if (!hasAccess) return null;
            return (
              <div key={group.id} className="flex items-center justify-center py-2 text-neutral-500" title={group.label}>
                <group.icon className="w-5 h-5" />
              </div>
            );
          })}
          {MANAGERS.includes(user?.role) && (
            <NavLink to="/analytics" title="Analytics"
              className={({ isActive }) =>
                `flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                }`}>
              <BarChart3 className="w-5 h-5" />
            </NavLink>
          )}
          {filteredBottom.map(item => (
            <NavLink key={item.id} to={item.path} title={item.label}
              className={({ isActive }) =>
                `flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-brand-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                }`}>
              <item.icon className="w-5 h-5" />
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-2 border-t border-white/[0.08]">
          <button onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer bg-transparent border-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-[#030712] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out w-[240px]">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">C</div>
          <div>
            <div className="text-white font-bold text-[13px] leading-tight">CIOS</div>
            <div className="text-neutral-500 text-[9px] leading-tight">Internal OS</div>
          </div>
        </NavLink>
        <button onClick={onToggle}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08] text-neutral-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {/* Dashboard */}
        {filteredStandalone.map(item => (
          <NavLink key={item.id} to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all border-l-2 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-transparent'
              }`
            }>
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="mx-4 my-2 border-b border-slate-700/50" />

        {/* Groups */}
        {sidebarGroups.map(group => (
          <SidebarGroup
            key={group.id}
            group={group}
            isOpen={openGroup === group.id}
            onToggle={handleToggle}
            user={user}
          />
        ))}

        {/* Analytics (between groups and bottom) */}
        {MANAGERS.includes(user?.role) && (
          <NavLink to="/analytics"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all border-l-2 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-transparent'
              }`
            }>
            <BarChart3 className="w-5 h-5 shrink-0" />
            Analytics
          </NavLink>
        )}

        {/* Divider before bottom */}
        {filteredBottom.length > 0 && (
          <div className="mx-4 my-2 border-t border-slate-700/50" />
        )}

        {/* Bottom items */}
        {filteredBottom.map(item => (
          <NavLink key={item.id} to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all border-l-2 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-transparent'
              }`
            }>
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

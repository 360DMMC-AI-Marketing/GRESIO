import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Folder, Users, BookOpen, Settings,
  ChevronDown, FolderOpen, Zap, CheckSquare, FlaskConical,
  Group, Clock, BarChart3, FileText, CalendarDays,
  Building2, Bell as BellIcon, Activity, Workflow, ClipboardList,
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
    label: 'Workspace',
    icon: Folder,
    items: [
      { id: 'projects', label: 'Projects List', icon: FolderOpen, path: '/projects', roles: ALL },
      { id: 'relay', label: 'Project Relay', icon: Workflow, path: '/relay', roles: ALL },
      {
        id: 'execution', label: 'Execution', icon: ClipboardList, type: 'subgroup', roles: ALL,
        items: [
          { id: 'sprints', label: 'Sprints', icon: Zap, path: '/sprints', roles: ALL },
          { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks', roles: ALL },
          { id: 'tests', label: 'Tests', icon: FlaskConical, path: '/test-cases', roles: ALL },
        ],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Users,
    items: [
      { id: 'team', label: 'Team', icon: Group, path: '/users', roles: MANAGERS },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/calendar', roles: ALL },
      { id: 'worklog', label: 'Work Log', icon: Clock, path: '/work-logs', roles: ALL },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: BarChart3,
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: MANAGERS },
      { id: 'reports', label: 'Reports', icon: FileText, path: '/reports', roles: MANAGERS },
    ],
  },
];

const standaloneItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ALL },
  { id: 'super-companies', label: 'Companies', icon: Building2, path: '/super/companies', roles: ['super_admin'] },
  { id: 'super-admins', label: 'Admins', icon: Users, path: '/super/admins', roles: ['super_admin'] },
  { id: 'super-notifications', label: 'Notifications', icon: BellIcon, path: '/super/notifications', roles: ['super_admin'] },
  { id: 'super-analytics', label: 'Analytics', icon: Activity, path: '/super/analytics', roles: ['super_admin'] },
];

const bottomItems = [
  { id: 'onboarding', label: 'Onboarding Guide', icon: BookOpen, path: '/onboarding-guide', roles: ALL },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin', roles: ['admin'] },
  { id: 'super-settings', label: 'Super Settings', icon: Settings, path: '/super/settings', roles: ['super_admin'] },
  { id: 'super-health', label: 'System Health', icon: Activity, path: '/super/health', roles: ['super_admin'] },
];

function SidebarGroup({ group, isOpen, onToggle, user }) {
  const location = useLocation();
  const [openSubgroup, setOpenSubgroup] = useState('');
  const filteredItems = group.items.filter(i => i.roles?.includes(user?.role));
  if (filteredItems.length === 0) return null;
  const active = filteredItems.some(i => i.path && location.pathname === i.path);

  return (
    <div>
      <button
        onClick={() => onToggle(group.id)}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer bg-transparent border-none ${
          isOpen ? 'text-white bg-white/[0.06]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        <group.icon className="w-[26px] h-[26px] shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${active ? 'text-blue-400' : 'text-slate-500'}`}
        />
      </button>
          <div
            className="transition-all duration-200 ease-in-out"
            style={{ maxHeight: isOpen ? 400 : 0, opacity: isOpen ? 1 : 0, overflow: 'hidden' }}
          >
        <div className="pb-1 pt-1 pl-7">
          {filteredItems.map(item => {
            if (item.type === 'subgroup') {
              const subItems = item.items.filter(i => i.roles?.includes(user?.role));
              if (subItems.length === 0) return null;
              const subActive = subItems.some(i => location.pathname === i.path);
              const subOpen = openSubgroup === item.id;
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setOpenSubgroup(prev => prev === item.id ? '' : item.id)}
                    aria-expanded={subOpen}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg cursor-pointer bg-transparent border-none w-full ${
                      subOpen ? 'text-white bg-white/[0.06]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <ClipboardList className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`shrink-0 w-4 h-4 transition-transform duration-200 ${
                      subOpen ? 'rotate-180' : ''
                    } ${subActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  </button>
                  <div className="transition-all duration-200 ease-in-out"
                    style={{ maxHeight: subOpen ? 200 : 0, opacity: subOpen ? 1 : 0, overflow: 'hidden' }}>
                    <div className="pb-1 pt-0.5 pl-7">
                      {subItems.map(sub => (
                        <NavLink key={sub.id} to={sub.path}
                          className={({ isActive }) =>
                   `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg ${
                     isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                   }`
                          }>
                          <sub.icon className="w-5 h-5 shrink-0" />
                          {sub.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <NavLink key={item.id} to={item.path}
                className={({ isActive }) =>
                             `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg ${
                    isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`
                }>
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
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
      <aside className="bg-[#0F172A] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out w-[64px]">
        <div className="flex items-center justify-center px-0 py-4 border-b border-white/[0.06]">
          <NavLink to="/dashboard" className="flex items-center justify-center hover:opacity-90 transition-opacity">
            <span className="text-white font-bold text-lg tracking-tight">GRESIO</span>
          </NavLink>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
          {filteredStandalone.map(item => (
            <NavLink key={item.id} to={item.path} title={item.label}
              className={({ isActive }) =>
                `flex items-center justify-center py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-blue-600/30 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}>
              <item.icon className="w-[26px] h-[26px]" />
            </NavLink>
          ))}
          {sidebarGroups.map(group => {
            const hasAccess = group.items.some(i => i.roles?.includes(user?.role));
            if (!hasAccess) return null;
            return (
              <div key={group.id} className="flex items-center justify-center py-2.5 text-slate-500" title={group.label}>
                <group.icon className="w-[26px] h-[26px]" />
              </div>
            );
          })}
          {filteredBottom.map(item => (
            <NavLink key={item.id} to={item.path} title={item.label}
              className={({ isActive }) =>
                `flex items-center justify-center py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-blue-600/30 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}>
              <item.icon className="w-[26px] h-[26px]" />
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-2 border-t border-white/[0.06]">
          <button onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer bg-transparent border-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-[#0F172A] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out w-[280px]">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.08]">
        <NavLink to="/dashboard" className="flex flex-col items-center hover:opacity-90 transition-all duration-200 cursor-pointer">
          <span className="text-white font-bold text-2xl tracking-tight">GRESIO</span>
          <span className="text-slate-500 text-xs font-medium mt-0.5">Internal OS</span>
        </NavLink>
        <button onClick={onToggle}
          className="absolute right-3 top-7 w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto px-3">
        {/* Dashboard */}
        {filteredStandalone.map(item => (
          <NavLink key={item.id} to={item.path}
            className={({ isActive }) =>
               `flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all rounded-lg ${
                 isActive
                   ? 'bg-blue-600/20 text-blue-400'
                   : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
               }`
             }>
             <item.icon className="w-[26px] h-[26px] shrink-0" />
             {item.label}
           </NavLink>
         ))}

         {/* Divider */}
         <div className="mx-1 my-3 border-b border-white/[0.06]" />

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

        {/* Divider before bottom */}
        {filteredBottom.length > 0 && (
          <div className="mx-1 my-3 border-t border-white/[0.06]" />
        )}

        {/* Bottom items */}
        {filteredBottom.map(item => (
          <NavLink key={item.id} to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all rounded-lg ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`
            }>
            <item.icon className="w-[26px] h-[26px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

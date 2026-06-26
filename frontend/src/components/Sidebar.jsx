import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Folder, Users, BookOpen, Settings,
  ChevronDown, FolderOpen, Zap, CheckSquare, FlaskConical,
  Group, Clock, BarChart3, FileText, CalendarDays,
  Building2, Bell as BellIcon, Activity, ClipboardList, BrainCircuit, Library,
  Download,
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
      { id: 'team', label: 'Department', icon: Group, path: '/users', roles: MANAGERS },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/calendar', roles: ALL },
      { id: 'worklog', label: 'Work Log', icon: Clock, path: '/work-logs', roles: ALL },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    icon: Library,
    items: [
      { id: 'wiki', label: 'Wiki', icon: BookOpen, path: '/wiki', roles: ALL },
      { id: 'workdna', label: 'WorkDNA', icon: BrainCircuit, path: '/work-dna', roles: ALL },
      { id: 'templates', label: 'Templates', icon: ClipboardList, path: '/templates', roles: ALL },
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
  {
    id: 'importation',
    label: 'Importation',
    icon: Download,
    items: [
      { id: 'azure-import', label: 'Azure AD', icon: Users, path: '/admin/azure-import', roles: ['admin'] },
      { id: 'clickup-import', label: 'ClickUp', icon: ClipboardList, path: '/admin/clickup-import', roles: ['admin'] },
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
      <button onClick={() => onToggle(group.id)} aria-expanded={isOpen}
        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all duration-200 rounded-[var(--radius-lg)] cursor-pointer bg-transparent border-none group ${
          isOpen
            ? 'text-white bg-white/[0.06]'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
        }`}>
        <group.icon className="w-[26px] h-[26px] shrink-0 transition-all duration-200"
          style={{ filter: active && !isOpen ? 'drop-shadow(0 0 6px rgba(96,165,250,0.3))' : 'none' }} />
        <span className="flex-1 text-left">{group.label}</span>
        {active && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: 'var(--brand-primary)'}} />}
        <ChevronDown className={`w-4 h-4 transition-all duration-200 ${
          isOpen ? 'rotate-180' : ''
        } ${active ? '' : 'text-slate-500'}`}
          style={{ color: active && !isOpen ? 'var(--brand-primary)' : undefined }} />
      </button>
      <div className="transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? 400 : 0, opacity: isOpen ? 1 : 0, overflow: 'hidden' }}>
        <div className="pb-1 pt-1 pl-7 relative">
          {filteredItems.some(i => i.type !== 'subgroup' && i.path) && (
            <div className="absolute left-[18px] top-1 bottom-1 w-px"
              style={{background: 'linear-gradient(to bottom, var(--brand-primary), transparent)'}} />
          )}
          {filteredItems.map(item => {
            if (item.type === 'subgroup') {
              const subItems = item.items.filter(i => i.roles?.includes(user?.role));
              if (subItems.length === 0) return null;
              const subActive = subItems.some(i => location.pathname === i.path);
              const subOpen = openSubgroup === item.id;
              return (
                <div key={item.id} className="relative">
                  <div className="absolute left-[-14px] top-0 bottom-0 w-px"
                    style={{background: subOpen || subActive ? 'var(--brand-primary)' : 'rgba(255,255,255,0.06)'}} />
                  <button onClick={() => setOpenSubgroup(prev => prev === item.id ? '' : item.id)}
                    aria-expanded={subOpen}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-[var(--radius-lg)] cursor-pointer bg-transparent border-none ${
                      subOpen ? 'text-white bg-white/[0.06]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}>
                    <ClipboardList className="w-5 h-5 shrink-0 transition-all duration-200" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`shrink-0 w-4 h-4 transition-all duration-200 ${
                      subOpen ? 'rotate-180' : ''
                    } ${subActive ? '' : 'text-slate-500'}`}
                      style={{ color: subActive && !subOpen ? 'var(--brand-primary)' : undefined }} />
                  </button>
                  <div className="transition-all duration-200 ease-in-out"
                    style={{ maxHeight: subOpen ? 200 : 0, opacity: subOpen ? 1 : 0, overflow: 'hidden' }}>
                    <div className="pb-1 pt-0.5 pl-7 relative">
                      <div className="absolute left-[5px] top-0 bottom-0 w-px"
                        style={{background: 'linear-gradient(to bottom, var(--brand-primary), rgba(255,255,255,0.05))'}} />
                      {subItems.map(sub => (
                        <NavLink key={sub.id} to={sub.path}
                          className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-[var(--radius-lg)] relative ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            }`
                          }
                          style={({ isActive }) => isActive ? {
                            background: 'rgba(35,71,232,0.12)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            borderLeft: '2px solid var(--brand-primary)',
                            borderRadius: 'var(--radius-lg)',
                          } : {}}>
                          <sub.icon className="w-5 h-5 shrink-0 transition-all duration-200" />
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
                  `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-[var(--radius-lg)] ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'rgba(35,71,232,0.12)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  borderLeft: '2px solid var(--brand-primary)',
                  borderRadius: 'var(--radius-lg)',
                } : {}}>
                <item.icon className="w-5 h-5 shrink-0 transition-all duration-200" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ user, collapsed, onToggle, isMobile, mobileOpen, onMobileClose }) {
  const { company } = useAuth();
  const [openGroup, setOpenGroup] = useState(() => {
    try { return localStorage.getItem('sidebarOpenGroup') || ''; } catch { return ''; }
  });

  useEffect(() => {
    try { localStorage.setItem('sidebarOpenGroup', openGroup); } catch {}
  }, [openGroup]);

  const handleToggle = (id) => {
    setOpenGroup(prev => prev === id ? '' : id);
  };

  const filteredStandalone = standaloneItems.filter(i => i.roles?.includes(user?.role));
  const filteredBottom = bottomItems.filter(i => i.roles?.includes(user?.role));

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all duration-200 rounded-[var(--radius-lg)] ${
      isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
    }`;

  const navLinkStyles = ({ isActive }) => isActive ? {
    background: 'rgba(35,71,232,0.12)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    borderLeft: '2px solid var(--brand-primary)',
    borderRadius: 'var(--radius-lg)',
  } : {};

  const renderNavLink = (item, onClick) => (
    <NavLink key={item.id} to={item.path} onClick={onClick}
      className={navLinkClasses}
      style={navLinkStyles}>
      <item.icon className="w-[26px] h-[26px] shrink-0 transition-all duration-200" />
      {item.label}
    </NavLink>
  );

  const renderCollapsedIcon = (item, isGroup = false) => {
    if (isGroup) {
      return (
        <div key={item.id} className="group relative flex items-center justify-center py-2.5 text-slate-500 cursor-default" title={item.label}>
          <item.icon className="w-[26px] h-[26px]" />
          <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[11px] font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
            {item.label}
          </div>
        </div>
      );
    }
    return (
      <NavLink key={item.id} to={item.path} title={item.label}
        className={({ isActive }) =>
          `group relative flex items-center justify-center py-2.5 rounded-[var(--radius-lg)] text-xs font-medium transition-all duration-200 ${
            isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
          }`
        }
        style={({ isActive }) => isActive ? {
          background: 'rgba(35,71,232,0.12)',
          backdropFilter: 'blur(4px)',
        } : {}}>
        <item.icon className="w-[26px] h-[26px] transition-all duration-200" />
        <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[11px] font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
          {item.label}
        </div>
      </NavLink>
    );
  };

  if (isMobile) {
    if (!mobileOpen) return null;
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onMobileClose} />
        <aside className="bg-gradient-to-b from-[#0F172A] to-[#0B1120] h-screen fixed top-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out w-[280px] shadow-2xl">
          <div className="px-5 py-6 border-b border-white/[0.08] flex items-center justify-between">
            <NavLink to="/dashboard" onClick={onMobileClose} className="flex flex-col items-center hover:opacity-90 transition-all duration-200 cursor-pointer">
              <span className="text-white font-bold text-2xl tracking-tight"
                style={{textShadow: '0 0 20px rgba(35,71,232,0.3)'}}>GRESIO</span>
              <span className="text-slate-500 text-xs font-medium mt-0.5 tracking-[0.15em]">Internal OS</span>
            </NavLink>
            <button onClick={onMobileClose}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <nav className="flex-1 py-3 overflow-y-auto px-3">
            {filteredStandalone.map(item => renderNavLink(item, onMobileClose))}
            <div className="mx-1 my-3" style={{borderBottom: '0.5px solid rgba(255,255,255,0.06)'}} />
            {sidebarGroups.map(group => (
              <SidebarGroup key={group.id} group={group} isOpen={openGroup === group.id} onToggle={handleToggle} user={user} />
            ))}
            {filteredBottom.length > 0 && <div className="mx-1 my-3" style={{borderTop: '0.5px solid rgba(255,255,255,0.06)'}} />}
            {filteredBottom.map(item => renderNavLink(item, onMobileClose))}
          </nav>
        </aside>
      </>
    );
  }

  if (collapsed) {
    return (
      <aside className="bg-gradient-to-b from-[#0F172A] to-[#0B1120] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out w-[64px]">
        <div className="flex items-center justify-center px-0 py-4" style={{borderBottom: '0.5px solid rgba(255,255,255,0.06)'}}>
          <NavLink to="/dashboard" className="flex items-center justify-center hover:opacity-90 transition-opacity">
            <span className="text-white font-bold text-lg tracking-tight"
              style={{textShadow: '0 0 20px rgba(35,71,232,0.3)'}}>GRESIO</span>
          </NavLink>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
          {filteredStandalone.map(item => renderCollapsedIcon(item))}
          {sidebarGroups.map(group => {
            const hasAccess = group.items.some(i => i.roles?.includes(user?.role));
            if (!hasAccess) return null;
            return renderCollapsedIcon(group, true);
          })}
          {filteredBottom.map(item => renderCollapsedIcon(item))}
        </nav>
        <div className="px-2 py-2" style={{borderTop: '0.5px solid rgba(255,255,255,0.06)'}}>
          <button onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-[var(--radius-lg)] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer bg-transparent border-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-gradient-to-b from-[#0F172A] to-[#0B1120] h-screen fixed top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out w-[280px]">
      <div className="px-5 py-6 relative" style={{borderBottom: '0.5px solid rgba(255,255,255,0.06)'}}>
        <NavLink to="/dashboard" className="flex flex-col items-center hover:opacity-90 transition-all duration-200 cursor-pointer">
          <span className="text-white font-bold text-2xl tracking-tight"
            style={{textShadow: '0 0 20px rgba(35,71,232,0.3)'}}>GRESIO</span>
          <span className="text-slate-500 text-xs font-medium mt-0.5 tracking-[0.15em]">Internal OS</span>
        </NavLink>
        <button onClick={onToggle}
          className="absolute right-3 top-7 w-6 h-6 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto px-3">
        {filteredStandalone.map(item => renderNavLink(item))}

        <div className="mx-1 my-3" style={{borderBottom: '0.5px solid rgba(255,255,255,0.06)'}} />

        {sidebarGroups.map(group => (
          <SidebarGroup key={group.id} group={group} isOpen={openGroup === group.id} onToggle={handleToggle} user={user} />
        ))}

        {filteredBottom.length > 0 && (
          <div className="mx-1 my-3" style={{borderTop: '0.5px solid rgba(255,255,255,0.06)'}} />
        )}

        {filteredBottom.map(item => renderNavLink(item))}
      </nav>
    </aside>
  );
}

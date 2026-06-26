import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';

export default function OnboardingGuide() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(user?.onboardingCompleted || false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [checklist, setChecklist] = useState({
    role: false, lifecycle: false, tasks: false, contact: false, features: false,
  });
  const [openSections, setOpenSections] = useState({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true,
  });
  const [scrollProgress, setScrollProgress] = useState(0);
  const pageRef = useRef(null);
  const footerRef = useRef(null);
  const allChecked = Object.values(checklist).every(Boolean);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (acknowledged) return;
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setReachedBottom(true); },
      { rootMargin: '-100px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [acknowledged]);

  const handleScroll = () => {
    if (pageRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = pageRef.current;
      setScrollProgress(Math.min((scrollTop / (scrollHeight - clientHeight)) * 100, 100));
    }
  };

  const handleAcknowledge = async () => {
    try {
      const res = await auth.updateProfile({ onboardingCompleted: true });
      updateUser(res.data);
    } catch (e) { console.error(e); }
    navigate('/dashboard');
  };

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div ref={pageRef} onScroll={handleScroll} className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-20 page-enter">
      {/* ── Progress Bar ── */}
      {!acknowledged && (
        <div className="fixed top-14 left-0 right-0 z-40 h-1 bg-neutral-200 dark:bg-[var(--border-primary)]" style={{ paddingLeft: 0 }}>
          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
        </div>
      )}

      {/* ── Header ── */}
      <div className="glass-panel gradient-wave rounded-[var(--radius-xl)] p-4 sm:p-5 mb-5 flex items-center justify-between flex-wrap gap-3" style={{background: 'linear-gradient(135deg, #f0f4ff 0%, #eef2ff 50%, #f5f3ff 100%)', backgroundSize: '200% 200%'}}>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl">📖</span>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-[var(--text-primary)] m-0">User Onboarding & System Overview</h1>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 px-2 py-0.5 rounded-full">
              <span className="live-dot" /> Guide
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] mt-1">Complete guide to understanding and using GRESIO</p>
        </div>
        <span className="text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={{background: acknowledged ? 'var(--success-bg)' : 'var(--warning-bg)', color: acknowledged ? 'var(--success-text)' : 'var(--warning-text)'}}>
          {acknowledged ? '✅ Acknowledged' : '⏳ Not Acknowledged'}
        </span>
      </div>

      {/* ── Welcome Banner ── */}
      {showWelcome && !acknowledged && (
        <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--border-primary)] p-4 mb-5 flex items-start gap-3">
          <span className="text-lg shrink-0">👋</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-[var(--text-primary)] m-0">Welcome to GRESIO!</p>
            <p className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] mt-1">You've completed the quick setup. Review the guide below, check the 5 items, then acknowledge at the bottom.</p>
            <button onClick={() => setShowWelcome(false)}
              className="btn-premium mt-2 text-[10px]">Got it</button>
          </div>
        </div>
      )}

      {/* ── Sections ── */}
      <div className="flex flex-col gap-4 stagger">

        {/* 1. What is GRESIO? */}
        <Section num="1" title="What is GRESIO?" open={openSections[1]} onToggle={() => toggleSection(1)}>
          <p className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] leading-relaxed">
            GRESIO is an all-in-one internal operating system for managing projects of all kinds — software, design, business, content, and research — tracking tasks, running QA test cases, and monitoring project health from discovery to delivery.
          </p>
          <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-3 mb-2 uppercase tracking-wider">Key Features</h4>
          <InfoTable rows={[
            ['Project Dashboard','Visual progress tracker with lifecycle phases'],
            ['5 Project Types','Software, Design, Business, Content, Research — each with its own workflow'],
            ['Sprint Management','Create, plan, and execute agile sprints'],
            ['Task & Test Tracking','Assign, track, and complete tasks; create and execute QA tests'],
            ['Team Collaboration','Role-based access for secure teamwork'],
            ['Calendar','Color-coded view of tasks, sprints, deadlines, milestones, events, and reminders'],
            ['Report Generation','Admin (full audit) and Client (summary) PDF reports'],
            ['Automated Status Flow','Smart phase transitions based on project data and type'],
            ['Manual Gates','Admin/PM/Team Lead approval for critical milestones'],
            ['Knowledge Base','Company wiki, WorkDNA archives, and reusable project templates'],
          ]} />
        </Section>

        {/* 2. Your Role & Permissions */}
        <Section num="2" title="Your Role & Permissions" open={openSections[2]} onToggle={() => toggleSection(2)}>
          <p className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] leading-relaxed">
            Your role determines what you can see and do. You cannot change your own role — only an Admin can assign or modify roles. Below is the full permission matrix.
          </p>

          <div className="mt-3 overflow-auto rounded-[var(--radius-lg)] border border-neutral-100 dark:border-[var(--border-secondary)]">
            <table className="w-full border-collapse text-[10px] leading-tight">
              <thead>
                <tr className="bg-neutral-50 dark:bg-[var(--bg-tertiary)]">
                  <th className="px-2.5 py-2.5 text-left font-semibold text-neutral-800 dark:text-[var(--text-primary)] text-[10px] uppercase tracking-wider sticky left-0 bg-neutral-50 dark:bg-[var(--bg-tertiary)] z-10">Action</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-brand-700 dark:text-brand-400 text-[10px] uppercase tracking-wider">Admin</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-purple-700 dark:text-purple-400 text-[10px] uppercase tracking-wider">PM</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-amber-700 dark:text-amber-400 text-[10px] uppercase tracking-wider">Manager</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-cyan-700 dark:text-cyan-400 text-[10px] uppercase tracking-wider">Team Lead</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-emerald-700 dark:text-emerald-400 text-[10px] uppercase tracking-wider">QA</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-sky-700 dark:text-sky-400 text-[10px] uppercase tracking-wider">Dev</th>
                  <th className="px-2.5 py-2.5 text-center font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Intern</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Create Project','✅','✅','✅','❌','❌','❌','❌'],
                  ['Delete Project','✅','✅','✅','❌','❌','❌','❌'],
                  ['Create Sprint','✅','✅','✅','❌','❌','❌','❌'],
                  ['Create Task','✅','✅','✅','✅','✅','❌','❌'],
                  ['Assign Tasks','✅','✅','✅','✅','✅','❌','❌'],
                  ['Update Any Task','✅','✅','✅','✅','✅','✅','✅'],
                  ['Create Test Case','✅','✅','✅','❌','❌','❌','❌'],
                  ['Execute Test Case','✅','✅','✅','❌','✅','❌','❌'],
                  ['🔒 Launch Project','✅','✅','❌','❌','❌','❌','❌'],
                  ['🔒 Deliver Project','✅','✅','❌','❌','❌','❌','❌'],
                  ['Change User Roles','✅','❌','❌','❌','❌','❌','❌'],
                  ['Company Settings','✅','❌','❌','❌','❌','❌','❌'],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-[var(--border-secondary)] last:border-0 hover:bg-neutral-50 dark:hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className={`px-2.5 py-2 ${j === 0 ? 'text-left font-semibold text-neutral-800 dark:text-[var(--text-primary)] whitespace-nowrap text-[10px]' : 'text-center text-xs'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-neutral-400 dark:text-[var(--text-muted)] mt-2">🔒 = Manual gate — requires explicit action by permitted role</p>

          <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-4 mb-2 uppercase tracking-wider">Role Descriptions</h4>
          <InfoTable rows={[
            ['Admin','Full system access. Can create/delete projects, assign roles, manage settings.'],
            ['Project Manager (PM)','Manages multiple projects. Creates sprints, assigns tasks, launches/delivers.'],
            ['Team Lead','Leads a department. Manages sprint backlog, approves phases, manages members.'],
            ['Manager','Oversees operations. Edits projects, creates tasks, edits test cases.'],
            ['QA Tester','Executes test cases. Creates tasks, manages bugs, marks test results.'],
            ['Developer','Executes assigned tasks. Updates task status, runs test cases.'],
            ['Intern','Supports the department. Views projects, updates own tasks.'],
          ]} />
        </Section>

        {/* 3. Project Lifecycle */}
        <Section num="3" title="Project Lifecycle" open={openSections[3]} onToggle={() => toggleSection(3)}>
          <p className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] leading-relaxed">
            GRESIO supports <strong>5 project types</strong>, each with its own lifecycle. The phase bar adapts automatically.
          </p>

          <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-3 mb-2 uppercase tracking-wider">Project Types & Phases</h4>
          <InfoTable rows={[
            ['Type','Phases'],
            ['Software','Discovery → Planning → Development → Testing → Review → Launch → Delivered'],
            ['Design','Discovery → Planning → Designing → Prototyping → Testing → Review → Launch → Delivered'],
            ['Business','Discovery → Planning → Business Growth → Validation → Testing → Review → Launch → Delivered'],
            ['Content','Discovery → Planning → Content Creation → Editing → Testing → Review → Launch → Delivered'],
            ['Research','Discovery → Planning → Research → Analysis → Testing → Review → Launch → Delivered'],
          ]} />

          <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-3 mb-2 uppercase tracking-wider">Key Rules</h4>
          <ul className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] m-0 pl-4 space-y-1 leading-relaxed">
            <li>Auto-transitions move the project forward automatically. Only Admin/PM/Team Lead can override.</li>
            <li>You cannot skip phases — each phase must be completed in order.</li>
            <li>Manual gates (Launch, Delivered) require explicit approval by authorized roles.</li>
          </ul>
        </Section>

        {/* 4. Essential Features */}
        <Section num="4" title="Essential Features" open={openSections[4]} onToggle={() => toggleSection(4)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-600 dark:text-[var(--text-secondary)]">
            <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-3">
              <span className="text-base">📊</span>
              <p className="font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-1 mb-0.5">Dashboard</p>
              <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] m-0">Progress bar, stats cards, project health, and navigation tabs for every project.</p>
            </div>
            <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-3">
              <span className="text-base">✅</span>
              <p className="font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-1 mb-0.5">Tasks & Sprints</p>
              <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] m-0">Time-boxed sprints (1-2 weeks) with tasks. Status: To Do → In Progress → In Review → Done.</p>
            </div>
            <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-3">
              <span className="text-base">🧪</span>
              <p className="font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-1 mb-0.5">Test Cases</p>
              <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] m-0">QA validation with step-by-step instructions. Failed tests auto-create Bug tasks.</p>
            </div>
            <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-3">
              <span className="text-base">📅</span>
              <p className="font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-1 mb-0.5">Calendar</p>
              <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] m-0">Month view with color-coded tasks 🟡, sprints 🟢, deadlines 🔴, milestones 🔵, events 🟣, reminders 🟠.</p>
            </div>
            <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-3">
              <span className="text-base">🔔</span>
              <p className="font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-1 mb-0.5">Notifications</p>
              <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] m-0">Three tabs: Projects, Tasks & Tests, Other. Get alerts for assignments, deadlines, and phase changes.</p>
            </div>
            <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-3">
              <span className="text-base">📋</span>
              <p className="font-semibold text-neutral-800 dark:[var(--text-primary)] mt-1 mb-0.5">Reports</p>
              <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] m-0">Generate Admin (full KPIs) or Client (summary) PDF reports for completed/delivered projects.</p>
            </div>
          </div>
        </Section>

        {/* 5. WorkDNA & Knowledge Base */}
        <Section num="5" title="WorkDNA & Knowledge Base" open={openSections[5]} onToggle={() => toggleSection(5)}>
          <p className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] leading-relaxed">
            WorkDNA is GRESIO's intelligent project archive — it automatically analyzes every active project each month, logs key decisions, and lets you search past projects to learn from before starting something new.
          </p>

          <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-3 mb-2 uppercase tracking-wider">What WorkDNA Does</h4>
          <InfoTable rows={[
            ['Monthly Project Archive','Saves full snapshot: features, tech stack, risks, patterns, tasks, team, docs'],
            ['Decision Journal','Log every decision — what, why, alternatives, and outcome'],
            ['Déjà Vu Search','Search archives by keyword to find similar past work'],
            ['Pattern Detection','Rule-based analysis of overdue tasks, bug density, sprint cadence'],
          ]} />

          <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-3 mb-2 uppercase tracking-wider">Knowledge Base</h4>
          <ul className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] m-0 pl-4 space-y-1 leading-relaxed">
            <li><strong>📝 Wiki</strong> — Create/edit markdown articles with live preview, rate articles, attach files</li>
            <li><strong>🧬 WorkDNA</strong> — Browse monthly snapshots, log decisions, search past projects</li>
            <li><strong>📋 Templates</strong> — Browse reusable project templates with predefined phases and tasks</li>
          </ul>
        </Section>

        {/* 6. Checklist */}
        <Section num="6" title="Getting Started Checklist" open={openSections[6]} onToggle={() => toggleSection(6)}>
          <p className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] mb-3">Check all 5 items to acknowledge the guide:</p>
          <ul className="m-0 p-0 list-none space-y-2">
            {[
              {k:'role',l:'I understand my role and its permissions'},
              {k:'lifecycle',l:'I understand project lifecycle phases'},
              {k:'tasks',l:'I know how to create and update tasks'},
              {k:'contact',l:'I know who to contact if I\'m stuck'},
              {k:'features',l:'I\'ve reviewed the key features'},
            ].map(({k,l}) => (
              <li key={k}
                onClick={() => !acknowledged && setChecklist(p => ({...p, [k]: !p[k]}))}
                className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-md)] cursor-pointer transition-all hover:bg-neutral-50 dark:hover:bg-[var(--bg-tertiary)]"
                style={{opacity: checklist[k] ? 1 : 0.65}}>
                <span className={`w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center text-[10px] font-bold transition-all border-2 shrink-0 ${checklist[k] ? 'bg-brand-600 border-brand-600 text-white' : 'border-neutral-300 dark:border-[var(--border-primary)] text-transparent'}`}>
                  {checklist[k] ? '✓' : ''}
                </span>
                <span className={`text-xs transition-all ${checklist[k] ? 'font-semibold text-neutral-900 dark:text-[var(--text-primary)]' : 'text-neutral-600 dark:text-[var(--text-secondary)]'}`}>{l}</span>
              </li>
            ))}
          </ul>
          {!acknowledged && !allChecked && (
            <p className="text-[11px] font-semibold mt-3" style={{color: 'var(--warning-text)'}}>☑️ Check all 5 items above to enable acknowledgment</p>
          )}
          {!acknowledged && allChecked && !reachedBottom && (
            <p className="text-[11px] font-semibold mt-3" style={{color: 'var(--warning-text)'}}>📖 Scroll to the bottom of the page to acknowledge</p>
          )}
          {!acknowledged && allChecked && reachedBottom && (
            <p className="text-[11px] font-semibold mt-3" style={{color: 'var(--success-text)'}}>✅ All ready — acknowledge below</p>
          )}
        </Section>

        {/* 7. Admin Only */}
        {user?.role === 'admin' && (
          <Section num="7" title="Admin: Import Users from Microsoft 365" open={openSections[7]} onToggle={() => toggleSection(7)}>
            <p className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] leading-relaxed">
              Import all company users from Microsoft 365 / Azure AD in one click.
            </p>
            <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-[var(--text-primary)] mt-3 mb-2 uppercase tracking-wider">How It Works</h4>
            <ol className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] m-0 pl-4 space-y-1.5 leading-relaxed">
              <li>Go to <strong>Admin Panel</strong> from the sidebar</li>
              <li>In the <strong>"Import from Microsoft 365"</strong> card, type your domain (e.g. <code>company.com</code>)</li>
              <li>Click <strong>"Import Users"</strong> — accounts are created with temp passwords</li>
              <li>Welcome emails are sent automatically via Microsoft Graph</li>
              <li>Existing users (matched by email) are skipped</li>
            </ol>
            <p className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] mt-3">Imported users get the <strong>Developer</strong> role by default. You can change this later.</p>
          </Section>
        )}

        {/* 8. Need Help? */}
        <Section num="8" title="Need Help?" open={openSections[8]} onToggle={() => toggleSection(8)}>
          <div className="text-xs text-neutral-600 dark:text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p className="m-0 flex items-center gap-2">
              <span className="text-sm">✉️</span>
              <a href="mailto:Consult@360DMMC.com" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Consult@360DMMC.com</a>
            </p>
            <p className="m-0 flex items-center gap-2">
              <span className="text-sm">🕐</span>
              <span>Support Hours: Sunday–Thursday, 9:00 AM – 6:00 PM</span>
            </p>
            <p className="m-0 flex items-center gap-2">
              <span className="text-sm">🚨</span>
              <span>Emergency: Use the <strong>"Escalate"</strong> button in the top navigation</span>
            </p>
          </div>
        </Section>

      </div>

      {/* ── Footer / Acknowledge ── */}
      <div ref={footerRef} className="text-center mt-8 pt-5" style={{borderTop: '0.5px solid var(--border-primary)'}}>
        {acknowledged ? (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{color: 'var(--success-text)'}}>
            <span className="text-lg">✅</span> You have acknowledged this guide
          </div>
        ) : allChecked && reachedBottom ? (
          <button onClick={handleAcknowledge} className="btn-premium text-xs px-6 py-2.5 animate-scale-in">
            ✅ I Acknowledge and Agree
          </button>
        ) : (
          <span className="text-[11px]" style={{color: 'var(--text-muted)'}}>
            {!allChecked ? '☑️ Check all 5 items in the checklist above first' : '📖 Scroll down to reach the bottom'}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ num, title, open, onToggle, children }) {
  return (
    <div className="card-premium glow-card bg-white dark:bg-[var(--bg-secondary)] border border-neutral-200 dark:border-[var(--border-primary)] overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer bg-transparent border-none transition-colors hover:bg-neutral-50 dark:hover:bg-[var(--bg-tertiary)]">
        <span className="w-6 h-6 rounded-[var(--radius-md)] bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center text-[11px] font-bold shrink-0">{num}</span>
        <span className="flex-1 text-left text-sm font-semibold text-neutral-900 dark:text-[var(--text-primary)]">{title}</span>
        <svg className={`w-4 h-4 text-neutral-400 dark:text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoTable({ rows }) {
  return (
    <div className="overflow-auto rounded-[var(--radius-md)] border border-neutral-100 dark:border-[var(--border-secondary)]">
      <table className="w-full border-collapse text-[10px]">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-neutral-100 dark:border-[var(--border-secondary)] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-2.5 py-2 align-top ${j === 0 ? 'font-semibold whitespace-nowrap text-neutral-800 dark:text-[var(--text-primary)]' : 'text-neutral-500 dark:text-[var(--text-tertiary)]'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

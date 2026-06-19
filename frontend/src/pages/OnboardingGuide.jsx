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
    role: false, lead: false, lifecycle: false, manual: false, tasks: false, qa: false, calendar: false, relay: false, help: false,
  });
  const footerRef = useRef(null);
  const allChecked = Object.values(checklist).every(Boolean);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

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

  const handleAcknowledge = async () => {
    try {
      const res = await auth.updateProfile({ onboardingCompleted: true });
      updateUser(res.data);
    } catch (e) { console.error(e); }
    navigate('/dashboard');
  };

  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>📖 User Onboarding & System Overview</h1>
          <p style={{fontSize:11,color:'#6b7280',margin:'4px 0 0'}}>Complete guide to understanding and using GRESIO</p>
        </div>
        <span style={{fontSize:9,fontWeight:600,padding:'3px 10px',borderRadius:12,whiteSpace:'nowrap',background:acknowledged ? '#f0fdf4' : '#fffbeb',color:acknowledged ? '#16a34a' : '#d97706'}}>
          {acknowledged ? '✅ Acknowledged' : '⏳ Not Acknowledged'}
        </span>
      </div>

      {showWelcomeBanner && !acknowledged && (
        <div style={{background:'#f0f4ff',borderRadius:9,border:'0.5px solid #dce6ff',padding:'12px 16px',marginBottom:4}}>
          <p style={{fontSize:13,fontWeight:600,color:'#1a35c4',margin:'0 0 2px'}}>{'\u{1F44B}'} Welcome to GRESIO!</p>
          <p style={{fontSize:11,color:'#4b5563',margin:0}}>
            You've completed the quick setup. Review the full guide below, then check all items in the checklist and acknowledge at the bottom.
          </p>
          <button onClick={() => setShowWelcomeBanner(false)}
            style={{fontSize:10,color:'#6b7280',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:6,textDecoration:'underline'}}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:24,fontSize:12,color:'#374151',lineHeight:1.6}}>

        <Section title="2. What is GRESIO?">
          <p>GRESIO is an all-in-one internal operating system designed for managing projects of all kinds — software, design, business, content, and research — tracking tasks, running QA test cases, and monitoring project health from discovery to delivery.</p>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Key Features</h4>
          <InfoTable rows={[
            ['Project Dashboard','Visual progress tracker with lifecycle phases'],
            ['5 Project Types','Software, Design, Business, Content, Research — each with its own phase workflow'],
            ['Sprint Management','Create, plan, and execute agile sprints'],
            ['Task Tracking','Assign, track, and complete tasks'],
            ['Test Case Management','Create and execute QA tests linked to features'],
            ['Team Collaboration','Role-based access for secure teamwork'],
            ['Calendar','Visual calendar showing tasks, sprints, project deadlines, milestones, events, and reminders — all color-coded'],
            ['Project Relay','Chain multiple projects in an ordered pipeline with automatic notifications on delivery — supports branching workflows'],
            ['Report Generation','Generate admin (full audit) and client (summary) PDF reports for completed/delivered projects'],
            ['Automated Status Flow','Smart phase transitions based on project data and type'],
            ['Manual Gates','Admin/PM/Team Lead approval for critical milestones'],
          ]} />
        </Section>

        <Section title="3. User Roles & Permissions">
          <p>Your role determines what you can see and do in GRESIO. You cannot change your own role — only an Admin can assign or modify roles.</p>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Available Roles</h4>
          <InfoTable rows={[
            ['Admin','1 — Highest','Full system access. Can create/delete projects, assign roles, manage company settings, manage integrations, and access all features.'],
            ['Project Manager (PM)','2','Manages multiple projects. Can create sprints, assign tasks, launch/deliver projects, manage members, and view all reports.'],
            ['Team Lead','3','Leads a department. Can create tasks, manage sprint backlog, approve phase transitions, manage resources, and manage members.'],
            ['Manager','3','Oversees operations. Can edit projects, create tasks, edit/delete test cases, and view work logs.'],
            ['QA Tester','4','Executes test cases. Can create tasks, execute/retest test cases, manage bugs, and mark test results.'],
            ['Developer','4','Executes assigned tasks. Can update task status, view projects, and run test cases.'],
            ['Intern','5','Supports the department. Can view projects, update own tasks, run test cases, and view dashboards.'],
            ['Other','5','Base-level access. Can view dashboards and basic project information.'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Detailed Permission Matrix</h4>
          <InfoTable rows={[
            ['Action','Admin','PM','Manager','Team Lead','QA Tester','Developer','Intern'],
            ['Create Project','✅','✅','✅','❌','❌','❌','❌'],
            ['Delete Project','✅','✅','✅','❌','❌','❌','❌'],
            ['Edit Project','✅','✅','✅','✅','❌','❌','❌'],
            ['Edit Project Settings','✅','✅','✅','❌','❌','❌','❌'],
            ['Create Sprint','✅','✅','✅','❌','❌','❌','❌'],
            ['Delete Sprint','✅','❌','❌','❌','❌','❌','❌'],
            ['Manage Sprint Tasks','✅','✅','✅','❌','❌','❌','❌'],
            ['Create Task','✅','✅','✅','✅','✅','❌','❌'],
            ['Create Standalone Task','✅','✅','✅','✅','❌','❌','❌'],
            ['Update Any Task','✅','✅','✅','✅','✅','✅','✅'],
            ['Add / Delete Subtasks','✅','✅','✅','❌','❌','❌','❌'],
            ['Create Test Case','✅','✅','✅','❌','❌','❌','❌'],
            ['Edit / Delete Test Case','✅','✅','✅','✅','✅','❌','❌'],
            ['Execute / Retest Test Case','✅','✅','✅','❌','✅','❌','❌'],
            ['Manage Resources','✅','✅','✅','❌','❌','❌','❌'],
            ['Manage Members','✅','✅','✅','❌','❌','❌','❌'],
            ['Manage Bugs','✅','✅','✅','❌','✅','❌','❌'],
            ['🔒 Launch Project','✅','✅','❌','❌','❌','❌','❌'],
            ['🔒 Deliver Project','✅','✅','❌','❌','❌','❌','❌'],
            ['Evaluate Phase','✅','✅','✅','❌','❌','❌','❌'],
            ['View Work Logs','✅','✅','✅','✅','❌','❌','❌'],
            ['View Dashboard / Reports','✅','✅','✅','✅','✅','✅','✅'],
            ['Generate / Delete Reports','✅','✅','✅','✅','❌','❌','❌'],
            ['Change User Roles','✅','❌','❌','❌','❌','❌','❌'],
            ['Delete Users','✅','❌','❌','❌','❌','❌','❌'],
            ['Company / Plan Settings','✅','❌','❌','❌','❌','❌','❌'],
            ['Manage Integrations','✅','❌','❌','❌','❌','❌','❌'],
            ['Customize Dashboard','✅','❌','❌','❌','❌','❌','❌'],
            ['Microsoft Teams Settings','✅','✅','❌','❌','❌','❌','❌'],
            ['Browse & Use Templates','✅','✅','✅','✅','✅','✅','✅'],
            ['Save Project as Template','✅','✅','✅','❌','❌','❌','❌'],
          ]} />
          <p style={{fontSize:10,color:'#6b7280',marginTop:6}}>🔒 = Manual gate — requires explicit action by permitted role. System will not auto-transition.</p>
        </Section>

        <Section title="4. Project Lifecycle Explained">
          <p>GRESIO supports <strong>5 project types</strong>, each with its own lifecycle phases. When you create a project, you choose its type. The phase bar adapts automatically.</p>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Project Type Overview</h4>
          <InfoTable rows={[
            ['Type','Label','Phases'],
            ['Software','Software / Development','Discovery → Planning → Development → Testing → Review → Launch → Delivered'],
            ['Design','Design / Creative','Discovery → Planning → Designing → Prototyping → Testing → Review → Launch → Delivered'],
            ['Business','Business / Marketing / Growth','Discovery → Planning → Business Growth → Validation → Testing → Review → Launch → Delivered'],
            ['Content','Content / Writing','Discovery → Planning → Content Creation → Editing → Testing → Review → Launch → Delivered'],
            ['Research','Research / Analysis','Discovery → Planning → Research → Analysis → Testing → Review → Launch → Delivered'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Common Phases (All Types)</h4>
          <InfoTable rows={[
            ['Phase','Type','Trigger','Who Can Advance'],
            ['Discovery','All','Project created','System (auto)'],
            ['Planning','All','Project info / repos configured, or sprint exists','System (auto)'],
            ['Testing','All','Testing conditions met (varies by type)','System (auto)'],
            ['Review','All','Testing complete and all tasks done','System (auto)'],
            ['Launch','All','Manual approval','Admin, PM, Team Lead'],
            ['Delivered','All','Manual approval','Admin, PM, Team Lead'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Type-Specific Phases</h4>
          <InfoTable rows={[
            ['Type','Middle Phases','Auto-Transition Condition'],
            ['Software','Development','Sprint/tasks exist and work has started'],
            ['Design','Designing → Prototyping → Testing','Tasks exist → testing items/tests ready → all tasks done'],
            ['Business','Business Growth → Validation → Testing','Tasks exist → ≥70% done → testing ready'],
            ['Content','Content Creation → Editing → Testing','Tasks exist → ≥50% done → testing ready'],
            ['Research','Research → Analysis → Testing','Tasks exist → ≥50% done → testing ready'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Important Rules</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11}}>
            <li>Auto-transitions cannot be reversed by regular users. Only Admin/PM/Team Lead can manually override status backward.</li>
            <li>You cannot skip phases. A project must pass through each phase in order.</li>
            <li>Manual gates (Launch, Delivered) are locked. If you see a 🔒 icon, you do not have permission to proceed.</li>
            <li>The project type is set at creation and shown as a badge on project cards and the project detail page.</li>
          </ul>
        </Section>

        <Section title="5. Dashboard Overview">
          <p>When you open a project, you see:</p>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Progress Bar</h4>
          <ul style={{margin:'0 0 12px',paddingLeft:16,fontSize:11}}>
            <li>Shows current phase highlighted in blue</li>
            <li>Completed phases show green</li>
            <li>Pending phases are gray</li>
            <li>Manual phases show 🔒 lock icon</li>
          </ul>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Stats Cards</h4>
          <InfoTable rows={[
            ['Card','Meaning'],
            ['Total Sprints','Number of sprints created for this project'],
            ['Active Sprint','Currently running sprint (0 if none active)'],
            ['Total Tasks','All tasks across all sprints'],
            ['Completed','Tasks with status "Done"'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Project Health (Right Sidebar)</h4>
          <InfoTable rows={[
            ['Metric','Good','Warning','Bad'],
            ['Completion','100%','70-99%','<70%'],
            ['Overdue Tasks','0','1-2','3+'],
            ['Risk Level','—','—','High'],
            ['Days Left','On track','<7 days','Overdue (red)'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Navigation Tabs</h4>
          <InfoTable rows={[
            ['Tab',"What's Inside"],
            ['📋 Overview','Project summary, health metrics, recent activity'],
            ['⚡ Sprints','Sprint list, burndown charts, velocity'],
            ['🧪 Test Cases','Test case management and execution'],
            ['🔍 Review','Schedule review calls, track phase changes'],
            ['📅 Calendar','Task deadlines, sprint dates, project milestones, events, and reminders — month view with color-coded items'],
            ['🔗 Relay','Chain projects in an ordered pipeline with completion tracking and auto-notifications'],
            ['👥 Department','Members, roles, workload distribution'],
            ['🔗 Resources','Linked repositories, documentation, environments'],
            ['⚙️ Settings','Project configuration, notifications, integrations'],
          ]} />
        </Section>

        <Section title="6. Tasks, Sprints & Test Cases">
          <h4 style={{margin:'0 0 6px',fontSize:11,color:'#111827'}}>Tasks</h4>
          <ul style={{margin:'0 0 12px',paddingLeft:16,fontSize:11}}>
            <li>Regular work items assigned to developers</li>
            <li>Status: To Do → In Progress → In Review → Done</li>
            <li>Can be linked to sprints and features</li>
          </ul>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Sprints</h4>
          <ul style={{margin:'0 0 12px',paddingLeft:16,fontSize:11}}>
            <li>Time-boxed iterations (usually 1-2 weeks)</li>
            <li>Contains tasks and test cases</li>
            <li>Has start date, end date, and goal</li>
          </ul>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Test Cases (Special Task Type)</h4>
          <ul style={{margin:'0 0 12px',paddingLeft:16,fontSize:11}}>
            <li>Quality assurance items that validate features</li>
            <li>Linked to specific features/requirements</li>
            <li>Contains step-by-step instructions with expected vs actual results</li>
            <li>Status: Draft → Ready → In Progress → Passed / Failed / Blocked / Skipped</li>
            <li>If a test fails: System auto-creates a Bug task linked to the original feature</li>
          </ul>
        </Section>

        <Section title="7. Status Transitions: Auto vs Manual">
          <h4 style={{margin:'0 0 6px',fontSize:11,color:'#111827'}}>Automatic Transitions (System handles these)</h4>
          <p style={{fontSize:11}}>You don't need to do anything. The system checks conditions based on the project type and moves the project forward automatically.</p>
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Software / Development</h4>
          <InfoTable rows={[
            ['From','To','Condition'],
            ['Discovery','Planning','Project info filled (description, deadline, members) OR repos configured'],
            ['Planning','Development','Tasks exist OR Sprints exist (work started)'],
            ['Development','Testing','ALL tasks Done AND no critical tasks remain'],
            ['Testing','Review','All test cases passed OR (all testing items passed with none failed)'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Design / Creative</h4>
          <InfoTable rows={[
            ['From','To','Condition'],
            ['Discovery','Planning','Project info filled or repos linked'],
            ['Planning','Designing','Tasks or sprints exist'],
            ['Designing','Prototyping','Testing items exist OR (test cases exist AND all passed)'],
            ['Prototyping','Testing','Testing ready (test cases passed or all testing passed)'],
            ['Testing','Review','All tasks done and no critical blockers'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Business / Marketing / Growth</h4>
          <InfoTable rows={[
            ['From','To','Condition'],
            ['Discovery','Planning','Project info filled'],
            ['Planning','Business Growth','Tasks or sprints exist'],
            ['Business Growth','Validation','≥70% of tasks done'],
            ['Validation','Testing','Testing ready'],
            ['Testing','Review','All tasks done and no critical blockers'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Content / Writing</h4>
          <InfoTable rows={[
            ['From','To','Condition'],
            ['Discovery','Planning','Project info filled'],
            ['Planning','Content Creation','Tasks exist'],
            ['Content Creation','Editing','≥50% of tasks done'],
            ['Editing','Testing','Testing ready'],
            ['Testing','Review','All tasks done and no critical blockers'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Research / Analysis</h4>
          <InfoTable rows={[
            ['From','To','Condition'],
            ['Discovery','Planning','Project info filled'],
            ['Planning','Research','Tasks exist'],
            ['Research','Analysis','≥50% of tasks done'],
            ['Analysis','Testing','Testing ready'],
            ['Testing','Review','All tasks done and no critical blockers'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Manual Transitions (You must click)</h4>
          <p style={{fontSize:11}}>These apply to <strong>all project types</strong> and require explicit action by an authorized user.</p>
          <InfoTable rows={[
            ['From','To','Who Can Click','What System Checks'],
            ['Any last auto phase','Launch','Admin, PM','All critical tests passed, no open critical bugs'],
            ['Launch','Delivered','Admin, PM','All acceptance criteria met, stakeholders approved'],
          ]} />
          <p style={{fontSize:11,marginTop:6}}>If you click Launch or Delivered and the system blocks you, a report will show what's missing.</p>
        </Section>

        <Section title="8. Notifications & Alerts">
          <p>Notifications are organized into <strong>three tabs</strong> on the Notifications page:</p>
          <InfoTable rows={[
            ['Tab','Types You See'],
            ['📁 Projects','Project updates, phase changes, project invites'],
            ['✅ Tasks & Tests','Task assignments, task updates, status changes for tasks/tests'],
            ['📢 Other','Meeting reminders, deadline alerts, warnings, worklog entries, mentions, system messages'],
          ]} />
          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Notification Triggers</h4>
          <InfoTable rows={[
            ['Event','Who Gets Notified','Tab'],
            ['Task assigned to you','You','📁 Projects'],
            ['Sprint starts','All sprint members','📁 Projects'],
            ['Project phase changes','All project members','📁 Projects'],
            ['Review call scheduled','All project members','📢 Other'],
            ['Task marked overdue','You + Your Team Lead','📢 Other'],
            ['Test case failed','QA Lead + Developer + PM','✅ Tasks'],
            ['Warning triggered (interests)','PM + Team Lead','📢 Other'],
            ['Worklog added','Other project members','📢 Other'],
            ['Project ready for Launch','PM + Stakeholders','📁 Projects'],
            ['Manual action required','Authorized users','📁 Projects'],
          ]} />
          <p style={{fontSize:11}}>To manage notifications: Go to Settings → Notifications in your profile.</p>
        </Section>

        <Section title="9. Report Generation">
          <p>GRESIO can generate professional PDF reports for projects that have reached <strong>Completed</strong> status or <strong>Delivered</strong> phase. These reports can be shared with stakeholders or clients.</p>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Who Can Generate Reports</h4>
          <p style={{fontSize:11}}>Only <strong>Admin</strong>, <strong>Project Manager</strong>, <strong>Manager</strong>, and <strong>Team Lead</strong> can generate, view, and delete reports.</p>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Report Types</h4>
          <InfoTable rows={[
            ['Type','Audience','Contents'],
            ['Admin Report','Internal team, PM, Admin','Full project KPIs: tasks, sprints, team performance, effort hours, test results, timeline, project health metrics. Branded "Generated by GRESIO · Certified by 360 DMMC".'],
            ['Client Report','Client or external stakeholder','App features overview, design/visual highlights, and the 8-phase project methodology. Focused on value delivered, not internal KPIs. Branded "Generated by GRESIO · Certified by 360 DMMC".'],
          ]} />

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>How to Generate a Report</h4>
          <ol style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.8}}>
            <li>Go to <strong>Projects</strong> from the sidebar</li>
            <li>Find a project with <strong>Completed</strong> status or <strong>Delivered</strong> phase</li>
            <li>Click the <strong>"Generate Report"</strong> button on the project card</li>
            <li>Choose <strong>Admin Report</strong>, <strong>Client Report</strong>, or <strong>Generate Both</strong></li>
            <li>The report is saved instantly — click <strong>"View Report"</strong> to open it</li>
          </ol>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Viewing &amp; Downloading Reports</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>All saved reports are listed under <strong>Insights → Reports</strong> in the sidebar</li>
            <li>Click <strong>View</strong> to open the full report preview page</li>
            <li>Click <strong>Download PDF</strong> on the preview page to export as a PDF file</li>
            <li>You can share the report link with anyone — the public preview page requires a login</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Important Notes</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>Reports capture a <strong>snapshot</strong> of project data at the time of generation. They do not auto-update — generate a new report to refresh the data.</li>
            <li>Generating a report for the same project <strong>overwrites</strong> the previous report of the same type. Old data is replaced.</li>
            <li>Reports can only be <strong>deleted</strong> by authorized roles (Admin, PM, Manager, Team Lead).</li>
            <li>Download count is tracked for each report.</li>
          </ul>
        </Section>

        <Section title="10. WorkDNA — Company Brain">
          <p style={{fontSize:11}}>WorkDNA is GRESIO's intelligent project archive — it automatically analyzes every active project each month, logs key decisions, and lets you search past projects to learn from before starting something new.</p>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>🧬 What WorkDNA Does</h4>
          <InfoTable rows={[
            ['Feature','What It Does','How It Helps'],
            ['Monthly Project Archive','Each month, WorkDNA scans all active projects and saves a full snapshot: features, tech stack, risks, patterns, task stats, team members, documents, repositories, and technical URLs','Every project\'s complete technical state is preserved. No more digging through old chats to find what was used.'],
            ['Decision Journal','Log every important decision — what was decided, why, what alternatives were considered, and the outcome','Never lose context. New team members can catch up in minutes instead of weeks.'],
            ['Déjà Vu Search','Search archived projects and past decisions by keyword (features, tech, project names) to find similar work done before','Avoid repeating the same mistakes. Know what to watch out for before you start.'],
            ['Pattern Detection','Rule-based analysis of overdue tasks, bug density, sprint cadence, and completion rates across all projects','Get warned about problems before they become crises. Spot bottlenecks you didn\'t know existed.'],
          ]} />

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>How to Use It</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>Navigate to <strong>Insights → WorkDNA</strong> from the sidebar</li>
            <li>The <strong>Project Archive</strong> tab shows all analyzed projects — click any to expand and see every technical detail (features, tech stack, docs, repos, risks, stats, key decisions)</li>
            <li>Click <strong>"Monthly Analysis"</strong> to trigger an immediate scan of all active projects and create fresh archives</li>
            <li>Use the <strong>Decision Journal</strong> tab to browse all logged decisions and their outcomes</li>
            <li>Use the <strong>Déjà Vu</strong> tab to search archived projects and decisions by keyword — find similar past projects before starting new work</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Who Can Log Decisions</h4>
          <InfoTable rows={[
            ['Role','Log Decision','Delete Decision','Run Analysis','View WorkDNA'],
            ['Admin','✅','✅','✅','✅'],
            ['Project Manager','✅','✅','✅','✅'],
            ['Team Lead','✅','✅','❌','✅'],
            ['Manager','✅','❌','✅','✅'],
            ['Developer','❌','❌','❌','✅'],
            ['QA Tester','❌','❌','❌','✅'],
            ['Intern / Other','❌','❌','❌','✅'],
          ]} />

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>What Each Archive Contains</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li><strong>Features</strong> — extracted from task titles and types</li>
            <li><strong>Tech Stack</strong> — detected from task descriptions across all projects</li>
            <li><strong>Risks</strong> — overdue tasks, critical bugs, delayed status, sprint overdue</li>
            <li><strong>Patterns</strong> — task completion rate, sprint cadence, bug density</li>
            <li><strong>Stats</strong> — tasks (done/overdue/total), sprints, bugs, decisions count</li>
            <li><strong>Documents</strong> — all resources linked to the project (Figma, docs, repos, specs)</li>
            <li><strong>Repositories</strong> — GitHub repos and other code hosting links</li>
            <li><strong>Technical URLs</strong> — frontend/backend/mobile repos, staging/production URLs, API docs</li>
            <li><strong>Key Decisions</strong> — decisions linked to the project, with rationale and outcome</li>
            <li><strong>Client & Description</strong> — project metadata</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Why WorkDNA Matters</h4>
          <p style={{fontSize:11}}>
            Traditional PM tools manage tasks. WorkDNA manages <strong>wisdom</strong>. Every project makes your company smarter. 
            When someone leaves, their decision trail stays. When a new project starts, past archives are already searchable. 
            Over time, WorkDNA becomes your company's most valuable asset — the one thing that compounds in value with every project.
          </p>
        </Section>

        <Section title="11. WorkDNA — Fully Automatic (No AI Needed)">
          <p style={{fontSize:11}}>WorkDNA is designed to be fully automatic and self-contained. All analysis is done using <strong>rule-based logic</strong> — no external API keys, no AI costs, no setup required.</p>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>⚙️ How Analysis Works</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>When you click <strong>"Monthly Analysis"</strong>, WorkDNA scans all active projects immediately</li>
            <li>For each project, it fetches: tasks, sprints, bugs, decisions, resources, team members, settings</li>
            <li>Features are extracted from task titles and types using keyword matching</li>
            <li>Tech stack is detected from task descriptions (React, Node.js, Database, Mobile, DevOps, etc.)</li>
            <li>Risks are calculated: overdue tasks, unresolved critical bugs, low progress, sprint delays</li>
            <li>Patterns are detected: completion rate, sprint cadence, bug density</li>
            <li>A summary is generated automatically from project status, completion rate, and features</li>
            <li>Results are saved as a monthly snapshot — one document per project per month</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>🧠 Why Rule-Based</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li><strong>Zero cost</strong> — no API keys, no monthly bills, no token limits</li>
            <li><strong>Instant</strong> — analysis completes in seconds, not minutes</li>
            <li><strong>Deterministic</strong> — same data always produces same results, no hallucination risk</li>
            <li><strong>Private</strong> — no data leaves your server, all processing is local</li>
            <li><strong>Self-contained</strong> — works immediately after deployment, no configuration needed</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>🔮 Future Possibilities</h4>
          <p style={{fontSize:11}}>While WorkDNA is currently 100% rule-based, its architecture supports adding AI-powered features later (semantic search, natural language queries, auto-extracted decisions) if needed. But for now, everything works automatically — no setup, no cost, no complexity.</p>

          <blockquote style={{margin:'10px 0',padding:'8px 12px',background:'#f0f4ff',borderLeft:'3px solid #2347e8',fontSize:11,borderRadius:4}}>
            <strong>💡 Bottom line:</strong> WorkDNA is the easiest intelligence layer to adopt — click one button and every project is archived forever. No configuration, no API keys, no maintenance.
          </blockquote>
        </Section>

        <Section title="12. Getting Started Checklist">
          <p>Before you start using GRESIO, complete this checklist:</p>
          <ul style={{margin:0,padding:0,fontSize:11,listStyle:'none'}}>
            {[
              {k:'role',l:'I understand my role and its permissions'},
              {k:'lead',l:'I know who my Team Lead / PM is'},
              {k:'lifecycle',l:'I understand the lifecycle phases for each project type'},
              {k:'manual',l:'I know that Launch and Delivered require manual approval'},
              {k:'tasks',l:'I know how to create and update tasks'},
              {k:'qa',l:'I know how to run test cases (if I\'m QA)'},
              {k:'calendar',l:'I know how to use the Calendar to track deadlines and events'},
              {k:'relay',l:'I understand how Project Relay chains work'},
              {k:'workdna',l:'I understand WorkDNA and how to log decisions'},
              {k:'help',l:'I know where to find help if I\'m stuck'},
            ].map(({k,l}) => (
              <li key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',cursor:'pointer',opacity:checklist[k] ? 1 : 0.6}}
                onClick={() => !acknowledged && setChecklist(p => ({...p, [k]: !p[k]}))}>
                <span style={{fontSize:11,color:checklist[k] ? '#16a34a' : '#d1d5db'}}>
                  {checklist[k] ? '✅' : '◻️'}
                </span>
                <span style={{color:checklist[k] ? '#111827' : '#6b7280',fontWeight:checklist[k] ? 600 : 400}}>{l}</span>
              </li>
            ))}
          </ul>
          {!acknowledged && !allChecked && (
            <p style={{fontSize:11,fontWeight:600,color:'#d97706',marginTop:10}}>☑️ Check all items above to enable acknowledgment</p>
          )}
          {!acknowledged && allChecked && !reachedBottom && (
            <p style={{fontSize:11,fontWeight:600,color:'#d97706',marginTop:10}}>📖 Scroll to the bottom of the page to acknowledge</p>
          )}
          {!acknowledged && allChecked && reachedBottom && (
            <p style={{fontSize:11,fontWeight:600,color:'#16a34a',marginTop:10}}>✅ All items checked — you can now acknowledge below</p>
          )}
        </Section>

        {user?.role === 'admin' && (
        <Section title="13. Admin: Import Users from Microsoft 365">
          <p style={{fontSize:11}}>As an admin, you can import all company users from your Microsoft 365 / Azure AD directory directly into GRESIO in one click.</p>

          <h4 style={{margin:'14px 0 6px',fontSize:11,color:'#111827'}}>What this does</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>Searches Azure AD for all users whose email ends with <strong>your company domain</strong></li>
            <li>Creates a GRESIO account for each user with a temporary password</li>
            <li>Sends a welcome email with login instructions via Microsoft Graph</li>
            <li>Users who already exist in GRESIO (matched by email) are skipped</li>
          </ul>

          <h4 style={{margin:'14px 0 6px',fontSize:11,color:'#111827'}}>Steps</h4>
          <ol style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.8}}>
            <li>From the sidebar, go to <strong>Admin Panel</strong></li>
            <li>Scroll down to the <strong>"Import from Microsoft 365"</strong> card</li>
            <li>In the <strong>@</strong> input field, type your company email domain (e.g. <code>yourcompany.com</code>)</li>
            <li>Click the <strong>"Import Users"</strong> button (with the Microsoft logo)</li>
            <li>Wait for the import to complete — a green success message will show the count of imported and skipped users</li>
          </ol>

          <h4 style={{margin:'14px 0 6px',fontSize:11,color:'#111827'}}>What happens after import</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>All imported users can be seen in the <strong>Team</strong> section from the sidebar</li>
            <li>Each user receives a welcome email with their email, temporary password, and login link</li>
            <li>Imported users are assigned the <strong>Developer</strong> role by default (you can change this later)</li>
            <li>Users can change their password after first login</li>
          </ul>

        </Section>
        )}

        <Section title="16. FAQ & Troubleshooting">
          <div style={{display:'flex',flexDirection:'column',gap:12,fontSize:11}}>
            <Qa q="Why can't I click 'Launch'?" a={"Only Admin, PM, or Team Lead can launch a project. If you don't see the button or it's grayed out, your role doesn't have permission. Contact your PM."} />
            <Qa q="The project is stuck in Development. Why won't it move to Testing?" a={"Check that: All tasks are marked \"Done\" (not \"In Review\" or \"In Progress\"), All sprints are marked \"Completed\", There are no open blockers."} />
            <Qa q="I marked my task as Done but the project didn't advance." a="The system checks ALL tasks across ALL sprints. If even one task is not Done, the project stays in Development." />
            <Qa q="Can I undo a status change?" a="Only Admin, PM, or Team Lead can manually override status backward. Regular users cannot undo auto-transitions." />
            <Qa q="What happens if a test case fails?" a="The system automatically creates a Bug task, links it to the failed test, and notifies the developer who built that feature." />
            <Qa q="I uploaded a file but my teammate can't see it." a="Check that your teammate has at least Viewer access to the project. Also verify the file is attached to a task or test case they can access." />
            <Qa q="How do I change my role?" a="You cannot. Only an Admin can change user roles. Contact your system administrator." />
            <Qa q="What does &quot;6d overdue&quot; mean?" a="The project deadline has passed by 6 days. The PM and Team Lead are notified. Work should be prioritized to close the project." />
          </div>
        </Section>

        <Section title="14. Calendar">
          <p style={{fontSize:11}}>The Calendar page gives you a month-view of all your team's important dates — tasks, sprints, project deadlines, milestones, events, and reminders — all in one place.</p>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>What You See</h4>
          <InfoTable rows={[
            ['Item','Color','Description'],
            ['Tasks','🟡 Yellow','Task deadlines pulled from all projects'],
            ['Sprints','🟢 Green','Sprint start and end dates'],
            ['Deadlines','🔴 Red','Project final delivery deadlines'],
            ['Milestones','🔵 Blue','Key project milestones'],
            ['Events','🟣 Purple','Custom events added via the calendar'],
            ['Reminders','🟠 Orange','Manual reminders for reviews & meetings'],
          ]} />

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>How to Use</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>Navigate between months using the ← → arrows</li>
            <li>Each day shows dots or indicators for items due that day</li>
            <li>Click <strong>"Add Event"</strong> to create a custom calendar event or reminder</li>
            <li>Events can optionally create a <strong>Microsoft Teams meeting</strong> — toggle "Create Teams Meeting" and enter the meeting link</li>
            <li>Reminders can be set for review calls directly from the <strong>Review</strong> tab in a project's detail page</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Access</h4>
          <p style={{fontSize:11}}>The Calendar is available from the sidebar under <strong>Workspace → Execution → Calendar</strong>. It is visible to all roles.</p>
        </Section>

        <Section title="15. Project Relay">
          <p style={{fontSize:11}}>Project Relay lets you chain projects in ordered pipelines. When one project is delivered, the next project's team is automatically notified — perfect for workflows where projects depend on each other.</p>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Key Concepts</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>A <strong>Chain</strong> is a named sequence of projects in a specific order</li>
            <li>Chains are standalone entities — they don't modify the original projects</li>
            <li>Both <strong>linear</strong> (1→2→3) and <strong>branching</strong> (1→[2,3]) chains are supported</li>
            <li>When a project's phase changes to <strong>Delivered</strong>, the system sends a notification to members of the next project in the chain</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Who Can Create & Manage Chains</h4>
          <InfoTable rows={[
            ['Role','Create','Edit','Delete'],
            ['Admin','✅','✅','✅'],
            ['Project Manager','✅','✅','✅'],
            ['Team Lead','✅','✅','❌'],
            ['Manager','✅','✅','❌'],
            ['Others','❌','❌','❌'],
          ]} />

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Chain Status & Visuals</h4>
          <ul style={{margin:0,paddingLeft:16,fontSize:11,lineHeight:1.7}}>
            <li>Each project in the chain shows its current phase (e.g., Development, Delivered)</li>
            <li>Delivered projects appear with a <strong>green background</strong></li>
            <li>When <strong>all</strong> projects in a chain are delivered, the chain card shows a green left border and a <strong>✓ Completed</strong> badge</li>
            <li>The completion count (e.g., <strong>3/3 projects done</strong>) is shown on every chain card</li>
            <li>Edit/Delete buttons are hidden once the chain is fully completed</li>
          </ul>

          <h4 style={{margin:'12px 0 6px',fontSize:11,color:'#111827'}}>Accessing Project Relay</h4>
          <p style={{fontSize:11}}>Go to <strong>Workspace → Project Relay</strong> from the sidebar. From there you can view all chains, create new ones, and click into any chain to see its pipeline visualization. Each chain is also visible from its member projects' <strong>Relay</strong> tab in the project detail page.</p>
        </Section>

        <Section title="System Administrator Contact">
          <p style={{fontSize:11}}>
            If you encounter issues not covered in this guide:<br />
            System Admin: <a href="mailto:Consult@360DMMC.com">Consult@360DMMC.com</a><br />
            Support Hours: Sunday–Thursday, 9:00 AM – 6:00 PM<br />
            Emergency: Use the 🚨 "Escalate" button in the top navigation
          </p>
        </Section>

        <Section title="Version History">
          <InfoTable rows={[
            ['Version','Date','Changes'],
            ['1.1','June 2026','Added Microsoft 365 user import guide for admins'],
            ['1.2','June 2026','Added 5 project types with type-specific lifecycle phases'],
            ['1.3','June 2026','Added Report Generation feature (admin + client PDF reports)'],
            ['1.4','June 2026','Added Review tab with call scheduler; enhanced notifications with 3-tab layout; project phase change alerts'],
            ['1.5','June 2026','Added Calendar page with color-coded tasks, sprints, deadlines, milestones, events, and reminders'],
            ['1.6','June 2026','Added Project Relay — chain projects in ordered pipelines with delivery notifications'],
            ['1.7','June 2026','Added dedicated Calendar (11) and Project Relay (12) sections to the guide; updated checklist with relay item'],
            ['2.0','June 2026','🧬 Added WorkDNA — Company Brain: Decision Journal, Project Déjà Vu, Pattern Detection, Invisible Work Map. New WorkDNA page under Insights. Added to Landing page and Onboarding guide as section 10.'],
            ['2.1','June 2026','🤖 Added AI Roadmap section to Onboarding (section 11). Created stub AI provider + embeddings services. Ready for API key activation.'],
          ]} />
        </Section>
      </div>

      <div ref={footerRef} style={{textAlign:'center',marginTop:24,paddingTop:16,borderTop:'0.5px solid #e5e7eb'}}>
        {acknowledged ? (
          <span style={{fontSize:12,color:'#22c55e',fontWeight:600}}>✅ You have acknowledged this guide</span>
        ) : allChecked && reachedBottom ? (
          <button onClick={handleAcknowledge} className="btn btn-blue" style={{fontSize:11,padding:'8px 20px'}}>
            ✅ I Acknowledge and Agree
          </button>
        ) : (
          <span style={{fontSize:11,color:'#9ca3af'}}>
            {!allChecked ? '☑️ Check all items in the checklist above first' : '📖 Scroll down to reach the bottom'}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{background:'white',borderRadius:9,border:'0.5px solid #e5e7eb',padding:'14px 16px'}}>
      <h3 style={{fontSize:13,fontWeight:700,color:'#111827',margin:'0 0 8px'}}>{title}</h3>
      {children}
    </div>
  );
}

function InfoTable({ rows }) {
  return (
    <div style={{overflow:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{borderBottom:'0.5px solid #f3f4f6'}}>
              {row.map((cell, j) => (
                <td key={j} style={{padding:'5px 8px',fontWeight:j === 0 ? 600 : 400,color:j === 0 ? '#111827' : '#6b7280',whiteSpace: j === 0 ? 'nowrap' : undefined,verticalAlign:'top'}}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Qa({ q, a }) {
  return (
    <div>
      <p style={{fontWeight:600,color:'#111827',margin:'0 0 2px'}}>Q: {q}</p>
      <p style={{color:'#6b7280',margin:0}}>A: {a}</p>
    </div>
  );
}


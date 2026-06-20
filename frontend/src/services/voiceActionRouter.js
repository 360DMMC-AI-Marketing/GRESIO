import { matchAction, getActionsForPage } from '../data/voiceActions';

function getCurrentPage() {
  const path = window.location.pathname;
  if (path === '/' || path === '/dashboard') return 'dashboard';
  if (path === '/users' || path.startsWith('/users')) return 'users';
  if (path.startsWith('/projects/')) return 'projectDetail';
  if (path === '/projects' || path.startsWith('/projects?')) return 'projects';
  if (path === '/sprints' || path.startsWith('/sprints')) return 'sprints';
  if (path === '/tasks' || path.startsWith('/tasks')) return 'tasks';
  if (path === '/my-tasks' || path === '/my-tasks/') return 'myTasks';
  if (path === '/analytics' || path.startsWith('/analytics')) return 'analytics';
  if (path === '/calendar' || path.startsWith('/calendar')) return 'calendar';
  if (path === '/admin' || path.startsWith('/admin')) return 'admin';
  if (path === '/settings' || path.startsWith('/settings')) return 'settings';
  return 'dashboard';
}

function findElementByVoice(name) {
  return document.querySelector(`[data-voice="${name}"]`);
}

function executeClickAction(payload) {
  const el = findElementByVoice(payload);
  if (el) { el.click(); return { success: true, message: `Clicked ${payload}` }; }
  return { success: false, message: `Could not find ${payload}` };
}

function executeNavigateAction(payload) {
  if (typeof payload === 'number') {
    window.history.go(payload);
  } else {
    window.location.href = payload;
  }
  return { success: true, message: `Navigating to ${payload}` };
}

function executeRefreshAction() {
  window.location.reload();
  return { success: true, message: 'Refreshing page' };
}

function executeScrollAction(payload) {
  const amount = payload === 'down' ? 400 : -400;
  window.scrollBy({ top: amount, behavior: 'smooth' });
  return { success: true, message: `Scrolled ${payload}` };
}

// Normalize text: strip filler phrases, fix common typos, remove repeated chars
function normalizeText(text) {
  let t = text.toLowerCase().trim();
  // Remove filler phrases
  t = t.replace(/^(i want to|i would like to|i need to|please|can you|could you|help me|make it)\s*/i, '');
  t = t.replace(/\b(please|thanks)\s*$/i, '');
  // Remove repeated characters (typos like "prroject" -> "project")
  t = t.replace(/(\w)\1{2,}/g, '$1$1');
  // Remove trailing/extra spaces
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// Common typo corrections
const TYPO_MAP = {
  'prroject': 'project', 'projject': 'project', 'projetc': 'project',
  'dashbaord': 'dashboard', 'dashbard': 'dashboard',
  'settigns': 'settings', 'setings': 'settings', 'settngs': 'settings',
  'anlytics': 'analytics', 'analylitcs': 'analytics', 'analitics': 'analytics',
  'calender': 'calendar', 'calandar': 'calendar', 'calender': 'calendar',
  'sprrint': 'sprint', 'sprnt': 'sprint', 'sprin': 'sprint',
  'deparment': 'department', 'departmnet': 'department', 'deprtment': 'department',
  'memeber': 'member', 'memmber': 'member',
  'notificaiton': 'notification', 'notifcation': 'notification', 'notificaion': 'notification',
  'overviwe': 'overview', 'overveiw': 'overview',
  'analysi': 'analytics', 'analys': 'analytics',
  'gresio': 'gresio', 'greesio': 'gresio', 'greshio': 'gresio', 'gressio': 'gresio', 'gremio': 'gresio',
};

function fixTypos(text) {
  let t = text;
  for (const [wrong, correct] of Object.entries(TYPO_MAP)) {
    t = t.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), correct);
  }
  return t;
}

// Fuzzy match: normalizes text + fixes typos + strips filler, then re-tries matching
function fuzzyMatch(text, page) {
  const cleaned = fixTypos(normalizeText(text));
  if (cleaned === text.toLowerCase().trim()) return null;
  const result = matchAction(cleaned, page);
  if (result.action !== 'ai') return result;
  return null;
}

// Build a prompt describing available commands for the AI agent
function buildAiPrompt(text, page) {
  const currentActions = getActionsForPage(page);
  const cmds = currentActions
    .filter(a => a.match)
    .map(a => a.match.toString())
    .slice(0, 15);
  return JSON.stringify({
    command: text,
    context: `User is on ${page} page. Available voice commands include patterns like: ${cmds.join(', ')}`,
    instruction: 'The user may have typos or unclear phrasing. Infer their intent and respond with the most likely command or a helpful suggestion.',
  });
}

function executeAiAction(text) {
  const { pathname } = window.location;
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;

  const page = getCurrentPage();

  if (projectId) {
    fetch('/api/ai/chat/' + projectId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gresio_token') },
      body: buildAiPrompt(text, page),
    }).then(r => r.json()).then(data => {
      const msg = data.reply || data.message || 'No response';
      window.dispatchEvent(new CustomEvent('voice-ai-response', { detail: msg }));
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('voice-ai-response', { detail: 'AI service unavailable' }));
    });
  } else {
    fetch('/api/ai-agent/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gresio_token') },
      body: buildAiPrompt(text, page),
    }).then(r => r.json()).then(data => {
      const msg = data.message || data.result || JSON.stringify(data);
      window.dispatchEvent(new CustomEvent('voice-ai-response', { detail: msg }));
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('voice-ai-response', { detail: 'AI service unavailable' }));
    });
  }

  return { success: true, message: 'Processing...', isAi: true };
}

const ALL_PAGES = ['dashboard', 'users', 'projectDetail', 'projects', 'sprints', 'tasks', 'myTasks', 'analytics', 'calendar', 'admin', 'settings'];

const PAGE_PATHS = {
  dashboard: '/',
  users: '/users',
  projects: '/projects',
  projectDetail: window?.location?.pathname || '',
  sprints: '/sprints',
  tasks: '/tasks',
  myTasks: '/my-tasks',
  analytics: '/analytics',
  calendar: '/calendar',
  admin: '/admin',
  settings: '/settings',
};

export default function executeCommand(text) {
  const page = getCurrentPage();

  // Try exact match on current page
  let action = matchAction(text, page);

  // If no match, try fuzzy matching (normalize + fix typos)
  if (action.action === 'ai') {
    const fuzzy = fuzzyMatch(text, page);
    if (fuzzy) action = fuzzy;
  }

  // If still no match, try ALL other pages (exact then fuzzy)
  if (action.action === 'ai') {
    for (const p of ALL_PAGES) {
      if (p === page) continue;
      let a = matchAction(text, p);
      if (a.action === 'ai') {
        const f = fuzzyMatch(text, p);
        if (f) a = f;
      }
      if (a.action !== 'ai') {
        const targetPath = PAGE_PATHS[p];
        if (targetPath && window.location.pathname !== targetPath) {
          sessionStorage.setItem('voice_pending', JSON.stringify({ command: text }));
          window.location.href = targetPath;
          return { success: true, message: 'Navigating...', stopListening: true };
        }
        action = a;
        break;
      }
    }
  }

  switch (action.action) {
    case 'click':
      return executeClickAction(action.payload);
    case 'navigate':
      return executeNavigateAction(action.payload);
    case 'refresh':
      return executeRefreshAction();
    case 'scroll':
      return executeScrollAction(action.payload);
    case 'stop':
      return { success: true, message: '', stopListening: true };
    default:
      return executeAiAction(text);
  }
}

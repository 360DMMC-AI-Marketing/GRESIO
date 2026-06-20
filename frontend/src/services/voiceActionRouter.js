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

// -------------------------------------------------- //
//  SMARTER TEXT UNDERSTANDING (like a human assistant) //
// -------------------------------------------------- //

// 1. Remove filler noise — phrases people say but don't mean
function stripNoise(text) {
  let t = text.toLowerCase().trim();
  t = t.replace(/^(i (want to|would like to|need to|wanna|gonna)|please|can you|could you|help me|make it|i'd like to|i'm trying to|i am trying to|would you|will you|do this|do that)\s*/i, '');
  t = t.replace(/\b(please|thanks|thank you|thx|pls|plz)\s*$/i, '');
  return t;
}

// 2. Fix phonetic/accent transcriptions — map how people SAY words to how they're spelled
const PHONETIC_MAP = [
  // "vocier/vociere/vocie" → "voice"
  { from: /\bvoci(?:er|ere|e|al|ce)?\b/gi, to: 'voice' },
  // "dispare/disapear/disapeer" → "disappear"
  { from: /\bdis(?:apear|apeer|apare|paer|pere)\b/gi, to: 'disappear' },
  // "disactivation/desactivation" → "deactivation"
  { from: /\b(?:dis|des)activat(?:ion|e|ing)\b/gi, to: 'deactivation' },
  // "wint" → "won't"
  { from: /\bwint\b/gi, to: "won't" },
  // "poop up" → "pop up"
  { from: /\bpoop\s*up\b/gi, to: 'pop up' },
  // "clver/clevar/clevver" → "clever"
  { from: /\bcl(?:e|a)v(?:er|ar|ver|var)\b/gi, to: 'clever' },
  // "yu/ou" → "you"
  { from: /\b(?:yu|ou|yuo|u)\b/gi, to: 'you' },
  // "wt/wh" → "what"
  { from: /\b(?:wt|waht|whta|whta)\b/gi, to: 'what' },
  // "teh" → "the"
  { from: /\bteh\b/gi, to: 'the' },
  // "wierd" → "weird"
  { from: /\bwierd\b/gi, to: 'weird' },
  // "dont" → "don't"
  { from: /\bdont\b/gi, to: "don't" },
  // "doesnt" → "doesn't"
  { from: /\bdoesnt\b/gi, to: "doesn't" },
  // "isnt" → "isn't"
  { from: /\bisnt\b/gi, to: "isn't" },
  // "wont" → "won't"
  { from: /\bwont\b/gi, to: "won't" },
  // "cann/ccan" → "can"
  { from: /\b(?:ccan|cann|caan)\b/gi, to: 'can' },
  // "wanna" → "want to"
  { from: /\bwanna\b/gi, to: 'want to' },
  // "gonna" → "going to"
  { from: /\bgonna\b/gi, to: 'going to' },
  // "gimme" → "give me"
  { from: /\bgimme\b/gi, to: 'give me' },
  // "hezar" → "hear"
  { from: /\bhezar\b/gi, to: 'hear' },
  // "prbelm" → "problem"
  { from: /\bprbelm\b/gi, to: 'problem' },
  // "maek" → "make"
  { from: /\bmaek\b/gi, to: 'make' },
  // "thsoen" → "those"
  { from: /\bthsoen\b/gi, to: 'those' },
  // "tjhem" → "them"
  { from: /\btjhem\b/gi, to: 'them' },
  // "foirst" → "first"
  { from: /\bfoirst\b/gi, to: 'first' },
  // "doen" → "done"
  { from: /\bdoen\b/gi, to: 'done' },
  // "likc" → "like" / "lick" → "like" / "likc" → "like"
  { from: /\blik[ck]\b/gi, to: 'like' },
  // "clcik" → "click"
  { from: /\bclcik\b/gi, to: 'click' },
  // "manully" → "manually"
  { from: /\bmanull[ey]\b/gi, to: 'manually' },
  // "seolon" → "so only"
  { from: /\bseolon\b/gi, to: 'so only' },
  // "nwço" → "now"
  { from: /\bnw[çc]o?\b/gi, to: 'now' },
  // "e cna" → "I can"
  { from: /\be\s+cna\b/gi, to: 'I can' },
  // "cna" → "can"
  { from: /\bcna\b/gi, to: 'can' },
  // "wha(t" → "what"
  { from: /\bwha\(?\b/gi, to: 'what' },
  // "ir" → "it" (when likely a typo for "it")
  { from: /\b(?:irt|iit|ti)\b/gi, to: 'it' },
  // "annd" → "and"
  { from: /\bannd\b/gi, to: 'and' },
  // "typpe/typing/typngh" → "type/typing"
  { from: /\btyp(?:e|ing|ngh|ng)\b/gi, to: 'typing' },
  // "liem" → "like"
  { from: /\bliem\b/gi, to: 'like' },
  // "hçma" → "hmm"
  { from: /\bh[çc]ma\b/gi, to: 'hmm' },
  // "promtou" → "prompt to"
  { from: /\bpromtou?\b/gi, to: 'prompt to' },
  // "iodreea" → "idea"
  { from: /\biodre+a\b/gi, to: 'idea' },
  // "oerk" → "work"
  { from: /\boerk\b/gi, to: 'work' },
  // "fveryone" → "everyone"
  { from: /\bfver(?:yone|y|)\b/gi, to: 'everyone' },
  // "separet" → "separate"
  { from: /\bsepar(?:et|ret|ate|etly)\b/gi, to: 'separate' },
  // "whaty" → "what"
  { from: /\bwhaty\b/gi, to: 'what' },
];

function fixPhonetic(text) {
  let t = text;
  for (const rule of PHONETIC_MAP) {
    t = t.replace(rule.from, rule.to);
  }
  return t;
}

// 3. Common spelling corrections (word-level)
const SPELLING_MAP = {
  'project': 'project', 'projet': 'project', 'proj': 'project',
  'dashboard': 'dashboard', 'dashbord': 'dashboard', 'dash': 'dashboard',
  'settings': 'settings', 'setting': 'settings', 'seting': 'settings',
  'analytics': 'analytics', 'analytic': 'analytics', 'analitics': 'analytics',
  'calendar': 'calendar', 'calandar': 'calendar', 'calender': 'calendar',
  'sprint': 'sprint', 'sprnt': 'sprint',
  'department': 'department', 'departmnt': 'department', 'dept': 'department',
  'member': 'member', 'memmber': 'member', 'mbr': 'member',
  'notification': 'notification', 'notif': 'notification',
  'overview': 'overview', 'overviw': 'overview', 'ovrw': 'overview',
  'separate': 'separate', 'seprate': 'separate', 'seperate': 'separate',
  'create': 'create', 'creat': 'create', 'cretae': 'create', 'crate': 'create',
  'generate': 'generate', 'genrate': 'generate', 'gen': 'generate',
  'customize': 'customize', 'customise': 'customize', 'custm': 'customize',
  'refresh': 'refresh', 'refres': 'refresh', 'rfsh': 'refresh',
  'invite': 'invite', 'invit': 'invite', 'invte': 'invite',
  'remove': 'remove', 'remov': 'remove', 'rm': 'remove',
  'manage': 'manage', 'manag': 'manage', 'mng': 'manage',
  'report': 'report', 'repot': 'report', 'rprt': 'report',
  'submit': 'submit', 'subit': 'submit', 'sbmt': 'submit',
  'activate': 'activate', 'activ': 'activate', 'actv': 'activate',
  'deactivate': 'deactivate', 'deactiv': 'deactivate',
  'disappear': 'disappear', 'disapear': 'disappear',
  'listening': 'listening', 'listn': 'listening', 'lstn': 'listening',
  'recognition': 'recognition', 'recog': 'recognition',
  'activation': 'activation', 'activtion': 'activation',
  'deactivation': 'deactivation', 'desactivation': 'deactivation',
  'command': 'command', 'comand': 'command', 'cmnd': 'command',
  'execute': 'execute', 'execut': 'execute', 'exe': 'execute',
  'button': 'button', 'buton': 'button', 'btn': 'button',
  'voice': 'voice', 'voce': 'voice', 'voci': 'voice', 'voic': 'voice',
  'chat': 'chat', 'chta': 'chat', 'chatt': 'chat',
  'bot': 'bot', 'bott': 'bot', 'bote': 'bot',
  'popup': 'popup', 'pop up': 'popup', 'pop': 'popup',
  'clever': 'clever', 'clevr': 'clever',
  'understand': 'understand', 'undrstnd': 'understand', 'undrstand': 'understand',
  'problem': 'problem', 'prob': 'problem', 'prblm': 'problem',
  'working': 'working', 'workng': 'working', 'wrkng': 'working',
  'normal': 'normal', 'norml': 'normal', 'nrml': 'normal',
  'typing': 'typing', 'typ': 'typing',
  'click': 'click', 'clic': 'click', 'clcik': 'click',
  'tab': 'tab', 'tabe': 'tab', 'tb': 'tab',
  'view': 'view', 'viw': 'view', 'vw': 'view',
  'sync': 'sync', 'synk': 'sync', 'sinc': 'sync',
  'outlook': 'outlook', 'outlk': 'outlook', 'otlk': 'outlook',
  'github': 'github', 'githb': 'github', 'gthb': 'github',
  'admin': 'admin', 'adm': 'admin', 'admn': 'admin',
  'users': 'users', 'user': 'users', 'usrs': 'users',
  'task': 'task', 'tsk': 'task', 'tks': 'task',
  'sprint': 'sprint', 'spr': 'sprint', 'sprnt': 'sprint',
  'profile': 'profile', 'prof': 'profile', 'profl': 'profile',
  'password': 'password', 'passwd': 'password', 'pwd': 'password',
  'login': 'login', 'log in': 'login', 'log': 'login',
  'register': 'register', 'reg': 'register', 'rgstr': 'register',
  'search': 'search', 'serch': 'search', 'srch': 'search',
  'filter': 'filter', 'filtr': 'filter', 'flt': 'filter',
  'sort': 'sort', 'srt': 'sort',
  'upload': 'upload', 'upld': 'upload', 'uplod': 'upload',
  'download': 'download', 'dwnld': 'download', 'dnld': 'download',
  'delete': 'delete', 'del': 'delete', 'dlt': 'delete',
  'edit': 'edit', 'edt': 'edit', 'edite': 'edit',
  'update': 'update', 'upd': 'update', 'updt': 'update',
  'save': 'save', 'sav': 'save', 'sve': 'save',
  'cancel': 'cancel', 'cncl': 'cancel', 'cancle': 'cancel',
  'confirm': 'confirm', 'confrm': 'confirm', 'cnfrm': 'confirm',
  'close': 'close', 'clse': 'close', 'cls': 'close',
  'open': 'open', 'opn': 'open', 'opne': 'open',
  'back': 'back', 'bak': 'back', 'bck': 'back',
  'home': 'home', 'hom': 'home', 'hm': 'home',
  'help': 'help', 'hlp': 'help', 'halp': 'help',
};

function fixSpelling(text) {
  let t = text;
  const words = t.split(/\s+/);
  const corrected = words.map(w => {
    const clean = w.replace(/[^a-zA-Z']/g, '');
    if (!clean) return w;
    const lower = clean.toLowerCase();
    if (SPELLING_MAP[lower]) {
      return w.replace(clean, SPELLING_MAP[lower]);
    }
    return w;
  });
  return corrected.join(' ');
}

// 4. Remove repeated characters (typo like "prroject" → "project")
function dedupeChars(text) {
  return text.replace(/(\w)\1{2,}/g, '$1$1');
}

// 5. Full normalization pipeline
function fullyNormalize(text) {
  let t = text;
  t = stripNoise(t);
  t = fixPhonetic(t);
  t = fixSpelling(t);
  t = dedupeChars(t);
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// 6. Extract intent keywords from text
const INTENT_KEYWORDS = {
  navigate: [
    'go to', 'open', 'navigate', 'show me', 'take me', 'visit', 'launch', 'switch to',
    'move to', 'head to', 'view page', 'see',
  ],
  click: [
    'click', 'tap', 'press', 'hit', 'select', 'choose', 'pick', 'toggle',
    'activate', 'enable', 'disable', 'turn on', 'turn off',
  ],
  create: [
    'create', 'new', 'make', 'add', 'build', 'generate', 'start',
  ],
  view: [
    'view', 'show', 'display', 'see', 'look', 'open', 'preview',
  ],
  filter: [
    'filter', 'sort', 'find', 'search', 'show only', 'list',
  ],
};

function extractIntent(text) {
  const t = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (t.includes(kw)) return intent;
    }
  }
  return null;
}

// 7. Find closest action by keyword scoring across all pages
function findBestAction(text, page) {
  const t = text.toLowerCase();
  const words = t.split(/\s+/).filter(w => w.length > 2);

  const allPages = ['dashboard', 'users', 'projectDetail', 'projects', 'sprints', 'tasks', 'myTasks', 'analytics', 'calendar', 'admin', 'settings'];

  let bestAction = null;
  let bestScore = 0;
  let bestPage = page;

  for (const p of allPages) {
    const actions = getActionsForPage(p);
    for (const action of actions) {
      if (!action.match) continue;
      let score = 0;
      const pattern = action.match.source || action.match.toString();
      const patternLower = pattern.toLowerCase();

      // Score 1: word overlap between input and pattern
      for (const word of words) {
        if (patternLower.includes(word)) score += 2;
        // Partial match (prefix/suffix)
        for (const pw of patternLower.split(/\W+/)) {
          if (pw.length > 3 && (pw.startsWith(word) || word.startsWith(pw))) score += 1;
        }
      }

      // Score 2: high-value keywords get extra points
      const actionKeywords = ['project', 'task', 'dashboard', 'member', 'department',
        'report', 'sprint', 'calendar', 'analytics', 'user', 'setting', 'notification',
        'profile', 'team', 'admin', 'tab', 'filter', 'create', 'invite', 'sync',
        'outlook', 'github', 'generate', 'customize', 'remove', 'close', 'add',
        'scroll', 'refresh', 'back', 'home', 'sleep', 'stop', 'listening',
      ];
      for (const kw of actionKeywords) {
        if (t.includes(kw)) {
          if (patternLower.includes(kw)) score += 3;
          // Word boundary match
          if (new RegExp('\\b' + kw + '\\b', 'i').test(patternLower)) score += 2;
        }
      }

      // Score 3: intent match
      const intent = extractIntent(text);
      if (intent) {
        if (patternLower.includes(intent)) score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
        bestPage = p;
      }
    }
  }

  return { action: bestAction, score: bestScore, page: bestPage };
}

// 8. Smart AI prompt that tells the model to infer intent
function buildSmartPrompt(text, page, closestHint) {
  const actions = getActionsForPage(page);
  const cmdList = actions
    .filter(a => a.match)
    .map(a => {
      const s = a.match.toString();
      return s.substring(0, s.indexOf('=>') > 0 ? s.indexOf('=>') : 80);
    })
    .slice(0, 20);
  const hint = closestHint ? `\nClosest match found: "${closestHint.action.match}". Score: ${closestHint.score}/100.` : '';

  return JSON.stringify({
    user_said: text,
    context: `User is on the "${page}" page.`,
    available_commands: cmdList.join('\n'),
    hint: hint || 'No command matched exactly.',
    instructions: [
      'You are a smart project management assistant for GRESIO.',
      'The user may have typos, heavy accents, or unclear phrasing.',
      'UNDERSTAND what they MEAN, not just what they SAY.',
      'If their intent is clear, respond with the action you think they want.',
      'If unsure, ask ONE clarifying question with options.',
      'When you understand, say something like: "I think you want to [action]. Say yes to proceed."',
      'Be helpful, concise, and proactive.',
    ].join(' '),
  });
}

function executeAiAction(text) {
  const { pathname } = window.location;
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;
  const page = getCurrentPage();

  const normalized = fullyNormalize(text);
  const closest = findBestAction(text, page);

  const body = buildSmartPrompt(text, page, closest.score > 0 ? closest : null);

  if (projectId) {
    fetch('/api/ai/chat/' + projectId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gresio_token') },
      body,
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
      body,
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

  // Step 1: Exact match on current page
  let action = matchAction(text, page);

  // Step 2: Full normalization + re-try on current page
  if (action.action === 'ai') {
    const normalized = fullyNormalize(text);
    if (normalized !== text.toLowerCase().trim()) {
      action = matchAction(normalized, page);
    }
  }

  // Step 3: Smart keyword scoring on all pages
  if (action.action === 'ai') {
    const best = findBestAction(text, page);
    if (best.score >= 6 && best.action) {
      // High confidence — use it
      if (best.page !== page) {
        const targetPath = PAGE_PATHS[best.page];
        if (targetPath && window.location.pathname !== targetPath) {
          sessionStorage.setItem('voice_pending', JSON.stringify({ command: text }));
          window.location.href = targetPath;
          return { success: true, message: 'Navigating...', stopListening: true };
        }
      }
      action = best.action;
    } else if (best.score >= 3 && best.action) {
      // Medium confidence — try normalized match on the best page
      const normalized = fullyNormalize(text);
      let a = matchAction(normalized, best.page);
      if (a.action === 'ai') a = best.action;
      if (a.action !== 'ai') {
        if (best.page !== page) {
          const targetPath = PAGE_PATHS[best.page];
          if (targetPath && window.location.pathname !== targetPath) {
            sessionStorage.setItem('voice_pending', JSON.stringify({ command: text }));
            window.location.href = targetPath;
            return { success: true, message: 'Navigating...', stopListening: true };
          }
        }
        action = a;
      }
    }
  }

  // Step 4: Fallback — try all pages (original + normalized)
  if (action.action === 'ai') {
    for (const p of ALL_PAGES) {
      if (p === page) continue;
      let a = matchAction(text, p);
      if (a.action === 'ai') {
        const normalized = fullyNormalize(text);
        if (normalized !== text.toLowerCase().trim()) {
          a = matchAction(normalized, p);
        }
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

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
  if (path === '/work-logs' || path.startsWith('/work-logs')) return 'workLogs';
  if (path === '/test-cases' || path.startsWith('/test-cases')) return 'testCases';

  if (path === '/onboarding-guide' || path.startsWith('/onboarding-guide')) return 'onboardingGuide';
  if (path === '/reports' || path.startsWith('/reports')) return 'reports';
  if (path.match(/^\/projects\/[^/]+\/reports\/edit/)) return 'reportEdit';
  if (path === '/profile' || path.startsWith('/profile')) return 'profile';
  if (path === '/github' || path.startsWith('/github')) return 'github';
  if (path === '/teams' || path.startsWith('/teams')) return 'teams';
  if (path === '/outlook' || path.startsWith('/outlook')) return 'outlook';
  if (path === '/work-dna' || path.startsWith('/work-dna')) return 'workDna';
  if (path === '/templates/create') return 'createTemplate';
  if (path.startsWith('/templates/')) return 'templateDetail';
  if (path === '/templates' || path.startsWith('/templates?')) return 'templateMarketplace';
  if (path === '/super/dashboard' || path.startsWith('/super/dashboard')) return 'superDashboard';
  if (path === '/super/companies' || path.startsWith('/super/companies?')) return 'superCompanies';
  if (path.startsWith('/super/companies/')) return 'superCompanyDetail';
  if (path === '/super/admins' || path.startsWith('/super/admins')) return 'superAdmins';
  if (path === '/super/analytics' || path.startsWith('/super/analytics')) return 'superAnalytics';
  if (path === '/super/health' || path.startsWith('/super/health')) return 'superHealth';
  if (path === '/super/notifications' || path.startsWith('/super/notifications')) return 'superNotifications';
  if (path === '/super/profile' || path.startsWith('/super/profile')) return 'superProfile';
  if (path === '/super/settings' || path.startsWith('/super/settings')) return 'superSettings';
  return 'dashboard';
}

function findElementByVoice(name) {
  let el = document.querySelector(`[data-voice="${name}"]`);
  if (el) return el;
  // Fallback: search by placeholder text
  el = document.querySelector(`input[placeholder="${name}"], textarea[placeholder="${name}"]`);
  if (el) return el;
  // Fallback: search by associated label text
  const label = document.querySelector(`label`);
  if (label && label.textContent.trim().toLowerCase() === name.toLowerCase()) {
    const id = label.getAttribute('for');
    if (id) return document.getElementById(id);
    const parent = label.parentElement;
    if (parent) return parent.querySelector('input, textarea, select');
  }
  // Try partial placeholder match
  el = document.querySelector(`input[placeholder*="${name}" i], textarea[placeholder*="${name}" i]`);
  return el || null;
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

function executeFocusAction(payload) {
  const el = findElementByVoice(payload);
  if (el) { el.focus(); return { success: true, message: `Focused ${payload}` }; }
  return { success: false, message: `Could not find ${payload}` };
}

function executeFillAction(payload, groups) {
  const el = findElementByVoice(payload);
  if (!el) return { success: false, message: `Could not find ${payload}` };
  // Extract value from command — groups[1] is the captured value
  const value = (groups && groups[1]) ? groups[1].trim() : '';
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true, message: `Set "${value}"` };
  }
  return { success: false, message: 'Element is not an input' };
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
  { from: /\bvoci(?:er|ere|e|al|ce|s)?\b/gi, to: 'voice' },
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
  { from: /\b(?:wt|waht|whta|whta|whhat)\b/gi, to: 'what' },
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
  { from: /\b(?:ccan|cann|caan|kann)\b/gi, to: 'can' },
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
  // "maek/mk" → "make"
  { from: /\b(?:maek|mak|mke)\b/gi, to: 'make' },
  // "thsoen" → "those"
  { from: /\bthsoen\b/gi, to: 'those' },
  // "tjhem" → "them"
  { from: /\btjhem\b/gi, to: 'them' },
  // "foirst" → "first"
  { from: /\bfoirst\b/gi, to: 'first' },
  // "doen" → "done"
  { from: /\bdoen\b/gi, to: 'done' },
  // "lidk/likc" → "like"
  { from: /\bl(?:ik[ck]|idk|iek)\b/gi, to: 'like' },
  // "clcik" → "click"
  { from: /\b(?:clcik|clik|klick|klic)\b/gi, to: 'click' },
  // "manully" → "manually"
  { from: /\bmanull[ey]\b/gi, to: 'manually' },
  // "seolon" → "so only"
  { from: /\bseolon\b/gi, to: 'so only' },
  // "nwço" → "now"
  { from: /\b(?:nw[çc]o?|no[w])\b/gi, to: 'now' },
  // "e cna" → "I can"
  { from: /\be\s+cna\b/gi, to: 'I can' },
  // "cna" → "can"
  { from: /\bcna\b/gi, to: 'can' },
  // "wha(t" → "what"
  { from: /\bwha\(?\b/gi, to: 'what' },
  // "ir" → "it"
  { from: /\b(?:irt|iit|ti)\b/gi, to: 'it' },
  // "annd" → "and"
  { from: /\b(?:annd|adn|nd)\b/gi, to: 'and' },
  // "typpe/typing/typngh" → "type/typing"
  { from: /\btyp(?:e|ing|ngh|ng)\b/gi, to: 'typing' },
  // "hçma/hmm" → "hmm"
  { from: /\bh[çc]ma\b/gi, to: 'hmm' },
  // "promtou" → "prompt to"
  { from: /\bpromtou?\b/gi, to: 'prompt to' },
  // "iodreea" → "idea"
  { from: /\b(?:iodre+a|idear)\b/gi, to: 'idea' },
  // "oerk/wrok" → "work"
  { from: /\b(?:oerk|wrok|wrk)\b/gi, to: 'work' },
  // "fveryone" → "everyone"
  { from: /\b(?:fver(?:yone|y)|everione)\b/gi, to: 'everyone' },
  // "separet" → "separate"
  { from: /\bsepar(?:et|ret|ate|etly)\b/gi, to: 'separate' },
  // "whaty" → "what"
  { from: /\bwhaty\b/gi, to: 'what' },
  // --- NEW: Project management speech fixes ---
  // "projeck/projec/projet" → "project"
  { from: /\bproj(?:eck|ec|et|ct)\b/gi, to: 'project' },
  // "dasboard/dashbord" → "dashboard"
  { from: /\bd(?:asboard|ashbord|eshboard)\b/gi, to: 'dashboard' },
  // "calender/calandar/calendr" → "calendar"
  { from: /\bcal(?:ender|andar|endr|ender)\b/gi, to: 'calendar' },
  // "analytics/analitics" → "analytics"
  { from: /\banal(?:ytics|itics|ysis)\b/gi, to: 'analytics' },
  // "sprint/sprnt" → "sprint"
  { from: /\bspr(?:int|nt|ent|rint)\b/gi, to: 'sprint' },
  // "setting/seting/settng" → "settings"
  { from: /\bs(?:etting|eting|ettng|eting)\b/gi, to: 'settings' },
  // "profile/profil/profiel" → "profile"
  { from: /\bpro(?:file|fil|fiel|phile)\b/gi, to: 'profile' },
  // "member/memmber" → "member"
  { from: /\bm(?:ember|emmber|eber)\b/gi, to: 'member' },
  // "department/dept" → "department"
  { from: /\bd(?:epartment|ept|epartmnt)\b/gi, to: 'department' },
  // "asign/assigne" → "assign"
  { from: /\b(?:asign|assigne|asin)\b/gi, to: 'assign' },
  // "task/tsk" → "task"
  { from: /\bt(?:ask|sk|aks)\b/gi, to: 'task' },
  // "notification/notif" → "notification"
  { from: /\b(?:notif(?:ication)?|notfication)\b/gi, to: 'notification' },
  // "overview/overviw" → "overview"
  { from: /\bover(?:view|viw|vew)\b/gi, to: 'overview' },
  // "create/creat/cretae" → "create"
  { from: /\b(?:creat|cretae|crate|kreate)\b/gi, to: 'create' },
  // "generate/genrate" → "generate"
  { from: /\b(?:generate|genrate|gen)\b/gi, to: 'generate' },
  // "filter/filtr" → "filter"
  { from: /\bf(?:ilter|iltr|lter)\b/gi, to: 'filter' },
  // "search/serch" → "search"
  { from: /\b(?:serch|sarch|searsh)\b/gi, to: 'search' },
  // "refresh/refres" → "refresh"
  { from: /\br(?:efresh|efres|fesh)\b/gi, to: 'refresh' },
  // "template/templat" → "template"
  { from: /\bt(?:emplate|emplat|amplat)\b/gi, to: 'template' },
  // "assignee/asignee" → "assignee"
  { from: /\b(?:assignee|asignee|assigne)\b/gi, to: 'assignee' },
  // "deadline/deadlne" → "deadline"
  { from: /\bdead(?:line|lne|lin)\b/gi, to: 'deadline' },
  // "priority/priorit" → "priority"
  { from: /\bpriori(?:ty|t|te)\b/gi, to: 'priority' },
  // "comment/coment" → "comment"
  { from: /\bc(?:omment|oment|omme)\b/gi, to: 'comment' },
  // "submit/subit" → "submit"
  { from: /\b(?:submit|subit|sbmt)\b/gi, to: 'submit' },
  // "invite/invit" → "invite"
  { from: /\bin(?:vite|vit|vte)\b/gi, to: 'invite' },
  // --- NEW: Common misrecognitions from speech ---
  // "for" → "four" (but keep as "for" if context)
  // "to" → "two" / "too"
  { from: /\btwo\s+(?:project|task|sprint)\b/gi, to: 'to $&' },
  // "a new" → slipped "a" before everything
  // "i want" / "i need" / "i would like" are stripped by stripNoise already
  // "pleace/pls/plz" → stripped by stripNoise
  // "creaction" → "creation"
  { from: /\bcreaction\b/gi, to: 'creation' },
  // "delett" → "delete"
  { from: /\bdelet(?:e|t|ting)\b/gi, to: 'delete' },
  // "mouve" → "move"
  { from: /\bm(?:ouve|uve|oove)\b/gi, to: 'move' },
  // "reop" → "report"
  { from: /\bre(?:op|port|po)\b/gi, to: 'report' },
  // "descro" → "description"
  { from: /\bdesc(?:ro|ription|rip)\b/gi, to: 'description' },
  // "stauts" → "status"
  { from: /\bst(?:auts|atus|tus)\b/gi, to: 'status' },
  // "assigne" → "assigned"
  { from: /\bassign(?:e|ed|ing)\b/gi, to: 'assigned' },
  // "compleet" → "complete"
  { from: /\bcomple(?:et|te|t)\b/gi, to: 'complete' },
  // "progress/progres" → "progress"
  { from: /\bpro(?:gress|gres)\b/gi, to: 'progress' },
  // "overdue/overdue" → "overdue"
  { from: /\bover(?:due|du|dew)\b/gi, to: 'overdue' },
  // "blocker/blockr" → "blocker"
  { from: /\bblock(?:er|r|ed|ing)\b/gi, to: 'blocked' },
  // "shedjule" → "schedule"
  { from: /\bs(?:chedule|hedjule|kedjule)\b/gi, to: 'schedule' },
  // "collab" → "collaboration"
  { from: /\bcollab(?:oration|orat|)\b/gi, to: 'collaboration' },
  // "feedbak" → "feedback"
  { from: /\bfeed(?:back|bak|bac)\b/gi, to: 'feedback' },
  // "resouse" → "resource"
  { from: /\bres(?:ource|ouse|ouce)\b/gi, to: 'resource' },
  // "delivry" → "delivery"
  { from: /\bdeliv(?:ery|ry|er)\b/gi, to: 'delivery' },
  // "relase" → "release"
  { from: /\bre(?:lease|lese|las)\b/gi, to: 'release' },
  // "deply" → "deploy"
  { from: /\bdep(?:loy|ly|pley)\b/gi, to: 'deploy' },
  // "integraion" → "integration"
  { from: /\bintegra(?:tion|ion)\b/gi, to: 'integration' },
  // "authntication" → "authentication"
  { from: /\bauth(?:entication|ntication)\b/gi, to: 'authentication' },
  // "dashbord" → "dashboard" (repeated for emphasis)
  { from: /\bdash\s*b[o0]rd\b/gi, to: 'dashboard' },
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

  const allPages = ALL_PAGES;

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
    context: `User is on the "${page}" page. URL: ${window.location.href}`,
    available_commands: cmdList.join('\n'),
    hint: hint || 'No command matched exactly.',
    instructions: [
      'You are GRESIO AI — a command execution engine. Your ONLY job is to do EXACTLY what the user asked. Do NOT add extra steps.',
      '',
      'CRITICAL RULE: ONLY do what the user literally said. Nothing more.',
      '  BAD: User says "go to projects" → AI navigates AND shows project details',
      '  GOOD: User says "go to projects" → AI only navigates to /projects',
      '',
      '🔹 ACTION EXECUTION:',
      'If the user asks you to DO something, respond with ACTION: lines.',
      '  ACTION: navigate /projects',
      '  ACTION: click new-project',
      '  ACTION: fill field-name "the value"',
      '  ACTION: focus element-name',
      '',
      'Examples:',
      '  User: "go to projects"',
      '  AI: ACTION: navigate /projects',
      '      Going to projects.',
      '',
      '  User: "create a project called testing"',
      '  AI: ACTION: navigate /projects',
      '      ACTION: click new-project',
      '      ACTION: fill field-name "testing"',
      '      Done.',
      '',
      '  User: "what is this app"',
      '  AI: This is GRESIO - a project management platform.',
      '',
      '  User: "go to calendar"',
      '  AI: ACTION: navigate /calendar',
      '',
      '  User: "show my tasks"',
      '  AI: ACTION: navigate /tasks',
      '',
      'Rules:',
      '- ONLY respond with ACTION: lines if the user ASKED for an action',
      '- If the user just asked a question, answer it directly — do NOT take actions',
      '- NEVER add extra actions the user did not ask for',
      '- If you cannot do exactly what was asked, say what is missing in one sentence',
      '- Do NOT suggest follow-up actions unless the user asks "what next?"',
    ].join('\n'),
  });
}

function executeActionFromLine(line) {
  const trimmed = line.trim();
  const navMatch = trimmed.match(/^navigate\s+(.+)/i);
  if (navMatch) return executeNavigateAction(navMatch[1].trim());
  const clickMatch = trimmed.match(/^click\s+(.+)/i);
  if (clickMatch) return executeClickAction(clickMatch[1].trim());
  const fillMatch = trimmed.match(/^fill\s+(\S+)\s+"(.+)"$/i);
  if (fillMatch) {
    const groups = [null, null, fillMatch[2]];
    return executeFillAction(fillMatch[1], groups);
  }
  const focusMatch = trimmed.match(/^focus\s+(.+)/i);
  if (focusMatch) return executeFocusAction(focusMatch[1].trim());
  const scrollMatch = trimmed.match(/^scroll\s+(up|down)/i);
  if (scrollMatch) return executeScrollAction(scrollMatch[1]);
  const refreshMatch = trimmed.match(/^refresh/i);
  if (refreshMatch) return executeRefreshAction();
  return null;
}

function processAiReply(reply) {
  const lines = reply.split('\n');
  const actionLines = [];
  const messageLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('ACTION:')) {
      actionLines.push(trimmed.replace(/^ACTION:\s*/i, ''));
    } else {
      messageLines.push(line);
    }
  }
  // Execute all action lines sequentially
  let lastResult = null;
  for (const actionLine of actionLines) {
    lastResult = executeActionFromLine(actionLine);
    if (lastResult && lastResult.stopListening) break;
  }
  const message = messageLines.join('\n').trim();
  return { message: message || (lastResult ? lastResult.message : 'Done'), success: lastResult ? lastResult.success !== false : true, stopListening: lastResult ? lastResult.stopListening : false };
}

function getChatHistory() {
  try {
    const stored = sessionStorage.getItem('gresio_chat_history');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function appendChatHistory(entry) {
  try {
    const history = getChatHistory();
    history.push(entry);
    if (history.length > 50) history.splice(0, history.length - 50);
    sessionStorage.setItem('gresio_chat_history', JSON.stringify(history));
  } catch {}
}

function getPageContext() {
  return {
    page: getCurrentPage(),
    url: window.location.href,
    pathname: window.location.pathname,
  };
}

function executeAiAction(text) {
  const { pathname } = window.location;
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;
  const page = getCurrentPage();

  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gresio_token') },
  };

  const dispatchResponse = (detail) => {
    window.dispatchEvent(new CustomEvent('voice-ai-response', { detail }));
  };

  // Step 1: Try action execution via /api/ai-agent/command
  fetch('/api/ai-agent/command', {
    ...fetchOptions,
    body: JSON.stringify({
      command: text,
      projectId: projectId || undefined,
      page,
    }),
  }).then(r => r.json()).then(data => {
    if (data.success) {
      appendChatHistory({ role: 'user', content: text });
      appendChatHistory({ role: 'assistant', content: data.message, metadata: { action: true, entities: data.entities, navigateTo: data.navigateTo } });

      // Navigate if requested
      if (data.navigateTo && window.location.pathname !== data.navigateTo) {
        dispatchResponse({ message: data.message || 'Done', success: true, isAi: true, action: true });
        if (data.navigateTo !== -1) {
          setTimeout(() => { window.location.href = data.navigateTo; }, 400);
        } else {
          window.history.back();
        }
        return;
      }

      dispatchResponse({ message: data.message || 'Done', success: true, isAi: true, action: true });
      return;
    }

    // Command failed or unknown — fall back to conversational chat
    fallbackToChat(text, projectId, page, fetchOptions, dispatchResponse);
  }).catch(() => {
    // Network error — fall back to chat
    fallbackToChat(text, projectId, page, fetchOptions, dispatchResponse);
  });

  return { success: true, message: 'Processing...', isAi: true };
}

function fallbackToChat(text, projectId, page, fetchOptions, dispatchResponse) {
  const history = getChatHistory();
  const context = getPageContext();

  if (projectId) {
    // Project-specific chat
    fetch('/api/ai/chat/' + projectId, {
      ...fetchOptions,
      body: JSON.stringify({
        message: text,
        page: context.page,
        url: context.url,
        history: history.slice(-10),
      }),
    }).then(r => r.json()).then(data => {
      const msg = data.reply || data.message || '';
      appendChatHistory({ role: 'user', content: text });
      if (msg) appendChatHistory({ role: 'assistant', content: msg });

      const result = processAiReply(msg);
      dispatchResponse({ message: result.message || msg, success: result.success, isAi: true });
    }).catch(() => {
      dispatchResponse({ message: 'AI service unavailable.', success: false, isAi: true });
    });
  } else {
    // App-wide chat
    fetch('/api/ai-agent/chat', {
      ...fetchOptions,
      body: JSON.stringify({
        message: text,
        page: context.page,
        url: context.url,
        history: history.slice(-10),
      }),
    }).then(r => r.json()).then(data => {
      let msg = data.reply || data.message || '';
      appendChatHistory({ role: 'user', content: text });
      if (msg) appendChatHistory({ role: 'assistant', content: msg });

      const navMatch = msg.match(/NAVIGATE:\s*(\/\S*)/i);
      if (navMatch) {
        const path = navMatch[1];
        msg = msg.replace(/NAVIGATE:\s*\/\S*/i, '').trim();
        dispatchResponse({ message: msg || 'Navigating...', success: true, isAi: true });
        if (window.location.pathname !== path) {
          setTimeout(() => { window.location.href = path; }, 500);
        }
      } else {
        dispatchResponse({ message: msg || 'Got it. What else?', success: true, isAi: true });
      }
    }).catch(() => {
      dispatchResponse({ message: 'AI service unavailable.', success: false, isAi: true });
    });
  }
}

const ALL_PAGES = [
  'dashboard', 'users', 'projectDetail', 'projects', 'sprints', 'tasks', 'myTasks',
  'analytics', 'calendar', 'admin', 'workLogs', 'testCases', 'projectRelay',
  'onboardingGuide', 'reports', 'reportEdit', 'profile', 'github', 'teams', 'outlook',
  'workDna', 'templateMarketplace', 'templateDetail', 'createTemplate',
  'superDashboard', 'superCompanies', 'superCompanyDetail', 'superAdmins',
  'superAnalytics', 'superHealth', 'superNotifications', 'superProfile', 'superSettings',
];

const PAGE_PATHS = {
  dashboard: '/dashboard',
  users: '/users',
  projects: '/projects',
  projectDetail: window?.location?.pathname || '',
  sprints: '/sprints',
  tasks: '/tasks',
  myTasks: '/my-tasks',
  analytics: '/analytics',
  calendar: '/calendar',
  admin: '/admin',
  workLogs: '/work-logs',
  testCases: '/test-cases',

  onboardingGuide: '/onboarding-guide',
  reports: '/reports',
  reportEdit: '/reports',
  profile: '/profile',
  github: '/github',
  teams: '/teams',
  outlook: '/outlook',
  workDna: '/work-dna',
  templateMarketplace: '/templates',
  templateDetail: '/templates',
  createTemplate: '/templates/create',
  superDashboard: '/super/dashboard',
  superCompanies: '/super/companies',
  superCompanyDetail: '/super/companies',
  superAdmins: '/super/admins',
  superAnalytics: '/super/analytics',
  superHealth: '/super/health',
  superNotifications: '/super/notifications',
  superProfile: '/super/profile',
  superSettings: '/super/settings',
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
    case 'focus':
      return executeFocusAction(action.payload);
    case 'fill':
      return executeFillAction(action.payload, action.groups);
    case 'stop':
      return { success: true, message: '', stopListening: true };
    default:
      return executeAiAction(text);
  }
}

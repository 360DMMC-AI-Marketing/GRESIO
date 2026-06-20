import { matchAction } from '../data/voiceActions';

function getCurrentPage() {
  const path = window.location.pathname;
  if (path === '/' || path === '/dashboard') return 'dashboard';
  if (path === '/users' || path.startsWith('/users')) return 'users';
  if (path.startsWith('/projects/')) return 'projectDetail';
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

function executeAiAction(text) {
  const { pathname } = window.location;
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;

  if (projectId) {
    fetch('/api/ai/chat/' + projectId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gresio_token') },
      body: JSON.stringify({ message: text }),
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
      body: JSON.stringify({ command: text }),
    }).then(r => r.json()).then(data => {
      const msg = data.message || data.result || JSON.stringify(data);
      window.dispatchEvent(new CustomEvent('voice-ai-response', { detail: msg }));
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('voice-ai-response', { detail: 'AI service unavailable' }));
    });
  }

  return { success: true, message: 'Processing...', isAi: true };
}

export default function executeCommand(text) {
  const page = getCurrentPage();

  // Try current page first
  let action = matchAction(text, page);

  // If not found and falls to 'ai', try ALL other pages
  if (action.action === 'ai') {
    const allPages = ['dashboard', 'users', 'projectDetail'];
    for (const p of allPages) {
      if (p === page) continue;
      const a = matchAction(text, p);
      if (a.action !== 'ai') {
        // Found on another page — navigate there first
        const pagePaths = { dashboard: '/', users: '/users', projectDetail: window.location.pathname };
        if (pagePaths[p] && window.location.pathname !== pagePaths[p]) {
          window.location.href = pagePaths[p];
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

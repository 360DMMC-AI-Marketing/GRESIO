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
    const a = document.createElement('a');
    a.href = payload;
    a.click();
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
  const { origin, pathname } = window.location;
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;

  if (projectId) {
    fetch(`/api/ai/chat/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      body: JSON.stringify({ message: text }),
    }).catch(() => {});
  } else {
    fetch('/api/ai-agent/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gresio_token')}` },
      body: JSON.stringify({ command: text }),
    }).catch(() => {});
  }

  return { success: true, message: 'Sent to AI' };
}

export default function executeCommand(text) {
  const page = getCurrentPage();
  const action = matchAction(text, page);

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

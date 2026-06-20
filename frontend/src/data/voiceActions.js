const VOICE_ACTIONS = {
  dashboard: [
    { match: /go\s*to\s*team/i, action: 'navigate', payload: '/users' },
    { match: /go\s*to\s*project/i, action: 'navigate', payload: '/projects' },
    { match: /go\s*to\s*setting/i, action: 'navigate', payload: '/settings' },
    { match: /go\s*to\s*task/i, action: 'navigate', payload: '/my-tasks' },
    { match: /go\s*to\s*analytics/i, action: 'navigate', payload: '/analytics' },
    { match: /show\s*metric/i, action: 'click', payload: 'show-metrics' },
    { match: /show\s*chart/i, action: 'click', payload: 'show-charts' },
  ],

  users: [
    { match: /create\s*department/i, action: 'click', payload: 'create-department' },
    { match: /invite/i, action: 'click', payload: 'invite-member' },
    { match: /go\s*to\s*dashboard/i, action: 'navigate', payload: '/' },
    { match: /go\s*to\s*project/i, action: 'navigate', payload: '/projects' },
  ],

  projectDetail: [
    { match: /add\s*member/i, action: 'click', payload: 'add-member' },
    { match: /create\s*department/i, action: 'click', payload: 'create-department' },
    { match: /go\s*to\s*overview/i, action: 'click', payload: 'tab-overview' },
    { match: /view\s*task/i, action: 'click', payload: 'tab-tasks' },
    { match: /view\s*bug/i, action: 'click', payload: 'tab-bugs' },
    { match: /view\s*test/i, action: 'click', payload: 'tab-test-cases' },
    { match: /view\s*team/i, action: 'click', payload: 'tab-team' },
    { match: /view\s*sprint/i, action: 'click', payload: 'tab-sprints' },
    { match: /view\s*review/i, action: 'click', payload: 'tab-review' },
    { match: /view\s*resource/i, action: 'click', payload: 'tab-resources' },
    { match: /view\s*setting/i, action: 'click', payload: 'tab-settings' },
    { match: /new\s*sprint/i, action: 'click', payload: 'new-sprint' },
    { match: /new\s*test/i, action: 'click', payload: 'new-test-case' },
    { match: /remove\s*member/i, action: 'click', payload: 'remove-member' },
    { match: /close\s*panel/i, action: 'click', payload: 'close-panel' },
    { match: /go\s*to\s*dashboard/i, action: 'navigate', payload: '/' },
  ],

  global: [
    { match: /go\s*to\s*home/i, action: 'navigate', payload: '/' },
    { match: /go\s*back/i, action: 'navigate', payload: -1 },
    { match: /refresh/i, action: 'refresh', payload: null },
    { match: /scroll\s*down/i, action: 'scroll', payload: 'down' },
    { match: /scroll\s*up/i, action: 'scroll', payload: 'up' },
    { match: /stop\s*listening/i, action: 'stop', payload: null },
    { match: /go\s*to\s*sleep/i, action: 'stop', payload: null },
  ],
};

export function getActionsForPage(page) {
  const pageActions = VOICE_ACTIONS[page] || [];
  return [...pageActions, ...VOICE_ACTIONS.global];
}

export function matchAction(text, page) {
  const actions = getActionsForPage(page);
  for (const action of actions) {
    if (action.match.test(text)) {
      return action;
    }
  }
  return { match: null, action: 'ai', payload: text };
}

export default VOICE_ACTIONS;

function p(pattern) {
  const parts = [pattern];
  // Replace \s* with more flexible patterns for common variations
  let expanded = pattern.source.replace(/\\s\*/g, '\\s*');
  // Add "a" and "the" variations: "create department" ~ "create a department"
  expanded = expanded.replace(/create\\s\*/g, 'create\\s*(?:a\\s*|the\\s*)?');
  expanded = expanded.replace(/new\\s\*/g, '(?:new|create)\\s*');
  expanded = expanded.replace(/generate\\s\*/g, 'generate\\s*(?:a\\s*)?');
  return new RegExp(expanded, 'i');
}

const VOICE_ACTIONS = {
  dashboard: [
    { match: p(/go\s*to\s*team/i), action: 'navigate', payload: '/users' },
    { match: /go\s*to\s*project/i, action: 'navigate', payload: '/projects' },
    { match: p(/go\s*to\s*setting/i), action: 'navigate', payload: '/settings' },
    { match: p(/go\s*to\s*task/i), action: 'navigate', payload: '/my-tasks' },
    { match: p(/go\s*to\s*analytics/i), action: 'navigate', payload: '/analytics' },
    { match: p(/show\s*metric/i), action: 'click', payload: 'show-metrics' },
    { match: p(/show\s*chart/i), action: 'click', payload: 'show-charts' },
    { match: p(/go\s*to\s*calendar/i), action: 'navigate', payload: '/calendar' },
    { match: p(/go\s*to\s*sprint/i), action: 'navigate', payload: '/sprints' },
    { match: p(/go\s*to\s*admin/i), action: 'navigate', payload: '/admin' },
  ],

  users: [
    { match: p(/create\s*department/i), action: 'click', payload: 'create-department' },
    { match: /invite/i, action: 'click', payload: 'invite-member' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*project/i), action: 'navigate', payload: '/projects' },
    { match: p(/go\s*to\s*setting/i), action: 'navigate', payload: '/settings' },
  ],

  projectDetail: [
    { match: p(/add\s*member/i), action: 'click', payload: 'add-member' },
    { match: p(/create\s*department/i), action: 'click', payload: 'create-department' },
    { match: p(/go\s*to\s*overview/i), action: 'click', payload: 'tab-overview' },
    { match: p(/view\s*task/i), action: 'click', payload: 'tab-tasks' },
    { match: p(/view\s*bug/i), action: 'click', payload: 'tab-bugs' },
    { match: p(/view\s*test/i), action: 'click', payload: 'tab-test-cases' },
    { match: p(/view\s*team/i), action: 'click', payload: 'tab-team' },
    { match: p(/view\s*sprint/i), action: 'click', payload: 'tab-sprints' },
    { match: p(/view\s*review/i), action: 'click', payload: 'tab-review' },
    { match: p(/view\s*resource/i), action: 'click', payload: 'tab-resources' },
    { match: p(/view\s*setting/i), action: 'click', payload: 'tab-settings' },
    { match: p(/new\s*sprint/i), action: 'click', payload: 'new-sprint' },
    { match: p(/new\s*test/i), action: 'click', payload: 'new-test-case' },
    { match: p(/remove\s*member/i), action: 'click', payload: 'remove-member' },
    { match: p(/close\s*panel/i), action: 'click', payload: 'close-panel' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  projects: [
    { match: p(/create\s*new\s*project/i), action: 'click', payload: 'new-project' },
    { match: p(/new\s*project/i), action: 'click', payload: 'new-project' },
    { match: p(/generate\s*report/i), action: 'click', payload: 'generate-report' },
    { match: p(/customize\s*report/i), action: 'click', payload: 'customize-report' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*setting/i), action: 'navigate', payload: '/settings' },
  ],

  sprints: [
    { match: p(/add\s*task/i), action: 'click', payload: 'add-task' },
    { match: p(/create\s*task/i), action: 'click', payload: 'create-task' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*project/i), action: 'navigate', payload: '/projects' },
  ],

  tasks: [
    { match: p(/add\s*separate\s*task/i), action: 'click', payload: 'add-separate-task' },
    { match: p(/create\s*task/i), action: 'click', payload: 'create-task-submit' },
    { match: p(/project\s*task/i), action: 'click', payload: 'tab-project-tasks' },
    { match: /separate\s*task/i, action: 'click', payload: 'tab-separate-tasks' },
    { match: p(/filter\s*(all|todo|in.progress|review|done|delayed)/i), action: 'click', payload: 'filter-$1' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  myTasks: [
    { match: /tasks\s*tab/i, action: 'click', payload: 'tab-tasks-view' },
    { match: p(/analytics\s*tab/i), action: 'click', payload: 'tab-analytics-view' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*task/i), action: 'navigate', payload: '/tasks' },
  ],

  analytics: [
    { match: p(/workload\s*overview/i), action: 'click', payload: 'tab-workload' },
    { match: p(/projects\s*tab/i), action: 'click', payload: 'tab-projects-analytics' },
    { match: p(/people\s*tab/i), action: 'click', payload: 'tab-people' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  calendar: [
    { match: p(/go\s*to\s*today/i), action: 'click', payload: 'today' },
    { match: p(/next\s*month/i), action: 'click', payload: 'next-month' },
    { match: p(/prev\s*month/i), action: 'click', payload: 'prev-month' },
    { match: p(/month\s*view/i), action: 'click', payload: 'tab-month' },
    { match: p(/agenda\s*view/i), action: 'click', payload: 'tab-agenda' },
    { match: p(/sync\s*outlook/i), action: 'click', payload: 'sync-outlook' },
    { match: p(/add\s*event/i), action: 'click', payload: 'add-event' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  admin: [
    { match: p(/generate\s*key/i), action: 'click', payload: 'generate-key' },
    { match: p(/import\s*user/i), action: 'click', payload: 'import-users' },
    { match: p(/sync\s*github/i), action: 'click', payload: 'sync-github' },
    { match: p(/sync\s*team/i), action: 'click', payload: 'sync-teams' },
    { match: p(/sync\s*outlook/i), action: 'click', payload: 'sync-outlook-admin' },
    { match: p(/upgrade\s*plan/i), action: 'click', payload: 'upgrade-plan' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  settings: [
    { match: p(/save\s*setting/i), action: 'click', payload: 'save-settings' },
    { match: /toggle\s*notification/i, action: 'click', payload: 'toggle-notifications' },
    { match: p(/toggle\s*alert/i), action: 'click', payload: 'toggle-alerts' },
    { match: p(/toggle\s*report/i), action: 'click', payload: 'toggle-weekly-report' },
    { match: p(/toggle\s*two.?factor/i), action: 'click', payload: 'toggle-two-factor' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  global: [
    { match: /go\s*to\s*home/i, action: 'navigate', payload: '/' },
    { match: /go\s*back/i, action: 'navigate', payload: -1 },
    { match: /refresh/i, action: 'refresh', payload: null },
    { match: /scroll\s*down/i, action: 'scroll', payload: 'down' },
    { match: /scroll\s*up/i, action: 'scroll', payload: 'up' },
    { match: /thank\s*you\s*gresio/i, action: 'stop', payload: null },
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

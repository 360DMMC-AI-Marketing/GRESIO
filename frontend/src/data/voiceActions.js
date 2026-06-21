function p(pattern) {
  let expanded = pattern.source.replace(/\\s\*/g, '\\s*');
  // Add "a"/"the" variations: "create department" ~ "create a department"
  expanded = expanded.replace(/create\\s\*/g, 'create\\s*(?:a\\s*|the\\s*)?');
  // "new project" ~ "create project" ~ "create a new project"
  expanded = expanded.replace(/new\\s\*/g, '(?:new|create)\\s*(?:a\\s*|the\\s*)?');
  expanded = expanded.replace(/generate\\s\*/g, 'generate\\s*(?:a\\s*)?');
  // "go to X" also matches "open X", "show X", "take me to X", "navigate to X", "head to X", "switch to X", "view X"
  expanded = expanded.replace(/go\\s\*to\\s\*/g, '(?:go\\s*to|open|show\\s*me|take\\s*me\\s*to|navigate\\s*to|head\\s*to|switch\\s*to|view|see)\\s*');
  return new RegExp(expanded, 'i');
}

const VOICE_ACTIONS = {
  dashboard: [
    { match: p(/go\s*to\s*team/i), action: 'navigate', payload: '/users' },
    { match: /go\s*to\s*project/i, action: 'navigate', payload: '/projects' },
    { match: p(/go\s*to\s*setting/i), action: 'navigate', payload: '/settings' },
    { match: p(/go\s*to\s*task/i), action: 'navigate', payload: '/my-tasks' },
    { match: p(/go\s*to\s*analytics/i), action: 'navigate', payload: '/analytics' },
    { match: p(/show\s*metric/i), action: 'click', payload: 'customize' },
    { match: p(/show\s*chart/i), action: 'click', payload: 'customize' },
    { match: p(/go\s*to\s*calendar/i), action: 'navigate', payload: '/calendar' },
    { match: p(/go\s*to\s*sprint/i), action: 'navigate', payload: '/sprints' },
    { match: p(/go\s*to\s*admin/i), action: 'navigate', payload: '/admin' },
    { match: p(/customize/i), action: 'click', payload: 'customize' },
    { match: p(/view\s*all\s*project/i), action: 'click', payload: 'view-all-projects' },
    { match: /manage/i, action: 'click', payload: 'manage' },
    { match: /refresh/i, action: 'click', payload: 'refresh-workload' },
    { match: /show\s*week/i, action: 'click', payload: 'view-weeks' },
    { match: /show\s*sprint/i, action: 'click', payload: 'view-sprints' },
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
    { match: /^sprint\s*name\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-sprint-name' },
    { match: /^sprint\s*goal\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-sprint-goal' },
    { match: /^task\s*title\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-task-title' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  projects: [
    { match: p(/create\s*new\s*project/i), action: 'click', payload: 'new-project' },
    { match: p(/new\s*project/i), action: 'click', payload: 'new-project' },
    { match: p(/submit\s*project/i), action: 'click', payload: 'create-project' },
    { match: p(/generate\s*report/i), action: 'click', payload: 'generate-report' },
    { match: p(/customize\s*report/i), action: 'click', payload: 'customize-report' },
    { match: /^(?:project\s*)?name\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-name' },
    { match: /^description\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-desc' },
    { match: /^client\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-client' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*setting/i), action: 'navigate', payload: '/settings' },
  ],

  sprints: [
    { match: p(/add\s*task/i), action: 'click', payload: 'add-task' },
    { match: p(/create\s*task/i), action: 'click', payload: 'create-task' },
    { match: /^title\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-title' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*project/i), action: 'navigate', payload: '/projects' },
  ],

  tasks: [
    { match: p(/add\s*separate\s*task/i), action: 'click', payload: 'add-separate-task' },
    { match: p(/create\s*task/i), action: 'click', payload: 'create-task-submit' },
    { match: p(/project\s*task/i), action: 'click', payload: 'tab-project-tasks' },
    { match: /separate\s*task/i, action: 'click', payload: 'tab-separate-tasks' },
    { match: /filter\s*all/i, action: 'click', payload: 'filter-all' },
    { match: /filter.*todo/i, action: 'click', payload: 'filter-todo' },
    { match: /filter.*progress/i, action: 'click', payload: 'filter-in_progress' },
    { match: /filter.*review/i, action: 'click', payload: 'filter-review' },
    { match: /filter.*done/i, action: 'click', payload: 'filter-done' },
    { match: /filter.*delay/i, action: 'click', payload: 'filter-delayed' },
    { match: /^title\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-title' },
    { match: /^task\s*desc(?:ription)?\s+(?:is\s+)?(.+)/i, action: 'fill', payload: 'field-desc' },
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
    { match: p(/projects\s*tab/i), action: 'click', payload: 'tab-projects' },
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
    { match: /toggle\s*notification/i, action: 'click', payload: 'toggle-emailNotifications' },
    { match: p(/toggle\s*alert/i), action: 'click', payload: 'toggle-systemAlerts' },
    { match: p(/toggle\s*report/i), action: 'click', payload: 'toggle-weeklyReport' },
    { match: p(/toggle\s*two.?factor/i), action: 'click', payload: 'toggle-two-factor' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  workLogs: [
    { match: p(/log\s*work/i), action: 'click', payload: 'log-work' },
    { match: p(/my\s*log/i), action: 'click', payload: 'tab-my-log' },
    { match: p(/history/i), action: 'click', payload: 'tab-history' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*task/i), action: 'navigate', payload: '/tasks' },
  ],

  testCases: [
    { match: p(/all\s*test/i), action: 'click', payload: 'tab-all' },
    { match: p(/auto\s*generated/i), action: 'click', payload: 'tab-auto' },
    { match: p(/flagged/i), action: 'click', payload: 'tab-flagged' },
    { match: p(/bug/i), action: 'click', payload: 'tab-bugs' },
    { match: p(/interest\s*config/i), action: 'click', payload: 'tab-config' },
    { match: p(/new\s*test\s*case/i), action: 'click', payload: 'new-test-case' },
    { match: p(/generate\s*from\s*task/i), action: 'click', payload: 'generate-tests' },
    { match: p(/generate\s*completed/i), action: 'click', payload: 'generate-completed' },
    { match: p(/run\s*filter/i), action: 'click', payload: 'run-filter' },
    { match: p(/save\s*config/i), action: 'click', payload: 'save-config' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  projectRelay: [
    { match: p(/new\s*chain/i), action: 'click', payload: 'new-chain' },
    { match: p(/create\s*chain/i), action: 'click', payload: 'create-chain' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*project/i), action: 'navigate', payload: '/projects' },
  ],

  onboardingGuide: [
    { match: p(/acknowledge/i), action: 'click', payload: 'acknowledge-guide' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  reports: [
    { match: p(/admin\s*report/i), action: 'click', payload: 'tab-admin-reports' },
    { match: p(/client\s*report/i), action: 'click', payload: 'tab-client-reports' },
    { match: p(/search\s*report/i), action: 'click', payload: 'search-reports' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*project/i), action: 'navigate', payload: '/projects' },
  ],

  reportEdit: [
    { match: p(/save\s*report/i), action: 'click', payload: 'save-report' },
    { match: p(/preview\s*report/i), action: 'click', payload: 'preview-report' },
    { match: p(/client\s*report/i), action: 'click', payload: 'type-client' },
    { match: p(/admin\s*report/i), action: 'click', payload: 'type-admin' },
    { match: p(/back\s*to\s*project/i), action: 'click', payload: 'back-project' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  profile: [
    { match: p(/save\s*profile/i), action: 'click', payload: 'save-profile' },
    { match: p(/change\s*password/i), action: 'click', payload: 'change-password' },
    { match: p(/enable\s*two.?factor/i), action: 'click', payload: 'enable-2fa' },
    { match: p(/disable\s*two.?factor/i), action: 'click', payload: 'disable-2fa' },
    { match: p(/upload\s*avatar/i), action: 'click', payload: 'upload-avatar' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  github: [
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*admin/i), action: 'navigate', payload: '/admin' },
  ],

  teams: [
    { match: p(/sync\s*now/i), action: 'click', payload: 'sync-teams' },
    { match: p(/go\s*to\s*admin/i), action: 'click', payload: 'go-admin-integrations' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  outlook: [
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*admin/i), action: 'navigate', payload: '/admin' },
  ],

  workDna: [
    { match: p(/monthly\s*analysis/i), action: 'click', payload: 'monthly-analysis' },
    { match: p(/project\s*archive/i), action: 'click', payload: 'tab-archive' },
    { match: p(/decision\s*journal/i), action: 'click', payload: 'tab-decisions' },
    { match: p(/deja\s*vu/i), action: 'click', payload: 'tab-dejavu' },
    { match: p(/search\s*deja\s*vu/i), action: 'click', payload: 'search-dejavu' },
    { match: p(/log\s*decision/i), action: 'click', payload: 'log-decision' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  templateMarketplace: [
    { match: p(/create\s*template/i), action: 'click', payload: 'create-template' },
    { match: p(/filter\s*type/i), action: 'click', payload: 'filter-type' },
    { match: p(/sort\s*by/i), action: 'click', payload: 'sort-by' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  templateDetail: [
    { match: p(/use\s*template/i), action: 'click', payload: 'use-template' },
    { match: p(/rate\s*template/i), action: 'click', payload: 'rate-template' },
    { match: p(/back\s*to\s*marketplace/i), action: 'click', payload: 'back-marketplace' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  createTemplate: [
    { match: p(/publish\s*template/i), action: 'click', payload: 'publish-template' },
    { match: p(/add\s*phase/i), action: 'click', payload: 'add-phase' },
    { match: p(/add\s*task/i), action: 'click', payload: 'add-task' },
    { match: p(/cancel/i), action: 'click', payload: 'cancel-create' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  superDashboard: [
    { match: p(/view\s*health/i), action: 'click', payload: 'view-health' },
    { match: p(/view\s*analytics/i), action: 'click', payload: 'view-analytics' },
    { match: p(/view\s*companies/i), action: 'click', payload: 'view-companies' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
  ],

  superCompanies: [
    { match: p(/add\s*company/i), action: 'click', payload: 'add-company' },
    { match: p(/create\s*company/i), action: 'click', payload: 'create-company' },
    { match: p(/search\s*company/i), action: 'click', payload: 'search-company' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superCompanyDetail: [
    { match: p(/overview\s*tab/i), action: 'click', payload: 'tab-overview' },
    { match: p(/projects\s*tab/i), action: 'click', payload: 'tab-projects' },
    { match: p(/users\s*tab/i), action: 'click', payload: 'tab-users' },
    { match: p(/back\s*to\s*companies/i), action: 'click', payload: 'back-companies' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superAdmins: [
    { match: p(/invite\s*admin/i), action: 'click', payload: 'invite-admin' },
    { match: p(/search\s*admin/i), action: 'click', payload: 'search-admin' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superAnalytics: [
    { match: p(/one\s*month/i), action: 'click', payload: 'period-1m' },
    { match: p(/six\s*month/i), action: 'click', payload: 'period-6m' },
    { match: p(/one\s*year/i), action: 'click', payload: 'period-1y' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superHealth: [
    { match: p(/refresh\s*health/i), action: 'click', payload: 'refresh-health' },
    { match: p(/check\s*health/i), action: 'click', payload: 'check-health' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superNotifications: [
    { match: p(/mark\s*all\s*read/i), action: 'click', payload: 'mark-all-read' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superProfile: [
    { match: p(/save\s*profile/i), action: 'click', payload: 'save-profile' },
    { match: p(/change\s*photo/i), action: 'click', payload: 'change-photo' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  superSettings: [
    { match: p(/save\s*setting/i), action: 'click', payload: 'save-settings' },
    { match: /toggle\s*notification/i, action: 'click', payload: 'toggle-emailNotifications' },
    { match: p(/toggle\s*alert/i), action: 'click', payload: 'toggle-systemAlerts' },
    { match: p(/toggle\s*report/i), action: 'click', payload: 'toggle-weeklyReport' },
    { match: p(/toggle\s*two.?factor/i), action: 'click', payload: 'toggle-two-factor' },
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/super/dashboard' },
  ],

  global: [
    { match: p(/open\s*chat/i), action: 'click', payload: 'open-chat' },
    { match: /go\s*to\s*home/i, action: 'navigate', payload: '/' },
    { match: /go\s*back/i, action: 'navigate', payload: -1 },
    { match: /go\s*forward/i, action: 'navigate', payload: 1 },
    { match: /refresh/i, action: 'refresh', payload: null },
    { match: /reload/i, action: 'refresh', payload: null },
    { match: /scroll\s*down/i, action: 'scroll', payload: 'down' },
    { match: /scroll\s*up/i, action: 'scroll', payload: 'up' },
    { match: /thank\s*you\s*gresio/i, action: 'stop', payload: null },
    { match: /stop\s*listening/i, action: 'stop', payload: null },
    { match: /go\s*to\s*sleep/i, action: 'stop', payload: null },
    { match: /shut\s*up/i, action: 'stop', payload: null },
    { match: /never\s*mind/i, action: 'stop', payload: null },
    { match: /cancel/i, action: 'stop', payload: null },
    // Navigation to every page — all use p() which now matches "go to", "open", "show me", "take me to", "navigate to", "head to", "switch to", "view"
    { match: p(/go\s*to\s*dashboard/i), action: 'navigate', payload: '/' },
    { match: p(/go\s*to\s*project/i), action: 'navigate', payload: '/projects' },
    { match: p(/go\s*to\s*task/i), action: 'navigate', payload: '/tasks' },
    { match: p(/go\s*to\s*my.?task/i), action: 'navigate', payload: '/my-tasks' },
    { match: p(/go\s*to\s*setting/i), action: 'navigate', payload: '/settings' },
    { match: p(/go\s*to\s*team/i), action: 'navigate', payload: '/users' },
    { match: p(/go\s*to\s*people/i), action: 'navigate', payload: '/users' },
    { match: p(/go\s*to\s*calendar/i), action: 'navigate', payload: '/calendar' },
    { match: p(/go\s*to\s*sprint/i), action: 'navigate', payload: '/sprints' },
    { match: p(/go\s*to\s*admin/i), action: 'navigate', payload: '/admin' },
    { match: p(/go\s*to\s*analytics/i), action: 'navigate', payload: '/analytics' },
    { match: p(/go\s*to\s*report/i), action: 'navigate', payload: '/reports' },
    { match: p(/go\s*to\s*profile/i), action: 'navigate', payload: '/profile' },
    { match: p(/go\s*to\s*work.?log/i), action: 'navigate', payload: '/work-logs' },
    { match: p(/go\s*to\s*test.?case/i), action: 'navigate', payload: '/test-cases' },
    { match: p(/go\s*to\s*relay/i), action: 'navigate', payload: '/project-relay' },
    { match: p(/go\s*to\s*guide/i), action: 'navigate', payload: '/onboarding-guide' },
    { match: p(/go\s*to\s*github/i), action: 'navigate', payload: '/github' },
    { match: p(/go\s*to\s*dna/i), action: 'navigate', payload: '/work-dna' },
    { match: p(/go\s*to\s*template/i), action: 'navigate', payload: '/template-marketplace' },
    { match: p(/go\s*to\s*super.?admin/i), action: 'navigate', payload: '/super/dashboard' },
    { match: p(/go\s*to\s*bug/i), action: 'navigate', payload: '/test-cases' },
    { match: p(/go\s*to\s*outlook/i), action: 'navigate', payload: '/outlook' },
    { match: p(/go\s*to\s*teams/i), action: 'navigate', payload: '/teams' },
    // Alias shortcuts
    { match: /(?:show|view)\s*dash/i, action: 'navigate', payload: '/' },
    { match: /(?:show|view)\s*project/i, action: 'navigate', payload: '/projects' },
    { match: /(?:show|view)\s*task/i, action: 'navigate', payload: '/tasks' },
    { match: /(?:show|view)\s*(?:my|assigned)\s*task/i, action: 'navigate', payload: '/my-tasks' },
    { match: /(?:show|view)\s*calendar/i, action: 'navigate', payload: '/calendar' },
    { match: /(?:show|view)\s*setting/i, action: 'navigate', payload: '/settings' },
    { match: /(?:show|view)\s*admin/i, action: 'navigate', payload: '/admin' },
    { match: /(?:show|view)\s*team/i, action: 'navigate', payload: '/users' },
    { match: /(?:show|view)\s*sprint/i, action: 'navigate', payload: '/sprints' },
    { match: /(?:show|view)\s*analytics/i, action: 'navigate', payload: '/analytics' },
    // Page-specific entry points
    { match: /take\s*me\s*to\s*dashboard/i, action: 'navigate', payload: '/' },
    { match: /take\s*me\s*to\s*project/i, action: 'navigate', payload: '/projects' },
    { match: /take\s*me\s*to\s*task/i, action: 'navigate', payload: '/tasks' },
    { match: /take\s*me\s*to\s*setting/i, action: 'navigate', payload: '/settings' },
  ],
};

export function getActionsForPage(page) {
  const pageActions = VOICE_ACTIONS[page] || [];
  return [...pageActions, ...VOICE_ACTIONS.global];
}

export function matchAction(text, page) {
  const actions = getActionsForPage(page);
  for (const action of actions) {
    const m = text.match(action.match);
    if (m) {
      return { match: action.match, action: action.action, payload: action.payload, groups: m };
    }
  }
  return { match: null, action: 'ai', payload: text, groups: null };
}

export default VOICE_ACTIONS;

import axios from 'axios';

function createAxios(baseURL) {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('gresio_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('gresio_token');
        localStorage.removeItem('gresio_user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
  );
  return instance;
}

const api = createAxios(import.meta.env.VITE_API_URL || '/api');
const superApi = axios.create({ baseURL: '' });
superApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('gresio_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
superApi.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gresio_token');
      localStorage.removeItem('gresio_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
  verify2fa: (data) => api.post('/auth/verify-2fa', data),
  setup2fa: () => api.post('/auth/setup-2fa'),
  enable2fa: (data) => api.post('/auth/enable-2fa', data),
  disable2fa: (data) => api.post('/auth/disable-2fa', data),
};

export const users = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getActivity: (id, params) => api.get(`/users/${id}/activity`, { params }),
  getCapacity: () => api.get('/users/capacity'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const projects = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  getAnalytics: (id) => api.get(`/projects/${id}/analytics`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  launch: (id) => api.patch(`/projects/${id}/launch`),
  deliver: (id, data) => api.patch(`/projects/${id}/deliver`, data),
  evaluatePhase: (id) => api.post(`/projects/${id}/evaluate-phase`),
  getResources: (id, params) => api.get(`/projects/${id}/resources`, { params }),
  addResource: (id, data) => api.post(`/projects/${id}/resources`, data),
  updateResource: (projectId, id, data) => api.patch(`/projects/${projectId}/resources/${id}`, data),
  deleteResource: (projectId, id) => api.delete(`/projects/${projectId}/resources/${id}`),
  getTeam: (id, params) => api.get(`/projects/${id}/team`, { params }),
  addTeamMember: (id, data) => api.post(`/projects/${id}/team`, data),
  updateTeamMember: (projectId, memberId, data) => api.patch(`/projects/${projectId}/team/${memberId}`, data),
  removeTeamMember: (projectId, memberId) => api.delete(`/projects/${projectId}/team/${memberId}`),
  getTeamForAssign: (id, params) => api.get(`/projects/${id}/team/assign`, { params }),
  getTeamGroups: (id) => api.get(`/projects/${id}/team/groups`),
  createTeamGroup: (id, data) => api.post(`/projects/${id}/team/groups`, data),
  updateTeamGroup: (projectId, groupId, data) => api.patch(`/projects/${projectId}/team/groups/${groupId}`, data),
  archiveTeamGroup: (projectId, groupId) => api.delete(`/projects/${projectId}/team/groups/${groupId}`),
  getSuggestedTeams: (id) => api.get(`/projects/${id}/team/suggested`),
  getGroupedMembers: (id, params) => api.get(`/projects/${id}/team/grouped`, { params }),
  getTeamAnalytics: (id) => api.get(`/projects/${id}/team/analytics`),
  getAllDomainTeamGroups: () => api.get('/projects/teams/grouped'),
  getSettings: (id) => api.get(`/projects/${id}/settings`),
  updateSettings: (id, data) => api.put(`/projects/${id}/settings`, data),
  createTeamsChannel: (id) => api.post(`/projects/${id}/teams-channel`),
  updateReviewCall: (id, data) => api.patch(`/projects/${id}/review-call`, data),
  deleteReviewCall: (id) => api.delete(`/projects/${id}/review-call`),
};

export const tasks = {
  getAll: (params) => api.get('/tasks', { params }),
  getSeparate: (params) => api.get('/tasks/separate', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  createSeparate: (data) => api.post('/tasks/separate', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  bulkUpdate: (data) => api.patch('/tasks/bulk', data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addSubtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
  updateSubtask: (id, subtaskId, data) => api.patch(`/tasks/${id}/subtasks/${subtaskId}`, data),
  deleteSubtask: (id, subtaskId) => api.delete(`/tasks/${id}/subtasks/${subtaskId}`),
  autoPrioritize: (id) => api.get(`/tasks/auto-prioritize/${id}`),
  getRiskForecast: () => api.get('/tasks/risk-forecast'),
};

export const analytics = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getProductivity: (params) => api.get('/analytics/productivity', { params }),
  getWorkload: () => api.get('/analytics/workload'),
  getPredictions: () => api.get('/analytics/predictions'),
  getCompany: () => api.get('/analytics/company'),
};

export const integrations = {
  getAll: () => api.get('/integrations'),
  update: (name, data) => api.patch(`/integrations/${name}`, data),
  sync: (name) => api.post(`/integrations/${name}/sync`),
  syncPlatform: (name, platform) => api.post(`/integrations/${name}/sync?platform=${platform}`),
  createMeeting: (data) => api.post('/integrations/create-meeting', data),
};

export const sprints = {
  getAll: (params) => api.get('/sprints', { params }),
  getById: (id) => api.get(`/sprints/${id}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.patch(`/sprints/${id}`, data),
  addTask: (id, taskId) => api.post(`/sprints/${id}/tasks`, { taskId }),
  removeTask: (id, taskId) => api.delete(`/sprints/${id}/tasks/${taskId}`),
  delete: (id) => api.delete(`/sprints/${id}`),
};

export const companies = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  updatePlan: (id, plan) => api.patch(`/companies/${id}/plan`, { plan }),
  importUsers: (id, data) => api.post(`/companies/${id}/import`, data),
  addWikiDepartment: (id, name) => api.patch(`/companies/${id}/wiki-department`, { name }),
};

export const notifications = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markUnread: (id) => api.patch(`/notifications/${id}/unread`),
  markAllRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  handleAction: (id, action) => api.post(`/notifications/${id}/action`, { action }),
  cleanupStale: () => api.post('/notifications/cleanup-stale'),
};

export const testing = {
  getAll: (params) => api.get('/testing', { params }),
  getById: (id) => api.get(`/testing/${id}`),
  create: (data) => api.post('/testing', data),
  update: (id, data) => api.patch(`/testing/${id}`, data),
  delete: (id) => api.delete(`/testing/${id}`),
  addAttachment: (id, formData) => api.post(`/testing/${id}/attachments`, formData),
  addComment: (id, data) => api.post(`/testing/${id}/comments`, data),
};

export const testCases = {
  getAll: (params) => api.get('/test-cases', { params }),
  getById: (id) => api.get(`/test-cases/${id}`),
  getStats: (projectId) => api.get(`/test-cases/stats/${projectId}`),
  getAutoGenerated: (projectId, params) => api.get(`/test-cases/auto-generated/${projectId || ''}`, { params }),
  create: (data) => api.post('/test-cases', data),
  update: (id, data) => api.patch(`/test-cases/${id}`, data),
  delete: (id) => api.delete(`/test-cases/${id}`),
  updateStep: (id, data) => api.patch(`/test-cases/${id}/step`, data),
  bulkGenerate: (data) => api.post('/test-cases/bulk-generate', data),
  autoGenerate: (data) => api.post('/test-cases/auto-generate', data),
  generateCompleted: (params) => api.post('/test-cases/generate-completed', null, { params }),
  execute: (id, data) => api.post(`/test-cases/${id}/execute`, data),
  retest: (id) => api.post(`/test-cases/${id}/retest`),
  uploadAttachment: (id, formData) => api.post(`/test-cases/${id}/attachments`, formData),
};

export const interests = {
  getProjectInterests: (projectId) => api.get(`/interests/project/${projectId}`),
  updateProjectInterests: (projectId, data) => api.put(`/interests/project/${projectId}`, data),
  runFilter: (projectId) => api.post(`/interests/project/${projectId}/filter`),
  getFlagged: (projectId) => api.get(`/interests/flagged/${projectId || ''}`),
  getStats: (projectId) => api.get(`/interests/stats/${projectId || ''}`),
  restoreFlagged: (id) => api.post(`/interests/flagged/${id}/restore`),
  restoreAllFlagged: () => api.post('/interests/flagged/restore-all'),
  deleteAllFlagged: () => api.delete('/interests/flagged'),
};

export const chains = {
  getAll: () => api.get('/chains'),
  getById: (id) => api.get(`/chains/${id}`),
  create: (data) => api.post('/chains', data),
  update: (id, data) => api.put(`/chains/${id}`, data),
  remove: (id) => api.delete(`/chains/${id}`),
};

export const bugs = {
  getAll: (params) => api.get('/bugs', { params }),
  getById: (id) => api.get(`/bugs/${id}`),
  getStats: (projectId) => api.get(`/bugs/stats/${projectId || ''}`),
  create: (data) => api.post('/bugs', data),
  update: (id, data) => api.patch(`/bugs/${id}`, data),
  resolve: (id, data) => api.post(`/bugs/${id}/resolve`, data),
  reopen: (id, data) => api.post(`/bugs/${id}/reopen`, data),
  triggerRetest: (id) => api.post(`/bugs/${id}/retest`),
};

export const myTasks = {
  getAll: () => api.get('/my-tasks'),
  getWidgets: () => api.get('/my-tasks/widgets'),
  getAnalytics: () => api.get('/my-tasks/analytics'),
};

export const workLogs = {
  getMyLogs: (params) => api.get('/work-logs/my', { params }),
  getTeamLogs: (params) => api.get('/work-logs/team', { params }),
  getHistory: (userId) => api.get(`/work-logs/history/${userId}`),
  create: (data) => api.post('/work-logs', data),
  update: (id, data) => api.patch(`/work-logs/${id}`, data),
  delete: (id) => api.delete(`/work-logs/${id}`),
};

export const calendarEvents = {
  getAll: (params) => api.get('/calendar', { params }),
  create: (data) => api.post('/calendar', data),
  update: (id, data) => api.patch(`/calendar/${id}`, data),
  delete: (id) => api.delete(`/calendar/${id}`),
};

export const aiBridge = {
  getPending: () => api.get('/ai-bridge/pending'),
  getHistory: () => api.get('/ai-bridge/history'),
  respond: (id, response) => api.post(`/ai-bridge/respond/${id}`, { response }),
};

export const workDna = {
  getDashboard: () => api.get('/work-dna/dashboard'),
  getDecisions: (params) => api.get('/work-dna/decisions', { params }),
  getDecisionTrail: (refType, refId) => api.get(`/work-dna/decisions/${refType}/${refId}`),
  createDecision: (data) => api.post('/work-dna/decisions', data),
  deleteDecision: (id) => api.delete(`/work-dna/decisions/${id}`),
  getDejaVu: (projectId) => api.get(`/work-dna/deja-vu/${projectId}`),
  searchDejaVu: (q) => api.get('/work-dna/deja-vu/search', { params: { q } }),
  getPatterns: () => api.get('/work-dna/patterns'),
  getAnalyses: (params) => api.get('/work-dna/analyses', { params }),
  analyzeAll: () => api.post('/work-dna/analyze-all'),

};

// Super admin API — uses same token, no baseURL prefix
export const superAdmin = {
  login: (data) => superApi.post('/super-api/auth/login', data),
  getMe: () => superApi.get('/super-api/auth/me'),
  getCompanies: () => superApi.get('/super-api/companies'),
  getCompany: (id) => superApi.get(`/super-api/companies/${id}`),
  getCompanyProjects: (id) => superApi.get(`/super-api/companies/${id}/projects`),
  createCompany: (data) => superApi.post('/super-api/companies', data),
  updateCompany: (id, data) => superApi.patch(`/super-api/companies/${id}`, data),
  deleteCompany: (id) => superApi.delete(`/super-api/companies/${id}`),
  getUsers: () => superApi.get('/super-api/users'),
  createUser: (data) => superApi.post('/super-api/users', data),
  getNotifications: () => superApi.get('/super-api/notifications'),
  markNotificationRead: (id) => superApi.patch(`/super-api/notifications/${id}/read`),
  markAllNotificationsRead: () => superApi.patch('/super-api/notifications/read-all'),
  deleteNotification: (id) => superApi.delete(`/super-api/notifications/${id}`),
  getRevenue: (period) => superApi.get('/super-api/analytics/revenue', { params: { period } }),
  getGrowth: (period) => superApi.get('/super-api/analytics/growth', { params: { period } }),
  getHealth: () => superApi.get('/super-api/health'),
  getSettings: () => superApi.get('/super-api/settings'),
  saveSettings: (data) => superApi.put('/super-api/settings', data),
};

export const ai = {
  chat: (projectId, message) => api.post(`/ai/chat/${projectId}`, { message }),
  getChatHistory: (projectId) => api.get(`/ai/chat/${projectId}/history`),
  clearChatHistory: (projectId) => api.delete(`/ai/chat/${projectId}`),
  generateReportSummary: (id) => api.post(`/ai/report-summary/${id}`),
  estimateTask: (data) => api.post('/ai/estimate', data),
  detectRisks: (projectId) => api.get(`/ai/risks/${projectId}`),
  generateTemplate: (data) => api.post('/ai/generate-template', data),
};

export const aiAgent = {
  command: (command) => api.post('/ai-agent/command', { command }),
  suggestions: () => api.get('/ai-agent/suggestions'),
};

export const templates = {
  list: (params) => api.get('/templates', { params }),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.patch(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  download: (id) => api.post(`/templates/${id}/download`),
  rate: (id, rating) => api.post(`/templates/${id}/rate`, { rating }),
  my: () => api.get('/templates/my'),
};

export const wiki = {
  getAll: (params) => api.get('/wiki', { params }),
  getById: (id) => api.get(`/wiki/${id}`),
  getBySlug: (slug) => api.get(`/wiki/slug/${slug}`),
  create: (data) => api.post('/wiki', data),
  update: (id, data) => api.patch(`/wiki/${id}`, data),
  delete: (id) => api.delete(`/wiki/${id}`),
  uploadFile: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/wiki/${id}/upload`, fd);
  },
  deleteFile: (id, fileId) => api.delete(`/wiki/${id}/files/${fileId}`),
};

export const reportShare = {
  share: (id, data) => api.post(`/reports/${id}/share`, data),
  getSettings: (id) => api.get(`/reports/${id}/share`),
  disable: (id) => api.delete(`/reports/${id}/share`),
};

export { superAdmin as api };
export default api;

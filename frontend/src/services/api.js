import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gresio_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
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

export const auth = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const users = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getActivity: (id, params) => api.get(`/users/${id}/activity`, { params }),
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
  delete: (id) => api.delete(`/tasks/${id}`),
  addSubtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
  updateSubtask: (id, subtaskId, data) => api.patch(`/tasks/${id}/subtasks/${subtaskId}`, data),
  deleteSubtask: (id, subtaskId) => api.delete(`/tasks/${id}/subtasks/${subtaskId}`),
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
};

export const notifications = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markUnread: (id) => api.patch(`/notifications/${id}/unread`),
  markAllRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  handleAction: (id, action) => api.post(`/notifications/${id}/action`, { action }),
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

export default api;

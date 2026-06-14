import api from './api';

export const reportDraftsService = {
  getDraft: (projectId, type) => api.get(`/report-drafts/project/${projectId}?type=${type}`),
  saveDraft: (projectId, data) => api.post(`/report-drafts/project/${projectId}`, data),
  saveReport: (projectId, data) => api.post(`/report-drafts/project/${projectId}/save-report`, data),
  generateCustomPdf: (projectId, data) => api.post(`/report-drafts/project/${projectId}/generate-pdf`, data),
};

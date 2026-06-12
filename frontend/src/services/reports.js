import api from './api';

export const reportsService = {
  list: () => api.get('/reports'),
  getReportData: (id, type) => api.get(`/reports/project/${id}?type=${type}`),
  generate: (id, type) => api.post(`/reports/project/${id}`, { type }),
  getById: (id) => api.get(`/reports/${id}`),
  delete: (id) => api.delete(`/reports/${id}`),
  countDownload: (id) => api.post(`/reports/${id}/download`),
};

import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const targetsAPI = {
  getAll: () => api.get('/targets'),
  getOne: (id) => api.get(`/targets/${id}`),
  create: (data) => api.post('/targets', data),
  update: (id, data) => api.patch(`/targets/${id}`, data),
  delete: (id) => api.delete(`/targets/${id}`),
  getChecks: (id, limit = 10) => api.get(`/targets/${id}/checks?limit=${limit}`),
  getLatestCheck: (id) => api.get(`/targets/${id}/checks/latest`),
};

export const checksAPI = {
  getOne: (id) => api.get(`/checks/${id}`),
  getChanges: (limit = 50) => api.get(`/checks/changes?limit=${limit}`),
};

export default api;
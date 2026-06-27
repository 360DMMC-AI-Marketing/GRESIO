const BASE = import.meta.env.VITE_API_URL || '';
const API = `${BASE}/super-api`;

function getToken() {
  let t = localStorage.getItem('sa_token');
  if (!t) { t = prompt('Enter super admin token'); if (t) localStorage.setItem('sa_token', t); }
  return t;
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options,
  });
  if (res.status === 401) { localStorage.removeItem('sa_token'); window.location.pathname = '/login'; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },
  getMe: () => request('/auth/me'),
  getCompanies: () => request('/companies'),
  getCompany: (id) => request(`/companies/${id}`),
  createCompany: (data) => request('/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id, data) => request(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCompany: (id) => request(`/companies/${id}`, { method: 'DELETE' }),
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
};

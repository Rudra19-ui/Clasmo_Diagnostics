const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('clasmo_token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.detail || data.non_field_errors?.[0] || Object.values(data)[0]?.[0] || 'Request failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  me: () => request('/auth/me/'),
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tests/${query ? `?${query}` : ''}`);
  },
  getTestCategories: () => request('/test-categories/'),
  searchRegistrations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/registrations/${query ? `?${query}` : ''}`);
  },
  getWorksheet: (ids) => request(`/registrations/worksheet/?ids=${ids}`),
  createRegistration: (payload) =>
    request('/registrations/create/', { method: 'POST', body: JSON.stringify(payload) }),
  getNextLabCode: () => request('/registrations/next-lab-code/'),
  getDashboardSummary: () => request('/dashboard/summary/'),
  getReportSummary: (type) => request(`/reports/summary/?type=${type}`),
  createPickupRequest: (payload) =>
    request('/pickup-requests/', { method: 'POST', body: JSON.stringify(payload) }),
  getPickupRequests: () => request('/pickup-requests/'),
  createMessage: (message) =>
    request('/messages/', { method: 'POST', body: JSON.stringify({ message }) }),
  getMessages: () => request('/messages/'),
  globalSearch: (q) => request(`/search/global/?q=${encodeURIComponent(q)}`),
  getUsers: () => request('/users/'),

  // Clinical module
  getTestParameters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/test-parameters/${query ? `?${query}` : ''}`);
  },
  createTestParameter: (payload) =>
    request('/test-parameters/', { method: 'POST', body: JSON.stringify(payload) }),
  updateTestParameter: (id, payload) =>
    request(`/test-parameters/${id}/`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTestParameter: (id) =>
    request(`/test-parameters/${id}/`, { method: 'DELETE' }),
  getReport: (registrationId) => request(`/reports/${registrationId}/`),
  submitReport: (registrationId, payload) =>
    request(`/reports/${registrationId}/`, { method: 'POST', body: JSON.stringify(payload) }),
  verifyReport: (registrationId) =>
    request(`/reports/${registrationId}/verify/`, { method: 'PATCH', body: '{}' }),
};

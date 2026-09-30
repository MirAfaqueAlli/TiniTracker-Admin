import axios from 'axios';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE}/api/provider`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('provider_admin_token') || localStorage.getItem('provider_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('provider_admin_token');
        localStorage.removeItem('provider_admin_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export { api, API_BASE };
export default api;

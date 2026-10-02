import axios from 'axios';

// .env gives the server root (http://localhost:5000/); all APIs live under /api/v1
const root = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/').replace(/\/+$/, '');
const TOKEN_KEY = 'motordesk-auth';

const api = axios.create({ baseURL: `${root}/api/v1`, timeout: 20000 });

// Attach JWT from the persisted auth store
api.interceptors.request.use((config) => {
  try {
    const token = JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}')?.state?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore corrupt storage */ }
  return config;
});

// Unwrap { success, data, meta } and normalise errors to a readable message
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error — is the server running?');

    if (status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(Object.assign(new Error(message), { status, errors: error.response?.data?.errors }));
  }
);

export const AUTH_STORAGE_KEY = TOKEN_KEY;
export default api;

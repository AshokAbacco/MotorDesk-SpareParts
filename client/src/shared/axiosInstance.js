// client/src/shared/axiosInstance.js
import axios from 'axios';

// .env gives the server root (http://localhost:5000/); all APIs live under /api/v1
const root = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/').replace(/\/+$/, '');
const TOKEN_KEY = 'motordesk-auth';

// 60s: a free Render server sleeps after 15 min idle and needs ~30–60s to wake up on the next request
const api = axios.create({ baseURL: `${root}/api/v1`, timeout: 60000 });

// Attach JWT from the persisted auth store
api.interceptors.request.use((config) => {
  try {
    const token = JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}')?.state?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore corrupt storage */ }
  return config;
});

/*
 * Sliding session: when the server sends a renewed login token (X-Refresh-Token header),
 * hand it to the auth store, so users stay logged in until they press Logout.
 * The store registers the handler (avoids a circular import).
 */
let onTokenRefresh = null;
export const setTokenRefreshHandler = (fn) => { onTokenRefresh = fn; };

// Unwrap { success, data, meta } and normalise errors to a readable message
api.interceptors.response.use(
  (res) => {
    const fresh = res.headers?.['x-refresh-token'];
    if (fresh && onTokenRefresh) onTokenRefresh(fresh);
    return res.data;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message
      || (error.code === 'ECONNABORTED'
        ? 'The server is taking too long to respond (it may be waking up). Please try again in a moment.'
        : 'Network error — is the server running?');

    // Only a real "login no longer valid" (401) logs out — timeouts, network errors and server errors never do
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
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
import axios from 'axios';

// Same-origin "/api" by default:
// - `npm run dev` proxies it to the local API (see vite.config.js)
// - on Vercel, vercel.json rewrites it to the deployed API
// Set VITE_API_URL only to call an API on another origin directly.
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const user = readUser();
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

// An expired or revoked token signs the user out everywhere instead of failing silently.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && readUser()?.token && !url.startsWith('/auth/login')) {
      window.dispatchEvent(new Event('taskflow:unauthorized'));
    }
    return Promise.reject(error);
  }
);

const OFFLINE = 'Cannot reach the TaskFlow server. Check your connection, or that the API is running.';

// Human-readable message for any API failure.
export function errorMessage(error, fallback = 'Something went wrong') {
  const res = error?.response;
  if (res) {
    const data = res.data;
    if (data && typeof data === 'object' && typeof data.message === 'string' && data.message) return data.message;
    if (res.status === 404) return 'The TaskFlow API was not found at this address. The API may not be deployed.';
    // The API always answers errors with JSON; a bare 5xx comes from a proxy or host in front of it.
    if (res.status >= 500) return OFFLINE;
    return fallback;
  }
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.request || error?.code === 'ERR_NETWORK') return OFFLINE;
  return fallback;
}

export default api;

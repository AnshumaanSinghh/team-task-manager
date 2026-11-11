import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://backend-production-bc0ea.up.railway.app/api';

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

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

export const errorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || (error?.code === 'ECONNABORTED' ? 'The server took too long to respond' : fallback);

export default api;

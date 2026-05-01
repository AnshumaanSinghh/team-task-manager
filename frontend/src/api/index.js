import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://backend-production-bc0ea.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;

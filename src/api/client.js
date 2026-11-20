import axios from 'axios';
import { clearSession } from '../utils/session';

const client = axios.create();

client.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('alchemist_token');
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* storage unavailable */ }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only treat 401 as "session expired" if we actually sent a token (public portal pages have none).
    const sentAuth = !!err?.config?.headers?.Authorization;
    if (err?.response?.status === 401 && sentAuth) {
      clearSession();
      if (!window.location.hash.startsWith('#client') && !window.location.hash.startsWith('#certificate')) {
        window.location.reload();
      }
    }
    return Promise.reject(err);
  }
);

client.isCancel = axios.isCancel;
export default client;

export const LOCAL_BACKEND_URL = 'http://127.0.0.1:8002';
export const DEPLOYED_BACKEND_URL = 'https://preq-ten.vercel.app';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '');

const defaultBackendUrl = isLocalhost ? LOCAL_BACKEND_URL : DEPLOYED_BACKEND_URL;
const rawApiUrl = (import.meta.env.VITE_API_URL || defaultBackendUrl).trim();

export const API_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

export const BASE_URL = import.meta.env.VITE_BASE_URL 
  || rawApiUrl.replace(/\/api\/?$/, '');

// Alchemist (auth / hub) backend origin, no trailing slash or /api. Used for login and document uploads.
export const AUTH_API_URL = (import.meta.env.VITE_AUTH_API_URL || (import.meta.env.DEV ? 'http://localhost:8001' : '')).replace(/\/+$/, '');

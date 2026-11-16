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

// Lightweight Axios-compatible client using browser native fetch
export const apiClient = {
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  },
  async post(url, data, options = {}) {
    return this.request('POST', url, data, options);
  },
  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options);
  },
  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  },
  async request(method, url, data, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    const headers = {
      ...(data && !(data instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };
    try {
      const key = typeof window !== 'undefined' ? localStorage.getItem('groq_api_key') : null;
      if (key && !headers['X-Groq-Api-Key'] && !headers['x-groq-api-key']) {
        headers['X-Groq-Api-Key'] = key;
      }
    } catch (_) {}

    const controller = new AbortController();
    // Default 60 seconds timeout to accommodate deep LLM document analysis
    const timeout = setTimeout(() => controller.abort(), options.timeout || 60000);

    const body = data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined;
    let res;
    try {
      res = await fetch(fullUrl, {
        method,
        headers,
        body,
        signal: controller.signal
      });
    } catch (fetchErr) {
      if (fullUrl.includes('localhost:8002') || fullUrl.includes('127.0.0.1:8002')) {
        const fallbackUrl = fullUrl
          .replace('http://localhost:8002/api', 'https://preq-ten.vercel.app/api')
          .replace('http://127.0.0.1:8002/api', 'https://preq-ten.vercel.app/api');
        res = await fetch(fallbackUrl, {
          method,
          headers,
          body,
          signal: controller.signal
        });
      } else {
        throw fetchErr;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errJson;
      try { errJson = JSON.parse(errText); } catch (_) {}
      const error = new Error(errJson?.detail || errJson?.message || `HTTP ${res.status}: ${res.statusText}`);
      error.response = { status: res.status, data: errJson || { detail: errText } };
      throw error;
    }

    const contentType = res.headers.get('content-type') || '';
    const resData = contentType.includes('application/json') ? await res.json() : await res.text();
    return { data: resData, status: res.status, headers: res.headers };
  }
};

export default apiClient;


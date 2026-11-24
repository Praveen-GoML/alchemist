import api from '../api/client';
import { AUTH_API_URL } from '../apiConfig';

/** Shared hub data: one versioned row per key on the backend. */
const base = () => `${AUTH_API_URL}/hub/state`;

export const syncAvailable = () => !!AUTH_API_URL;

export async function fetchAll() {
  const { data } = await api.get(`${base()}/all`, { timeout: 20000 });
  return data.items || {};
}

export async function fetchVersions() {
  const { data } = await api.get(`${base()}/versions`, { timeout: 15000 });
  return data.versions || {};
}

export async function fetchKeys(keys) {
  if (!keys.length) return {};
  const { data } = await api.post(`${base()}/get`, { keys }, { timeout: 20000 });
  return data.items || {};
}

/** Saves one key. Resolves { version } or { conflict: true, version, value } when someone else saved first. */
export async function putKey(key, value, baseVersion) {
  try {
    const { data } = await api.put(base(), { key, value, base_version: baseVersion }, { timeout: 20000 });
    return { version: data.version };
  } catch (err) {
    if (err?.response?.status === 409) {
      const d = err.response.data?.detail || {};
      return { conflict: true, version: d.version ?? 0, value: d.value ?? null };
    }
    throw err;
  }
}

export async function seed(items) {
  const { data } = await api.post(`${base()}/seed`, { items }, { timeout: 30000 });
  return data.inserted || 0;
}

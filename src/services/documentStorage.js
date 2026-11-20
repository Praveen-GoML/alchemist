import axios from '../api/client';
import { AUTH_API_URL } from '../apiConfig';

export const MAX_UPLOAD_MB = 25;
export const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.zip'];

/** Where uploads currently go: { storage: 'dropbox' | 'local', max_mb } */
export async function getStorageStatus() {
  if (!AUTH_API_URL) return null;
  try {
    const { data } = await axios.get(`${AUTH_API_URL}/upload/status`);
    return data;
  } catch {
    return null;
  }
}

/**
 * Upload a project document through the backend, which stores it in Dropbox.
 * Throws an Error with a readable message on failure. File bytes are never kept in app state.
 */
export async function uploadProjectFile(projectName, file) {
  if (!AUTH_API_URL) throw new Error('Upload server is not configured (VITE_AUTH_API_URL).');

  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) throw new Error(`${ext} files are not allowed.`);
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`File is larger than ${MAX_UPLOAD_MB} MB.`);

  const form = new FormData();
  form.append('file', file);
  form.append('project', projectName || 'General');

  try {
    const { data } = await axios.post(`${AUTH_API_URL}/upload`, form, { timeout: 120000 });
    return {
      publicUrl: data.url,
      filePath: data.path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storageProvider: data.storage === 'dropbox' ? 'Dropbox' : 'Server storage',
    };
  } catch (err) {
    const detail = err?.response?.data?.detail;
    if (err?.response?.status === 403) throw new Error('Only PMs and TLs can upload documents.');
    if (err?.response?.status === 401) throw new Error('Your session expired. Please log in again.');
    throw new Error(typeof detail === 'string' ? detail : 'Upload failed. Check that the server is running.');
  }
}

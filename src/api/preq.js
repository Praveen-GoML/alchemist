import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from './client';
import { API_URL } from '../apiConfig';
import { keys } from './keys';

/**
 * Pre-requisite tracker API, as TanStack Query hooks.
 *
 *   useQuery    every read: projects, one project, its checklist, BRD, certificate, templates
 *   useMutation every write: create / edit / delete a project, change a prerequisite, verify, reject, escalate…
 *
 * After a write, the screens that show that data refresh by themselves (the cache is invalidated),
 * so no component needs to call a "reload" function any more.
 */

const url = (path) => `${API_URL}${path}`;
const get = (path, config) => axios.get(url(path), config).then((r) => r.data);
const send = (method, path, data, config) => axios.request({ method, url: url(path), data, ...config }).then((r) => r.data);

/** The error message a screen should show: the server's own explanation when it gave one. */
export const apiError = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  return err?.message || fallback;
};

export const isCancelled = (err) => axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';

/* ───────────── reads: query options (also usable with queryClient.fetchQuery) ───────────── */

export const projectsQuery = () => queryOptions({ queryKey: keys.preq.projects, queryFn: ({ signal }) => get('/projects', { signal }) });
export const statsQuery = () => queryOptions({ queryKey: keys.preq.stats, queryFn: ({ signal }) => get('/projects/dashboard-stats', { signal }) });
export const projectQuery = (id) => queryOptions({ queryKey: keys.preq.project(id), queryFn: ({ signal }) => get(`/projects/${id}`, { signal }) });
export const checklistQuery = (id) => queryOptions({
  queryKey: keys.preq.checklist(id),
  queryFn: ({ signal }) => get(`/projects/${id}/checklist`, { signal }).then((d) => (Array.isArray(d) ? d : [])),
});
export const brdQuery = (id) => queryOptions({ queryKey: keys.preq.brd(id), queryFn: ({ signal }) => get(`/projects/${id}/brd`, { signal }) });
export const certificateQuery = (id) => queryOptions({ queryKey: keys.preq.certificate(id), queryFn: ({ signal }) => get(`/projects/${id}/certificate`, { signal }) });
export const contextQuery = (id) => queryOptions({
  queryKey: keys.preq.context(id),
  queryFn: ({ signal }) => get(`/projects/${id}/context`, { signal }),
});
export const templatesQuery = () => queryOptions({ queryKey: keys.preq.templates, queryFn: ({ signal }) => get('/templates', { signal }), staleTime: 10 * 60_000 });

/* ───────────── reads: hooks ───────────── */

export const useProjects = (options) => useQuery({ ...projectsQuery(), ...options });
export const useDashboardStats = (options) => useQuery({ ...statsQuery(), ...options });
export const useProject = (id, options) => useQuery({ ...projectQuery(id), enabled: !!id, ...options });
export const useChecklist = (id, options) => useQuery({ ...checklistQuery(id), enabled: !!id, ...options });
export const useProjectContext = (id, options) => useQuery({ ...contextQuery(id), enabled: !!id, retry: false, ...options });
export const useBrd = (id, options) => useQuery({ ...brdQuery(id), enabled: !!id, ...options });
export const useCertificate = (id, options) => useQuery({ ...certificateQuery(id), enabled: !!id, retry: false, ...options });
export const useTemplates = (options) => useQuery({ ...templatesQuery(), retry: false, ...options });

/* ───────────── writes: hooks ───────────── */

/** Refresh everything the tracker shows. Cheap: only the queries a screen is currently using are refetched. */
const useRefreshPreq = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['preq'] });
};

export const useCreateProject = () => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: (payload) => send('post', '/projects', payload), onSuccess: refresh });
};

/** Start an analysis from an uploaded file or pasted text. Pass `signal` (an AbortSignal) to allow cancelling. */
export const useAnalyzeSow = () => {
  const refresh = useRefreshPreq();
  return useMutation({
    mutationFn: ({ file, text, signal }) => {
      if (file) {
        const form = new FormData();
        form.append('file', file);
        return send('post', '/analyze-sow-file', form, { signal });
      }
      return send('post', '/analyze-sow', { content: text }, { signal });
    },
    onSuccess: refresh,
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const refresh = useRefreshPreq();
  return useMutation({
    mutationFn: ({ id, payload }) => send('put', `/projects/${id}`, payload),
    onSuccess: (data, { id, payload }) => {
      // show the change at once, then let the refetch confirm it
      queryClient.setQueryData(keys.preq.projects, (list) =>
        Array.isArray(list) ? list.map((p) => (p.id === id ? { ...p, ...payload, ...(data || {}) } : p)) : list);
      refresh();
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const refresh = useRefreshPreq();
  return useMutation({
    mutationFn: (id) => send('delete', `/projects/${id}`),
    onSuccess: (_d, id) => {
      queryClient.setQueryData(keys.preq.projects, (list) => (Array.isArray(list) ? list.filter((p) => p.id !== id) : list));
      refresh();
    },
  });
};

export const useClearAllProjects = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => send('post', '/projects/clear-all'),
    onSuccess: () => {
      queryClient.setQueryData(keys.preq.projects, []);
      queryClient.setQueryData(keys.preq.stats, {
        total_projects: 0, cleared_projects: 0, at_risk_projects: 0, average_score: 0, total_critical_blockers: 0, recent_escalations: [],
      });
    },
  });
};

export const useSeedDemo = () => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: () => send('post', '/projects/seed-demo'), onSuccess: refresh });
};

export const useRetryAnalysis = (projectId) => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: () => send('post', `/projects/${projectId}/retry-analysis`, {}), onSettled: refresh });
};

export const useInternalSignoff = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => send('post', `/projects/${projectId}/internal-review-signoff`, payload),
    onSuccess: (project) => { queryClient.setQueryData(keys.preq.project(projectId), project); },
  });
};

export const useGenerateBrd = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => send('post', `/projects/${projectId}/generate-brd`, {}),
    onSuccess: (brd) => { queryClient.setQueryData(keys.preq.brd(projectId), brd); },
  });
};

/** Download the BRD (.docx) or the Excel tracker as a file. */
export const useExportFile = (projectId) => useMutation({
  mutationFn: (kind) => send('get', `/projects/${projectId}/${kind === 'docx' ? 'export-brd-docx' : 'export-excel-tracker'}`, undefined, { responseType: 'blob' }),
});

/** Add a prerequisite to a project. Resolves the created item. */
export const useAddItem = (projectId) => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: (payload) => send('post', `/projects/${projectId}/items`, payload), onSuccess: refresh });
};

/** Change fields on one prerequisite (status, owner…). Resolves the updated item. */
export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const refresh = useRefreshPreq();
  return useMutation({
    mutationFn: ({ id, patch }) => send('put', `/items/${id}`, patch),
    onSuccess: (row, { id, patch }) => {
      // update the row in every cached checklist right away
      queryClient.setQueriesData({ queryKey: ['preq', 'project'] }, (data) =>
        Array.isArray(data) ? data.map((it) => (it.id === id ? { ...it, ...patch, ...(row || {}) } : it)) : data);
      refresh();
    },
  });
};

export const useVerifyItem = () => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: (id) => send('post', `/items/${id}/verify`), onSuccess: refresh });
};

export const useAiVerifyItem = () => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: (id) => send('post', `/items/${id}/ai-verify`), onSuccess: refresh });
};

export const useRejectItem = () => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: ({ id, reason }) => send('post', `/items/${id}/reject`, { reason }), onSuccess: refresh });
};

export const useEscalateItem = () => {
  const refresh = useRefreshPreq();
  return useMutation({ mutationFn: ({ id, level, message }) => send('post', `/items/${id}/escalate`, { level, message }), onSuccess: refresh });
};

/** Send evidence for a prerequisite (form data); marks it Verified straight away when asked to. */
export const useSubmitEvidence = () => {
  const refresh = useRefreshPreq();
  return useMutation({
    mutationFn: async ({ id, form, verify }) => {
      await send('post', `/items/${id}/submit-evidence`, form);
      if (verify) await send('post', `/items/${id}/verify`);
    },
    onSuccess: refresh,
  });
};

/** Ask the AI how a client can obtain one credential (the caller caches the answer in the query cache). */
export const requestCredentialGuide = (item) => send('post', '/copilot/dynamic-credential-guide', {
  name: item.name,
  category: item.category,
  description: item.description,
  expected_evidence: item.expected_evidence,
  client_name: 'Client Sponsor',
});

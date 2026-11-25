import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys as queryKeys } from '../api/keys';
import { syncAvailable, fetchAll, fetchVersions, fetchKeys, putKey, seed } from '../services/hubSync';

/**
 * The hub's data, shared through the backend.
 *
 * - `data` and `updateData(updater)` behave exactly as before, so screens did not change.
 * - Every top-level key is its own row on the server. The big per-person / per-project maps
 *   (leave, hygiene, checklist, projectDocs, clMeta) are split one row per entry, so two people
 *   editing different people or projects never overwrite each other.
 * - If two people change the same row at once, the later save is re-applied on top of the newer
 *   server copy (the original edit functions are replayed), so nothing is silently lost.
 * - The latest copy is kept in localStorage as a cache so the app opens instantly and works offline.
 *
 * Network work goes through TanStack Query:
 *   useQuery    first load (seeds an empty server) and the 12-second "what changed?" poll
 *   useMutation saving one row at a time
 * Everything else (the instant local copy, the replay of edits after a conflict) stays here,
 * because that is application logic, not server state.
 */
const CACHE_KEY = 'alchemist-data';
const SHARDED = new Set(['leave', 'hygiene', 'checklist', 'projectDocs', 'clMeta']);
const SKIP = new Set(['updatedAt']);
const SEP = '|';
const POLL_MS = 12000;
const FLUSH_MS = 350;
const MAX_RETRY = 4;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const json = (v) => JSON.stringify(v === undefined ? null : v);

/** data -> Map(serverKey -> value) */
export function toKeys(data) {
  const out = new Map();
  Object.keys(data || {}).forEach(k => {
    if (SKIP.has(k)) return;
    const v = data[k];
    if (SHARDED.has(k) && isObj(v)) Object.keys(v).forEach(e => out.set(`${k}${SEP}${e}`, v[e]));
    else out.set(k, v);
  });
  return out;
}

const splitKey = (key) => {
  const i = key.indexOf(SEP);
  if (i > 0 && SHARDED.has(key.slice(0, i))) return [key.slice(0, i), key.slice(i + 1)];
  return [key, null];
};

const getKey = (data, key) => {
  const [k, e] = splitKey(key);
  return e === null ? data?.[k] : data?.[k]?.[e];
};

/** Returns a copy of `data` with one server key set (value null/undefined removes a map entry). */
const setKey = (data, key, value) => {
  const [k, e] = splitKey(key);
  if (e === null) return { ...data, [k]: value };
  const map = { ...(isObj(data?.[k]) ? data[k] : {}) };
  if (value === null || value === undefined) delete map[e]; else map[e] = value;
  return { ...data, [k]: map };
};

/** Server items -> data, falling back to `defaults` for anything the server does not have yet. */
const assemble = (items, defaults) => {
  const out = {};
  const groups = {};
  Object.entries(items).forEach(([key, { value }]) => {
    const [k, e] = splitKey(key);
    if (e === null) { out[k] = value; return; }
    groups[k] = groups[k] || {};
    if (value !== null && value !== undefined) groups[k][e] = value;
  });
  SHARDED.forEach(k => { out[k] = groups[k] || {}; });
  Object.keys(defaults || {}).forEach(k => {
    if (!SKIP.has(k) && !(k in out)) out[k] = defaults[k];
  });
  return out;
};

export function useHubData(initialState, { canSeed = true } = {}) {
  const [data, setDataState] = useState(() => {
    try { const saved = localStorage.getItem(CACHE_KEY); return saved ? JSON.parse(saved) : initialState; } catch { return initialState; }
  });
  const [status, setStatus] = useState(syncAvailable() ? 'loading' : 'local');

  const dataRef = useRef(data);
  const base = useRef(new Map());       // key -> { json, version }  what the server is known to hold
  const dirty = useRef(new Set());      // keys with changes not saved yet
  const pending = useRef([]);           // [{ fn, keys:Set }] edits not saved yet, for replay on conflict
  const timer = useRef(null);
  const flushing = useRef(false);
  const ready = useRef(!syncAvailable());
  const [readyState, setReadyState] = useState(!syncAvailable());   // same flag as `ready`, but it can switch queries on
  const alive = useRef(true);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: ({ key, value, baseVersion }) => putKey(key, value, baseVersion),
  });

  const commit = useCallback((next) => {
    dataRef.current = next;
    setDataState(next);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  }, []);

  /* ---------- saving ---------- */
  const flush = useCallback(async () => {
    if (flushing.current || !ready.current) return;
    flushing.current = true;
    try {
      while (dirty.current.size && alive.current) {
        const key = [...dirty.current][0];
        let attempt = 0, done = false;
        while (!done && attempt < MAX_RETRY) {
          attempt += 1;
          const value = getKey(dataRef.current, key);
          const b = base.current.get(key);
          const res = await saveMutation.mutateAsync({ key, value: value === undefined ? null : value, baseVersion: b ? b.version : 0 });
          if (!res.conflict) {
            base.current.set(key, { json: json(value), version: res.version });
            dirty.current.delete(key);
            pending.current.forEach(p => p.keys.delete(key));
            pending.current = pending.current.filter(p => p.keys.size);
            done = true;
          } else {
            // someone saved first: take their copy, then replay our edits to this key on top of it
            let cur = setKey(dataRef.current, key, res.value);
            pending.current.filter(p => p.keys.has(key)).forEach(p => {
              try { cur = setKey(cur, key, getKey(p.fn(cur), key)); } catch { /* skip an edit that no longer applies */ }
            });
            base.current.set(key, { json: json(res.value), version: res.version });
            commit(cur);
          }
        }
        if (!done) { dirty.current.delete(key); throw new Error('conflict'); }
      }
      if (alive.current) setStatus('synced');
    } catch {
      if (alive.current) setStatus('offline');
      timer.current = setTimeout(flush, 6000); // try again
    } finally {
      flushing.current = false;
    }
  }, [commit, saveMutation]);

  const schedule = useCallback(() => {
    if (!ready.current) return;
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, FLUSH_MS);
  }, [flush]);

  /** Same shape as before: updateData(fn | object). */
  const updateData = useCallback((updater) => {
    const fn = typeof updater === 'function' ? updater : () => updater;
    const prev = dataRef.current;
    const next = { ...fn(prev), updatedAt: new Date().toISOString() };
    commit(next);
    if (!syncAvailable()) return;
    const before = toKeys(prev), after = toKeys(next);
    const changed = new Set();
    after.forEach((v, k) => { if (!before.has(k) || json(before.get(k)) !== json(v)) changed.add(k); });
    before.forEach((v, k) => { if (!after.has(k)) changed.add(k); }); // removed entries
    if (!changed.size) return;
    changed.forEach(k => dirty.current.add(k));
    pending.current.push({ fn, keys: new Set(changed) });
    schedule();
  }, [commit, schedule]);

  /* ---------- loading and refreshing ---------- */
  const applyServer = useCallback((items) => {
    let next = dataRef.current;
    Object.entries(items).forEach(([key, { value, version }]) => {
      if (dirty.current.has(key)) return; // our own unsaved edit wins until it is saved
      base.current.set(key, { json: json(value), version });
      next = setKey(next, key, value);
    });
    commit(next);
  }, [commit]);

  /* First load: a query. An empty server is set up by the first PM/TL (never overwriting anything);
     a member who arrives earlier waits, and the query quietly re-asks every poll until someone has. */
  const loadQuery = useQuery({
    queryKey: queryKeys.hub.all,
    enabled: syncAvailable(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.data?.waiting ? POLL_MS : false),
    queryFn: async () => {
      let items = await fetchAll();
      if (!Object.keys(items).length) {
        if (!canSeed) return { waiting: true, items: {} };
        const m = toKeys(dataRef.current);
        const seedItems = {}; m.forEach((v, k) => { seedItems[k] = v === undefined ? null : v; });
        await seed(seedItems);
        items = await fetchAll();
      }
      return { waiting: false, items };
    },
  });

  useEffect(() => {
    const res = loadQuery.data;
    if (!res) return;
    if (res.waiting) { setStatus('loading'); return; }
    base.current = new Map(Object.entries(res.items).map(([k, { value, version }]) => [k, { json: json(value), version }]));
    commit({ ...assemble(res.items, initialState), updatedAt: new Date().toISOString() });
    ready.current = true;
    setReadyState(true);
    setStatus('synced');
    if (dirty.current.size) schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!loadQuery.isError) return;
    ready.current = true; setReadyState(true); setStatus('offline'); // keep working from the cached copy
  }, [loadQuery.isError]);

  /* The "what changed?" poll: a query that asks for the version numbers every 12 s (and when you come back to the tab). */
  const versionsQuery = useQuery({
    queryKey: queryKeys.hub.versions,
    queryFn: fetchVersions,
    enabled: syncAvailable() && readyState,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    const versions = versionsQuery.data;
    if (!versions || flushing.current) return undefined;
    const stale = Object.keys(versions).filter(k => !dirty.current.has(k) && (base.current.get(k)?.version ?? -1) !== versions[k]);
    let cancelled = false;
    (async () => {
      try {
        if (stale.length) {
          const fetched = await queryClient.fetchQuery({ queryKey: queryKeys.hub.keys(stale), queryFn: () => fetchKeys(stale), staleTime: 0, gcTime: 0 });
          if (!cancelled) applyServer(fetched);
        }
        if (!cancelled && !dirty.current.size) setStatus('synced');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    })();
    return () => { cancelled = true; };
    // dataUpdatedAt (not data): the same version numbers still need re-checking against our unsaved edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionsQuery.dataUpdatedAt]);

  useEffect(() => {
    if (versionsQuery.isError) setStatus('offline');
  }, [versionsQuery.isError, versionsQuery.errorUpdatedAt]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);

  // save before the tab closes if something is waiting
  useEffect(() => {
    const onHide = () => { if (dirty.current.size) flush(); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [flush]);

  return { data, updateData, syncStatus: status };
}

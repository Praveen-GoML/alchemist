import { useCallback, useEffect, useRef, useState } from 'react';
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
  const alive = useRef(true);
  const waitingSeed = useRef(false);
  const loadRef = useRef(null);

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
          const res = await putKey(key, value === undefined ? null : value, b ? b.version : 0);
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
  }, [commit]);

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

  const refresh = useCallback(async () => {
    if (waitingSeed.current) { loadRef.current?.(); return; }
    if (!ready.current || flushing.current) return;
    try {
      const versions = await fetchVersions();
      const stale = Object.keys(versions).filter(k => !dirty.current.has(k) && (base.current.get(k)?.version ?? -1) !== versions[k]);
      if (stale.length) applyServer(await fetchKeys(stale));
      if (!dirty.current.size && alive.current) setStatus('synced');
    } catch {
      if (alive.current) setStatus('offline');
    }
  }, [applyServer]);

  useEffect(() => {
    alive.current = true;
    if (!syncAvailable()) return undefined;
    const load = async () => {
      try {
        let items = await fetchAll();
        if (!Object.keys(items).length) {
          if (!canSeed) { waitingSeed.current = true; if (alive.current) setStatus('loading'); return; } // wait for a PM or TL to set things up
          // first run: the very first PM/TL in puts the current data on the server (never overwrites)
          const m = toKeys(dataRef.current);
          const seedItems = {}; m.forEach((v, k) => { seedItems[k] = v === undefined ? null : v; });
          await seed(seedItems);
          items = await fetchAll();
        }
        if (!alive.current) return;
        waitingSeed.current = false;
        base.current = new Map(Object.entries(items).map(([k, { value, version }]) => [k, { json: json(value), version }]));
        commit({ ...assemble(items, initialState), updatedAt: new Date().toISOString() });
        ready.current = true;
        setStatus('synced');
        if (dirty.current.size) schedule();
      } catch {
        if (alive.current) { ready.current = true; setStatus('offline'); } // keep working from the cached copy
      }
    };
    loadRef.current = load;
    load();
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearInterval(id); clearTimeout(timer.current);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save before the tab closes if something is waiting
  useEffect(() => {
    const onHide = () => { if (dirty.current.size) flush(); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [flush]);

  return { data, updateData, syncStatus: status };
}

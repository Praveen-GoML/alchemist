import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../api/keys';
import { fetchNotifications, markRead, removeNotification } from '../services/notifications';

const POLL_MS = 15000;
const EMPTY = { unread: 0, items: [] };

/**
 * Near-real-time notifications with TanStack Query.
 *  - useQuery polls every 15 s while the tab is visible and refetches the moment you come back to it.
 *  - useMutation handles read / read-all / dismiss; each one updates the list instantly (optimistic)
 *    and rolls back if the server says no.
 * `onNew(items)` fires with notifications that arrived since the last poll.
 */
export function useNotifications({ enabled, onNew }) {
  const queryClient = useQueryClient();
  const lastId = useRef(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const query = useQuery({
    queryKey: keys.notifications,
    queryFn: () => fetchNotifications(40),
    enabled,
    refetchInterval: POLL_MS,            // pauses by itself while the tab is in the background
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    retry: false,                        // offline or signed out: keep what we have, try again next tick
  });

  const data = query.data ?? EMPTY;
  const items = data.items;

  // announce anything that arrived since the last response
  useEffect(() => {
    if (!query.data) return;
    const maxId = query.data.items.reduce((m, n) => Math.max(m, n.id), 0);
    if (lastId.current !== null && maxId > lastId.current) {
      const fresh = query.data.items.filter(n => n.id > lastId.current && !n.read_at);
      if (fresh.length) onNewRef.current?.(fresh);
    }
    lastId.current = Math.max(lastId.current ?? 0, maxId);
  }, [query.data]);

  /** Applies `change(list)` to the cached notifications right away; returns what to restore on failure. */
  const optimistic = useCallback(async (change) => {
    await queryClient.cancelQueries({ queryKey: keys.notifications });
    const previous = queryClient.getQueryData(keys.notifications);
    queryClient.setQueryData(keys.notifications, (old) => {
      const cur = old ?? EMPTY;
      const nextItems = change(cur.items);
      return { ...cur, items: nextItems, unread: nextItems.filter(n => !n.read_at).length };
    });
    return { previous };
  }, [queryClient]);

  const rollback = (_err, _vars, ctx) => { if (ctx?.previous) queryClient.setQueryData(keys.notifications, ctx.previous); };
  const settle = () => queryClient.invalidateQueries({ queryKey: keys.notifications });
  const stamp = () => new Date().toISOString();

  const readMutation = useMutation({
    mutationFn: ({ ids = [], all = false }) => markRead({ ids, all }),
    onMutate: ({ ids = [], all = false }) =>
      optimistic(list => list.map(n => (all || ids.includes(n.id) ? { ...n, read_at: n.read_at || stamp() } : n))),
    onError: rollback,
    onSettled: settle,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => removeNotification(id),
    onMutate: (id) => optimistic(list => list.filter(n => n.id !== id)),
    onError: rollback,
    onSettled: settle,
  });

  const read = useCallback((ids) => readMutation.mutateAsync({ ids }).catch(() => {}), [readMutation]);
  const readAll = useCallback(() => readMutation.mutateAsync({ all: true }).catch(() => {}), [readMutation]);
  const remove = useCallback((id) => removeMutation.mutateAsync(id).catch(() => {}), [removeMutation]);
  const { refetch } = query;
  const refresh = useCallback(() => refetch(), [refetch]);

  return { items, unread: data.unread, loaded: !!query.data || query.isError, refresh, read, readAll, remove };
}

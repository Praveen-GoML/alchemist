import { QueryClient } from '@tanstack/react-query';

/**
 * One shared TanStack Query client for the whole app.
 * - Reads (useQuery) are cached and shared between screens. Once a section has loaded its data,
 *   switching away and back re-renders instantly from that cache instead of calling the API again —
 *   a query only goes back to the network once it's actually stale (DEFAULT_STALE_TIME) or a mutation
 *   invalidates it directly, which happens immediately after every create/update/delete.
 * - A screen that genuinely needs live, continuously-refreshed data (the pre-req dashboards, the
 *   client portal, notifications, the team-sync version check) sets its own short staleTime /
 *   refetchInterval where it's defined — this default only governs everything else.
 * - Writes (useMutation) never retry on their own: a retried POST could create things twice.
 * - Failed reads retry once, but not for 4xx answers (those are "no", not "try again").
 */
const DEFAULT_STALE_TIME = 5 * 60_000; // revisit a section within 5 min: served from cache, no request
const DEFAULT_GC_TIME = 15 * 60_000;   // cache for an unmounted section is kept this long before eviction

const noRetryOn4xx = (failureCount, error) => {
  const status = error?.response?.status ?? error?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      retry: noRetryOn4xx,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

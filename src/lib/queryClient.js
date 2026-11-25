import { QueryClient } from '@tanstack/react-query';

/**
 * One shared TanStack Query client for the whole app.
 * - Reads (useQuery) are cached, shared between screens, and refetched when the tab regains focus.
 * - Writes (useMutation) never retry on their own: a retried POST could create things twice.
 * - Failed reads retry once, but not for 4xx answers (those are "no", not "try again").
 */
const noRetryOn4xx = (failureCount, error) => {
  const status = error?.response?.status ?? error?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: noRetryOn4xx,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

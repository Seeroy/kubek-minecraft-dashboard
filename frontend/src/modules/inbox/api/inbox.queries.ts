import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import type { NotificationPrefs, NotificationsPage } from "@shared/types/notification.types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export function useInboxQuery(unread: boolean) {
  return useInfiniteQuery({
    queryKey: qk.notifications.list(unread),
    queryFn: ({ pageParam }) => api.notifications.list({ cursor: pageParam, unread, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Unread count for the bell, kept small since only the counter is needed */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: qk.notifications.unreadCount(),
    queryFn: () => api.notifications.list({ unread: true, limit: 1 }),
    select: (page) => page.unreadCount,
  });
}

type InboxCache = InfiniteData<NotificationsPage, string | undefined>;

// Read state flips locally right away, the server answer only confirms it
function useInboxMutation<T>(mutationFn: (arg: T) => Promise<void>, patch: (cache: InboxCache, arg: T) => InboxCache) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: (arg: T) => {
      queryClient.setQueriesData<InboxCache>({ queryKey: qk.notifications.lists() }, (cache) => (cache ? patch(cache, arg) : cache));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notifications.all }),
  });
}

const mapItems = (cache: InboxCache, map: (page: NotificationsPage) => NotificationsPage): InboxCache => ({ ...cache, pages: cache.pages.map(map) });

export function useMarkReadMutation() {
  return useInboxMutation(api.notifications.markRead, (cache, id: string) =>
    mapItems(cache, (page) => ({ ...page, items: page.items.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: Date.now() } : n)) }))
  );
}

export function useMarkAllReadMutation() {
  return useInboxMutation(
    () => api.notifications.markAllRead(),
    (cache) => mapItems(cache, (page) => ({ ...page, unreadCount: 0, items: page.items.map((n) => (n.readAt ? n : { ...n, readAt: Date.now() })) }))
  );
}

export function useDeleteNotificationMutation() {
  return useInboxMutation(api.notifications.remove, (cache, id: string) =>
    mapItems(cache, (page) => ({ ...page, items: page.items.filter((n) => n.id !== id) }))
  );
}

export function useNotificationPrefsQuery() {
  return useQuery({ queryKey: qk.notifications.prefs(), queryFn: api.notifications.getPrefs });
}

export function useUpdateNotificationPrefsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) => api.notifications.setPrefs(prefs),
    onSuccess: (prefs) => queryClient.setQueryData(qk.notifications.prefs(), prefs),
  });
}

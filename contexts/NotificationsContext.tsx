import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
};

type RecipientRow = {
  id: string;
  notification_id: string;
  user_id: string;
  delivery_method?: string | null;
  read_at?: string | null;
  admin_notifications?: {
    id: string;
    title?: string | null;
    message?: string | null;
    target_type?: string | null;
    created_at?: string | null;
  } | null;
};

type Ctx = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: AppNotification) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | undefined>(undefined);

const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', title: 'Order shipped', body: 'Your gift is on the way! ETA Nov 15–22.', createdAt: Date.now() - 1000 * 60 * 60, read: false, actionLabel: 'Track order', actionHref: '/(buyer)/order-tracker' },
  { id: 'n2', title: 'Welcome to Giftyy', body: 'Thanks for joining! Enjoy 10% off your first order.', createdAt: Date.now() - 1000 * 60 * 60 * 6, read: true },
  { id: 'n3', title: 'Memory Vault', body: 'Your video is safely stored for 30 days.', createdAt: Date.now() - 1000 * 60 * 60 * 12, read: false, actionLabel: 'Open Vault', actionHref: '/(buyer)/memory-vault' },
];

const NOTIFICATIONS_PER_PAGE = 15; // Load 15 notifications at a time

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isUuid = useCallback((value: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }, []);

  const mapRowToNotification = useCallback((row: RecipientRow): AppNotification => {
    const parent = row.admin_notifications ?? null;
    const createdAt = parent?.created_at ? new Date(parent.created_at).getTime() : Date.now();
    
    const notification = {
      id: row.id,
      title: parent?.title ?? 'Notification',
      body: parent?.message ?? '',
      createdAt,
      read: Boolean(row.read_at),
    };
    
    // Debug log if we're missing data
    if (!parent || !parent.title || !parent.message) {
      console.warn(`[Notifications] Mapping notification ${row.id} with missing data:`, {
        hasParent: !!parent,
        title: parent?.title,
        message: parent?.message,
        notification_id: row.notification_id,
      });
    }
    
    return notification;
  }, []);

  const fetchAdminNotification = useCallback(async (notificationId: string) => {
    if (!isSupabaseConfigured()) return null;
    console.log('[Notifications] Fetching admin notification for ID:', notificationId);
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('id, title, message, target_type, created_at')
      .eq('id', notificationId)
      .maybeSingle();

    if (error) {
      // Suppress network error spam
      const isNetworkError = error.message?.includes('Network request failed') || 
                            error.message?.includes('fetch') ||
                            error.code === 'ECONNREFUSED';
      
      if (!isNetworkError) {
        console.error('[Notifications] Error fetching admin notification:', {
          notificationId,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
      }
      return null;
    }

    if (!data) {
      console.warn('[Notifications] No admin notification found for ID:', notificationId, '(This might be an RLS policy issue - check if the user has permission to read this notification)');
      return null;
    }

    console.log('[Notifications] Successfully fetched admin notification:', {
      id: data.id,
      title: data.title,
      message: data.message?.substring(0, 50) + '...',
    });
    return data;
  }, []);

  const fetchNotifications = useCallback(
    async (userId: string, limit: number = NOTIFICATIONS_PER_PAGE, offset: number = 0, append: boolean = false) => {
      if (!isSupabaseConfigured()) {
        setNotifications(SAMPLE_NOTIFICATIONS);
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setCurrentOffset(0);
      }

      try {
        // Fetch all notifications first (we'll paginate after sorting by created_at)
        // Since we need to sort by admin_notifications.created_at, we fetch all and paginate in memory
        // For better performance with large datasets, consider adding created_at to admin_notification_recipients
        const { data: allData, error: countError } = await supabase
        .from('admin_notification_recipients')
        .select(`
          id,
          notification_id,
          user_id,
          delivery_method,
          read_at,
          admin_notifications (
            id,
            title,
            message,
            target_type,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (countError) {
        // Suppress network error spam
        const isNetworkError = countError.message?.includes('Network request failed') || 
                              countError.message?.includes('fetch') ||
                              countError.code === 'ECONNREFUSED';
        
        if (!isNetworkError) {
          console.error('[Notifications] Error fetching notifications:', countError);
        }
        if (!append) {
          setNotifications(SAMPLE_NOTIFICATIONS);
        }
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }

      // Always fetch admin_notifications separately to ensure we have the data
      const rowsWithNotifications = await Promise.all(
        (allData ?? []).map(async (row: RecipientRow) => {
          if (!row.notification_id) {
            console.warn(`[Notifications] Row ${row.id} has no notification_id`);
            return row;
          }

          // Always fetch admin notification to ensure we have fresh data
          const admin = row.admin_notifications || await fetchAdminNotification(row.notification_id);
          
          if (!admin) {
            console.error(`[Notifications] Failed to fetch admin notification for ID: ${row.notification_id}`);
          }
          
          return {
            ...row,
            admin_notifications: admin,
          } as RecipientRow;
        })
      );

      // Deduplicate
      const dedup = new Map<string, RecipientRow>();
      rowsWithNotifications.forEach((row: RecipientRow) => {
        if (!row.notification_id) {
          return;
        }
        const key = row.notification_id;
        const existing = dedup.get(key);

        if (!existing) {
          dedup.set(key, row);
          return;
        }

        // Prefer in-app delivery if both email + in-app exist
        if (existing.delivery_method !== 'in_app' && row.delivery_method === 'in_app') {
          dedup.set(key, row);
        }
      });

      // Map and sort by created_at
      const allMapped = Array.from(dedup.values())
        .map(mapRowToNotification)
        .sort((a, b) => b.createdAt - a.createdAt);

      // Apply pagination after sorting
      const totalCount = allMapped.length;
      const paginatedData = allMapped.slice(offset, offset + limit);
      const fetchedCount = paginatedData.length;
      
      // Check if we have more data to load
      setHasMore(offset + fetchedCount < totalCount);

      if (fetchedCount === 0 && !append) {
        setNotifications([]);
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }

      if (append) {
        setNotifications((prev) => {
          // Merge and deduplicate by id
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifications = paginatedData.filter(n => !existingIds.has(n.id));
          return [...prev, ...newNotifications].sort((a, b) => b.createdAt - a.createdAt);
        });
        setCurrentOffset(offset + fetchedCount);
        setLoadingMore(false);
      } else {
        setNotifications(paginatedData);
        setCurrentOffset(fetchedCount);
        setLoading(false);
      }
      } catch (err: any) {
        // Suppress network error spam
        const isNetworkError = err?.message?.includes('Network request failed') || 
                              err?.message?.includes('fetch') ||
                              err?.name === 'TypeError';
        
        if (!isNetworkError) {
          console.error('[Notifications] Unexpected error fetching notifications:', err);
        }
        
        if (!append) {
          setNotifications(SAMPLE_NOTIFICATIONS);
        }
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
      }
    },
    [mapRowToNotification, fetchAdminNotification]
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setHasMore(false);
      setCurrentOffset(0);
      return;
    }

    fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, 0, false);

    if (!isSupabaseConfigured()) {
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`user_notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notification_recipients', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          // Handle DELETE events
          if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
            return;
          }

          // Handle INSERT and UPDATE events
          const admin = payload.new.notification_id
            ? await fetchAdminNotification(payload.new.notification_id)
            : null;

          if (!admin) {
            return;
          }

          const hydrated: RecipientRow = {
            ...(payload.new as RecipientRow),
            admin_notifications: admin,
          };

          const notification = mapRowToNotification(hydrated);
          
          // Update the notification in the list
          setNotifications((prev) => {
            const idx = prev.findIndex((n) => n.id === notification.id);
            if (idx === -1) {
              // New notification - add it
              return [notification, ...prev].sort((a, b) => b.createdAt - a.createdAt);
            } else {
              // Existing notification - update it (e.g., read status changed)
              const copy = [...prev];
              copy[idx] = notification;
              return copy.sort((a, b) => b.createdAt - a.createdAt);
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] Realtime subscription active');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchNotifications, mapRowToNotification, fetchAdminNotification, upsertLocalNotification]);

  const upsertLocalNotification = useCallback((notification: AppNotification) => {
    setNotifications((prev) => {
      const idx = prev.findIndex((n) => n.id === notification.id);
      if (idx === -1) {
        return [notification, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      }
      const copy = [...prev];
      copy[idx] = notification;
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    });
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markRead = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read) return; // Already read, no need to update

      // Optimistically update UI first for better UX
      setNotifications(ns => ns.map(n => (n.id === id ? { ...n, read: true } : n)));

      // Update database
      if (isSupabaseConfigured() && isUuid(id)) {
        const { data, error } = await supabase
          .from('admin_notification_recipients')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id)
          .select();

        if (error) {
          console.error('[Notifications] Error marking read:', {
            notificationId: id,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
          });
          // Revert optimistic update on error
          setNotifications(ns => ns.map(n => (n.id === id ? { ...n, read: false } : n)));
          return;
        }

        if (data && data.length > 0) {
          console.log('[Notifications] Successfully marked notification as read:', {
            notificationId: id,
            readAt: data[0].read_at,
          });
        } else {
          console.warn('[Notifications] No rows updated when marking as read:', id);
          // Revert optimistic update if no rows were updated
          setNotifications(ns => ns.map(n => (n.id === id ? { ...n, read: false } : n)));
        }
      }
    },
    [notifications, isUuid]
  );

  const markAllRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return; // Nothing to mark as read

    // Optimistically update UI first for better UX
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));

    // Update database
    if (isSupabaseConfigured() && user) {
      const { data, error } = await supabase
        .from('admin_notification_recipients')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)
        .select();

      if (error) {
        console.error('[Notifications] Error marking all read:', {
          userId: user.id,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
        // Revert optimistic update on error - restore previous read state
        setNotifications(ns => {
          const unreadIds = new Set(unreadNotifications.map(n => n.id));
          return ns.map(n => (unreadIds.has(n.id) ? { ...n, read: false } : n));
        });
        return;
      }

      const updatedCount = data?.length ?? 0;
      console.log('[Notifications] Successfully marked all notifications as read:', {
        userId: user.id,
        updatedCount,
      });
      
      // Refresh to ensure consistency with database
      // This ensures any notifications that were added while we were marking as read are also handled
      setTimeout(() => {
        refresh();
      }, 500);
    }
  }, [user, notifications, refresh]);

  const addNotification = useCallback(async (n: AppNotification) => {
    // Local helper for optimistic/UI-only notifications
    setNotifications(ns => [n, ...ns]);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setHasMore(false);
      setCurrentOffset(0);
      return;
    }
    await fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, 0, false);
  }, [user, fetchNotifications]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore || loading) {
      return;
    }
    await fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, currentOffset, true);
  }, [user, fetchNotifications, loadingMore, hasMore, loading, currentOffset]);

  return (
    <NotificationsContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markRead, 
      markAllRead, 
      addNotification, 
      loading, 
      loadingMore,
      hasMore,
      refresh,
      loadMore,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}



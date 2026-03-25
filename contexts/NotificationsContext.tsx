import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  type?: string;
  data?: any;
  actionLabel?: string;
  actionHref?: string;
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

const NOTIFICATIONS_PER_PAGE = 20;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mapRowToNotification = useCallback((row: any): AppNotification => {
    return {
      id: row.id,
      title: row.title || 'Notification',
      body: row.body || '',
      createdAt: new Date(row.created_at).getTime(),
      read: Boolean(row.is_read),
      type: row.type,
      data: row.data,
      actionLabel: row.data?.action_label,
      actionHref: row.data?.action_href,
    };
  }, []);

  const fetchNotifications = useCallback(
    async (userId: string, limit: number = NOTIFICATIONS_PER_PAGE, offset: number = 0, append: boolean = false) => {
      if (!isSupabaseConfigured()) {
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
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        const mapped = (data || []).map(mapRowToNotification);

        if (append) {
          setNotifications(prev => [...prev, ...mapped]);
          setCurrentOffset(offset + mapped.length);
        } else {
          setNotifications(mapped);
          setCurrentOffset(mapped.length);
        }

        setHasMore(mapped.length === limit);
      } catch (err) {
        console.error('[Notifications] Error fetching notifications:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mapRowToNotification]
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, 0, false);

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = mapRowToNotification(payload.new);
            setNotifications(prev => [newNotif, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = mapRowToNotification(payload.new);
            setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchNotifications, mapRowToNotification]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('[Notifications] Error marking read:', err);
      // Revert on error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    } catch (err) {
      console.error('[Notifications] Error marking all read:', err);
      // Refresh to get correct state
      fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, 0, false);
    }
  }, [user, fetchNotifications]);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications(prev => [n, ...prev]);
  }, []);

  const refresh = useCallback(async () => {
    if (user) await fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, 0, false);
  }, [user, fetchNotifications]);

  const loadMore = useCallback(async () => {
    if (user && hasMore && !loadingMore) {
      await fetchNotifications(user.id, NOTIFICATIONS_PER_PAGE, currentOffset, true);
    }
  }, [user, hasMore, loadingMore, currentOffset, fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Sync app icon badge count with unread notifications
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
    }
  }, [unreadCount]);

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

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

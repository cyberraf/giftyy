import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationsContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

const BRAND_COLOR = '#f75507';
const BRAND_LIGHT = '#FFF0E8';

export default function NotificationsScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, loading, loadingMore, hasMore, refresh, loadMore } = useNotifications();
  const [mode, setMode] = React.useState<'all' | 'unread'>('all');
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = React.useState(false);
  const data = React.useMemo(
    () => notifications.filter((n) => (mode === 'all' ? true : !n.read)),
    [notifications, mode]
  );

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="chevron.left" size={22} color="#111" weight="semibold" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            style={styles.markAllButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'unread'] as const).map((m) => {
          const active = mode === m;
          const count = m === 'unread' ? unreadCount : notifications.length;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.filterTab, active && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {m === 'all' ? 'All' : 'Unread'}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {loading && !refreshing && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottom + 100 } // Extra space for tab bar and safe area
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={BRAND_COLOR} />
                <Text style={styles.loadMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <IconSymbol name="bell.slash" size={48} color="#d1d5db" weight="light" />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                {mode === 'unread' 
                  ? "You don't have any unread notifications" 
                  : "You don't have any notifications yet"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isExpanded = expanded.has(item.id);
            return (
              <Pressable
                onPress={() => {
                  if (!item.read) {
                    markRead(item.id);
                  }
                  setExpanded((s) => {
                    const next = new Set(Array.from(s));
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}
                style={({ pressed }) => [
                  styles.card,
                  !item.read && styles.unreadCard,
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Unread indicator */}
                {!item.read && (
                  <View style={styles.unreadDot} />
                )}

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                  
                  {item.body && (
                    <Text 
                      numberOfLines={isExpanded ? undefined : 3} 
                      style={styles.cardBody}
                    >
                      {item.body}
                    </Text>
                  )}

                  {item.body && item.body.length > 100 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpanded((s) => {
                          const next = new Set(Array.from(s));
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      style={styles.expandButton}
                    >
                      <Text style={styles.expandButtonText}>
                        {isExpanded ? 'Show less' : 'Read more'}
                      </Text>
                    </Pressable>
                  )}

                  {item.actionHref && (
                    <Pressable 
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(item.actionHref as any);
                      }} 
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>
                        {item.actionLabel ?? 'View'}
                      </Text>
                      <IconSymbol name="arrow.right" size={16} color="white" weight="semibold" />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: BRAND_COLOR,
    fontSize: 14,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  filterTabActive: {
    backgroundColor: BRAND_LIGHT,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: BRAND_COLOR,
  },
  filterBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeActive: {
    backgroundColor: BRAND_COLOR,
  },
  filterBadgeText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
  },
  filterBadgeTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  unreadCard: {
    borderColor: BRAND_LIGHT,
    backgroundColor: BRAND_LIGHT,
    borderWidth: 1.5,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_COLOR,
  },
  cardContent: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 22,
  },
  cardTitleUnread: {
    color: '#111827',
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 2,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    marginTop: 4,
  },
  expandButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLOR,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
});



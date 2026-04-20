import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Announcement, AnnouncementCTA } from '@/types/announcement';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import AnnouncementPopup from '@/components/announcements/AnnouncementPopup';

type AnnouncementsContextType = {
  pendingAnnouncements: Announcement[];
  currentAnnouncement: Announcement | null;
};

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

const POPUP_DELAY_MS = 2000;

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const hasFetched = useRef(false);

  const currentAnnouncement = showPopup && queue.length > 0 ? queue[0] : null;

  // Fetch active announcements when user logs in
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setQueue([]);
      setShowPopup(false);
      hasFetched.current = false;
      return;
    }

    // Only fetch once per session (until user changes)
    if (hasFetched.current) return;
    hasFetched.current = true;

    let timeoutId: NodeJS.Timeout;

    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase.rpc('get_active_announcements', {
          p_user_id: user.id,
        });

        if (error) {
          console.warn('[Announcements] Error fetching:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const announcements: Announcement[] = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            body: row.body,
            image_url: row.image_url,
            frequency: row.frequency,
            priority: row.priority,
            cta_buttons: typeof row.cta_buttons === 'string'
              ? JSON.parse(row.cta_buttons)
              : row.cta_buttons || [],
            expires_at: row.expires_at,
            created_at: row.created_at,
          }));

          setQueue(announcements);

          // Delay popup so app feels settled after login
          timeoutId = setTimeout(() => {
            setShowPopup(true);
          }, POPUP_DELAY_MS);
        }
      } catch (err) {
        console.warn('[Announcements] Unexpected error:', err);
      }
    };

    fetchAnnouncements();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  // Record interaction with Supabase
  const recordInteraction = useCallback(
    async (announcementId: string, action: 'seen' | 'clicked' | 'dismissed') => {
      if (!user) return;
      try {
        await supabase.rpc('record_announcement_interaction', {
          p_announcement_id: announcementId,
          p_user_id: user.id,
          p_action: action,
        });
      } catch (err) {
        console.warn('[Announcements] Failed to record interaction:', err);
      }
    },
    [user]
  );

  // Record "seen" when popup becomes visible
  useEffect(() => {
    if (currentAnnouncement) {
      recordInteraction(currentAnnouncement.id, 'seen');
    }
  }, [currentAnnouncement?.id, recordInteraction]);

  // Advance to next announcement in queue
  const advanceQueue = useCallback(() => {
    setQueue(prev => {
      const next = prev.slice(1);
      if (next.length === 0) {
        setShowPopup(false);
      }
      return next;
    });
  }, []);

  const handleDismiss = useCallback(() => {
    if (currentAnnouncement) {
      recordInteraction(currentAnnouncement.id, 'dismissed');
    }
    advanceQueue();
  }, [currentAnnouncement, recordInteraction, advanceQueue]);

  const handleCTA = useCallback(
    (cta: AnnouncementCTA) => {
      if (currentAnnouncement) {
        if (cta.action === 'dismiss') {
          recordInteraction(currentAnnouncement.id, 'dismissed');
        } else {
          recordInteraction(currentAnnouncement.id, 'clicked');
        }
      }

      // Close popup first, then navigate
      advanceQueue();

      if (cta.action === 'navigate' && cta.route) {
        // Small delay to let modal close before navigation
        setTimeout(() => {
          router.push(cta.route as any);
        }, 300);
      } else if (cta.action === 'open_url' && cta.url) {
        Linking.openURL(cta.url).catch(() => {});
      }
    },
    [currentAnnouncement, recordInteraction, advanceQueue, router]
  );

  return (
    <AnnouncementsContext.Provider
      value={{
        pendingAnnouncements: queue,
        currentAnnouncement,
      }}
    >
      {children}
      <AnnouncementPopup
        announcement={currentAnnouncement}
        onDismiss={handleDismiss}
        onCTA={handleCTA}
      />
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) throw new Error('useAnnouncements must be used within AnnouncementsProvider');
  return ctx;
}

import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export type UserSettings = {
    user_id: string;
    push_notifications_enabled: boolean;
    email_notifications_enabled: boolean;
    occasion_reminders_enabled: boolean;
    order_updates_enabled: boolean;
    reminder_days_before: number[];
    timezone: string | null;
    theme: 'light' | 'dark' | 'system';
    language: string;
    updated_at: string;
};


export function useSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!user || !isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                setSettings(data as UserSettings);
            } else {
                // No settings row yet — upsert so concurrent calls don't race and produce a 23505
                const { data: newData, error: insertError } = await supabase
                    .from('user_settings')
                    .upsert({ user_id: user.id }, { onConflict: 'user_id' })
                    .select()
                    .single();

                if (insertError) throw insertError;
                setSettings(newData as UserSettings);
            }
        } catch (err: any) {
            console.error('[useSettings] Error fetching settings:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
        if (!user || !isSupabaseConfigured()) return { error: new Error('User not authenticated') };

        try {
            const { error: updateError } = await supabase
                .from('user_settings')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            setSettings(prev => prev ? { ...prev, ...updates } : null);
            return { error: null };
        } catch (err: any) {
            console.error('[useSettings] Error updating settings:', err);
            return { error: err as Error };
        }
    }, [user]);

    useEffect(() => {
        const syncTimezone = async () => {
            if (!user || !settings) return;

            try {
                const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (settings.timezone !== currentTimezone) {
                    await updateSettings({ timezone: currentTimezone });
                }
            } catch (err) {
                console.warn('[useSettings] Failed to detect or sync timezone:', err);
            }
        };

        fetchSettings();
        syncTimezone();
    }, [fetchSettings, user, settings?.user_id]); // Only re-run if user changes or settings for that user are loaded


    return {
        settings,
        loading,
        error,
        updateSettings,
        refresh: fetchSettings
    };
}

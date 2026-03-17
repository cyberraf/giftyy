import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

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

type SettingsContextType = {
    settings: UserSettings | null;
    loading: boolean;
    error: Error | null;
    updateSettings: (updates: Partial<UserSettings>) => Promise<{ error: Error | null }>;
    refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
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
                const { data: newData, error: insertError } = await supabase
                    .from('user_settings')
                    .upsert({ user_id: user.id }, { onConflict: 'user_id' })
                    .select()
                    .single();

                if (insertError) throw insertError;
                setSettings(newData as UserSettings);
            }
        } catch (err: any) {
            console.error('[SettingsContext] Error fetching settings:', err);
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
            console.error('[SettingsContext] Error updating settings:', err);
            return { error: err as Error };
        }
    }, [user]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider value={{ settings, loading, error, updateSettings, refresh: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettingsContext must be used within a SettingsProvider');
    }
    return context;
}

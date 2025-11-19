import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type Recipient = {
    id: string;
    firstName: string;
    lastName?: string;
    relationship: string;
    email?: string;
    phone: string;
    address: string;
    apartment?: string;
    city: string;
    state?: string;
    country: string;
    zip: string;
    sports?: string;
    hobbies?: string;
    favoriteColors?: string;
    favoriteArtists?: string;
    stylePreferences?: string;
    favoriteGenres?: string;
    personalityLifestyle?: string;
    giftTypePreference?: string;
    dietaryPreferences?: string;
    allergies?: string;
    recentLifeEvents?: string;
    ageRange?: string;
    notes?: string;
};

type RecipientsContextValue = {
    recipients: Recipient[];
    loading: boolean;
    setRecipients: (recipients: Recipient[]) => void;
    addRecipient: (recipient: Omit<Recipient, 'id'>) => Promise<{ error: Error | null }>;
    updateRecipient: (id: string, recipient: Partial<Recipient>) => Promise<{ error: Error | null }>;
    deleteRecipient: (id: string) => Promise<{ error: Error | null }>;
    refreshRecipients: () => Promise<void>;
};

const RecipientsContext = createContext<RecipientsContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to Recipient (camelCase)
function dbRowToRecipient(row: any): Recipient {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name || undefined,
        relationship: row.relationship,
        email: row.email || undefined,
        phone: row.phone,
        address: row.address,
        apartment: row.apartment || undefined,
        city: row.city,
        state: row.state || undefined,
        country: row.country,
        zip: row.zip,
        sports: row.sports || undefined,
        hobbies: row.hobbies || undefined,
        favoriteColors: row.favorite_colors || undefined,
        favoriteArtists: row.favorite_artists || undefined,
        stylePreferences: row.style_preferences || undefined,
        favoriteGenres: row.favorite_genres || undefined,
        personalityLifestyle: row.personality_lifestyle || undefined,
        giftTypePreference: row.gift_type_preference || undefined,
        dietaryPreferences: row.dietary_preferences || undefined,
        allergies: row.allergies || undefined,
        recentLifeEvents: row.recent_life_events || undefined,
        ageRange: row.age_range || undefined,
        notes: row.notes || undefined,
    };
}

// Helper function to convert Recipient (camelCase) to database row (snake_case)
function recipientToDbRow(recipient: Partial<Recipient>): any {
    const row: any = {};
    if (recipient.firstName !== undefined) row.first_name = recipient.firstName;
    if (recipient.lastName !== undefined) row.last_name = recipient.lastName;
    if (recipient.relationship !== undefined) row.relationship = recipient.relationship;
    if (recipient.email !== undefined) row.email = recipient.email;
    if (recipient.phone !== undefined) row.phone = recipient.phone;
    if (recipient.address !== undefined) row.address = recipient.address;
    if (recipient.apartment !== undefined) row.apartment = recipient.apartment;
    if (recipient.city !== undefined) row.city = recipient.city;
    if (recipient.state !== undefined) row.state = recipient.state;
    if (recipient.country !== undefined) row.country = recipient.country;
    if (recipient.zip !== undefined) row.zip = recipient.zip;
    if (recipient.sports !== undefined) row.sports = recipient.sports;
    if (recipient.hobbies !== undefined) row.hobbies = recipient.hobbies;
    if (recipient.favoriteColors !== undefined) row.favorite_colors = recipient.favoriteColors;
    if (recipient.favoriteArtists !== undefined) row.favorite_artists = recipient.favoriteArtists;
    if (recipient.stylePreferences !== undefined) row.style_preferences = recipient.stylePreferences;
    if (recipient.favoriteGenres !== undefined) row.favorite_genres = recipient.favoriteGenres;
    if (recipient.personalityLifestyle !== undefined) row.personality_lifestyle = recipient.personalityLifestyle;
    if (recipient.giftTypePreference !== undefined) row.gift_type_preference = recipient.giftTypePreference;
    if (recipient.dietaryPreferences !== undefined) row.dietary_preferences = recipient.dietaryPreferences;
    if (recipient.allergies !== undefined) row.allergies = recipient.allergies;
    if (recipient.recentLifeEvents !== undefined) row.recent_life_events = recipient.recentLifeEvents;
    if (recipient.ageRange !== undefined) row.age_range = recipient.ageRange;
    if (recipient.notes !== undefined) row.notes = recipient.notes;
    return row;
}

export function RecipientsProvider({ children }: { children: React.ReactNode }) {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Fetch recipients from Supabase
    const refreshRecipients = useCallback(async () => {
        if (!user) {
            setRecipients([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('recipients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching recipients:', error);
                return;
            }

            const fetchedRecipients = (data || []).map(dbRowToRecipient);
            setRecipients(fetchedRecipients);
        } catch (err) {
            console.error('Unexpected error fetching recipients:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch recipients when user changes
    useEffect(() => {
        refreshRecipients();
    }, [refreshRecipients]);

    const addRecipient = useCallback(async (recipient: Omit<Recipient, 'id'>): Promise<{ error: Error | null }> => {
        if (!user) {
            return { error: new Error('User not authenticated') };
        }

        try {
            const dbRow = recipientToDbRow(recipient);
            dbRow.user_id = user.id;

            const { data, error } = await supabase
                .from('recipients')
                .insert(dbRow)
                .select()
                .single();

            if (error) {
                console.error('Error adding recipient:', error);
                return { error: new Error(error.message) };
            }

            // Refresh the list
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            console.error('Unexpected error adding recipient:', err);
            return { error: err instanceof Error ? err : new Error(String(err)) };
        }
    }, [user, refreshRecipients]);

    const updateRecipient = useCallback(async (id: string, updates: Partial<Recipient>): Promise<{ error: Error | null }> => {
        if (!user) {
            return { error: new Error('User not authenticated') };
        }

        try {
            const dbRow = recipientToDbRow(updates);

            const { error } = await supabase
                .from('recipients')
                .update(dbRow)
                .eq('id', id)
                .eq('user_id', user.id); // Ensure user owns this recipient

            if (error) {
                console.error('Error updating recipient:', error);
                return { error: new Error(error.message) };
            }

            // Refresh the list
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            console.error('Unexpected error updating recipient:', err);
            return { error: err instanceof Error ? err : new Error(String(err)) };
        }
    }, [user, refreshRecipients]);

    const deleteRecipient = useCallback(async (id: string): Promise<{ error: Error | null }> => {
        if (!user) {
            return { error: new Error('User not authenticated') };
        }

        try {
            const { error } = await supabase
                .from('recipients')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id); // Ensure user owns this recipient

            if (error) {
                console.error('Error deleting recipient:', error);
                return { error: new Error(error.message) };
            }

            // Refresh the list
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            console.error('Unexpected error deleting recipient:', err);
            return { error: err instanceof Error ? err : new Error(String(err)) };
        }
    }, [user, refreshRecipients]);

    const value = useMemo(
        () => ({
            recipients,
            loading,
            setRecipients,
            addRecipient,
            updateRecipient,
            deleteRecipient,
            refreshRecipients,
        }),
        [recipients, loading, addRecipient, updateRecipient, deleteRecipient, refreshRecipients]
    );

    return <RecipientsContext.Provider value={value}>{children}</RecipientsContext.Provider>;
}

export function useRecipients() {
    const ctx = useContext(RecipientsContext);
    if (!ctx) {
        throw new Error('useRecipients must be used within RecipientsProvider');
    }
    return ctx;
}


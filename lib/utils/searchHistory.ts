import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@giftyy:recent_searches';
const MAX_ITEMS = 10;

export async function getRecentSearches(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function addRecentSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
        const existing = await getRecentSearches();
        // Remove duplicate if exists, then prepend
        const updated = [trimmed, ...existing.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_ITEMS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Silently fail
    }
}

export async function removeRecentSearch(query: string): Promise<void> {
    try {
        const existing = await getRecentSearches();
        const updated = existing.filter(s => s !== query);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Silently fail
    }
}

export async function clearRecentSearches(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
        // Silently fail
    }
}

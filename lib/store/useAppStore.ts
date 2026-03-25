import { create } from 'zustand';

type AppState = {
	activeRecipientId: string | null;
	setActiveRecipient: (id: string | null) => void;
	clearActiveRecipient: () => void;
	
	homeAiState: {
		messages: any[] | null;
		sessionId: string | null;
		text: string;
		isExpanded: boolean;
		sessionState: any | null;
		lastActiveAt: number | null;
	} | null;
	setHomeAiState: (state: Partial<NonNullable<AppState['homeAiState']>>) => void;
	clearHomeAiState: () => void;
	
	homeDataCache: {
		myProfileId: string | null;
		circleOccasions: any[];
		myProfileOccasions: any[];
		ignoredOccasionIds: string[];
		myPreferences: any | null;
		lastFetched: number;
	} | null;
	setHomeDataCache: (cache: Partial<NonNullable<AppState['homeDataCache']>>) => void;
};

/**
 * Global lightweight app store.
 *
 * NOTE:
 * - This is intentionally minimal and focused only on UI-level state
 *   that multiple screens care about (active recipient on Home / AI flows).
 * - No Supabase or network calls should live in this store.
 */
export const useAppStore = create<AppState>((set) => ({
	activeRecipientId: null,
	setActiveRecipient: (id) => set({ activeRecipientId: id }),
	clearActiveRecipient: () => set({ activeRecipientId: null }),

	homeAiState: null,
	setHomeAiState: (newState) => set((s) => ({
		homeAiState: {
			...(s.homeAiState || { messages: null, sessionId: null, text: '', isExpanded: false, sessionState: null, lastActiveAt: null }),
			...newState
		}
	})),
	clearHomeAiState: () => set({ homeAiState: null }),

	homeDataCache: null,
	setHomeDataCache: (newCache) => set((s) => ({
		homeDataCache: {
			...(s.homeDataCache || { myProfileId: null, circleOccasions: [], myProfileOccasions: [], ignoredOccasionIds: [], myPreferences: null, lastFetched: 0 }),
			...newCache
		}
	})),
}));


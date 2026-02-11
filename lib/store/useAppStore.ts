import { create } from 'zustand';

type AppState = {
	activeRecipientId: string | null;
	setActiveRecipient: (id: string | null) => void;
	clearActiveRecipient: () => void;
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
}));


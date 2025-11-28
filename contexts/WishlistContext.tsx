import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logProductAnalyticsEvent } from '@/lib/product-analytics';

const STORAGE_KEY = '@giftyy:wishlist';

type WishlistItem = {
	productId: string;
	addedAt: string;
};

type WishlistContextValue = {
	wishlist: WishlistItem[];
	isWishlisted: (productId: string) => boolean;
	toggleWishlist: (productId: string) => Promise<void>;
	removeFromWishlist: (productId: string) => Promise<void>;
	clearWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
	const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
	const [hydrated, setHydrated] = useState(false);

	// Load wishlist from storage
	useEffect(() => {
		const loadWishlist = async () => {
			try {
				const stored = await AsyncStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					if (Array.isArray(parsed)) {
						setWishlist(parsed);
					}
				}
			} catch (error) {
				console.warn('[Wishlist] Failed to load wishlist from storage', error);
			} finally {
				setHydrated(true);
			}
		};

		loadWishlist();
	}, []);

	const persistWishlist = useCallback(async (items: WishlistItem[]) => {
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch (error) {
			console.warn('[Wishlist] Failed to persist wishlist', error);
		}
	}, []);

	const isWishlisted = useCallback(
		(productId: string) => {
			if (!productId) return false;
			return wishlist.some((item) => item.productId === productId);
		},
		[wishlist]
	);

	const toggleWishlist = useCallback(
		async (productId: string) => {
			if (!productId) return;

			const alreadyWishlisted = wishlist.some((item) => item.productId === productId);

			setWishlist((prev) => {
				let next: WishlistItem[];
				if (alreadyWishlisted) {
					next = prev.filter((item) => item.productId !== productId);
				} else {
					next = [...prev, { productId, addedAt: new Date().toISOString() }];
				}

				if (hydrated) {
					persistWishlist(next);
				}
				return next;
			});

			if (!alreadyWishlisted) {
				logProductAnalyticsEvent({
					productId,
					eventType: 'wishlist',
				});
			}
		},
		[wishlist, hydrated, persistWishlist]
	);

	const removeFromWishlist = useCallback(
		async (productId: string) => {
			if (!productId) return;
			setWishlist((prev) => {
				const next = prev.filter((item) => item.productId !== productId);
				if (hydrated) {
					persistWishlist(next);
				}
				return next;
			});
		},
		[hydrated, persistWishlist]
	);

	const clearWishlist = useCallback(async () => {
		setWishlist([]);
		if (hydrated) {
			try {
				await AsyncStorage.removeItem(STORAGE_KEY);
			} catch (error) {
				console.warn('[Wishlist] Failed to clear wishlist', error);
			}
		}
	}, [hydrated]);

	const value = useMemo(
		() => ({
			wishlist,
			isWishlisted,
			toggleWishlist,
			removeFromWishlist,
			clearWishlist,
		}),
		[wishlist, isWishlisted, toggleWishlist, removeFromWishlist, clearWishlist]
	);

	return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
	const ctx = React.useContext(WishlistContext);
	if (!ctx) {
		throw new Error('useWishlist must be used within WishlistProvider');
	}
	return ctx;
}



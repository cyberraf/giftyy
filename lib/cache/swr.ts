import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stale-While-Revalidate (SWR) cache utility.
 *
 * Returns cached data immediately (stale), then revalidates from the
 * network in the background and updates the cache.
 *
 * Usage:
 *   const { data, isStale } = await swr('products', fetchProducts, { maxAgeMs: 5 * 60_000 });
 *   // data is available immediately from cache (if cached)
 *   // isStale = true means the data came from cache and a revalidation fetch was started
 */

const CACHE_PREFIX = '@giftyy:swr:';

type SWROptions = {
	/** Maximum age of cached data before it's considered stale (default: 5 min) */
	maxAgeMs?: number;
	/** Maximum age before cache is completely expired and must be refetched (default: 24h) */
	expireMs?: number;
};

type CacheEntry<T> = {
	data: T;
	cachedAt: number;
};

type SWRResult<T> = {
	data: T | null;
	isStale: boolean;
	isCached: boolean;
};

/**
 * Read from cache. Returns null if no cache entry exists.
 */
async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
	try {
		const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
		if (!raw) return null;
		return JSON.parse(raw) as CacheEntry<T>;
	} catch {
		return null;
	}
}

/**
 * Write to cache.
 */
async function writeCache<T>(key: string, data: T): Promise<void> {
	try {
		const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
		await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
	} catch (e) {
		console.warn('[SWR] Cache write failed:', key, e);
	}
}

/**
 * Stale-while-revalidate: returns cached data immediately if available,
 * then revalidates in the background.
 *
 * @param key     Unique cache key
 * @param fetcher Async function that fetches fresh data
 * @param options Cache timing options
 * @returns       Cached data (or null) + staleness info
 *
 * The caller should:
 * 1. Use `result.data` immediately to populate UI
 * 2. If `result.isStale`, call `fetcher()` again and update state when done
 *    (this function does NOT auto-revalidate — the caller decides when to update UI)
 */
export async function swrRead<T>(
	key: string,
	options: SWROptions = {},
): Promise<SWRResult<T>> {
	const { maxAgeMs = 5 * 60_000, expireMs = 24 * 60 * 60_000 } = options;

	const cached = await readCache<T>(key);
	if (!cached) {
		return { data: null, isStale: true, isCached: false };
	}

	const age = Date.now() - cached.cachedAt;

	// Completely expired — treat as no cache
	if (age > expireMs) {
		return { data: null, isStale: true, isCached: false };
	}

	// Stale but still usable
	if (age > maxAgeMs) {
		return { data: cached.data, isStale: true, isCached: true };
	}

	// Fresh
	return { data: cached.data, isStale: false, isCached: true };
}

/**
 * Write fresh data to the SWR cache after a successful fetch.
 */
export async function swrWrite<T>(key: string, data: T): Promise<void> {
	await writeCache(key, data);
}

/**
 * Invalidate a specific cache key.
 */
export async function swrInvalidate(key: string): Promise<void> {
	try {
		await AsyncStorage.removeItem(CACHE_PREFIX + key);
	} catch {
		// ignore
	}
}

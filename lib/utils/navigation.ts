import type { Router } from 'expo-router';

/** Default when there is no navigation history (cold start / deep link). */
export const BUYER_FALLBACK_HOME = '/(buyer)/(tabs)/home' as const;

export const BUYER_FALLBACK_SHOP = '/(buyer)/(tabs)/shop' as const;

function normalizeReturnTo(
    value: string | string[] | undefined
): string | undefined {
    if (value == null) return undefined;
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string') return undefined;
    const t = raw.trim();
    return t.length > 0 ? t : undefined;
}

/**
 * Safely navigate back using the stack history.
 * If the stack is empty (e.g. deep link, cold start), falls back to a sensible route.
 */
export function safeGoBack(router: Router, fallback?: string) {
    if (router.canGoBack()) {
        router.back();
    } else {
        router.replace((fallback ?? BUYER_FALLBACK_HOME) as any);
    }
}

export type SmartBuyerBackOptions = {
    /**
     * When there is no stack to pop, go here (e.g. `returnTo` passed when opening PDP).
     * Uses `replace` so we don't stack duplicate entries.
     */
    returnTo?: string | string[] | undefined;
    /** Search screen with no history: prefer shop over home. */
    preferShopFallback?: boolean;
    /** Explicit fallback when no history and no returnTo. */
    fallback?: string;
};

/**
 * Intelligent buyer back: always prefers real history (`router.back()`), then optional
 * `returnTo`, then contextual defaults. Avoids jumping to a hardcoded route while
 * the user still has stack entries (unlike navigating to `returnTo` before `back()`).
 */
export function smartBuyerBack(router: Router, opts: SmartBuyerBackOptions = {}) {
    if (router.canGoBack()) {
        router.back();
        return;
    }

    const returnTo = normalizeReturnTo(opts.returnTo);
    if (returnTo) {
        router.replace(returnTo as any);
        return;
    }

    if (opts.preferShopFallback) {
        router.replace(BUYER_FALLBACK_SHOP as any);
        return;
    }

    router.replace((opts.fallback ?? BUYER_FALLBACK_HOME) as any);
}

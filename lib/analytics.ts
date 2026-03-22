import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Lightweight analytics module for tracking user behavior.
 *
 * Events are batched in memory and flushed periodically or when the batch
 * reaches a configurable size. This avoids one network request per event.
 *
 * Product-specific events remain in `lib/product-analytics.ts`.
 * This module handles broader user-level tracking:
 *   - Screen views
 *   - Funnel milestones (signup → browse → cart → checkout → purchase)
 *   - Search queries
 *   - Feature usage
 */

export type AnalyticsEvent = {
	event_type: string;
	screen?: string;
	metadata?: Record<string, unknown>;
};

type QueuedEvent = AnalyticsEvent & {
	timestamp: string; // ISO string
	user_id: string | null;
	session_id: string;
};

// ── Configuration ──────────────────────────────────────────────────────

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

// ── State ──────────────────────────────────────────────────────────────

let _queue: QueuedEvent[] = [];
let _userId: string | null = null;
let _sessionId: string = generateSessionId();
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _isFlushing = false;

// ── Public API ─────────────────────────────────────────────────────────

/** Set the current authenticated user ID. Call on login/logout. */
export function identifyUser(userId: string | null): void {
	_userId = userId;
}

/** Track an analytics event. Non-blocking — events are batched. */
export function trackEvent(event: AnalyticsEvent): void {
	if (!isSupabaseConfigured()) return;

	_queue.push({
		...event,
		timestamp: new Date().toISOString(),
		user_id: _userId,
		session_id: _sessionId,
	});

	if (_queue.length >= BATCH_SIZE) {
		flushEvents();
	}
}

/** Convenience: track a screen view. */
export function trackScreenView(screen: string): void {
	trackEvent({ event_type: 'screen_view', screen });
}

/** Convenience: track a search query. */
export function trackSearch(query: string, resultCount?: number): void {
	trackEvent({
		event_type: 'search',
		screen: 'search',
		metadata: { query, result_count: resultCount },
	});
}

/** Convenience: track funnel milestones. */
export function trackFunnel(step: string, metadata?: Record<string, unknown>): void {
	trackEvent({
		event_type: 'funnel',
		metadata: { step, ...metadata },
	});
}

/** Start the periodic flush timer. Call once at app startup. */
export function startAnalytics(): void {
	if (_flushTimer) return;
	_sessionId = generateSessionId();
	_flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);
}

/** Stop the flush timer and flush remaining events. */
export function stopAnalytics(): void {
	if (_flushTimer) {
		clearInterval(_flushTimer);
		_flushTimer = null;
	}
	flushEvents();
}

// ── Internal ───────────────────────────────────────────────────────────

async function flushEvents(): Promise<void> {
	if (_isFlushing || _queue.length === 0) return;
	_isFlushing = true;

	const batch = _queue.splice(0);

	try {
		const { error } = await supabase.from('analytics_events').insert(
			batch.map((e) => ({
				event_type: e.event_type,
				screen: e.screen ?? null,
				metadata: e.metadata ?? null,
				user_id: e.user_id,
				session_id: e.session_id,
				created_at: e.timestamp,
			})),
		);

		if (error) {
			// Put events back at the front of the queue (they'll retry next flush)
			console.warn('[Analytics] Flush failed, re-queuing', error.message);
			_queue.unshift(...batch);
			// Cap queue to prevent unbounded growth
			if (_queue.length > 200) {
				_queue = _queue.slice(-200);
			}
		}
	} catch (err) {
		console.warn('[Analytics] Flush error', err);
		_queue.unshift(...batch);
		if (_queue.length > 200) {
			_queue = _queue.slice(-200);
		}
	} finally {
		_isFlushing = false;
	}
}

function generateSessionId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

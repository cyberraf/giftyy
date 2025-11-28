import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type ProductAnalyticsEventType = 'view' | 'share' | 'wishlist' | 'added_to_cart' | 'purchase';

type LogEventOptions = {
	productId?: string | null;
	eventType: ProductAnalyticsEventType;
	metadata?: Record<string, unknown>;
};

export async function logProductAnalyticsEvent({ productId, eventType, metadata }: LogEventOptions) {
	if (!productId) {
		return { error: new Error('Product ID is required for analytics logging') };
	}

	if (!isSupabaseConfigured()) {
		return { error: new Error('Supabase not configured') };
	}

	try {
		const { error } = await supabase.from('product_analytics_events').insert({
			product_id: productId,
			event_type: eventType,
			metadata: metadata ?? null,
		});

		if (error) {
			console.warn('[Analytics] Failed to log product event', eventType, productId, error);
			return { error };
		}

		return { error: null };
	} catch (err) {
		console.warn('[Analytics] Unexpected error logging product event', eventType, productId, err);
		return { error: err instanceof Error ? err : new Error(String(err)) };
	}
}



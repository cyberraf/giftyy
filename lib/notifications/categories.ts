import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification category identifiers.
 * These must match the categoryId sent from the server in push payloads.
 */
export const NOTIFICATION_CATEGORIES = {
	ORDER_STATUS: 'order_status',
	GIFT_RECEIVED: 'gift_received',
	OCCASION_REMINDER: 'occasion_reminder',
	PROMO: 'promo',
} as const;

/**
 * Action identifiers used in notification buttons.
 */
export const NOTIFICATION_ACTIONS = {
	VIEW_ORDER: 'view_order',
	TRACK_ORDER: 'track_order',
	OPEN_GIFT: 'open_gift',
	SHOP_NOW: 'shop_now',
	REMIND_LATER: 'remind_later',
} as const;

/**
 * Registers all notification categories with expo-notifications.
 * Must be called once during app initialization (before any notifications arrive).
 *
 * Categories define the action buttons shown on notifications:
 * - iOS: shown in notification long-press / expanded view
 * - Android: shown as notification action buttons
 */
export async function registerNotificationCategories(): Promise<void> {
	if (Platform.OS === 'web') return;

	try {
		await Notifications.setNotificationCategoryAsync(
			NOTIFICATION_CATEGORIES.ORDER_STATUS,
			[
				{
					identifier: NOTIFICATION_ACTIONS.VIEW_ORDER,
					buttonTitle: 'View Order',
					options: { opensAppToForeground: true },
				},
				{
					identifier: NOTIFICATION_ACTIONS.TRACK_ORDER,
					buttonTitle: 'Track',
					options: { opensAppToForeground: true },
				},
			]
		);

		await Notifications.setNotificationCategoryAsync(
			NOTIFICATION_CATEGORIES.GIFT_RECEIVED,
			[
				{
					identifier: NOTIFICATION_ACTIONS.OPEN_GIFT,
					buttonTitle: 'Open Gift',
					options: { opensAppToForeground: true },
				},
			]
		);

		await Notifications.setNotificationCategoryAsync(
			NOTIFICATION_CATEGORIES.OCCASION_REMINDER,
			[
				{
					identifier: NOTIFICATION_ACTIONS.SHOP_NOW,
					buttonTitle: 'Shop Now',
					options: { opensAppToForeground: true },
				},
				{
					identifier: NOTIFICATION_ACTIONS.REMIND_LATER,
					buttonTitle: 'Remind Later',
					options: { opensAppToForeground: false },
				},
			]
		);

		await Notifications.setNotificationCategoryAsync(
			NOTIFICATION_CATEGORIES.PROMO,
			[
				{
					identifier: NOTIFICATION_ACTIONS.SHOP_NOW,
					buttonTitle: 'Shop Now',
					options: { opensAppToForeground: true },
				},
			]
		);

		console.log('[Notifications] Categories registered');
	} catch (e) {
		console.warn('[Notifications] Failed to register categories:', e);
	}
}

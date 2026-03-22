import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { NOTIFICATION_ACTIONS } from './categories';

/**
 * Request notification permissions on app launch
 * Retrieve Expo push token
 * Detect platform (ios/android)
 * Store/update token in Supabase linked to the authenticated user
 */
export async function registerForPushNotifications(userId: string) {
  try {
    console.log('[PushNotifications] Starting registration for user:', userId);

    // 1. Check if running on a real device
    if (!Device.isDevice) {
      console.log('[PushNotifications] Must use physical device for Push Notifications');
      return null;
    }

    // 2. Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    console.log('[PushNotifications] Permission status:', finalStatus);

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted for push notifications.');
      return null;
    }

    // 3. Get Expo push token
    // Get the project ID from constants if available
    const projectId =
      require('expo-constants').default?.expoConfig?.extra?.eas?.projectId ??
      require('expo-constants').default?.easConfig?.projectId;

    if (!projectId) {
      console.warn('[PushNotifications] No EAS Project ID found. Push notification token retrieval might fail.');
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResponse.data;
    console.log('[PushNotifications] Token generated:', token);

    // 4. Detect platform
    const platform = Platform.OS;
    const deviceName = Device.modelName || 'Unknown Device';

    // 5. Save token to Supabase
    // Table: push_tokens
    // Fields: user_id, token, platform, device_name, updated_at
    const { error: upsertError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token: token,
          platform: platform,
          device_name: deviceName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, token' }
      );

    if (upsertError) {
      console.error('[PushNotifications] Error saving token to Supabase:', upsertError);
      // We don't crash the app if this fails
    } else {
      console.log('[PushNotifications] Token successfully saved/updated in Supabase');
    }

    return token;
  } catch (err) {
    console.error('[PushNotifications] Unexpected error during registration:', err);
    return null;
  }
}

// Optional: Foreground notification handler
export function setupForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Set up listener for when users tap on push notifications.
 * Routes to the appropriate screen based on the notification category action
 * and attached data. Falls back to the notifications screen.
 * Returns cleanup function to remove the listener.
 */
export function setupNotificationResponseHandler() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { content } = response.notification.request;
    const actionId = response.actionIdentifier;
    const data = content.data as Record<string, any> | undefined;

    console.log('[PushNotifications] Notification tapped:', { actionId, data });

    try {
      // Handle specific action button taps
      switch (actionId) {
        case NOTIFICATION_ACTIONS.VIEW_ORDER:
        case NOTIFICATION_ACTIONS.TRACK_ORDER:
          if (data?.orderId) {
            router.push({ pathname: '/(buyer)/orders/[id]', params: { id: data.orderId } });
          } else {
            router.push('/(buyer)/notifications');
          }
          return;

        case NOTIFICATION_ACTIONS.OPEN_GIFT:
          if (data?.giftCode) {
            router.push({ pathname: '/gift/[code]', params: { code: data.giftCode } });
          } else {
            router.push('/(buyer)/notifications');
          }
          return;

        case NOTIFICATION_ACTIONS.SHOP_NOW:
          router.push('/(buyer)/(tabs)/shop');
          return;

        case NOTIFICATION_ACTIONS.REMIND_LATER:
          // No navigation — handled in background
          return;

        default:
          break;
      }

      // Default tap (no specific action) — route based on data type
      if (data?.type === 'order_status' && data?.orderId) {
        router.push({ pathname: '/(buyer)/orders/[id]', params: { id: data.orderId } });
      } else if (data?.type === 'gift_received' && data?.giftCode) {
        router.push({ pathname: '/gift/[code]', params: { code: data.giftCode } });
      } else {
        router.push('/(buyer)/notifications');
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to navigate on notification tap:', err);
    }
  });

  return () => subscription.remove();
}

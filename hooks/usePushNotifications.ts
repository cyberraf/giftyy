import * as Device from 'expo-device';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { registerForPushNotificationsAsync } from '../src/push/registerForPush';

export function usePushNotifications(userId: string | undefined) {
    const registerToken = useCallback(async () => {
        if (!userId) return;

        try {
            const token = await registerForPushNotificationsAsync();
            if (!token) return;

            const deviceName = Device.deviceName || 'Unknown Device';
            const platform = Platform.OS;

            // Call the Supabase RPC to register the token
            const { error } = await supabase.rpc('register_push_token', {
                p_user_id: userId,
                p_token: token,
                p_device_name: deviceName,
                p_platform: platform
            });

            if (error) {
                console.error('[usePushNotifications] Error registering token:', error);
            } else {
                console.log('[usePushNotifications] Token registered successfully');
            }
        } catch (error) {
            console.warn('[usePushNotifications] Failed to register push notifications:', error);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            registerToken();
        }
    }, [userId, registerToken]);

    return { registerToken };
}

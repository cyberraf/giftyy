import { Platform } from 'react-native';

// Safe require for native modules
const getNotifications = () => {
    if (Platform.OS === 'web') return null;
    try {
        return require('expo-notifications');
    } catch (e) {
        return null;
    }
};

const getDevice = () => {
    if (Platform.OS === 'web') return null;
    try {
        const { NativeModules } = require('react-native');
        if (!NativeModules.ExpoDevice && !NativeModules.ExpoDeviceModule && !(global as any).ExpoModules?.ExpoDevice) {
            return null;
        }
        return require('expo-device');
    } catch (e) {
        return null;
    }
};

export { registerForPushNotificationsAsync } from '../src/push/registerForPush';

export function setupNotificationHandlers() {
    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (e) {
        console.warn('[Notifications] Failed to set handler:', e);
    }
}

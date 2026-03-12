import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
        throw new Error("Push notifications require a physical device.");
    }

    // Ask permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        throw new Error("Permission not granted for push notifications.");
    }

    // Get Expo push token
    // projectId is required for newer Expo versions to get the token correctly
    const projectId =
        require("expo-constants").default?.expoConfig?.extra?.eas?.projectId ??
        require("expo-constants").default?.easConfig?.projectId;

    if (!projectId) {
        console.warn("No EAS Project ID found. Push notification token retrieval might fail.");
    }

    const token = await Notifications.getExpoPushTokenAsync({
        projectId,
    });
    // token.data looks like: ExponentPushToken[xxxx]
    // Send token.data to your backend and store it per user
    console.log("Expo push token:", token.data);

    // Android notification channel (required for good behavior)
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    return token.data;
}

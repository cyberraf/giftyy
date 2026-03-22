import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap — use for button presses, tab switches */
export const hapticLight = () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
};

/** Medium tap — use for add-to-cart, form submit, toggle */
export const hapticMedium = () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
};

/** Success — use after successful actions (save, purchase) */
export const hapticSuccess = () => {
    if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
};

/** Error — use after failed actions */
export const hapticError = () => {
    if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
};

/** Warning — use for destructive action confirmations */
export const hapticWarning = () => {
    if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
};

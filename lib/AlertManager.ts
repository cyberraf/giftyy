import { ToastType } from '@/components/ui/PremiumToast';
import { Alert as RNAlert } from 'react-native';

type AlertButton = {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
};

type AlertHandler = (title: string, message: string, buttons?: AlertButton[]) => void;
type ToastHandler = (message: string, type?: ToastType, duration?: number) => void;

let alertHandler: AlertHandler | null = null;
let toastHandler: ToastHandler | null = null;
const originalRNAlert = RNAlert.alert;

/**
 * Register the alert handler from the AlertContext.
 * This should only be called once by the AlertProvider.
 */
export const setAlertHandler = (handler: AlertHandler) => {
    alertHandler = handler;
};

/**
 * Register the toast handler from the ToastContext.
 * This should only be called once by the ToastProvider.
 */
export const setToastHandler = (handler: ToastHandler) => {
    toastHandler = handler;
};

/**
 * Trigger a Giftyy-styled alert from anywhere in the app.
 * Can be used in utility files, hooks, or components.
 */
export const GiftyyAlert = (title: string, message: string, buttons?: AlertButton[]) => {
    if (alertHandler) {
        alertHandler(title, message, buttons);
    } else {
        // Fallback to native RN Alert if handler not yet registered
        console.warn(`[AlertManager] Alert triggered before handler was set: ${title} - ${message}`);
        originalRNAlert(title, message, buttons);
    }
};

/**
 * Trigger a Giftyy-styled toast from anywhere in the app.
 */
export const GiftyyToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    if (toastHandler) {
        toastHandler(message, type, duration);
    } else {
        console.warn(`[AlertManager] Toast triggered before handler was set: ${message}`);
        // Fallback to alert if toast not available
        GiftyyAlert(type.toUpperCase(), message);
    }
};

/**
 * Globalizes the GiftyyAlert by monkey-patching React Native's Alert.alert.
 * This ensures ALL existing and future Alert.alert() calls use the new design.
 */
export const initializeGlobalAlert = () => {
    // @ts-ignore - Overwriting RN static method
    RNAlert.alert = (title: string, message?: string, buttons?: AlertButton[], options?: any) => {
        GiftyyAlert(title, message || '', buttons);
    };

    // Also patch the browser-style global alert() if available
    if (typeof global !== 'undefined') {
        // @ts-ignore
        global.alert = (message: string) => {
            GiftyyAlert('Alert', message);
        };
    }
};

/**
 * Unified notification utility that can trigger either an alert or a toast.
 */
export const GiftyyNotify = {
    alert: GiftyyAlert,
    toast: GiftyyToast
};

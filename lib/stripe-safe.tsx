import Constants from 'expo-constants';
import React from 'react';
import { Platform, Text, View } from 'react-native';

/**
 * Safe Stripe Wrapper
 * 
 * The @stripe/stripe-react-native SDK can crash in environments where its native module is missing 
 * (like Expo Go without the plugin correctly pre-built, or certain web/node environments).
 * 
 * This wrapper ensures the app stays stable by:
 * 1. Catching initialization errors.
 * 2. Providing typed null-op fallbacks for hooks.
 * 3. Safely wrapping the Provider.
 */

let StripeLib: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

try {
    // Attempt to require on native platforms (we rely on the try-catch to detect if native module exists)
    if (Platform.OS !== 'web') {
        StripeLib = require('@stripe/stripe-react-native');
    } else {
        console.log(`[StripeSafe] Running in Web. Using fallbacks (Mock Mode).`);
    }
} catch (e) {
    console.warn('[StripeSafe] Failed to require @stripe/stripe-react-native. Native module missing? Using fallbacks (Mock Mode).');
}

/**
 * Safe version of StripeProvider
 */
export const SafeStripeProvider = ({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) => {
    if (StripeLib?.StripeProvider && Platform.OS !== 'web' && publishableKey) {
        return (
            <StripeLib.StripeProvider publishableKey={publishableKey}>
                {children}
            </StripeLib.StripeProvider>
        );
    }
    return <>{children}</>;
};

/**
 * Safe version of CardField
 */
export const SafeCardField = (props: any) => {
    if (StripeLib?.CardField && Platform.OS !== 'web') {
        return <StripeLib.CardField {...props} />;
    }
    return (
        <View style={[{ height: 50, backgroundColor: '#f3f4f6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 8 }, props.style]}>
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>[Mock Stripe CardField]</Text>
        </View>
    );
};

/**
 * Safe version of useStripe hook
 */
export const useSafeStripe = () => {
    // If library is loaded and we're on native, try to use the real hook
    if (StripeLib?.useStripe && Platform.OS !== 'web') {
        try {
            return StripeLib.useStripe();
        } catch (e) {
            console.warn('[StripeSafe] useStripe failed (likely missing native module):', e);
        }
    }

    // Fallback implementation for Expo Go / Web
    return {
        initPaymentSheet: async () => {
            console.log('[StripeSafe] Mock: initPaymentSheet success');
            return { error: undefined };
        },
        presentPaymentSheet: async () => {
            console.log('[StripeSafe] Mock: presentPaymentSheet success');
            // Simulate a short delay for the "payment"
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { error: undefined };
        },
        confirmPayment: async () => ({ error: undefined }),
        createToken: async () => ({ error: { code: 'Failed', message: 'Stripe tokens not supported in mock mode' } }),
        createPaymentMethod: async () => ({ error: { code: 'Failed', message: 'Stripe payment methods not supported in mock mode' } }),
        handleNextAction: async () => ({ error: undefined }),
    };
};

import * as Sentry from '@sentry/react-native';
import { configureReanimatedLogger } from 'react-native-reanimated';

// Initialize Sentry for error tracking and performance monitoring
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  // Only enable in production builds
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  // Capture unhandled promise rejections
  enableAutoSessionTracking: true,
});

try {
  configureReanimatedLogger({
    strict: false, // Disable strict mode warnings about reading from `value` during render
  });
} catch (e) {
  console.warn('Reanimated logger configuration failed:', e);
}

// Import polyfills for React Native (required for Supabase)
import { decode, encode } from 'base-64';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Polyfill for base64 encoding/decoding (required by Supabase)
if (!global.btoa) {
  global.btoa = encode;
}
if (!global.atob) {
  global.atob = decode;
}

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#fff5f0',
  },
};

import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AlertProvider } from '@/contexts/AlertContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { AnnouncementsProvider } from '@/contexts/AnnouncementsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { RecipientsProvider } from '@/contexts/RecipientsContext';
import { SharedMemoriesProvider } from '@/contexts/SharedMemoriesContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { VaultsProvider } from '@/contexts/VaultsContext';
import { VideoMessagesProvider } from '@/contexts/VideoMessagesContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { initializeGlobalAlert } from '@/lib/AlertManager';
import { CheckoutProvider } from '@/lib/CheckoutContext';
import { SafeStripeProvider } from '@/lib/stripe-safe';
import { TourProvider } from '@/contexts/TourContext';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { initSyncManager } from '@/lib/offline/syncManager';
import { startAnalytics, stopAnalytics, identifyUser, trackScreenView } from '@/lib/analytics';
import { setupForegroundHandler, setupNotificationResponseHandler } from '@/lib/notifications/registerForPush';
import { registerNotificationCategories } from '@/lib/notifications/categories';

export const unstable_settings = {
  anchor: '(buyer)',
};

SplashScreen.preventAutoHideAsync().catch(() => { });

import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/hooks/useSettings';
import { SettingsProvider } from '@/contexts/SettingsContext';

function RootLayout() {
  // Initialize global alert system to intercept Alert.alert calls
  useEffect(() => {
    initializeGlobalAlert();
    setupForegroundHandler();
    registerNotificationCategories();
    const cleanupResponseHandler = setupNotificationResponseHandler();
    const cleanupSyncManager = initSyncManager();
    startAnalytics();
    return () => {
      cleanupResponseHandler();
      cleanupSyncManager();
      stopAnalytics();
    };
  }, []);

  // Hide native splash screen after a short delay to let the app settle
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider value={AppTheme}>
        <SafeStripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
          <TourProvider>
            <AlertProvider>
              <ToastProvider>
                <NetworkProvider>
                <AuthProvider>
                  <SettingsProvider>
                    <LanguageSync />
                    <CartProvider>
                    <WishlistProvider>
                      <CheckoutProvider>
                        <RecipientsProvider>
                          <VideoMessagesProvider>
                            <SharedMemoriesProvider>
                              <VaultsProvider>
                                <OrdersProvider>
                                  <CategoriesProvider>
                                    <ProductsProvider>
                                      <NotificationsProvider>
                                        <AnnouncementsProvider>
                                          <KeyboardAvoidingView
                                            style={{ flex: 1 }}
                                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                          >
                                            <AuthGuard>
                                              <Stack>
                                                <Stack.Screen name="index" options={{ headerShown: false }} />
                                                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                                                <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                                                <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
                                                <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
                                                <Stack.Screen name="offline" options={{ headerShown: false }} />
                                                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                                              </Stack>
                                            </AuthGuard>
                                          </KeyboardAvoidingView>
                                        </AnnouncementsProvider>
                                      </NotificationsProvider>
                                    </ProductsProvider>
                                  </CategoriesProvider>
                                </OrdersProvider>
                              </VaultsProvider>
                            </SharedMemoriesProvider>
                          </VideoMessagesProvider>
                        </RecipientsProvider>
                      </CheckoutProvider>
                    </WishlistProvider>
                  </CartProvider>
                </SettingsProvider>
                </AuthProvider>
                </NetworkProvider>
              </ToastProvider>
            </AlertProvider>
          </TourProvider>
        </SafeStripeProvider>

        <StatusBar style="auto" />
      </ThemeProvider>
    </I18nextProvider>
  );
}

function LanguageSync() {
  const { i18n } = useTranslation();
  const { settings } = useSettings();
  const hasSyncedInitial = useRef(false);

  useEffect(() => {
    if (settings?.language && !hasSyncedInitial.current) {
      if (settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
      }
      hasSyncedInitial.current = true;
    }
  }, [settings?.language, i18n]);

  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isOffline } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Identify user for analytics
  useEffect(() => {
    identifyUser(user?.id ?? null);
  }, [user?.id]);

  // Track screen views based on route segments
  const prevScreenRef = useRef('');
  useEffect(() => {
    if (loading) return;
    const screen = segments.join('/') || 'index';
    if (screen !== prevScreenRef.current) {
      prevScreenRef.current = screen;
      trackScreenView(screen);
    }
  }, [segments, loading]);

  useEffect(() => {
    if (loading) return;

    if (isOffline && !user) {
      // Only redirect to offline screen if there's no authenticated user.
      // If we have a user session, a transient network blip (e.g., returning from
      // Chrome Custom Tabs on Android) shouldn't kick them to the offline screen.
      router.replace('/offline');
      return;
    }

    const s = segments as any;
    const inAuthGroup = s[0] === '(auth)';
    const inOnboardingGroup = s[0] === '(onboarding)';
    const isIndex = s.length === 0 || s.includes('index');
    const isOfflineScreen = (segments as any).includes('offline');

    // If we recovered from offline (have user now), navigate away from offline screen
    if (isOfflineScreen && user && !isOffline) {
      router.replace('/(buyer)/(tabs)');
      return;
    }

    if (isOfflineScreen) return;

    const needsOnboarding = user && profile && !profile.onboarding_completed_at;

    if (!user && !inAuthGroup && !isIndex) {
      // Redirect to login if user is not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect authenticated user away from auth screens
      if (needsOnboarding) {
        router.replace('/(onboarding)/' as any);
      } else {
        router.replace('/(buyer)/(tabs)');
      }
    } else if (needsOnboarding && isIndex) {
      // User landed on index but needs onboarding
      router.replace('/(onboarding)/' as any);
    }
  }, [user, profile, loading, isOffline, segments, router]);

  return <>{children}</>;
}

export default Sentry.wrap(RootLayout);

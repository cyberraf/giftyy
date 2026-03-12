// Configure React Native Reanimated logger to disable strict mode warnings
import { configureReanimatedLogger } from 'react-native-reanimated';

configureReanimatedLogger({
  strict: false, // Disable strict mode warnings about reading from `value` during render
});

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
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';

import { AlertProvider } from '@/contexts/AlertContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
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

export const unstable_settings = {
  anchor: '(buyer)',
};

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  // Initialize global alert system to intercept Alert.alert calls
  useEffect(() => {
    initializeGlobalAlert();
  }, []);

  // Simulate any setup work (fonts, env, etc.) before hiding the splash
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppReady(true);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!appReady) return;

    let cancelled = false;
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignore splash hide errors
      }
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          delay: 400,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!cancelled) {
          setShowLoader(false);
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [appReady, opacity, scale]);

  // Global font family setup (uses Cooper BT if added to the project)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const RNText: any = Text as any;
    RNText.defaultProps = RNText.defaultProps || {};
    RNText.defaultProps.style = [RNText.defaultProps.style, { fontFamily: 'Cooper BT' }];
  }, []);

  return (
    <ThemeProvider value={AppTheme}>
      <SafeStripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
        <AlertProvider>
          <ToastProvider>
            <AuthProvider>
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
                                    <AuthGuard>
                                      <Stack>
                                        <Stack.Screen name="index" options={{ headerShown: false }} />
                                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                                        <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
                                        <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
                                        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                                      </Stack>
                                    </AuthGuard>
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
            </AuthProvider>
          </ToastProvider>
        </AlertProvider>
      </SafeStripeProvider>
      <StatusBar style="auto" />

      {showLoader && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
          }}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
            <Image
              source={require('@/assets/images/giftyy.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
            <View style={{ height: 14 }} />
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#f75507',
                letterSpacing: 0.3,
                // If you add the Cooper BT font file later (assets/fonts/CooperBT.ttf),
                // set fontFamily: 'Cooper BT' or 'CooperBT' depending on the loaded name
                // without requiring it here to keep builds stable.
              }}>
              Giftyy
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </ThemeProvider>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const s = segments as any;
    const inAuthGroup = s[0] === '(auth)';
    const isIndex = s.length === 0 || s.includes('index');

    if (!user && !inAuthGroup && !isIndex) {
      // Redirect to login if user is not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to buyer home if authenticated user tries to access auth screens
      router.replace('/(buyer)/(tabs)');
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

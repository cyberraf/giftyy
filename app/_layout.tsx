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
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

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

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    'Cooper BT': require('@/assets/fonts/Cooper-Md-BT-Medium.ttf'),
  });
  
  // Animation refs
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const breathingAnim = useRef(new Animated.Value(1)).current;

  // Initialize global alert system to intercept Alert.alert calls
  useEffect(() => {
    initializeGlobalAlert();
    // Hide native splash screen once the custom animation overlay is mounted
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  // Splash Screen Animation Sequence
  useEffect(() => {
    // Logo and Text Entrance (Parallel)
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 30,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // 3. Start breathing animation once entrance is done
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Simulate readiness (auth, etc.)
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Exit Animation
  useEffect(() => {
    // Only exit when app state is ready AND fonts are loaded (or failed to load)
    if (!appReady || (!fontsLoaded && !fontError)) return;

    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 800,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start(() => {
      setShowLoader(false);
    });
  }, [appReady, fontsLoaded, fontError]);

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
                                    <KeyboardAvoidingView
                                      style={{ flex: 1 }}
                                      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                    >
                                      <AuthGuard>
                                          <Stack>
                                            <Stack.Screen name="index" options={{ headerShown: false }} />
                                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                                            <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
                                            <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
                                            <Stack.Screen name="offline" options={{ headerShown: false }} />
                                            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                                          </Stack>
                                      </AuthGuard>
                                    </KeyboardAvoidingView>
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
            backgroundColor: '#fff5f0', // Match GIFTYY_THEME.colors.cream
            alignItems: 'center',
            justifyContent: 'center',
            opacity: overlayOpacity,
            zIndex: 9999,
          }}>
          <View style={{ alignItems: 'center' }}>
            <Animated.View 
              style={{ 
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { scale: breathingAnim } // Apply breathing effect here
                ] 
              }}
            >
              <Image
                source={require('@/assets/images/giftyy.png')}
                style={{ width: 180, height: 180 }}
                resizeMode="contain"
              />
            </Animated.View>
            
            <Animated.View 
              style={{ 
                marginTop: 20,
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }]
              }}
            >
              <Text
                style={{
                  fontSize: 42,
                  fontWeight: '900',
                  color: '#f75507',
                  letterSpacing: -0.5,
                  textAlign: 'center',
                  fontFamily: 'Cooper BT',
                }}>
                Giftyy
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#9ca3af',
                  marginTop: 4,
                  textAlign: 'center',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}>
                Giving Redefined
              </Text>
            </Animated.View>
          </View>
          
          {/* Subtle bottom indicator */}
          <Animated.View 
            style={{ 
              position: 'absolute', 
              bottom: 60,
              opacity: textOpacity 
            }}
          >
            <View style={{ 
              width: 4, 
              height: 4, 
              borderRadius: 2, 
              backgroundColor: '#f75507', 
              opacity: 0.3 
            }} />
          </Animated.View>
        </Animated.View>
      )}
    </ThemeProvider>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isOffline } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (isOffline) {
      router.replace('/offline');
      return;
    }

    const s = segments as any;
    const inAuthGroup = s[0] === '(auth)';
    const isIndex = s.length === 0 || s.includes('index');
    const isOfflineScreen = (segments as any).includes('offline');

    if (isOfflineScreen) return;

    if (!user && !inAuthGroup && !isIndex) {
      // Redirect to login if user is not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to buyer home if authenticated user tries to access auth screens
      router.replace('/(buyer)/(tabs)');
    }
  }, [user, loading, isOffline, segments, router]);

  return <>{children}</>;
}

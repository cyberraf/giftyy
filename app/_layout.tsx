// Configure React Native Reanimated logger to disable strict mode warnings
import { configureReanimatedLogger } from 'react-native-reanimated';

configureReanimatedLogger({
	strict: false, // Disable strict mode warnings about reading from `value` during render
});

// Import polyfills for React Native (required for Supabase)
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { decode, encode } from 'base-64';

// Polyfill for base64 encoding/decoding (required by Supabase)
if (!global.btoa) {
	global.btoa = encode;
}
if (!global.atob) {
	global.atob = decode;
}

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';

import { CartProvider } from '@/contexts/CartContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { RecipientsProvider } from '@/contexts/RecipientsContext';
import { VideoMessagesProvider } from '@/contexts/VideoMessagesContext';
import { SharedMemoriesProvider } from '@/contexts/SharedMemoriesContext';
import { VaultsProvider } from '@/contexts/VaultsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { CheckoutProvider } from '@/lib/CheckoutContext';

export const unstable_settings = {
  anchor: '(buyer)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

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
    <ThemeProvider value={DefaultTheme}>
      <AlertProvider>
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
                  <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                  </Stack>
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
      </AlertProvider>
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

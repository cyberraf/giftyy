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

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';

import { CartProvider } from '@/contexts/CartContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { RecipientsProvider } from '@/contexts/RecipientsContext';
import { VideoMessagesProvider } from '@/contexts/VideoMessagesContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CheckoutProvider } from '@/lib/CheckoutContext';

export const unstable_settings = {
  anchor: '(buyer)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AlertProvider>
        <AuthProvider>
          <CartProvider>
            <CheckoutProvider>
              <RecipientsProvider>
                <VideoMessagesProvider>
                  <OrdersProvider>
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
                  </OrdersProvider>
                </VideoMessagesProvider>
              </RecipientsProvider>
            </CheckoutProvider>
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
              source={require('@/assets/images/logo.png')}
              style={{ width: 140, height: 140, borderRadius: 28 }}
              resizeMode="contain"
            />
            <View style={{ height: 14 }} />
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: '#f75507',
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

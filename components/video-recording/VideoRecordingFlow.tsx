/**
 * Safe wrapper for the video recording flow.
 *
 * In Expo Go, `react-native-vision-camera` is not available and importing it
 * will crash the bundle. This wrapper detects availability at runtime and:
 * - Renders the VisionCamera implementation in dev builds/custom clients.
 * - Shows a friendly fallback screen in Expo Go.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useMemo } from 'react';
import { Linking, NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import { VisionCameraRecordingFlow, type VideoRecordingFlowProps } from './VisionCameraRecordingFlow';

function isVisionCameraAvailable(): boolean {
  // IMPORTANT:
  // Do NOT `require('react-native-vision-camera')` here.
  // In Expo Go, that triggers a red error overlay even if caught.
  // Instead, check for the native module presence.
  const nm: any = NativeModules as any;
  return !!(nm?.VisionCamera || nm?.VisionCameraModule || nm?.VisionCameraProxy);
}

export function VideoRecordingFlow(props: VideoRecordingFlowProps) {
  const canUse = useMemo(() => isVisionCameraAvailable(), []);

  if (!canUse) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <IconSymbol name="camera.fill" size={44} color={GIFTYY_THEME.colors.primary} />
          <Text style={styles.fallbackTitle}>Camera recording isn’t available in Expo Go</Text>
          <Text style={styles.fallbackText}>
            This feature uses a native camera module. To test recording, run a development build (EAS / Expo prebuild).
          </Text>

          <Pressable
            onPress={() => Linking.openURL('https://docs.expo.dev/workflow/prebuild/')}
            style={styles.fallbackButton}
          >
            <Text style={styles.fallbackButtonText}>How to enable (docs)</Text>
          </Pressable>

          {props.onCancel ? (
            <Pressable onPress={props.onCancel} style={styles.fallbackSecondary}>
              <Text style={styles.fallbackSecondaryText}>Back</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return <VisionCameraRecordingFlow {...props} />;
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  fallbackTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: GIFTYY_THEME.colors.gray900,
    textAlign: 'center',
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: GIFTYY_THEME.colors.gray600,
    textAlign: 'center',
  },
  fallbackButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: GIFTYY_THEME.colors.primary,
    width: '100%',
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  fallbackSecondary: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fallbackSecondaryText: {
    color: GIFTYY_THEME.colors.gray600,
    fontSize: 14,
    fontWeight: '700',
  },
});


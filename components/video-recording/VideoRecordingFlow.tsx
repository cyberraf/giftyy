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
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useMemo } from 'react';
import { Linking, NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import type { VideoRecordingFlowProps } from './VisionCameraRecordingFlow';

function isVisionCameraAvailable(): boolean {
  // 1. Check if we are in Expo Go (Store Client)
  // In Expo Go, ExecutionEnvironment is 'store_client'
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  // 2. Check for native module presence as a secondary validation
  const nm: any = NativeModules as any;
  const hasNativeModule = !!(nm?.VisionCamera || nm?.VisionCameraModule || nm?.VisionCameraProxy || (global as any).VisionCameraProxy);

  console.log('[VideoRecordingFlow] Environment:', Constants.executionEnvironment);
  console.log('[VideoRecordingFlow] Has Native Module:', hasNativeModule);

  // If we're not in Expo Go, we're likely in a dev client or standalone build where native modules are supported.
  return !isExpoGo;
}

export function VideoRecordingFlow(props: VideoRecordingFlowProps) {
  const canUse = useMemo(() => isVisionCameraAvailable(), []);

  if (!canUse) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <View style={styles.fallbackIconBg}>
            <IconSymbol name="camera.fill" size={44} color={GIFTYY_THEME.colors.primary} />
          </View>

          <Text style={styles.fallbackTitle}>Development Client Required</Text>
          <Text style={styles.fallbackText}>
            Our premium video features require native camera modules not available in the standard Expo Go app.
          </Text>

          <View style={styles.instructionBox}>
            <Text style={styles.instructionHeader}>How to test this feature:</Text>
            <View style={styles.instructionItem}>
              <View style={styles.bullet} />
              <Text style={styles.instructionText}>Ensure you're using a <Text style={{ fontWeight: '800' }}>Development Build</Text></Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.bullet} />
              <Text style={styles.instructionText}>Run with <Text style={{ fontWeight: '800', color: GIFTYY_THEME.colors.primary }}>npx expo start --dev-client</Text></Text>
            </View>
          </View>

          <Pressable
            onPress={() => Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/')}
            style={styles.fallbackButton}
          >
            <Text style={styles.fallbackButtonText}>Setup Dev Client</Text>
          </Pressable>

          {props.onCancel ? (
            <Pressable onPress={props.onCancel} style={styles.fallbackSecondary}>
              <Text style={styles.fallbackSecondaryText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // Use dynamic require to prevent top-level crash in Expo Go
  const { VisionCameraRecordingFlow } = require('./VisionCameraRecordingFlow');
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
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  fallbackIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GIFTYY_THEME.colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fallbackTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '900',
    color: GIFTYY_THEME.colors.gray900,
    textAlign: 'center',
  },
  fallbackText: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: GIFTYY_THEME.colors.gray600,
    textAlign: 'center',
  },
  instructionBox: {
    width: '100%',
    backgroundColor: GIFTYY_THEME.colors.gray50,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: GIFTYY_THEME.colors.gray200,
  },
  instructionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: GIFTYY_THEME.colors.gray700,
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GIFTYY_THEME.colors.primary,
    marginRight: 10,
  },
  instructionText: {
    fontSize: 13,
    color: GIFTYY_THEME.colors.gray600,
    flex: 1,
  },
  fallbackButton: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: GIFTYY_THEME.colors.primary,
    width: '100%',
    alignItems: 'center',
    shadowColor: GIFTYY_THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  fallbackSecondary: {
    marginTop: 16,
    paddingVertical: 8,
  },
  fallbackSecondaryText: {
    color: GIFTYY_THEME.colors.gray500,
    fontSize: 14,
    fontWeight: '700',
  },
});


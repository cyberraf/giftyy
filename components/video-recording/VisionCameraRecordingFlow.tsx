/**
 * VisionCamera-based implementation of the video recording flow.
 *
 * IMPORTANT:
 * - This file imports `react-native-vision-camera` and will crash in Expo Go.
 * - Only load this component behind a runtime availability check (see `VideoRecordingFlow.tsx`).
 */
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Camera,
  useCameraDevice,
  useCameraDevices,
  useCameraFormat,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';

const PRIMARY = GIFTYY_THEME.colors.primary;
const MAX_DURATION_SECONDS = 30;
const MAX_DURATION_MS = MAX_DURATION_SECONDS * 1000;

type Screen = 'welcome' | 'permission' | 'camera' | 'countdown' | 'recording' | 'preview';

export type VideoRecordingFlowProps = {
  onVideoRecorded: (videoUri: string, durationMs: number) => void;
  onCancel?: () => void;
  /** If provided, flow starts in preview mode */
  initialVideoUri?: string | null;
  /** Optional initial duration for the preview */
  initialDurationMs?: number;
  /** Called when user chooses to retake and discard the video */
  onRetake?: () => void;
};

export function VisionCameraRecordingFlow({
  onVideoRecorded,
  onCancel,
  initialVideoUri,
  initialDurationMs,
  onRetake,
}: VideoRecordingFlowProps) {
  const didApplyInitialRef = useRef(false);
  const [screen, setScreen] = useState<Screen>(() => (initialVideoUri ? 'preview' : 'welcome'));
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(initialVideoUri ?? null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(initialDurationMs ?? 0);
  const [useFrontCamera, setUseFrontCamera] = useState(true);

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } =
    useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission();

  const devices = useCameraDevices();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');

  // Choose the best available device based on preference and availability
  const device = useMemo(() => {
    const preferred = useFrontCamera ? frontDevice : backDevice;
    if (preferred) return preferred;

    // Fallback logic
    const fallback = useFrontCamera ? backDevice : frontDevice;
    if (fallback) {
      console.log(`[VisionCamera] Preferred camera (${useFrontCamera ? 'front' : 'back'}) not available. Falling back to ${useFrontCamera ? 'back' : 'front'}.`);
      return fallback;
    }

    // Last resort: any available device
    if (devices.length > 0) {
      console.log(`[VisionCamera] No specific camera match. Using first available: ${devices[0].position}`);
      return devices[0];
    }

    console.warn('[VisionCamera] No camera devices found at all.');
    return undefined;
  }, [useFrontCamera, frontDevice, backDevice, devices]);

  // Configure format for video recording (codec is set in startRecording options)
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 30 },
  ]);

  useEffect(() => {
    console.log('[VisionCamera] Status:', {
      availableDevices: devices.map(d => d.position),
      selectedPosition: device?.position,
      hasFormat: !!format,
      useFrontCamera
    });
  }, [devices, device, format, useFrontCamera]);

  const cameraRef = useRef<Camera>(null);
  const previewRef = useRef<Video>(null);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Countdown animation
  const countdownScale = useSharedValue(1);
  const countdownOpacity = useSharedValue(1);

  // Record button animation
  const recordButtonScale = useSharedValue(1);
  const recordButtonPulse = useSharedValue(0);

  // Timer color animation
  const timerColorProgress = useSharedValue(0);

  // Handle permissions
  useEffect(() => {
    if (screen === 'permission' && hasCameraPermission && hasMicrophonePermission) {
      setScreen('camera');
    }
  }, [screen, hasCameraPermission, hasMicrophonePermission]);

  // If a saved video is provided later, switch to preview once (do not override retakes)
  useEffect(() => {
    if (!didApplyInitialRef.current && initialVideoUri) {
      didApplyInitialRef.current = true;
      setVideoUri(initialVideoUri);
      setDurationMs(initialDurationMs ?? 0);
      setIsPlaying(true);
      setScreen('preview');
    }
  }, [initialVideoUri, initialDurationMs]);

  const stopRecording = useCallback(async () => {
    setRecording((prev) => (prev ? false : prev));
    try {
      await cameraRef.current?.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }

    recordButtonPulse.value = 0;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [recordButtonPulse]);

  const startRecordingInternal = useCallback(async () => {
    if (!device) return;

    setRecording(true);
    setElapsedMs(0);
    setScreen('recording');
    timerColorProgress.value = 0;

    recordButtonPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
      -1,
      false
    );

    timerRef.current = setInterval(() => {
      setElapsedMs((ms) => {
        const next = ms + 100;
        const seconds = next / 1000;
        const progress = Math.min(seconds / MAX_DURATION_SECONDS, 1);
        timerColorProgress.value = progress;

        if (next >= MAX_DURATION_MS) {
          stopRecording();
          return MAX_DURATION_MS;
        }
        return next;
      });
    }, 100);

    try {
      await cameraRef.current?.startRecording({
        flash: 'off',
        fileType: 'mp4', // Ensure MP4 container format
        videoCodec: 'h264', // Force H.264 codec for maximum Android compatibility
        onRecordingFinished: (video) => {
          console.log('[VisionCamera] Recording finished, video codec should be H.264');
          const uri = (video as any)?.path || (video as any)?.file?.path || (video as any)?.uri;
          if (uri) {
            setElapsedMs((currentMs) => {
              setDurationMs(currentMs);
              setVideoUri(uri);
              setScreen('preview');
              return currentMs;
            });
          }
        },
        onRecordingError: (error) => {
          console.error('Recording error:', error);
          setRecording(false);
          setScreen('camera');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        },
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecording(false);
      setScreen('camera');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [device, stopRecording, recordButtonPulse, timerColorProgress]);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    let current = 3;
    setCountdownNumber(3);
    setScreen('countdown');

    const animateCountdown = () => {
      countdownScale.value = 0.5;
      countdownOpacity.value = 0;
      countdownScale.value = withSequence(withSpring(1.2, { damping: 8 }), withTiming(1, { duration: 200 }));
      countdownOpacity.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 400 }));
    };

    animateCountdown();

    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdownNumber(current);
      if (current <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setScreen('camera');
        setTimeout(() => startRecordingInternal(), 100);
        return;
      }
      animateCountdown();
    }, 1000);
  }, [countdownOpacity, countdownScale, startRecordingInternal]);

  const handleRequestPermissions = useCallback(async () => {
    const cameraGranted = await requestCameraPermission();
    const micGranted = await requestMicrophonePermission();
    setScreen(cameraGranted && micGranted ? 'camera' : 'permission');
  }, [requestCameraPermission, requestMicrophonePermission]);

  const handleRecordPress = useCallback(() => {
    if (recording) stopRecording();
    else startCountdown();
  }, [recording, startCountdown, stopRecording]);

  const handleRetake = useCallback(async () => {
    didApplyInitialRef.current = true;
    try {
      if (previewRef.current) {
        await previewRef.current.pauseAsync();
        await previewRef.current.unloadAsync();
      }
    } catch (error) {
      console.warn('Error stopping video preview:', error);
    }
    setVideoUri(null);
    setElapsedMs(0);
    setDurationMs(0);
    setIsPlaying(true);
    onRetake?.();
    startCountdown();
  }, [onRetake, startCountdown]);

  const handleUseVideo = useCallback(async () => {
    if (!videoUri) return;
    try {
      if (previewRef.current) {
        await previewRef.current.pauseAsync();
        await previewRef.current.unloadAsync();
      }
    } catch (error) {
      console.warn('Error stopping video preview:', error);
    }
    setIsPlaying(false);
    onVideoRecorded(videoUri, durationMs || elapsedMs);
  }, [videoUri, durationMs, elapsedMs, onVideoRecorded]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      previewRef.current?.pauseAsync().catch(console.warn);
      previewRef.current?.unloadAsync().catch(console.warn);
    };
  }, []);

  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
    opacity: countdownOpacity.value,
  }));

  const recordButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordButtonScale.value * (1 + recordButtonPulse.value * 0.15) }],
    shadowOpacity: 0.3 + recordButtonPulse.value * 0.4,
  }));

  const getTimerColor = (progress: number) => {
    if (progress > 0.83) return '#ef4444';
    if (progress > 0.67) return '#fbbf24';
    return PRIMARY;
  };

  if (screen === 'welcome') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[GIFTYY_THEME.colors.cream, GIFTYY_THEME.colors.softPink]} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeInDown.duration(400)} style={styles.welcomeContent}>
          <View style={styles.sparkleContainer}>
            <IconSymbol name="sparkles" size={48} color={PRIMARY + '40'} />
          </View>
          <Text style={styles.welcomeTitle}>Record Your Video Message 💛</Text>
          <Text style={styles.welcomeSubtext}>Share your feelings in up to 30 seconds.</Text>
          <Pressable onPress={handleRequestPermissions} style={styles.startButton}>
            <LinearGradient colors={[PRIMARY, GIFTYY_THEME.colors.primaryLight]} style={styles.startButtonGradient}>
              <Text style={styles.startButtonText}>Start Recording</Text>
            </LinearGradient>
          </Pressable>
          {onCancel && (
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Back</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    );
  }

  if (screen === 'permission') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[GIFTYY_THEME.colors.cream, GIFTYY_THEME.colors.softPink]} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeIn.duration(300)} style={styles.permissionContent}>
          <IconSymbol name="camera.fill" size={64} color={PRIMARY} />
          <Text style={styles.permissionTitle}>Camera & Microphone Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera and microphone to record your heartfelt video message.
          </Text>
          <Pressable onPress={handleRequestPermissions} style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable Access</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openSettings()} style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (screen === 'countdown') {
    return (
      <View style={styles.countdownContainer} collapsable={false}>
        {device && format ? (
          <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} format={format} isActive={true} video audio />
        ) : (
          <View style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.countdownOverlay} collapsable={false}>
          <Animated.Text style={[styles.countdownNumber, countdownAnimatedStyle]}>{countdownNumber}</Animated.Text>
        </View>
      </View>
    );
  }

  if (screen === 'preview' && videoUri) {
    return (
      <View style={styles.container}>
        <Video
          ref={previewRef}
          style={StyleSheet.absoluteFill}
          source={{ uri: videoUri }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying}
          isLooping
          onPlaybackStatusUpdate={(status: any) => {
            if (status?.isLoaded) setDurationMs(status.durationMillis || durationMs);
          }}
        />
        <Pressable style={styles.previewTapOverlay} onPress={() => setIsPlaying((p) => !p)} accessibilityRole="button">
          <View style={styles.previewCenterIcon}>
            <View style={styles.previewCenterIconCircle}>
              <IconSymbol name={isPlaying ? 'pause.fill' : 'play.fill'} size={28} color="#fff" />
            </View>
          </View>
        </Pressable>
        <View style={styles.previewControls}>
          <Pressable onPress={handleRetake} style={styles.retakeButton}>
            <View style={styles.retakeButtonContent}>
              <IconSymbol name="arrow.counterclockwise" size={20} color="#fff" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </View>
          </Pressable>
          <Pressable onPress={handleUseVideo} style={styles.useVideoButton}>
            <LinearGradient colors={[PRIMARY, GIFTYY_THEME.colors.primaryLight]} style={styles.useVideoGradient}>
              <IconSymbol name="checkmark" size={20} color="#fff" />
              <Text style={styles.useVideoButtonText}>Use Video</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device || !format) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera not available</Text>
      </View>
    );
  }

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = MAX_DURATION_SECONDS - elapsedSeconds;
  const progress = elapsedMs / MAX_DURATION_MS;

  return (
    <View style={styles.container} collapsable={false}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={screen === 'camera' || screen === 'recording'}
        video
        audio
      />

      {recording && (
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: getTimerColor(progress) }]}>{Math.floor(elapsedMs / 1000)}s</Text>
          {remainingSeconds <= 3 && remainingSeconds > 0 && (
            <Text style={[styles.countdownWarning, { color: '#ef4444' }]}>{remainingSeconds}</Text>
          )}
        </View>
      )}

      <View style={styles.bottomControls}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={handleRecordPress} style={styles.recordButtonWrapper}>
          <Animated.View style={[styles.recordButton, recordButtonAnimatedStyle]}>{recording ? <View style={styles.stopIcon} /> : <View style={styles.recordIcon} />}</Animated.View>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 24 }}>
          <Pressable onPress={() => setUseFrontCamera((prev) => !prev)} style={styles.flipCameraButton}>
            <IconSymbol name="arrow.triangle.2.circlepath" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      {elapsedMs >= MAX_DURATION_MS && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.maxTimeMessage}>
          <Text style={styles.maxTimeText}>Maximum recording time reached.</Text>
        </Animated.View>
      )}
    </View>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  welcomeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  sparkleContainer: { marginBottom: 24 },
  welcomeTitle: { fontSize: 32, fontWeight: '900', color: GIFTYY_THEME.colors.gray900, textAlign: 'center', marginBottom: 12 },
  welcomeSubtext: { fontSize: 18, color: GIFTYY_THEME.colors.gray600, textAlign: 'center', marginBottom: 48 },
  startButton: { width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  startButtonGradient: { paddingVertical: 18, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 24 },
  cancelButtonText: { color: GIFTYY_THEME.colors.gray600, fontSize: 16, fontWeight: '600' },
  permissionContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  permissionTitle: { fontSize: 24, fontWeight: '900', color: GIFTYY_THEME.colors.gray900, textAlign: 'center', marginTop: 24, marginBottom: 16 },
  permissionText: { fontSize: 16, color: GIFTYY_THEME.colors.gray600, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  enableButton: { width: '100%', backgroundColor: PRIMARY, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  enableButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  settingsButton: { paddingVertical: 12, paddingHorizontal: 24 },
  settingsButtonText: { color: GIFTYY_THEME.colors.gray600, fontSize: 16, fontWeight: '600' },
  countdownContainer: { flex: 1, backgroundColor: '#000' },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  countdownNumber: { fontSize: 120, fontWeight: '900', color: PRIMARY },
  timerContainer: { position: 'absolute', top: 60, alignSelf: 'center', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 24, fontWeight: '800', color: PRIMARY, letterSpacing: 1 },
  countdownWarning: { fontSize: 32, fontWeight: '900', color: '#ef4444', letterSpacing: 1 },
  bottomControls: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  flipCameraButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center' },
  recordButtonWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#fff', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 8 },
  recordIcon: { width: 32, height: 32, borderRadius: 4, backgroundColor: '#fff' },
  stopIcon: { width: 32, height: 32, borderRadius: 4, backgroundColor: '#fff' },
  previewTapOverlay: { ...StyleSheet.absoluteFillObject },
  previewCenterIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewCenterIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  previewControls: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, gap: 16 },
  retakeButton: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)', overflow: 'hidden' },
  retakeButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 8 },
  retakeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  useVideoButton: { flex: 1, borderRadius: 20, overflow: 'hidden', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  useVideoGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 8 },
  useVideoButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  maxTimeMessage: { position: 'absolute', bottom: 180, alignSelf: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  maxTimeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },
});


/**
 * expo-camera-based implementation of the video recording flow.
 * Uses CameraView and recordAsync from expo-camera (compatible with Expo SDK 51).
 */
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { ResizeMode, Video } from 'expo-av';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const PRIMARY = GIFTYY_THEME.colors.primary;
const MAX_DURATION_SECONDS = 30;
const MAX_DURATION_MS = MAX_DURATION_SECONDS * 1000;

type Screen = 'welcome' | 'permission' | 'camera' | 'countdown' | 'recording' | 'preview';

export type VideoRecordingFlowProps = {
  onVideoRecorded: (videoUri: string, durationMs: number) => void;
  onCancel?: () => void;
  initialVideoUri?: string | null;
  initialDurationMs?: number;
  onRetake?: () => void;
  recipientFirstName?: string;
};

export function ExpoCameraRecordingFlow({
  onVideoRecorded,
  onCancel,
  initialVideoUri,
  initialDurationMs,
  onRetake,
  recipientFirstName,
}: VideoRecordingFlowProps) {
  const didApplyInitialRef = useRef(false);
  const [screen, setScreen] = useState<Screen>(() => (initialVideoUri ? 'preview' : 'welcome'));
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(initialVideoUri ?? null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(initialDurationMs ?? 0);
  const [useFrontCamera, setUseFrontCamera] = useState(true);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const hasCameraPermission = cameraPermission?.granted ?? false;
  const hasMicrophonePermission = micPermission?.granted ?? false;

  const cameraRef = useRef<CameraView>(null);
  const previewRef = useRef<Video>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const elapsedMsRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    elapsedMsRef.current = elapsedMs;
  }, [elapsedMs]);

  const countdownScale = useSharedValue(1);
  const countdownOpacity = useSharedValue(1);
  const recordButtonScale = useSharedValue(1);
  const recordButtonPulse = useSharedValue(0);
  const timerColorProgress = useSharedValue(0);

  useEffect(() => {
    if (screen === 'permission' && hasCameraPermission && hasMicrophonePermission) {
      setScreen('camera');
    }
  }, [screen, hasCameraPermission, hasMicrophonePermission]);

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
      cameraRef.current?.stopRecording();
      const result = await recordPromiseRef.current;
      recordPromiseRef.current = null;
      if (result?.uri) {
        const duration = elapsedMsRef.current;
        setDurationMs(duration);
        setVideoUri(result.uri);
        setScreen('preview');
      }
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
        const progress = Math.min(next / MAX_DURATION_MS, 1);
        timerColorProgress.value = progress;

        if (next >= MAX_DURATION_MS) {
          stopRecording();
          return MAX_DURATION_MS;
        }
        return next;
      });
    }, 100);

    try {
      recordPromiseRef.current = cameraRef.current?.recordAsync({
        maxDuration: MAX_DURATION_SECONDS,
      }) ?? null;
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecording(false);
      setScreen('camera');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [stopRecording, recordButtonPulse, timerColorProgress]);

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
        setTimeout(() => startRecordingInternal(), 300);
        return;
      }
      animateCountdown();
    }, 1000);
  }, [countdownOpacity, countdownScale, startRecordingInternal]);

  const handleRequestPermissions = useCallback(async () => {
    const camResult = await requestCameraPermission();
    const micResult = await requestMicPermission();
    if ((camResult?.granted ?? false) && (micResult?.granted ?? false)) {
      setScreen('camera');
    }
  }, [requestCameraPermission, requestMicPermission]);

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
        {/* Deep dark gradient — cinematic, immersive */}
        <LinearGradient
          colors={['#0a0a0f', '#12101a', '#1a0f0a']}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle radial glow behind the icon */}
        <View style={styles.glowCircle} />

        <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.welcomeContent}>

          {/* Icon with ring */}
          <View style={styles.welcomeIconRing}>
            <View style={styles.welcomeIconInner}>
              <IconSymbol name="video.fill" size={36} color="#fff" />
            </View>
          </View>

          {/* Overline label */}
          <Text style={styles.welcomeOverline}>STEP 4 OF 7</Text>

          {/* Bold headline */}
          <Text style={styles.welcomeTitle}>Record Your{`\n`}Video Message</Text>

          {/* Subtle tagline */}
          <Text style={styles.welcomeSubtext}>
            A personal touch that {recipientFirstName || 'your gift recipient'} will treasure forever.
          </Text>

          {/* Feature strip */}
          <View style={styles.featureRow}>
            <View style={styles.featureChip}>
              <IconSymbol name="clock" size={14} color={PRIMARY} />
              <Text style={styles.featureChipText}>Up to 30s</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureChip}>
              <IconSymbol name="lock.shield" size={14} color={PRIMARY} />
              <Text style={styles.featureChipText}>Private</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureChip}>
              <IconSymbol name="heart.fill" size={14} color={PRIMARY} />
              <Text style={styles.featureChipText}>Heartfelt</Text>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            onPress={handleRequestPermissions}
            style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[PRIMARY, '#d94800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButtonGradient}
            >
              <IconSymbol name="video.fill" size={18} color="#fff" />
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
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={useFrontCamera ? 'front' : 'back'}
          mode="video"
          mute={false}
        />
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

  const remainingSeconds = MAX_DURATION_SECONDS - Math.floor(elapsedMs / 1000);
  const progress = elapsedMs / MAX_DURATION_MS;

  return (
    <View style={styles.container} collapsable={false}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={useFrontCamera ? 'front' : 'back'}
        mode="video"
        mute={false}
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
  // ── Welcome screen ────────────────────────────────────────────
  glowCircle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: PRIMARY,
    opacity: 0.08,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  welcomeIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  welcomeIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  welcomeOverline: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 36,
    gap: 0,
  },
  featureChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  featureChipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  featureDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  startButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  startButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 24 },
  cancelButtonText: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: '600' },
  // ── Permission screen ─────────────────────────────────────────
  sparkleContainer: { marginBottom: 24 },
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

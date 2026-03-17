/**
 * ReactionRecorder — A floating camera overlay that records the recipient's
 * reaction while they watch the sender's video message.
 *
 * Usage: Render this component on top of the GiftViewerSlides when recording
 * is active. It handles permissions, recording, upload, and cleanup.
 */
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { supabase } from '@/lib/supabase';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import {
    CameraView,
    useCameraPermissions,
    useMicrophonePermissions,
} from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const MAX_DURATION_SECONDS = 45;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ReactionRecorderProps {
    /** Order ID — used as path prefix in storage */
    orderId: string;
    /** Video message ID to link to */
    videoMessageId: string | null;
    /** Authenticated user ID */
    userId: string;
    /** Called when a reaction is successfully recorded + uploaded */
    onReactionSaved: (reactionVideoUrl: string, durationSeconds: number) => void;
    /** Called when the user dismisses the prompt without recording */
    onDismiss: () => void;
    /** Whether to show the initial prompt */
    showPrompt: boolean;
}

type RecorderState = 'prompt' | 'recording' | 'uploading' | 'done' | 'idle';

export default function ReactionRecorder({
    orderId,
    videoMessageId,
    userId,
    onReactionSaved,
    onDismiss,
    showPrompt,
}: ReactionRecorderProps) {
    const [state, setState] = useState<RecorderState>(showPrompt ? 'prompt' : 'idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [uploadProgressText, setUploadProgressText] = useState<string>('Processing recording...');
    const [uploadProgressValue, setUploadProgressValue] = useState<number | null>(null);

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();

    const cameraRef = useRef<CameraView>(null);
    const recordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const cameraReadyRef = useRef(false);
    const pendingRecordRef = useRef(false);

    // Reset to prompt when showPrompt changes
    useEffect(() => {
        if (showPrompt && state === 'idle') {
            setState('prompt');
        }
    }, [showPrompt]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            try {
                cameraRef.current?.stopRecording();
            } catch { }
        };
    }, []);

    // Called when CameraView is fully mounted and ready
    const handleCameraReady = useCallback(() => {
        cameraReadyRef.current = true;
        // If we were waiting to record, start now
        if (pendingRecordRef.current) {
            pendingRecordRef.current = false;
            startRecording();
        }
    }, []);

    const handleAcceptPrompt = useCallback(async () => {
        // Request permissions
        const camResult = await requestCameraPermission();
        const micResult = await requestMicPermission();

        if (!(camResult?.granted) || !(micResult?.granted)) {
            Alert.alert(
                'Permissions Required',
                'Camera and microphone access are needed to record your reaction.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Switch to recording state so CameraView renders
        cameraReadyRef.current = false;
        pendingRecordRef.current = true;
        setState('recording');
        // Recording will start when onCameraReady fires
    }, [requestCameraPermission, requestMicPermission]);

    const startRecording = useCallback(async () => {
        if (!cameraReadyRef.current) {
            // Camera not ready yet — mark pending, will retry from onCameraReady
            pendingRecordRef.current = true;
            return;
        }

        setElapsedSeconds(0);
        startTimeRef.current = Date.now();

        // Start timer
        timerRef.current = setInterval(() => {
            if (!startTimeRef.current) return;
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const clamped = Math.min(elapsed, MAX_DURATION_SECONDS);
            setElapsedSeconds(clamped);

            // Auto-stop at max duration
            if (elapsed >= MAX_DURATION_SECONDS) {
                stopRecording();
            }
        }, 500);

        // Begin camera recording
        try {
            recordPromiseRef.current = cameraRef.current?.recordAsync({
                maxDuration: MAX_DURATION_SECONDS,
            }) ?? null;
        } catch (err) {
            console.error('[ReactionRecorder] Error starting recording:', err);
            setState('idle');
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, []);

    const stopRecording = useCallback(async () => {
        // Clear timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const duration = startTimeRef.current
            ? Math.min(Math.floor((Date.now() - startTimeRef.current) / 1000), MAX_DURATION_SECONDS)
            : elapsedSeconds;

        try {
            // IMPORTANT: Stop recording extending the camera BEFORE unmounting it
            cameraRef.current?.stopRecording();
            const result = await recordPromiseRef.current;
            recordPromiseRef.current = null;

            // Safely transition to uploading state now that camera is stopped
            setState('uploading');
            setUploadProgressText('Processing recording...');
            setUploadProgressValue(0.1);

            if (!result?.uri) {
                console.error('[ReactionRecorder] No recording URI returned');
                setState('idle');
                return;
            }

            // Upload to Supabase Storage
            setUploadProgressText('Uploading your reaction...');
            const videoUrl = await uploadReaction(result.uri, duration);

            if (videoUrl) {
                setState('done');
                onReactionSaved(videoUrl, duration);
            } else {
                setState('idle');
            }
        } catch (err) {
            console.error('[ReactionRecorder] Error stopping/uploading:', err);
            setState('idle');
        }
    }, [elapsedSeconds, orderId, videoMessageId, userId, onReactionSaved]);

    const uploadReaction = async (localUri: string, durationSeconds: number): Promise<string | null> => {
        let fakeProgressInterval: ReturnType<typeof setInterval> | null = null;
        try {
            const timestamp = Date.now();
            const filename = `reaction-${orderId}-${timestamp}.mp4`;
            const filePath = `${orderId}/${filename}`;

            // Read file as base64
            const fileUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
            const base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: 'base64',
            });

            setUploadProgressText('Uploading video...');
            setUploadProgressValue(0.15);

            // Convert to bytes
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Simulate progress since supabase client in RN doesn't give upload events reliably
            fakeProgressInterval = setInterval(() => {
                setUploadProgressValue((prev) => {
                    if (!prev) return 0.15;
                    // Cap fake progress at 90%
                    if (prev >= 0.9) return 0.9;
                    return prev + Math.random() * 0.15;
                });
            }, 800);

            // Upload to reaction-videos bucket
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('reaction-videos')
                .upload(filePath, bytes, {
                    contentType: 'video/mp4',
                    upsert: false,
                });

            if (fakeProgressInterval) clearInterval(fakeProgressInterval);

            if (uploadError) {
                console.error('[ReactionRecorder] Upload error:', uploadError.message);
                Alert.alert('Upload Failed', 'Could not upload your reaction. Please try again.');
                return null;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('reaction-videos')
                .getPublicUrl(filePath);

            setUploadProgressText('Saving reaction...');
            setUploadProgressValue(0.95);

            // Save reaction metadata via Edge Function to bypass client-side RLS restrictions
            const { data, error: fnError } = await supabase.functions.invoke('save-reaction', {
                body: {
                    orderId: orderId,
                    videoMessageId: videoMessageId,
                    reactionVideoUrl: publicUrl,
                    duration: durationSeconds,
                    isPublic: false,
                    userId: userId,
                },
            });

            if (fnError || data?.error) {
                console.error('[ReactionRecorder] Edge Function save error:', fnError || data?.error);
                // Video uploaded but DB failed — still return the URL
            }

            setUploadProgressValue(1);
            return publicUrl;
        } catch (err: any) {
            if (fakeProgressInterval) clearInterval(fakeProgressInterval);
            console.error('[ReactionRecorder] Upload error:', err);
            Alert.alert('Upload Failed', err.message || 'An unexpected error occurred.');
            return null;
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // ── Prompt Modal ──
    if (state === 'prompt') {
        return (
            <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.promptCard}>
                        <Text style={{ fontSize: responsiveFontSize(40) }}>🎥</Text>
                        <Text style={styles.promptTitle}>Record Your Reaction?</Text>
                        <Text style={styles.promptSubtitle}>
                            Capture your reaction while watching the video. The sender will love to see it!
                        </Text>
                        <Pressable
                            style={({ pressed }) => [
                                styles.promptButton,
                                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                            ]}
                            onPress={handleAcceptPrompt}
                        >
                            <Text style={styles.promptButtonText}>Yes, Record!</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.promptSkip,
                                pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => {
                                setState('idle');
                                onDismiss();
                            }}
                        >
                            <Text style={styles.promptSkipText}>Maybe Later</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    // ── Uploading overlay ──
    if (state === 'uploading') {
        const progressPercent = Math.min(Math.round((uploadProgressValue || 0) * 100), 100);
        return (
            <View style={styles.uploadOverlayWrapper}>
                <View style={styles.uploadProgressContainer}>
                    <ActivityIndicator size="large" color="#f75507" />
                    <Text style={styles.uploadProgressTitle}>Recording Reaction</Text>
                    <Text style={styles.uploadProgressText}>
                        {progressPercent}%
                    </Text>
                    <View style={styles.uploadProgressBarBg}>
                        <View
                            style={[
                                styles.uploadProgressBarFill,
                                { width: `${progressPercent}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.uploadStatusText}>{uploadProgressText}</Text>
                </View>
            </View>
        );
    }

    // ── Recording HUD (floating camera preview + timer) ──
    if (state === 'recording') {
        const progress = elapsedSeconds / MAX_DURATION_SECONDS;
        const isWarning = progress > 0.85;

        return (
            <View style={styles.recordingContainer} pointerEvents="box-none">
                {/* Camera preview */}
                <View style={styles.cameraPreviewWrapper}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.cameraPreview}
                        facing="front"
                        mode="video"
                        mute={false}
                        onCameraReady={handleCameraReady}
                    />
                    {/* Recording indicator + timer */}
                    <View style={styles.recordingBadge}>
                        <View style={[styles.recordingDot, isWarning && { backgroundColor: '#ef4444' }]} />
                        <Text style={[styles.recordingTime, isWarning && { color: '#ef4444' }]}>
                            {formatTime(elapsedSeconds)}
                        </Text>
                    </View>
                </View>

                {/* Stop button */}
                <Pressable
                    style={({ pressed }) => [
                        styles.stopButton,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={stopRecording}
                >
                    <View style={styles.stopIcon} />
                    <Text style={styles.stopText}>Stop</Text>
                </Pressable>
            </View>
        );
    }

    // idle / done — render nothing
    return null;
}

const styles = StyleSheet.create({
    // ── Prompt modal ──
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(24),
    },
    promptCard: {
        backgroundColor: '#fff',
        borderRadius: scale(24),
        padding: scale(28),
        alignItems: 'center',
        maxWidth: scale(340),
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    promptTitle: {
        fontSize: responsiveFontSize(22),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginTop: verticalScale(12),
        marginBottom: verticalScale(8),
    },
    promptSubtitle: {
        fontSize: responsiveFontSize(14),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(22),
        marginBottom: verticalScale(20),
    },
    promptButton: {
        backgroundColor: '#f75507',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(36),
        borderRadius: scale(16),
        alignSelf: 'stretch',
        alignItems: 'center',
        shadowColor: '#f75507',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    promptButtonText: {
        color: '#fff',
        fontSize: responsiveFontSize(17),
        fontWeight: '700',
    },
    promptSkip: {
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(24),
        marginTop: verticalScale(4),
    },
    promptSkipText: {
        color: GIFTYY_THEME.colors.gray400,
        fontSize: responsiveFontSize(15),
        fontWeight: '600',
    },

    // ── Recording HUD ──
    recordingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    cameraPreviewWrapper: {
        position: 'absolute',
        top: verticalScale(50),
        right: scale(16),
        width: scale(110),
        height: scale(150),
        borderRadius: scale(16),
        overflow: 'hidden',
        borderWidth: 2.5,
        borderColor: '#f75507',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cameraPreview: {
        width: '100%',
        height: '100%',
    },
    recordingBadge: {
        position: 'absolute',
        top: scale(6),
        left: scale(6),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: scale(8),
        paddingVertical: scale(3),
        borderRadius: scale(10),
        gap: scale(4),
    },
    recordingDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: '#f75507',
    },
    recordingTime: {
        color: '#fff',
        fontSize: responsiveFontSize(11),
        fontWeight: '700',
    },
    stopButton: {
        position: 'absolute',
        bottom: verticalScale(100),
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(12),
        borderRadius: scale(24),
        gap: scale(8),
    },
    stopIcon: {
        width: scale(16),
        height: scale(16),
        borderRadius: scale(3),
        backgroundColor: '#ef4444',
    },
    stopText: {
        color: '#fff',
        fontSize: responsiveFontSize(15),
        fontWeight: '700',
    },

    // ── Uploading Progress ──
    uploadOverlayWrapper: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    uploadProgressContainer: {
        width: 280,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    uploadProgressTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: GIFTYY_THEME.colors.gray900,
        marginTop: 16,
        marginBottom: 8,
    },
    uploadProgressText: {
        fontSize: 14,
        color: GIFTYY_THEME.colors.gray500,
        marginBottom: 20,
    },
    uploadProgressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: GIFTYY_THEME.colors.gray100,
        borderRadius: 4,
        overflow: 'hidden',
    },
    uploadProgressBarFill: {
        height: '100%',
        backgroundColor: '#f75507',
        borderRadius: 4,
    },
    uploadStatusText: {
        marginTop: 16,
        fontSize: 13,
        color: GIFTYY_THEME.colors.gray400,
        fontStyle: 'italic',
    },
});

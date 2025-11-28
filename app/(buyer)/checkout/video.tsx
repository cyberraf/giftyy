import { useCheckout } from '@/lib/CheckoutContext';
import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, Dimensions, Linking, Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useAuth } from '@/contexts/AuthContext';

// Lightweight glass effect helper: uses expo-blur if available, otherwise falls back
let BlurViewComp: any = null;
let FFmpegKitMod: any = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	BlurViewComp = require('expo-blur').BlurView;
} catch {}
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	FFmpegKitMod = require('ffmpeg-kit-react-native');
} catch {}
function Glass({ children, style, intensity = 40, tint = 'dark' }: { children?: React.ReactNode; style?: any; intensity?: number; tint?: 'light' | 'dark' | 'default' }) {
	if (BlurViewComp) {
		return <BlurViewComp intensity={intensity} tint={tint} style={[{ backgroundColor: 'rgba(255,255,255,0.06)' }, style]}>{children}</BlurViewComp>;
	}
	return <View style={[{ backgroundColor: 'rgba(0,0,0,0.35)' }, style]}>{children}</View>;
}

export default function VideoScreen() {
    useKeepAwake();
    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
    const cameraRef = useRef<Camera>(null);
    const [recording, setRecording] = useState(false);
    const [uri, setUri] = useState<string | undefined>();
    const previewRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    
    // Ensure video is unmuted when preview loads
    useEffect(() => {
        if (uri && previewRef.current) {
            setIsMuted(false);
            // Set unmuted state after a brief delay to ensure video is loaded
            setTimeout(() => {
                previewRef.current?.setStatusAsync({ isMuted: false, volume: 1.0 });
            }, 100);
        }
    }, [uri]);
    const [positionMs, setPositionMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const [clipStartMs, setClipStartMs] = useState(0);
    const [clipEndMs, setClipEndMs] = useState<number | null>(null);
	const [trackWidth, setTrackWidth] = useState(0);

	// Preview editor tools
	type EditorTool = 'filters' | 'trim' | 'crop' | 'text';
	const [editorTool, setEditorTool] = useState<EditorTool>('filters');

	// Crop state (preview-only UI)
	type CropAspect = 'free' | '1:1' | '4:5' | '9:16' | '16:9';
	const [cropAspect, setCropAspect] = useState<CropAspect>('free');

	// Text overlay state
	const [textOverlay, setTextOverlay] = useState('');
	type TextPos = 'top' | 'center' | 'bottom';
	const [textPos, setTextPos] = useState<TextPos>('bottom');
	type TextTone = 'light' | 'dark';
	const [textTone, setTextTone] = useState<TextTone>('light');
	type TextSize = 's' | 'm' | 'l';
	const [textSize, setTextSize] = useState<TextSize>('m');

    const [exporting, setExporting] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    const [cameraAllowed, setCameraAllowed] = useState<boolean>(hasCameraPermission);
    const [microphoneAllowed, setMicrophoneAllowed] = useState<boolean>(hasMicrophonePermission);

	// Build crop filter for ffmpeg
	const buildCropFilter = (aspect: CropAspect) => {
		if (aspect === 'free') return null;
		if (aspect === '1:1') {
			const w = 'min(iw,ih)';
			const h = 'min(iw,ih)';
			const x = `(iw-${w})/2`;
			const y = `(ih-${h})/2`;
			return `crop=${w}:${h}:${x}:${y}`;
		}
		const ratio = (a: number, b: number) => `${a}/${b}`;
		const pick = (a: number, b: number) => {
			const cond = `gte(iw/ih,${ratio(a,b)})`;
			const w = `if(${cond},ih*${ratio(a,b)},iw)`;
			const h = `if(${cond},ih,iw*${ratio(b,a)})`;
			const x = `(iw-(${w}))/2`;
			const y = `(ih-(${h}))/2`;
			return `crop=${w}:${h}:${x}:${y}`;
		};
		if (aspect === '4:5') return pick(4, 5);
		if (aspect === '9:16') return pick(9, 16);
		if (aspect === '16:9') return pick(16, 9);
		return null;
	};

	const goToPaymentStep = async (path: string) => {
		if (!videoTitle.trim()) {
			setNotice('Please add a video title before proceeding');
			setTimeout(() => setNotice(null), 3000);
			return;
		}

		if (!user) {
			setNotice('Please sign in to continue');
			setTimeout(() => setNotice(null), 3000);
			return;
		}

		// Get file size
		let fileSizeBytes: number | undefined;
		try {
			const fileUri = path.startsWith('file://') ? path : `file://${path}`;
			const fileInfo = await FileSystem.getInfoAsync(fileUri);
			if (fileInfo.exists && 'size' in fileInfo) {
				fileSizeBytes = fileInfo.size;
			}
		} catch (err) {
			console.warn('Could not get file size:', err);
		}

		// Convert duration from milliseconds to seconds
		const durationSeconds = durationMs > 0 ? Math.round(durationMs / 1000) : undefined;

		// Upload video to Supabase Storage
		try {
			setUploading(true);
			const { videoMessage, error } = await addVideoMessage(
				path,
				videoTitle.trim(),
				'sent', // Videos recorded by user are 'sent'
				undefined, // orderId - will be updated after order creation
				durationSeconds,
				fileSizeBytes
			);

			if (error || !videoMessage) {
				console.error('Error uploading video:', error);
				setNotice('Failed to upload video. Please try again.');
				setTimeout(() => setNotice(null), 3000);
				setUploading(false);
				return;
			}

			// Store the video URL and title in checkout context
			// The video is now stored in Supabase, so we use the stored URL
			setVideoUri(videoMessage.videoUrl);
			setVideoTitle(videoTitle.trim());
			setUploading(false);
			router.push('/(buyer)/checkout/shared-memory');
		} catch (err) {
			console.error('Unexpected error uploading video:', err);
			setNotice('Failed to upload video. Please try again.');
			setTimeout(() => setNotice(null), 3000);
			setUploading(false);
		}
	};

	const exportEditedVideo = async () => {
		if (!uri) return;
		const hasCrop = cropAspect !== 'free';
		const hasTrim = clipStartMs > 0 || (clipEndMs && durationMs && clipEndMs < durationMs);
		// Only export if edits present; otherwise return original
		if (!hasCrop && !hasTrim) {
			goToPaymentStep(uri);
			return;
		}
		if (!FFmpegKitMod?.FFmpegKit) {
			setNotice('Export requires ffmpeg-kit-react-native. Using original.');
			goToPaymentStep(uri);
			return;
		}
		try {
			setExporting(true);
			const input = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
			// Use cache/doc directory via any to avoid TS type issues across Expo versions
			const outDir = ((FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '') as string;
			const ts = Date.now();
			const outPath = `${outDir}giftyy-export-${ts}.mp4`;
			// Ensure outDir exists (cache/doc dirs exist by default)
			const start = Math.max(0, Math.floor(clipStartMs / 1000));
			const end = Math.max(start + 1, Math.floor(((clipEndMs ?? durationMs) || 0) / 1000));
			const crop = buildCropFilter(cropAspect);
			const vf = crop ? `-vf "${crop}"` : '';
			const ss = hasTrim ? `-ss ${start}` : '';
			const to = hasTrim ? `-to ${end}` : '';
			// Try libx264 first; fallback to default encoder if not available
			const cmdPrimary = `${ss} ${to} -i "${input}" ${vf} -c:v libx264 -crf 23 -preset veryfast -c:a copy -movflags +faststart "${outPath}"`;
			let session = await FFmpegKitMod.FFmpegKit.run(cmdPrimary);
			const rc = await session.getReturnCode?.();
			if (!rc || !FFmpegKitMod.ReturnCode.isSuccess(rc)) {
				const cmdFallback = `${ss} ${to} -i "${input}" ${vf} -c:v mpeg4 -q:v 2 -c:a copy "${outPath}"`;
				session = await FFmpegKitMod.FFmpegKit.run(cmdFallback);
			}
			// Verify file exists
			const info = await FileSystem.getInfoAsync(outPath.startsWith('file://') ? outPath : `file://${outPath}`);
			if (!info.exists) {
				throw new Error('Export failed');
			}
			const finalUri = outPath.startsWith('file://') ? outPath : `file://${outPath}`;
			await goToPaymentStep(finalUri);
		} catch (e) {
			console.error('Export failed', e);
			setNotice('Export failed. Using original.');
			await goToPaymentStep(uri);
		} finally {
			setExporting(false);
		}
	};
    const [isReady, setIsReady] = useState(false);
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const device = useCameraDevice(facing);
    // Get a format that supports video recording
    // Try preferred settings first, but use any available format if preferred isn't available
    const format = useCameraFormat(device, [
        { videoResolution: { width: 1280, height: 720 } },
        { fps: 60 },
    ]);
	const [colorFilter, setColorFilter] = useState<'none' | 'blue' | 'gray' | 'bw' | 'sepia' | 'warm' | 'cool' | 'rose' | 'teal' | 'purple' | 'amber' | 'mint' | 'noir' | 'soft'>('none');

	const colorOptions = [
		{ key: 'none', label: 'None', color: 'transparent' },
		{ key: 'blue', label: 'Blue', color: 'rgba(60,120,255,0.9)' },
		{ key: 'gray', label: 'Gray', color: 'rgba(120,120,120,0.9)' },
		{ key: 'bw', label: 'B&W', color: 'rgba(0,0,0,0.9)' },
		{ key: 'sepia', label: 'Sepia', color: 'rgba(112,66,20,0.9)' },
		{ key: 'warm', label: 'Warm', color: 'rgba(255,140,0,0.9)' },
		{ key: 'cool', label: 'Cool', color: 'rgba(0,160,255,0.9)' },
		{ key: 'rose', label: 'Rose', color: 'rgba(255,99,132,0.9)' },
		{ key: 'teal', label: 'Teal', color: 'rgba(0,128,128,0.9)' },
		{ key: 'purple', label: 'Purple', color: 'rgba(160,80,255,0.9)' },
		{ key: 'amber', label: 'Amber', color: 'rgba(255,191,0,0.9)' },
		{ key: 'mint', label: 'Mint', color: 'rgba(0,200,140,0.9)' },
		{ key: 'noir', label: 'Noir', color: 'rgba(0,0,0,1)' },
		{ key: 'soft', label: 'Soft', color: 'rgba(255,255,255,0.9)' },
	] as const;

	const CHIP_SIZE = 54;
	const GAP = 12;
    const ITEM_SIZE = CHIP_SIZE + GAP;

	// Centralized overlay color mapping for live/preview
	const overlayColorFor = (key: typeof colorFilter) => {
		switch (key) {
			case 'blue': return 'rgba(60,120,255,0.12)';
			case 'gray': return 'rgba(0,0,0,0.18)';
			case 'bw': return 'rgba(0,0,0,0.35)';
			case 'sepia': return 'rgba(112,66,20,0.12)';
			case 'warm': return 'rgba(255,140,0,0.12)';
			case 'cool': return 'rgba(0,160,255,0.12)';
			case 'rose': return 'rgba(255,99,132,0.12)';
			case 'teal': return 'rgba(0,128,128,0.12)';
			case 'purple': return 'rgba(160,80,255,0.12)';
			case 'amber': return 'rgba(255,191,0,0.12)';
			case 'mint': return 'rgba(0,200,140,0.12)';
			case 'noir': return 'rgba(0,0,0,0.5)';
			case 'soft': return 'rgba(255,255,255,0.06)';
			default: return 'transparent';
		}
	};

	// util: ms to mm:ss
	const msToTime = (ms: number) => {
		const total = Math.max(0, Math.floor(ms / 1000));
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	};
    const screenW = Dimensions.get('window').width;
    const sidePad = (screenW - CHIP_SIZE) / 2;
    const [activeIdx, setActiveIdx] = useState(0);
    const listRef = useRef<any>(null);

    const [elapsedMs, setElapsedMs] = useState(0);
    const MAX_MS = 30_000;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { setVideoUri, setVideoTitle } = useCheckout();
    const router = useRouter();
    const [notice, setNotice] = useState<string | null>(null);
    const [videoTitle, setVideoTitleLocal] = useState('');
    const [uploading, setUploading] = useState(false);
    const { setVisible } = useBottomBarVisibility();
    const { addVideoMessage } = useVideoMessages();
    const { user } = useAuth();

    const syncPermissions = useCallback(
        async (shouldRequest: boolean) => {
            const normalize = (status?: string) => status === 'authorized' || status === 'granted';

            let cameraGranted = hasCameraPermission || normalize(await Camera.getCameraPermissionStatus());
            if (!cameraGranted && shouldRequest) {
                cameraGranted = await requestCameraPermission();
            }

            let microphoneGranted = hasMicrophonePermission || normalize(await Camera.getMicrophonePermissionStatus());
            if (!microphoneGranted && shouldRequest) {
                microphoneGranted = await requestMicrophonePermission();
            }

            setCameraAllowed(cameraGranted);
            setMicrophoneAllowed(microphoneGranted);
            setPermissionsChecked(true);

            if (!cameraGranted || !microphoneGranted) {
                setNotice('Camera and microphone permissions are required to record a video.');
            } else {
                setNotice(null);
            }
        },
        [hasCameraPermission, hasMicrophonePermission, requestCameraPermission, requestMicrophonePermission]
    );

    useEffect(() => {
        (async () => {
            await syncPermissions(true);
        })();
    }, [syncPermissions]);

    useFocusEffect(
        useCallback(() => {
            setVisible(false); // Hide bottom bar on video recording/preview page
            syncPermissions(false);
            return () => {
                setVisible(true); // Show bottom bar when leaving
            };
        }, [syncPermissions, setVisible])
    );

    useEffect(() => {
        const onAppStateChange = (state: AppStateStatus) => {
            if (state === 'active') {
                syncPermissions(false);
            }
        };
        const subscription = AppState.addEventListener('change', onAppStateChange);
        return () => subscription.remove();
    }, [syncPermissions]);

    const start = async () => {
        if (!isReady) return;
        if (!cameraAllowed || !microphoneAllowed) {
            setNotice('Camera and microphone permissions are required to record a video.');
            return;
        }
        setRecording(true);
        setElapsedMs(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setElapsedMs((ms) => {
                const next = ms + 100;
                if (next >= MAX_MS) {
                    // auto stop at max duration
                    stop();
                }
                return next;
            });
        }, 100);
        try {
            cameraRef.current?.startRecording({
                flash: 'off',
                onRecordingFinished: (video) => {
                    // @ts-ignore different platforms
                    const u = (video as any)?.path || (video as any)?.file?.path || (video as any)?.uri;
                    if (u) setUri(u);
                },
                onRecordingError: (error) => {
                    console.error('Recording error from callback:', error);
                    setNotice('Recording failed. Please try again.');
                },
            });
        } catch (e) {
            console.error('Error starting recording:', e);
            setNotice('Failed to start recording.');
        } finally {
            // cleanup handled in stop()
        }
    };
    const stop = async () => {
        if (!recording) {
            return;
        }
        setTimeout(async () => {
            try {
                await cameraRef.current?.stopRecording();
            } catch (e) {
                console.error('Failed to stop recording', e);
            }
            setRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }, 100);
    };

    // Scrub helper (preview)
    const seekTo = (ms: number) => {
        const bounded = Math.max(0, Math.min(durationMs || ms, ms));
        previewRef.current?.setStatusAsync({ positionMillis: bounded, shouldPlay: isPlaying, isMuted: isMuted, volume: isMuted ? 0 : 1.0 });
    };

    if (!permissionsChecked || !cameraAllowed || !microphoneAllowed) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>We need camera and microphone access to record your video.</Text>
                <Pressable
                    onPress={() => Linking.openSettings()}
                    style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f75507' }}
                >
                    <Text style={{ color: 'white', fontWeight: '800' }}>Open App Settings</Text>
                </Pressable>
            </View>
        );
    }

    if (uri) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'black' }}>
                <Video
                    ref={previewRef}
                    style={{ flex: 1 }}
                    source={{ uri }}
					useNativeControls={false}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                    shouldPlay={isPlaying}
                    isMuted={isMuted}
                    volume={isMuted ? 0 : 1.0}
                    onPlaybackStatusUpdate={(status: any) => {
                        if (!status?.isLoaded) return;
                        const pos = status.positionMillis || 0;
                        const dur = status.durationMillis || durationMs;
                        if (dur && !clipEndMs) {
                            setClipEndMs(dur);
                        }
                        setPositionMs(pos);
                        setDurationMs(dur || 0);
                        // Loop within selected range if set
                        const end = clipEndMs ?? dur;
                        const start = clipStartMs;
                        if (end && pos >= end - 40 && end > start) {
                            previewRef.current?.setStatusAsync({ positionMillis: start, shouldPlay: isPlaying, isMuted: isMuted, volume: isMuted ? 0 : 1.0 });
                        }
                    }}
                />

                {/* Modern center play/pause button */}
                <Pressable
                    onPress={() => setIsPlaying((p) => !p)}
                    style={{ 
                        position: 'absolute', 
                        alignSelf: 'center', 
                        top: '45%', 
                        width: 100, 
                        height: 100, 
                        borderRadius: 50, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: isPlaying ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.65)', 
                        borderWidth: 3, 
                        borderColor: isPlaying ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)',
                        shadowColor: '#000',
                        shadowOpacity: isPlaying ? 0.3 : 0.6,
                        shadowRadius: isPlaying ? 12 : 20,
                        shadowOffset: { width: 0, height: isPlaying ? 4 : 8 },
                        opacity: isPlaying ? 0 : 1,
                    }}
                >
                    {!isPlaying ? (
                        <View style={{
                            width: 0,
                            height: 0,
                            backgroundColor: 'transparent',
                            borderStyle: 'solid',
                            borderLeftWidth: 32,
                            borderTopWidth: 20,
                            borderBottomWidth: 20,
                            borderLeftColor: 'white',
                            borderTopColor: 'transparent',
                            borderBottomColor: 'transparent',
                            marginLeft: 6,
                        }} />
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ width: 8, height: 28, backgroundColor: 'white', borderRadius: 2 }} />
                            <View style={{ width: 8, height: 28, backgroundColor: 'white', borderRadius: 2 }} />
                        </View>
                    )}
                </Pressable>
                
                {/* Tap anywhere to pause when playing */}
                {isPlaying && (
                    <Pressable
                        onPress={() => setIsPlaying(false)}
                        style={{ 
                            position: 'absolute', 
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    />
                )}

				{/* Glass top bar for preview */}
				<View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 16 }}>
					<Glass style={{ borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Pressable 
								onPress={() => setUri(undefined)} 
								style={{ 
									width: 44, 
									height: 44, 
									borderRadius: 22, 
									alignItems: 'center', 
									justifyContent: 'center', 
									backgroundColor: 'rgba(0,0,0,0.3)', 
									borderWidth: 1.5, 
									borderColor: 'rgba(255,255,255,0.25)' 
								}}
							>
								<Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>×</Text>
							</Pressable>
							<Text style={{ color: 'white', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 }}>Preview</Text>
                            <Pressable 
								onPress={() => setIsMuted((m) => !m)} 
								style={{ 
									width: 44, 
									height: 44, 
									borderRadius: 22, 
									alignItems: 'center', 
									justifyContent: 'center', 
									backgroundColor: isMuted ? 'rgba(247,85,7,0.2)' : 'rgba(0,0,0,0.3)', 
									borderWidth: 1.5, 
									borderColor: isMuted ? '#f75507' : 'rgba(255,255,255,0.25)' 
								}}
							>
                                <Text style={{ color: isMuted ? '#f75507' : 'white', fontSize: 20, fontWeight: '700' }}>{isMuted ? '🔇' : '🔊'}</Text>
                            </Pressable>
						</View>
					</Glass>
				</View>

                {/* Re-apply overlays on preview so it matches capture UI */}
				{colorFilter !== 'none' && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
							backgroundColor: overlayColorFor(colorFilter),
                        }}
                    />
                )}

                {/* Crop overlay (visual only) */}
                {editorTool === 'crop' && cropAspect !== 'free' && (() => {
                    const win = Dimensions.get('window');
                    const pad = 16;
                    const availW = win.width - pad * 2;
                    const availH = win.height - 220;
                    const ratioMap: Record<string, number> = { '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16, '16:9': 16 / 9 };
                    const r = ratioMap[cropAspect] || 1;
                    let fw = availW;
                    let fh = fw / r;
                    if (fh > availH) {
                        fh = availH;
                        fw = fh * r;
                    }
                    const left = (win.width - fw) / 2;
                    const top = (win.height - fh) / 2;
                    const right = left + fw;
                    const bottom = top + fh;
                    return (
                        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
                            {/* darken outside */}
                            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top, backgroundColor: 'rgba(0,0,0,0.45)' }} />
                            <View style={{ position: 'absolute', left: 0, width: left, top, bottom, backgroundColor: 'rgba(0,0,0,0.45)' }} />
                            <View style={{ position: 'absolute', left: right, right: 0, top, bottom, backgroundColor: 'rgba(0,0,0,0.45)' }} />
                            <View style={{ position: 'absolute', left: 0, right: 0, top: bottom, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
                            {/* frame */}
                            <View style={{ position: 'absolute', left, top, width: fw, height: fh, borderWidth: 2, borderColor: '#fff', borderRadius: 8 }} />
                        </View>
                    );
                })()}

                {/* Text overlay */}
                {textOverlay.trim().length > 0 && (() => {
                    const win = Dimensions.get('window');
                    const sz = textSize === 's' ? 18 : textSize === 'm' ? 24 : 32;
                    const toneColor = textTone === 'light' ? '#fff' : '#000';
                    const shadowColor = textTone === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
                    const y = textPos === 'top' ? 120 : textPos === 'center' ? win.height * 0.48 : win.height * 0.82;
                    return (
                        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y, alignItems: 'center' }}>
                            <Text style={{ color: toneColor, fontWeight: '900', fontSize: sz, textAlign: 'center', textShadowColor: shadowColor, textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 }, paddingHorizontal: 16 }}>
                                {textOverlay}
                            </Text>
                        </View>
                    );
                })()}

                {/* Glass bottom bar for preview tools */}
				<View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 40, paddingHorizontal: 16 }}>
                    <Glass style={{ borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
						{exporting && (
							<View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
								<Text style={{ color: 'white', fontWeight: '800' }}>Exporting…</Text>
							</View>
						)}
                        {/* Tool selector */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            {[
                                { key: 'filters', label: 'Filters', icon: '🎨' },
                                { key: 'trim', label: 'Trim', icon: '✂' },
                                { key: 'crop', label: 'Crop', icon: '▢' },
                                { key: 'text', label: 'Text', icon: '🅣' },
                            ].map((t: any) => {
                                const active = editorTool === t.key;
                                return (
                                    <Pressable key={t.key} onPress={() => setEditorTool(t.key)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: active ? 'rgba(247,85,7,0.18)' : 'transparent', borderWidth: 1, borderColor: active ? '#f75507' : 'rgba(255,255,255,0.2)' }}>
                                        <Text style={{ color: active ? '#fff' : 'rgba(255,255,255,0.9)', fontWeight: '800' }}>{t.icon} {t.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Tool content */}
                        {editorTool === 'filters' && (
                            <Animated.FlatList
                                horizontal
                                data={colorOptions as unknown as any[]}
                                keyExtractor={(item: any) => item.key}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 8, marginBottom: 8 }}
                                getItemLayout={(_data, index) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * index, index })}
                                renderItem={({ item, index }: any) => {
                                    const selected = colorFilter === item.key;
                                    const scale = selected ? 1.08 : 0.96;
                                    return (
                                        <View style={{ width: ITEM_SIZE, alignItems: 'center' }}>
                                            <Pressable
                                                onPress={() => {
                                                    setActiveIdx(index);
                                                    setColorFilter(item.key as any);
                                                }}
                                                style={{
                                                    width: CHIP_SIZE,
                                                    height: CHIP_SIZE,
                                                    marginRight: GAP,
                                                    borderRadius: CHIP_SIZE / 2,
                                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                                    borderWidth: 2,
                                                    borderColor: selected ? '#f75507' : 'rgba(255,255,255,0.18)',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transform: [{ scale }],
                                                }}
                                            >
                                                <View style={{ width: CHIP_SIZE - 16, height: CHIP_SIZE - 16, borderRadius: (CHIP_SIZE - 16) / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.key === 'none' ? (
                                                        <View style={{ width: CHIP_SIZE - 24, height: CHIP_SIZE - 24, borderRadius: (CHIP_SIZE - 24) / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                                                            <View style={{ position: 'absolute', width: CHIP_SIZE - 28, height: 2, backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotateZ: '-35deg' }] }} />
                                                        </View>
                                                    ) : (
                                                        <View style={{ width: CHIP_SIZE - 24, height: CHIP_SIZE - 24, borderRadius: (CHIP_SIZE - 24) / 2, backgroundColor: item.color, borderWidth: 2, borderColor: 'white' }} />
                                                    )}
                                                </View>
                                            </Pressable>
                                            <Text style={{ marginTop: 6, color: selected ? '#fff' : 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: selected ? '800' : '700' }}>{item.label}</Text>
                                        </View>
                                    );
                                }}
                            />
                        )}

                        {editorTool === 'trim' && (
                            <View>
                                <View
                                    style={{ marginBottom: 12, height: 28, justifyContent: 'center' }}
                                    onStartShouldSetResponder={() => true}
                                >
                                    <View
                                        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 1)}
                                        onStartShouldSetResponder={() => true}
                                        onResponderMove={(e: any) => {
                                            if (trackWidth <= 0) return;
                                            const x = Math.max(0, Math.min(trackWidth, e.nativeEvent.locationX));
                                            const ratio = x / Math.max(1, trackWidth);
                                            const ms = (clipEndMs ?? durationMs) * ratio;
                                            seekTo(ms);
                                        }}
                                        onResponderRelease={(e: any) => {
                                            if (trackWidth <= 0) return;
                                            const x = Math.max(0, Math.min(trackWidth, e.nativeEvent.locationX));
                                            const ratio = x / Math.max(1, trackWidth);
                                            const ms = (clipEndMs ?? durationMs) * ratio;
                                            seekTo(ms);
                                        }}
                                        style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}
                                    >
                                        {durationMs > 0 && (
                                            <View style={{ position: 'absolute', left: trackWidth * (clipStartMs / durationMs), width: trackWidth * (((clipEndMs ?? durationMs) - clipStartMs) / durationMs), top: 0, bottom: 0, backgroundColor: 'rgba(247,85,7,0.8)' }} />
                                        )}
                                        {durationMs > 0 && (
                                            <View style={{ position: 'absolute', left: trackWidth * (positionMs / durationMs), top: -6, width: 2, height: 20, backgroundColor: 'white' }} />
                                        )}
                                    </View>
                                    <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontVariant: ['tabular-nums'] }}>{msToTime(positionMs)}</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontVariant: ['tabular-nums'] }}>{msToTime(clipEndMs ?? durationMs)}</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 4 }}>
                                    <Pressable onPress={() => setClipStartMs(positionMs)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' }}>
                                        <Text style={{ color: 'white', fontWeight: '800' }}>Set Start</Text>
                                    </Pressable>
                                    <Pressable onPress={() => setClipEndMs(Math.max(positionMs, clipStartMs + 500))} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' }}>
                                        <Text style={{ color: 'white', fontWeight: '800' }}>Set End</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {editorTool === 'crop' && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                {[
                                    { k: 'free', label: 'Free' },
                                    { k: '1:1', label: '1:1' },
                                    { k: '4:5', label: '4:5' },
                                    { k: '9:16', label: '9:16' },
                                    { k: '16:9', label: '16:9' },
                                ].map((c: any) => {
                                    const active = cropAspect === c.k;
                                    return (
                                        <Pressable key={c.k} onPress={() => setCropAspect(c.k)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? '#f75507' : 'rgba(255,255,255,0.25)', backgroundColor: active ? 'rgba(247,85,7,0.18)' : 'transparent' }}>
                                            <Text style={{ color: '#fff', fontWeight: active ? '800' : '700' }}>{c.label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}

                        {editorTool === 'text' && (
                            <View>
                                <TextInput
                                    value={textOverlay}
                                    onChangeText={setTextOverlay}
                                    placeholder="Add text..."
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 10 }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {(['top','center','bottom'] as TextPos[]).map((p) => {
                                            const active = textPos === p;
                                            const label = p === 'top' ? 'Top' : p === 'center' ? 'Center' : 'Bottom';
                                            return (
                                                <Pressable key={p} onPress={() => setTextPos(p)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? '#f75507' : 'rgba(255,255,255,0.25)', backgroundColor: active ? 'rgba(247,85,7,0.18)' : 'transparent' }}>
                                                    <Text style={{ color: '#fff', fontWeight: active ? '800' : '700' }}>{label}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {(['light','dark'] as TextTone[]).map((t) => {
                                            const active = textTone === t;
                                            return (
                                                <Pressable key={t} onPress={() => setTextTone(t)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? '#f75507' : 'rgba(255,255,255,0.25)', backgroundColor: active ? 'rgba(247,85,7,0.18)' : 'transparent' }}>
                                                    <Text style={{ color: '#fff', fontWeight: active ? '800' : '700' }}>{t === 'light' ? 'Light' : 'Dark'}</Text>
                                                </Pressable>
                                            );
                                        })}
                                        {(['s','m','l'] as TextSize[]).map((sz) => {
                                            const active = textSize === sz;
                                            return (
                                                <Pressable key={sz} onPress={() => setTextSize(sz)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? '#f75507' : 'rgba(255,255,255,0.25)', backgroundColor: active ? 'rgba(247,85,7,0.18)' : 'transparent' }}>
                                                    <Text style={{ color: '#fff', fontWeight: active ? '800' : '700' }}>{sz.toUpperCase()}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Video Title Input */}
                        <View style={{ marginTop: 12, marginBottom: 8 }}>
                            <Text style={{ color: 'white', fontWeight: '800', marginBottom: 8, fontSize: 14 }}>Video Title *</Text>
                            <TextInput
                                value={videoTitle}
                                onChangeText={setVideoTitleLocal}
                                placeholder="Enter a title for your video message..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.12)', 
                                    color: 'white', 
                                    borderRadius: 12, 
                                    paddingHorizontal: 14, 
                                    paddingVertical: 12, 
                                    borderWidth: 1, 
                                    borderColor: videoTitle.trim() ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                                    fontSize: 15,
                                }}
                                maxLength={100}
                            />
                            {!videoTitle.trim() && (
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
                                    A title is required to continue
                                </Text>
                            )}
                        </View>

                        {/* Actions row */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <Pressable
                                onPress={() => {
                                    setUri(undefined);
                                    setVideoTitleLocal('');
                                }}
                                style={{ 
									flex: 1, 
									borderWidth: 2, 
									borderColor: 'rgba(255,255,255,0.4)', 
									paddingHorizontal: 20, 
									paddingVertical: 14, 
									borderRadius: 16, 
									alignItems: 'center', 
									justifyContent: 'center', 
									backgroundColor: 'rgba(0,0,0,0.25)' 
								}}
                            >
                                <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }}>Retake</Text>
                            </Pressable>
							<Pressable
								onPress={exportEditedVideo}
                                disabled={!videoTitle.trim() || uploading || exporting}
                                style={{ 
                                    flex: 1, 
                                    backgroundColor: videoTitle.trim() ? '#f75507' : 'rgba(247,85,7,0.4)', 
                                    paddingHorizontal: 20, 
                                    paddingVertical: 14, 
                                    borderRadius: 16, 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    opacity: (videoTitle.trim() && !uploading && !exporting) ? 1 : 0.6,
									shadowColor: videoTitle.trim() ? '#f75507' : 'transparent',
									shadowOpacity: 0.4,
									shadowRadius: 8,
									shadowOffset: { width: 0, height: 4 },
                                }}
                            >
                                {uploading || exporting ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }}>Use Video</Text>
                                )}
                            </Pressable>
                        </View>
                    </Glass>
				</View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            {device && format ? (
                <Camera
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    device={device}
                    format={format}
                    isActive={true}
                    video={true}
                    photo={false}
                    audio={true}
                    enableZoomGesture={false}
                    pixelFormat="yuv"
                    onInitialized={() => {
                        console.log('Camera initialized');
                        setIsReady(true);
                    }}
                />
            ) : (
                <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 16 }}>Loading camera...</Text>
                </View>
            )}

			{/* Modern glass top bar */}
			<View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 16 }}>
				<Glass style={{ borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<Pressable 
							onPress={() => router.back()} 
							style={{ 
								width: 44, 
								height: 44, 
								borderRadius: 22, 
								alignItems: 'center', 
								justifyContent: 'center', 
								backgroundColor: 'rgba(0,0,0,0.3)', 
								borderWidth: 1.5, 
								borderColor: 'rgba(255,255,255,0.25)' 
							}}
						>
							<Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>×</Text>
						</Pressable>
						<View style={{ alignItems: 'center', flex: 1 }}>
							<Text style={{ color: 'white', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 }}>Record Video</Text>
							{recording && (
								<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
									<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 6 }} />
									<Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums'] }}>
										{msToTime(elapsedMs)}
									</Text>
								</View>
							)}
						</View>
						<Pressable
							onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
							style={{ 
								width: 44, 
								height: 44, 
								borderRadius: 22, 
								alignItems: 'center', 
								justifyContent: 'center', 
								backgroundColor: 'rgba(0,0,0,0.3)', 
								borderWidth: 1.5, 
								borderColor: 'rgba(255,255,255,0.25)' 
							}}
						>
							<Text style={{ color: '#f75507', fontSize: 20, fontWeight: '700' }}>↻</Text>
						</Pressable>
					</View>
				</Glass>
			</View>

            {/* Small toast/notice */}
            {notice && (
                <View style={{ position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{notice}</Text>
                </View>
            )}

			{/* Color filter overlay (live) */}
            {colorFilter !== 'none' && (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
						backgroundColor: overlayColorFor(colorFilter),
                    }}
                />
            )}

            {/* Bottom toolbar with glass effect */}
			<View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 40, paddingHorizontal: 16 }}>
				<Glass style={{ borderRadius: 28, paddingVertical: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
					<View style={{ alignItems: 'center' }}>
                    {/* Filter carousel */}
                    <Animated.FlatList
                        ref={listRef}
                        horizontal
                        data={colorOptions as unknown as any[]}
                        keyExtractor={(item: any) => item.key}
                        showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ paddingHorizontal: sidePad, marginBottom: 20 }}
                        snapToInterval={ITEM_SIZE}
                        decelerationRate="fast"
                        getItemLayout={(_data, index) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * index, index })}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / ITEM_SIZE);
                            setActiveIdx(idx);
                            const key = (colorOptions[idx] as any)?.key;
                            setColorFilter(key as any);
                        }}
						renderItem={({ item, index }: any) => {
							const selected = index === activeIdx;
							const scale = selected ? 1.1 : 0.95;
							return (
								<View style={{ width: ITEM_SIZE, alignItems: 'center' }}>
									<Pressable
										onPress={() => {
											setActiveIdx(index);
											setColorFilter(item.key as any);
											listRef.current?.scrollToIndex?.({ index, animated: true });
										}}
										style={{
											width: CHIP_SIZE,
											height: CHIP_SIZE,
											marginRight: GAP,
											borderRadius: CHIP_SIZE / 2,
											backgroundColor: selected ? 'rgba(247,85,7,0.15)' : 'rgba(255,255,255,0.1)',
											borderWidth: selected ? 3 : 2,
											borderColor: selected ? '#f75507' : 'rgba(255,255,255,0.25)',
											alignItems: 'center',
											justifyContent: 'center',
											transform: [{ scale }],
											shadowColor: '#000',
											shadowOpacity: selected ? 0.4 : 0.2,
											shadowRadius: selected ? 8 : 4,
											shadowOffset: { width: 0, height: 3 },
										}}
									>
										<View style={{ width: CHIP_SIZE - 18, height: CHIP_SIZE - 18, borderRadius: (CHIP_SIZE - 18) / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
											{/* Color preview circle or "None" slash */}
											{item.key === 'none' ? (
												<View style={{ width: CHIP_SIZE - 28, height: CHIP_SIZE - 28, borderRadius: (CHIP_SIZE - 28) / 2, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
													<View style={{ position: 'absolute', width: CHIP_SIZE - 32, height: 2.5, backgroundColor: 'rgba(255,255,255,0.9)', transform: [{ rotateZ: '-35deg' }] }} />
												</View>
											) : (
												<View style={{ width: CHIP_SIZE - 28, height: CHIP_SIZE - 28, borderRadius: (CHIP_SIZE - 28) / 2, backgroundColor: item.color, borderWidth: 2.5, borderColor: 'white' }} />
											)}
											{/* Glossy highlight */}
											<View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: (CHIP_SIZE - 18) * 0.4, backgroundColor: 'rgba(255,255,255,0.15)' }} />
										</View>
									</Pressable>
									<Text style={{ marginTop: 8, color: selected ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: selected ? '800' : '600', letterSpacing: 0.3 }}>{item.label}</Text>
								</View>
							);
						}}
                    />

                    {/* Recording button with improved design */}
                    <Pressable
                        onPressIn={start}
                        onPressOut={stop}
                        disabled={!isReady}
                        style={{
							width: 88,
							height: 88,
							borderRadius: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
							backgroundColor: 'rgba(0,0,0,0.2)',
							marginTop: 4,
                        }}
                    >
                        <View style={{
							width: 88,
							height: 88,
							borderRadius: 44,
							borderWidth: recording ? 5 : 4,
							borderColor: recording ? '#ef4444' : '#f75507',
                            alignItems: 'center',
                            justifyContent: 'center',
							shadowColor: recording ? '#ef4444' : '#f75507',
							shadowOpacity: 0.5,
							shadowRadius: 12,
							shadowOffset: { width: 0, height: 4 },
                        }}>
							<View style={{ 
								width: recording ? 56 : 60, 
								height: recording ? 56 : 60, 
								borderRadius: recording ? 12 : 30, 
								backgroundColor: recording ? '#ef4444' : 'white',
								shadowColor: '#000',
								shadowOpacity: 0.3,
								shadowRadius: 8,
								shadowOffset: { width: 0, height: 2 },
							}} />
                        </View>
                    </Pressable>
						{!recording && !uri && (
							<View style={{ alignItems: 'center', marginTop: 12 }}>
								<Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>Hold to record</Text>
								<Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '500', fontSize: 12, marginTop: 4 }}>Up to 30 seconds</Text>
							</View>
						)}
					</View>
				</Glass>
            </View>
        </View>
    );
}

/**
 * Wrapper around expo-video that provides a simpler API similar to expo-av Video.
 * Use for straightforward video playback (loop, mute, controls).
 */
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type ContentFit = 'contain' | 'cover' | 'fill';

export type VideoPlayerRef = { play: () => void; pause: () => void };

type SimpleVideoProps = {
	source: { uri: string };
	style?: StyleProp<ViewStyle>;
	contentFit?: ContentFit;
	shouldPlay?: boolean;
	isLooping?: boolean;
	isMuted?: boolean;
	useNativeControls?: boolean;
	onPlayToEnd?: () => void;
	onLoad?: () => void;
	onError?: (error: unknown) => void;
	onPlayingChange?: (isPlaying: boolean) => void;
	videoRef?: React.MutableRefObject<VideoPlayerRef | null>;
};

export function SimpleVideo({
	source,
	style,
	contentFit = 'cover',
	shouldPlay = false,
	isLooping = false,
	isMuted = true,
	useNativeControls = false,
	onPlayToEnd,
	onLoad,
	onError,
	onPlayingChange,
	videoRef,
}: SimpleVideoProps) {
	const uri = source?.uri ?? '';
	const initialUriRef = useRef(uri);
	const [hasError, setHasError] = useState(false);
	const player = useVideoPlayer(uri, (p) => {
		p.loop = isLooping;
		p.muted = isMuted;
		if (shouldPlay) p.play();
	});

	useEffect(() => {
		if (videoRef) {
			videoRef.current = { play: () => player.play(), pause: () => player.pause() };
			return () => { videoRef.current = null; };
		}
	}, [player, videoRef]);

	useEventListener(player, 'playToEnd', () => onPlayToEnd?.());
	const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
	const { status } = useEvent(player, 'statusChange', { status: player.status });

	useEffect(() => { onPlayingChange?.(!!isPlaying); }, [isPlaying]);
	useEffect(() => {
		if (status === 'readyToPlay') {
			setHasError(false);
			onLoad?.();
		}
		if (status === 'error') {
			setHasError(true);
			onError?.('Video failed to load');
		}
	}, [status]);

	// Only call replace() when the URI actually changes after initial mount.
	// useVideoPlayer already loads the initial URI — calling replace() again on mount
	// restarts the iOS video decoder, causing black screen with audio still playing.
	useEffect(() => {
		if (uri && player && uri !== initialUriRef.current) {
			setHasError(false);
			try {
				player.replace(uri);
			} catch (err) {
				console.warn('[SimpleVideo] Error replacing source:', err);
				setHasError(true);
				onError?.(err);
			}
		}
		initialUriRef.current = uri;
	}, [uri, player]);

	useEffect(() => {
		if (!player) return;
		try {
			if (shouldPlay) player.play();
			else player.pause();
		} catch (err) {
			console.warn('[SimpleVideo] Error toggling playback:', err);
		}
	}, [shouldPlay, player]);

	// Error state with retry
	if (hasError) {
		return (
			<View style={[style, videoStyles.errorContainer]}>
				<Text style={videoStyles.errorText}>Video unavailable</Text>
				<Pressable
					style={videoStyles.retryButton}
					onPress={() => {
						setHasError(false);
						try {
							player.replace(uri);
						} catch (err) {
							setHasError(true);
						}
					}}
				>
					<Text style={videoStyles.retryText}>Tap to retry</Text>
				</Pressable>
			</View>
		);
	}

	// Loading state
	if (status === 'loading' || status === 'idle') {
		return (
			<View style={[style, videoStyles.loadingContainer]}>
				<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
				<VideoView
					player={player}
					style={StyleSheet.absoluteFill}
					contentFit={contentFit}
					nativeControls={useNativeControls}
				/>
			</View>
		);
	}

	return (
		<VideoView
			player={player}
			style={style}
			contentFit={contentFit}
			nativeControls={useNativeControls}
		/>
	);
}

const videoStyles = StyleSheet.create({
	errorContainer: {
		backgroundColor: '#1a1a1a',
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		color: '#999',
		fontSize: 14,
		marginBottom: 8,
	},
	retryButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.15)',
	},
	retryText: {
		color: '#ccc',
		fontSize: 13,
		fontWeight: '600',
	},
	loadingContainer: {
		justifyContent: 'center',
		alignItems: 'center',
	},
});

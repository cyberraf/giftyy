/**
 * Wrapper around expo-video that provides a simpler API similar to expo-av Video.
 * Use for straightforward video playback (loop, mute, controls).
 */
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

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
	const { playing } = useEvent(player, 'playingChange', { playing: player.playing });
	const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: player.error });
	useEffect(() => { onPlayingChange?.(!!playing); }, [playing]);
	useEffect(() => {
		if (status === 'readyToPlay') onLoad?.();
	}, [status]);
	useEffect(() => {
		if (error) onError?.(error);
	}, [error]);

	useEffect(() => {
		if (uri) player.replace(uri);
	}, [uri]);

	useEffect(() => {
		if (shouldPlay) player.play();
		else player.pause();
	}, [shouldPlay]);

	return (
		<VideoView
			player={player}
			style={style}
			contentFit={contentFit}
			nativeControls={useNativeControls}
			allowsFullscreen={useNativeControls}
		/>
	);
}

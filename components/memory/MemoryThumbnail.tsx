import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';

type Props = {
	fallbackUrl?: string; // Video URL
	style?: ViewStyle;
	showPlay?: boolean;
};

export function MemoryThumbnail({ fallbackUrl, style, showPlay = true }: Props) {
	const [hasError, setHasError] = useState(false);

	if (!fallbackUrl || hasError) {
		return (
			<View style={[styles.container, style]}>
				<View style={[StyleSheet.absoluteFill, styles.placeholder]}>
					<IconSymbol name="video" size={22} color={GIFTYY_THEME.colors.gray400} />
				</View>
			</View>
		);
	}

	return (
		<MemoryThumbnailInner fallbackUrl={fallbackUrl} style={style} showPlay={showPlay} onError={() => setHasError(true)} />
	);
}

function MemoryThumbnailInner({ fallbackUrl, style, showPlay, onError }: Props & { onError: () => void }) {
	const [loaded, setLoaded] = useState(false);
	const player = useVideoPlayer(fallbackUrl!, (p) => {
		p.muted = true;
		p.loop = false;
	});

	const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: player.error });

	useEffect(() => {
		if (error) onError();
	}, [error, onError]);

	// Seek to first frame and pause when loaded
	useEffect(() => {
		if (status === 'readyToPlay' && !loaded) {
			setLoaded(true);
			player.currentTime = 0;
			player.pause();
		}
	}, [status, loaded]);

	return (
		<View style={[styles.container, style]}>
			<VideoView
				player={player}
				style={StyleSheet.absoluteFill}
				contentFit="cover"
				nativeControls={false}
				allowsFullscreen={false}
			/>
			{showPlay && loaded && (
				<Animated.View
					entering={FadeIn}
					exiting={FadeOut}
					style={styles.playOverlay}
				>
					<IconSymbol name="play.fill" size={22} color="#fff" />
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#111',
		overflow: 'hidden',
		borderRadius: GIFTYY_THEME.radius.md,
	},
	placeholder: {
		backgroundColor: '#1a1a1a',
		alignItems: 'center',
		justifyContent: 'center',
	},
	playOverlay: {
		position: 'absolute',
		bottom: 10,
		right: 10,
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: 'rgba(0,0,0,0.5)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

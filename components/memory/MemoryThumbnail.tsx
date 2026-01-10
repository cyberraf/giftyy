import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';

type Props = {
	fallbackUrl?: string; // Video URL
	style?: ViewStyle;
	showPlay?: boolean;
};

export function MemoryThumbnail({ fallbackUrl, style, showPlay = true }: Props) {
	const [loaded, setLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const videoRef = useRef<Video>(null);

	// Seek to first frame when video loads
	useEffect(() => {
		if (loaded && videoRef.current && fallbackUrl) {
			videoRef.current.setPositionAsync(0).catch((err) => {
				console.warn('[MemoryThumbnail] Failed to seek to first frame:', err);
			});
		}
	}, [loaded, fallbackUrl]);

	const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
		if (status.isLoaded && !loaded) {
			setLoaded(true);
			// Pause immediately after loading to show first frame
			if (videoRef.current) {
				videoRef.current.pauseAsync().catch(() => {});
			}
		}
	};

	return (
		<View style={[styles.container, style]}>
			{fallbackUrl && !hasError ? (
				<>
					<Video
						ref={videoRef}
						source={{ uri: fallbackUrl }}
						style={StyleSheet.absoluteFill}
						resizeMode={ResizeMode.COVER}
						shouldPlay={false}
						isMuted={true}
						onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
						onError={(error) => {
							console.warn('[MemoryThumbnail] Video failed to load:', fallbackUrl, error);
							setHasError(true);
							setLoaded(true);
						}}
						// Use poster blur hash or placeholder while loading
						usePoster={true}
						posterSource={{ uri: fallbackUrl }}
						posterStyle={{ resizeMode: 'cover' }}
					/>
				</>
			) : (
				<View style={[StyleSheet.absoluteFill, styles.placeholder]}>
					<IconSymbol name="video" size={22} color={GIFTYY_THEME.colors.gray400} />
				</View>
			)}

			{showPlay && loaded && !hasError && (
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


import { Video, ResizeMode } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';

type VideoPreviewProps = {
	videoUrl: string;
	style?: ViewStyle;
};

/**
 * Component that displays a video preview (paused at the first frame)
 * Handles both public URLs and Supabase Storage URLs that may need authentication
 */
export function VideoPreview({ videoUrl, style }: VideoPreviewProps) {
	const videoRef = useRef<Video>(null);
	const [hasError, setHasError] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const signedUrl = useSignedVideoUrl(videoUrl);

	useEffect(() => {
		// Seek to 0 seconds to show the first frame once video is loaded
		const seekToStart = async () => {
			try {
				if (videoRef.current && isReady) {
					await videoRef.current.setPositionAsync(0);
					await videoRef.current.pauseAsync();
				}
			} catch (error) {
				console.error('Error seeking video:', error);
				setHasError(true);
			}
		};

		if (isReady) {
			seekToStart();
		}
	}, [signedUrl, isReady]);

	if (!signedUrl) {
		return (
			<View style={[style, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="small" color="#fff" />
			</View>
		);
	}

	return (
		<View style={[style, { backgroundColor: '#000', overflow: 'hidden' }]}>
			<Video
				ref={videoRef}
				source={{ uri: signedUrl }}
				style={StyleSheet.absoluteFill}
				resizeMode={ResizeMode.COVER}
				shouldPlay={false}
				isMuted={true}
				isLooping={false}
				onLoad={() => {
					setIsReady(true);
				}}
				onError={(error) => {
					console.error('Video preview error:', error);
					setHasError(true);
				}}
			/>
			{!isReady && !hasError && (
				<View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
					<ActivityIndicator size="small" color="#fff" />
				</View>
			)}
		</View>
	);
}

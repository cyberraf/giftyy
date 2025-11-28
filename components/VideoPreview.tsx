import { Video, ResizeMode } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
				console.warn('Video preview seek error:', error);
				setHasError(true);
			}
		};

		if (isReady) {
			seekToStart();
		}
	}, [signedUrl, isReady]);

	// Reset error state when URL changes
	useEffect(() => {
		setHasError(false);
		setIsReady(false);
	}, [signedUrl]);

	if (!signedUrl) {
		return (
			<View style={[style, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="small" color="#fff" />
			</View>
		);
	}

	// Show error placeholder if video failed to load
	if (hasError) {
		return (
			<View style={[style, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
				<IconSymbol name="camera.fill" size={32} color="#666" />
				<Text style={{ marginTop: 8, color: '#666', fontSize: 12 }}>Video unavailable</Text>
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
					// Check if it's a 403 Forbidden error (common for expired signed URLs or access issues)
					const errorMessage = error?.toString() || '';
					const is403 = errorMessage.includes('403') || errorMessage.includes('Forbidden');
					const isDemoUrl = videoUrl?.includes('coverr.co') || videoUrl?.includes('cdn.coverr');
					
					// Suppress warnings for demo/placeholder URLs (like coverr.co) that are expected to fail
					if (isDemoUrl) {
						// Silently handle demo URL failures - they're expected placeholders
						setHasError(true);
						return;
					}
					
					if (is403) {
						// Only log as warning for 403 errors (less noisy)
						console.warn('Video preview access denied (403):', videoUrl);
					} else {
						// Log other errors normally
						console.warn('Video preview error:', error);
					}
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

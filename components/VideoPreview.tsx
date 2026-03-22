import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';
import { IconSymbol } from '@/components/ui/icon-symbol';

type VideoPreviewProps = {
	videoUrl: string;
	style?: ViewStyle;
	pauseWhenViewerOpen?: boolean; // If true, unload video when viewer is open
};

function VideoPreviewInner({ signedUrl, style, pauseWhenViewerOpen }: { signedUrl: string; style?: ViewStyle; pauseWhenViewerOpen: boolean }) {
	const [hasError, setHasError] = useState(false);
	const player = useVideoPlayer(signedUrl, (p) => {
		p.loop = false;
		p.muted = true;
		p.play();
	});

	const { status } = useEvent(player, 'statusChange', { status: player.status });
	// Use player.status directly if needed

	useEffect(() => {
		// Use player.status directly if needed or status from event
		if (status === 'error') setHasError(true);
	}, [status]);

	// Seek to 0 and pause to show first frame once loaded
	useEffect(() => {
		if (status === 'readyToPlay') {
			player.currentTime = 0;
			player.pause();
		}
	}, [status]);

	// Aggressively unload video when viewer opens to free decoder resources
	useEffect(() => {
		if (pauseWhenViewerOpen) {
			player.pause();
			player.replace('');
		}
	}, [pauseWhenViewerOpen]);

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
			<VideoView
				key={signedUrl}
				player={player}
				style={StyleSheet.absoluteFill}
				contentFit="cover"
				nativeControls={false}
			/>
			{status !== 'readyToPlay' && (
				<View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
					<ActivityIndicator size="small" color="#fff" />
				</View>
			)}
		</View>
	);
}

/**
 * Component that displays a video preview (paused at the first frame)
 * Handles both public URLs and Supabase Storage URLs that may need authentication
 */
export function VideoPreview({ videoUrl, style, pauseWhenViewerOpen = false }: VideoPreviewProps) {
	const signedUrl = useSignedVideoUrl(videoUrl);

	if (!signedUrl) {
		return (
			<View style={[style, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="small" color="#fff" />
			</View>
		);
	}

	return (
		<VideoPreviewInner
			signedUrl={signedUrl}
			style={style}
			pauseWhenViewerOpen={pauseWhenViewerOpen}
		/>
	);
}

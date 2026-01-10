/**
 * Video Recording Screen for Checkout
 * Integrates the new VideoRecordingFlow component with checkout context
 */

import { VideoRecordingFlow } from '@/components/video-recording/VideoRecordingFlow';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCheckout } from '@/lib/CheckoutContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { InteractionManager, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import StepBar from '@/components/StepBar';

const PRIMARY = GIFTYY_THEME.colors.primary;
const DRAFT_VIDEO_TITLE_KEY = 'draft_video_title';

export default function VideoScreen() {
	useKeepAwake();
	const router = useRouter();
	const { setLocalVideoUri, setVideoDurationMs, setVideoTitle } = useCheckout();
	const { setVisible } = useBottomBarVisibility();

	const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
	const [recordedDurationMs, setRecordedDurationMs] = useState<number>(0);
	const [showTitleModal, setShowTitleModal] = useState(false);
	const [localVideoTitle, setLocalVideoTitle] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [videoRecorded, setVideoRecorded] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	// Load saved title from storage
	useEffect(() => {
		const loadSavedTitle = async () => {
			try {
				const savedTitle = await AsyncStorage.getItem(DRAFT_VIDEO_TITLE_KEY);
				if (savedTitle) {
					setLocalVideoTitle(savedTitle);
				}
			} catch (err) {
				console.warn('Error loading saved video title:', err);
			}
		};
		loadSavedTitle();
	}, []);

	// Save title to storage whenever it changes
	useEffect(() => {
		const saveTitle = async () => {
			if (localVideoTitle.trim()) {
				try {
					await AsyncStorage.setItem(DRAFT_VIDEO_TITLE_KEY, localVideoTitle);
				} catch (err) {
					console.warn('Error saving video title:', err);
				}
			}
		};
		
		// Debounce saving to avoid too many writes
		const timeoutId = setTimeout(saveTitle, 500);
		return () => clearTimeout(timeoutId);
	}, [localVideoTitle]);

	// Ensure component is mounted before rendering camera
	// This prevents Android crash from rendering camera during navigation transition
	useEffect(() => {
		// Use InteractionManager to wait for navigation animations to complete
		const task = InteractionManager.runAfterInteractions(() => {
			setIsMounted(true);
		});
		return () => {
			if (task && task.cancel) task.cancel();
		};
	}, []);

	// Hide bottom bar when on this screen
	useFocusEffect(
		useCallback(() => {
			setVisible(false);
			return () => {
				setVisible(true);
				// Clean up: reset video state when navigating away
				setRecordedVideoUri(null);
				setShowTitleModal(false);
				setVideoRecorded(false);
				setIsMounted(false);
			};
		}, [setVisible])
	);

	// Handle video recorded from the flow
	const handleVideoRecorded = useCallback(async (videoUri: string, durationMs: number) => {
		setRecordedVideoUri(videoUri);
		setRecordedDurationMs(durationMs);
		
		// Load saved title if it exists
		try {
			const savedTitle = await AsyncStorage.getItem(DRAFT_VIDEO_TITLE_KEY);
			if (savedTitle) {
				setLocalVideoTitle(savedTitle);
			}
		} catch (err) {
			console.warn('Error loading saved title:', err);
		}
		
		// Delay state changes to allow camera to properly stop and cleanup
		// This prevents the Android crash from unmounting while camera is active
		setTimeout(() => {
			setVideoRecorded(true);
			setShowTitleModal(true);
		}, 300);
	}, []);

	// Handle cancel from the flow
	const handleCancel = useCallback(() => {
		router.back();
	}, [router]);

	// Handle continue - store locally, don't upload yet
	const handleContinue = useCallback(async () => {
		try {
			if (!recordedVideoUri || !localVideoTitle.trim()) {
				setError('Please enter a video title');
				return;
			}

			const trimmedTitle = localVideoTitle.trim();
			
			// Store local video file URI, duration, and title in checkout context
			// Video will be uploaded after successful checkout
			setLocalVideoUri(recordedVideoUri);
			setVideoDurationMs(recordedDurationMs);
			setVideoTitle(trimmedTitle);
			
			// Clear saved title after storing (don't await to avoid blocking)
			AsyncStorage.removeItem(DRAFT_VIDEO_TITLE_KEY).catch(console.warn);
			
			// Close modal first
			setShowTitleModal(false);
			
			// Navigate after a brief delay to ensure state updates and modal close complete
			requestAnimationFrame(() => {
				try {
					router.push('/(buyer)/checkout/shared-memory');
				} catch (navError) {
					console.error('Navigation error:', navError);
					setError('Navigation failed. Please try again.');
					setShowTitleModal(true); // Reopen modal on error
				}
			});
		} catch (err) {
			console.error('Error in handleContinue:', err);
			setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
		}
	}, [recordedVideoUri, recordedDurationMs, localVideoTitle, setLocalVideoUri, setVideoDurationMs, setVideoTitle, router]);


        return (
		<View style={styles.container} collapsable={false}>
			<View style={styles.headerContainer} pointerEvents="box-none" collapsable={false}>
				<StepBar current={4} total={7} label="Record a video message" />
			</View>
			<View style={styles.videoFlowContainer} collapsable={false}>
				{!videoRecorded && isMounted ? (
					<VideoRecordingFlow
						onVideoRecorded={handleVideoRecorded}
						onCancel={handleCancel}
					/>
				) : null}
			</View>

			{/* Title Input Modal */}
			<Modal
				visible={showTitleModal}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setShowTitleModal(false)}
			>
				<Pressable 
					style={styles.modalOverlay}
					onPress={() => setShowTitleModal(false)}
					activeOpacity={1}
				>
					<Pressable 
						style={styles.modalContent}
						onPress={(e) => e.stopPropagation()}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add a Title</Text>
							<Text style={styles.modalSubtitle}>
								Give your video message a meaningful title
							</Text>
						</View>

						<View style={styles.inputContainer}>
							<TextInput
								value={localVideoTitle}
								onChangeText={(text) => {
									setLocalVideoTitle(text);
									setError(null);
								}}
								placeholder="Enter video title..."
								placeholderTextColor={GIFTYY_THEME.colors.gray400}
								style={[
									styles.titleInput,
									localVideoTitle.trim() && styles.titleInputFocused,
									error && styles.titleInputError,
								]}
								maxLength={100}
								autoFocus
							/>
							<Text style={styles.characterCount}>
								{localVideoTitle.length}/100
							</Text>
						</View>

						{error && (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>{error}</Text>
							</View>
						)}

						<Pressable
							onPress={handleContinue}
							disabled={!localVideoTitle.trim()}
							style={[
								styles.continueButton,
								!localVideoTitle.trim() && styles.continueButtonDisabled,
							]}
						>
							<LinearGradient
								colors={[PRIMARY, GIFTYY_THEME.colors.primaryLight]}
								style={styles.continueButtonGradient}
							>
								<Text style={styles.continueButtonText}>Continue</Text>
							</LinearGradient>
						</Pressable>
					</Pressable>
				</Pressable>
			</Modal>
                                    </View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	headerContainer: {
		zIndex: 100,
		elevation: 100,
		position: 'relative',
		backgroundColor: '#fff',
	},
	videoFlowContainer: {
		flex: 1,
		backgroundColor: '#000',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	modalContent: {
		width: '100%',
		maxWidth: 380,
		backgroundColor: '#fff',
		borderRadius: 28,
		padding: 28,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.25,
		shadowRadius: 20,
		elevation: 16,
	},
	modalHeader: {
		marginBottom: 24,
	},
	modalTitle: {
		fontSize: 28,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 8,
		textAlign: 'center',
		letterSpacing: -0.5,
	},
	modalSubtitle: {
		fontSize: 15,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		lineHeight: 22,
	},
	inputContainer: {
		marginBottom: 20,
	},
	titleInput: {
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray200,
		borderRadius: 16,
		paddingHorizontal: 18,
		paddingVertical: 16,
		fontSize: 16,
		color: GIFTYY_THEME.colors.gray900,
		minHeight: 56,
	},
	titleInputFocused: {
		borderColor: PRIMARY,
		backgroundColor: '#fff',
	},
	titleInputError: {
		borderColor: GIFTYY_THEME.colors.error,
	},
	characterCount: {
		fontSize: 12,
		color: GIFTYY_THEME.colors.gray400,
		textAlign: 'right',
		marginTop: 6,
	},
	errorContainer: {
		marginBottom: 20,
		paddingHorizontal: 4,
	},
	errorText: {
		color: GIFTYY_THEME.colors.error,
		fontSize: 14,
		textAlign: 'center',
		fontWeight: '600',
	},
	continueButton: {
		borderRadius: 20,
		overflow: 'hidden',
		height: 56,
		shadowColor: PRIMARY,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	continueButtonDisabled: {
		opacity: 0.5,
		shadowOpacity: 0,
	},
	continueButtonGradient: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	continueButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
});

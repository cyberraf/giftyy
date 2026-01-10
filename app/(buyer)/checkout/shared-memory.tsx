/**
 * Step 5 of 7: Add Shared Memory
 * Redesigned with emotional, nostalgic, and highly optional feel
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	FlatList,
	Image,
	RefreshControl,
	Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	FadeInDown,
	FadeInUp,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

import StepBar from '@/components/StepBar';
import { useCheckout } from '@/lib/CheckoutContext';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSharedMemories } from '@/contexts/SharedMemoriesContext';

export default function SharedMemoryScreen() {
	const router = useRouter();
	const { bottom } = useSafeAreaInsets();
	const {
		memoryType,
		setMemoryType,
		sharedMemoryId,
		localMemoryPhotoUri,
		setLocalMemoryPhotoUri,
		memoryCaption,
		setMemoryCaption,
		memoryText,
		setMemoryText,
		setSharedMemoryId,
	} = useCheckout();
	const { sharedMemories, loading, refreshSharedMemories, addSharedMemory } = useSharedMemories();
	const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
	const [uploading, setUploading] = useState(false);

	// Hydrate selection from checkout state
	useEffect(() => {
		if (memoryType && sharedMemoryId) {
			setSelectedId(sharedMemoryId);
		}
	}, [memoryType, sharedMemoryId]);

	const handleSkip = () => {
		clearMemorySelection();
		router.push('/(buyer)/checkout/payment');
	};

	const clearMemorySelection = () => {
		setMemoryType(null);
		setLocalMemoryPhotoUri(undefined);
		setMemoryCaption(undefined);
		setMemoryText(undefined);
		setSharedMemoryId(undefined);
		setSelectedId(undefined);
	};

	const handleSelectMemory = (memoryId: string, mediaType: 'photo' | 'video', title?: string, fileUrl?: string) => {
		// Toggle selection: if already selected, unselect it
		if (selectedId === memoryId) {
			clearMemorySelection();
		} else {
			setSelectedId(memoryId);
			setSharedMemoryId(memoryId);
			setMemoryType(mediaType === 'photo' ? 'photo' : null);
			// Clear local uploads and text
			setLocalMemoryPhotoUri(undefined);
			setMemoryCaption(title || undefined);
			setMemoryText(undefined);
		}
	};

	// Handle continue
	const handleContinue = () => {
		router.push('/(buyer)/checkout/payment');
	};

	const handleUploadNewMemory = useCallback(async () => {
		if (uploading) return;

		const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!perm.granted) {
			Alert.alert('Permission needed', 'Please allow access to upload a memory.');
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			allowsMultipleSelection: false,
			quality: 1,
		});

		if (result.canceled || !result.assets?.length) return;

		const asset = result.assets[0];
		const mediaType = asset.type === 'video' ? 'video' : 'photo';
		const title = asset.fileName || 'Checkout memory';

		setUploading(true);
		try {
			const { memory, error } = await addSharedMemory(asset.uri, title, mediaType);
			if (error) {
				Alert.alert('Upload failed', error.message);
				return;
			}
			if (memory?.id) {
				setSharedMemoryId(memory.id);
				setSelectedId(memory.id);
				setMemoryType(mediaType === 'photo' ? 'photo' : null);
				setMemoryCaption(memory.title || undefined);
				setMemoryText(undefined);
				setLocalMemoryPhotoUri(undefined);
				await refreshSharedMemories();
				Alert.alert('Uploaded', 'Memory added and selected for this order.');
			}
		} catch (err: any) {
			Alert.alert('Upload failed', err.message || 'Please try again.');
		} finally {
			setUploading(false);
		}
	}, [uploading, addSharedMemory, setSharedMemoryId, setMemoryType, setMemoryCaption, setMemoryText, setLocalMemoryPhotoUri, refreshSharedMemories]);

	const hasMemory = !!selectedId;
	const continueButtonText = hasMemory ? 'Continue with Memory' : 'Skip and Continue';

	// Derive display list
	const memoryItems = useMemo(() => {
		return sharedMemories.map((m) => ({
			...m,
			isSelected: m.id === selectedId,
		}));
	}, [sharedMemories, selectedId]);

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={0}
		>
			<StepBar current={5} total={7} label="Add a Shared Memory" />

			<FlatList
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: BOTTOM_BAR_TOTAL_SPACE + bottom + 120 },
				]}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={refreshSharedMemories}
						tintColor={GIFTYY_THEME.colors.primary}
						colors={[GIFTYY_THEME.colors.primary]}
					/>
				}
				data={memoryItems}
				keyExtractor={(item) => item.id}
				numColumns={2}
				columnWrapperStyle={memoryItems.length > 0 ? { gap: 12, marginBottom: 12 } : undefined}
				ListHeaderComponent={
					<>
						{/* Intro Block */}
						<Animated.View style={styles.introBlock} entering={FadeInDown.duration(400)}>
							<View style={styles.introIconContainer}>
								<IconSymbol name="heart.circle.fill" size={56} color={GIFTYY_THEME.colors.primary} />
							</View>
							<Text style={styles.introTitle}>
								Choose a shared memory from your vault.
							</Text>
							<Text style={styles.introSubtitle}>
								Attach one of your memories to their Celebration Wall. You can also upload a new one right here.
							</Text>
						</Animated.View>

						{/* Library of memories */}
						<View style={styles.libraryHeader}>
							<Text style={styles.libraryTitle}>Your Shared Memories</Text>
							<Text style={styles.librarySubtitle}>
								Pick one to include, or upload a new memory.
							</Text>
						</View>
					</>
				}
				ListEmptyComponent={
					!loading ? (
						<View style={styles.emptyState}>
							<IconSymbol name="photo" size={40} color={GIFTYY_THEME.colors.gray300} />
							<Text style={styles.emptyTitle}>No shared memories yet</Text>
							<Pressable
								style={styles.manageButton}
								onPress={handleUploadNewMemory}
								disabled={uploading}
							>
								<Text style={styles.manageButtonText}>
									{uploading ? 'Uploading...' : 'Upload a memory'}
								</Text>
							</Pressable>
						</View>
					) : null
				}
				renderItem={({ item, index }) => (
					<Animated.View entering={FadeInUp.duration(300).delay(index * 50)} style={{ flex: 1, marginHorizontal: 0 }}>
						<MemoryLibraryCard
							memory={item}
							isSelected={item.isSelected}
							onSelect={() =>
								handleSelectMemory(item.id, item.mediaType, item.title, item.fileUrl)
							}
						/>
					</Animated.View>
				)}
			/>

			{/* Sticky Bottom CTA */}
			<View
				style={[
					styles.stickyFooter,
					{
						bottom: BOTTOM_BAR_TOTAL_SPACE + bottom,
					},
				]}
			>
				<View style={styles.buttonContainer}>
					<Pressable
						style={({ pressed }) => [
							styles.continueButton,
							pressed && styles.continueButtonPressed,
						]}
						onPress={handleContinue}
					>
						<Text style={styles.continueButtonText}>
							{continueButtonText}
						</Text>
					</Pressable>
					<Pressable 
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Text style={styles.backButtonText}>Back to video</Text>
					</Pressable>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

type LibraryCardProps = {
	memory: {
		id: string;
		title: string;
		mediaType: 'video' | 'photo';
		fileUrl: string;
		isSelected?: boolean;
	};
	isSelected: boolean;
	onSelect: () => void;
};

function MemoryLibraryCard({ memory, isSelected, onSelect }: LibraryCardProps) {
	const preview = memory.fileUrl;

	return (
		<Pressable onPress={onSelect} style={[styles.card, isSelected && styles.cardSelected]}>
			<View style={styles.cardMedia}>
				{preview ? (
					<Image source={{ uri: preview }} style={styles.cardImage} />
				) : (
					<View style={styles.cardPlaceholder}>
						<IconSymbol name="photo" size={28} color={GIFTYY_THEME.colors.gray400} />
					</View>
				)}
				{isSelected && (
					<View style={styles.checkCircle}>
						<IconSymbol name="checkmark" size={16} color="#fff" />
					</View>
				)}
			</View>
			<View style={styles.cardBody}>
				<Text style={styles.cardTitle} numberOfLines={2}>
					{memory.title || 'Untitled memory'}
				</Text>
				<Text style={styles.cardSubtitle}>Tap to attach to this gift</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: GIFTYY_THEME.spacing.xl,
	},
	introBlock: {
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing['3xl'],
		paddingVertical: GIFTYY_THEME.spacing.xl,
	},
	introIconContainer: {
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	introTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
		lineHeight: GIFTYY_THEME.typography.sizes['2xl'] * 1.3,
	},
	introSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		lineHeight: GIFTYY_THEME.typography.sizes.base * 1.5,
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	libraryHeader: {
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	libraryTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 6,
	},
	librarySubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
	},
	card: {
		flex: 1,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		overflow: 'hidden',
		backgroundColor: '#fff',
		...GIFTYY_THEME.shadows.sm,
	},
	cardSelected: {
		borderColor: GIFTYY_THEME.colors.primary,
		borderWidth: 2,
		shadowOpacity: 0.25,
	},
	cardMedia: {
		position: 'relative',
		width: '100%',
		aspectRatio: 1.1,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	cardImage: {
		width: '100%',
		height: '100%',
	},
	cardPlaceholder: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkCircle: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	cardBody: {
		padding: GIFTYY_THEME.spacing.md,
		gap: 6,
	},
	cardTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	cardSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing['2xl'],
		gap: 8,
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	emptySubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		lineHeight: 20,
	},
	manageButton: {
		marginTop: 8,
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	manageButtonText: {
		color: '#fff',
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	stickyFooter: {
		position: 'absolute',
		left: 0,
		right: 0,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	buttonContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		paddingTop: 12,
		paddingBottom: 0,
		marginBottom: 0,
	},
	continueButton: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	continueButtonPressed: {
		opacity: 0.9,
		transform: [{ scale: 0.98 }],
	},
	continueButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	backButton: {
		marginTop: 6,
		marginBottom: 8,
		alignSelf: 'center',
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	backButtonText: {
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: '600',
		fontSize: 14,
	},
});

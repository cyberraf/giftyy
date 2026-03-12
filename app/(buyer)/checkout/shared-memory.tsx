/**
 * Step 5 of 7: Add Shared Memory
 * Redesigned with emotional, nostalgic, and highly optional feel
 */

import { useAlert } from '@/contexts/AlertContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	FlatList,
	Image,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View
} from 'react-native';
import Animated, {
	FadeInDown,
	FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StepBar from '@/components/StepBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useSharedMemories } from '@/contexts/SharedMemoriesContext';
import { useCheckout } from '@/lib/CheckoutContext';

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
	const { alert } = useAlert();

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
		router.push('/(buyer)/checkout/design');
	};

	const handleUploadNewMemory = useCallback(async () => {
		if (uploading) return;

		const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!perm.granted) {
			alert('Permission needed', 'Please allow access to upload a memory.');
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
				alert('Upload failed', error.message);
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
				alert('Uploaded', 'Memory added and selected for this order.');
			}
		} catch (err: any) {
			alert('Upload failed', err.message || 'Please try again.');
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
			<StepBar current={4} total={7} label="Add a Shared Memory" />

			<FlatList
				key="single-column"
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: bottom + 120 },
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
				numColumns={1}
				ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
				ListHeaderComponent={
					<>
						{/* Intro Block */}
						<Animated.View style={styles.introBlock} entering={FadeInDown.duration(400)}>
							<View style={styles.introIconContainer}>
								<IconSymbol name="heart.fill" size={64} color={GIFTYY_THEME.colors.primary} />
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

			{/* Floating Bottom CTA */}
			<View style={[styles.stickyBar, { bottom: bottom > 0 ? bottom + 8 : 24 }]}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
					<Pressable
						style={{ paddingVertical: 12, paddingRight: 16 }}
						onPress={() => router.back()}
					>
						<Text style={{ color: '#64748b', fontWeight: '800', fontSize: 13 }}>Back</Text>
					</Pressable>
					<Pressable
						style={{ flex: 1, backgroundColor: GIFTYY_THEME.colors.primary, paddingVertical: 14, borderRadius: 999, alignItems: 'center' }}
						onPress={handleContinue}
					>
						<Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
							{continueButtonText}
						</Text>
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
					<View style={styles.selectedOverlay} />
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
		backgroundColor: '#FFF5F0', // Premium cream background
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: GIFTYY_THEME.spacing.xl,
		paddingTop: GIFTYY_THEME.spacing['2xl'],
	},
	introBlock: {
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing['3xl'],
		paddingVertical: GIFTYY_THEME.spacing.xl,
	},
	introIconContainer: {
		marginBottom: GIFTYY_THEME.spacing.xl,
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 10,
	},
	introTitle: {
		fontSize: 32,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
		lineHeight: 38,
		letterSpacing: -0.5,
	},
	introSubtitle: {
		fontSize: 16,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		lineHeight: 24,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
	},
	libraryHeader: {
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	libraryTitle: {
		fontSize: 22,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 6,
		letterSpacing: -0.3,
	},
	librarySubtitle: {
		fontSize: 15,
		color: GIFTYY_THEME.colors.gray600,
	},
	card: {
		flex: 1,
		borderRadius: 24,
		borderWidth: 2,
		borderColor: 'transparent',
		overflow: 'hidden',
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 4,
		marginBottom: 4,
	},
	cardSelected: {
		borderColor: GIFTYY_THEME.colors.primary,
		transform: [{ scale: 0.98 }],
	},
	cardMedia: {
		position: 'relative',
		width: '100%',
		aspectRatio: 4 / 3, // Premium landscape ratio
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
	selectedOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(247, 85, 7, 0.15)',
	},
	checkCircle: {
		position: 'absolute',
		top: 16,
		right: 16,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 4,
	},
	cardBody: {
		padding: 20,
		gap: 4,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.gray900,
	},
	cardSubtitle: {
		fontSize: 14,
		color: GIFTYY_THEME.colors.gray500,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 48,
		backgroundColor: '#fff',
		borderRadius: 24,
		gap: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.05,
		shadowRadius: 16,
		elevation: 2,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.gray900,
	},
	emptySubtitle: {
		fontSize: 15,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		lineHeight: 22,
	},
	manageButton: {
		marginTop: 8,
		paddingHorizontal: 28,
		paddingVertical: 14,
		borderRadius: 999,
		backgroundColor: GIFTYY_THEME.colors.gray900,
	},
	manageButtonText: {
		color: '#fff',
		fontWeight: '800',
		fontSize: 15,
	},
	stickyBar: {
		position: 'absolute',
		left: 16,
		right: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		borderRadius: 32,
		paddingHorizontal: 20,
		paddingVertical: 16,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 8 },
		elevation: 20,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.05)',
	},
});

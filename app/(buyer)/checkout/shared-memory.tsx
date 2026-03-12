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
	Modal,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
	FadeInDown,
	FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemoryThumbnail } from '@/components/memory/MemoryThumbnail';
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
		<View style={styles.container}>


			<FlatList
				key="gallery-grid"
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: bottom + 120 },
				]}
				columnWrapperStyle={styles.columnWrapper}
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
				numColumns={3}
				ListHeaderComponent={
					<>

						{/* Library of memories */}
						<View style={styles.libraryHeader}>
							<Text style={styles.libraryTitle}>Your Memories</Text>
							<Pressable
								style={styles.headerUploadButton}
								onPress={handleUploadNewMemory}
								disabled={uploading}
							>
								<IconSymbol name="plus" size={16} color={GIFTYY_THEME.colors.primary} />
								<Text style={styles.headerUploadText}>Add New</Text>
							</Pressable>
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
						<MemoryLibraryCard
							memory={item}
							isSelected={item.isSelected}
							index={index}
							onSelect={() =>
								handleSelectMemory(item.id, item.mediaType, item.title, item.fileUrl)
							}
						/>
				)}
			/>

			{/* Floating Bottom CTA */}
			<View style={[styles.stickyBar, { bottom: bottom > 0 ? bottom + 8 : 24 }]}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
					<Pressable
						style={{ paddingVertical: 12, paddingHorizontal: 16 }}
						onPress={() => router.back()}
					>
						<Text style={{ color: '#64748b', fontWeight: '800', fontSize: 13 }}>Back</Text>
					</Pressable>
					<Pressable
						style={{ flex: 1, backgroundColor: GIFTYY_THEME.colors.primary, paddingVertical: 16, borderRadius: 20, alignItems: 'center', shadowColor: GIFTYY_THEME.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
						onPress={handleContinue}
					>
						<Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
							{continueButtonText}
						</Text>
					</Pressable>
				</View>
			</View>

			<UploadingModal visible={uploading} />
		</View>
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

const MemoryLibraryCard = React.memo(({ memory, isSelected, onSelect, index }: LibraryCardProps & { index: number }) => {
	return (
		<Animated.View 
			entering={FadeInUp.duration(400).delay(index * 30)} 
			style={styles.gridItem}
		>
			<Pressable onPress={onSelect} style={[styles.card, isSelected && styles.cardSelected]}>
				<View style={styles.cardMedia}>
					{memory.mediaType === 'video' ? (
						<MemoryThumbnail fallbackUrl={memory.fileUrl} style={styles.cardImage} showPlay={false} />
					) : (
						<Image source={{ uri: memory.fileUrl }} style={styles.cardImage} />
					)}
					
					{isSelected && (
						<View style={styles.selectedOverlay}>
							<View style={styles.checkCircle}>
								<IconSymbol name="checkmark" size={12} color="#fff" />
							</View>
						</View>
					)}
				</View>
			</Pressable>
		</Animated.View>
	);
});

function UploadingModal({ visible }: { visible: boolean }) {
	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.modalOverlay}>
				<BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
				<Animated.View entering={FadeInDown.duration(300)} style={styles.modalContent}>
					<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.modalTitle}>Uploading Memory...</Text>
					<Text style={styles.modalSubtitle}>This will just take a moment.</Text>
				</Animated.View>
			</View>
		</Modal>
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
		paddingTop: 140, // Extra space for global header
	},


	card: {
		flex: 1,
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	cardSelected: {
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	cardMedia: {
		flex: 1,
		position: 'relative',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: 16,
		overflow: 'hidden',
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
		backgroundColor: 'rgba(247, 85, 7, 0.4)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkCircle: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	gridItem: {
		flex: 1 / 3,
		aspectRatio: 1,
		padding: 4,
	},
	columnWrapper: {
		justifyContent: 'flex-start',
	},
	libraryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.lg,
		marginTop: GIFTYY_THEME.spacing.md,
	},
	libraryTitle: {
		fontSize: 20,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.gray900,
		letterSpacing: -0.3,
	},
	headerUploadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		gap: 6,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.05)',
	},
	headerUploadText: {
		fontSize: 13,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.primary,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.3)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 32,
		padding: 32,
		alignItems: 'center',
		width: '100%',
		maxWidth: 320,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 10,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.gray900,
		marginTop: 20,
		marginBottom: 8,
		letterSpacing: -0.5,
	},
	modalSubtitle: {
		fontSize: 15,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
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

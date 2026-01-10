import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useProducts } from '@/contexts/ProductsContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width, height } = Dimensions.get('window');

// Video Thumbnail Component - Shows video preview in gallery
function VideoThumbnail({ videoUrl }: { videoUrl: string }) {
	const player = useVideoPlayer(videoUrl, (player) => {
		player.loop = true;
		player.muted = true;
		try {
			player.play();
		} catch (error) {
			// Ignore play errors
		}
	});

	useEffect(() => {
		return () => {
			// Cleanup: try to pause, but don't throw if player is already released
			try {
				player.pause();
			} catch (error) {
				// Ignore cleanup errors - player may already be released
			}
		};
	}, [player]);

	return (
		<View style={styles.videoThumbnailContainer}>
			<VideoView
				player={player}
				style={styles.videoThumbnail}
				contentFit="cover"
				nativeControls={false}
			/>
		</View>
	);
}

// Fullscreen Media Viewer Modal with swipeable gallery
function MediaViewerModal({
	visible,
	mediaList,
	initialIndex,
	onClose,
}: {
	visible: boolean;
	mediaList: VendorMedia[];
	initialIndex: number;
	onClose: () => void;
}) {
	const { top, bottom } = useSafeAreaInsets();
	const flatListRef = React.useRef<FlatList>(null);
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	
	// All hooks must be called before any conditional returns
	const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: any[] }) => {
		if (viewableItems.length > 0) {
			const index = viewableItems[0].index ?? 0;
			setCurrentIndex(index);
		}
	}).current;

	const viewabilityConfig = React.useRef({
		itemVisiblePercentThreshold: 50,
	}).current;

	// Scroll to initial index when modal opens
	useEffect(() => {
		if (visible && flatListRef.current && initialIndex >= 0 && mediaList.length > 0) {
			setTimeout(() => {
				flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
				setCurrentIndex(initialIndex);
			}, 100);
		}
	}, [visible, initialIndex, mediaList.length]);

	if (!visible || mediaList.length === 0) return null;

	const currentMedia = mediaList[currentIndex];

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={[styles.modalContainer, { paddingTop: top, paddingBottom: bottom }]}>
				{/* Header */}
				<View style={styles.modalHeader}>
					<Pressable onPress={onClose} style={styles.modalCloseButton}>
						<IconSymbol name="xmark" size={24} color={GIFTYY_THEME.colors.white} />
					</Pressable>
					<View style={styles.modalTitleContainer}>
						{currentMedia?.title && (
							<Text style={styles.modalTitle} numberOfLines={1}>
								{currentMedia.title}
							</Text>
						)}
						{mediaList.length > 1 && (
							<Text style={styles.modalCounter}>
								{currentIndex + 1} / {mediaList.length}
							</Text>
						)}
					</View>
					<View style={styles.modalCloseButton} />
				</View>

				{/* Swipeable Media Gallery */}
				<View style={styles.modalContent}>
					<FlatList
						ref={flatListRef}
						data={mediaList}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						keyExtractor={(item) => item.id}
						onViewableItemsChanged={onViewableItemsChanged}
						viewabilityConfig={viewabilityConfig}
						renderItem={({ item }) => (
							<MediaViewerItem media={item} width={width} height={height} />
						)}
						getItemLayout={(data, index) => ({
							length: width,
							offset: width * index,
							index,
						})}
						initialScrollIndex={initialIndex}
						onScrollToIndexFailed={(info) => {
							const wait = new Promise((resolve) => setTimeout(resolve, 500));
							wait.then(() => {
								flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
							});
						}}
					/>
				</View>

				{/* Description */}
				{currentMedia?.description && (
					<View style={styles.modalDescription}>
						<Text style={styles.modalDescriptionText}>{currentMedia.description}</Text>
					</View>
				)}
			</View>
		</Modal>
	);
}

// Individual media item component for the gallery
function MediaViewerItem({ media, width, height }: { media: VendorMedia; width: number; height: number }) {
	const videoPlayer = useVideoPlayer(media.mediaType === 'video' ? media.mediaUrl : '', (player) => {
		player.loop = false;
		player.muted = false;
	});

	useEffect(() => {
		if (media.mediaType === 'video') {
			try {
				videoPlayer.replace(media.mediaUrl);
				videoPlayer.play();
			} catch (error) {
				console.warn('Error playing video:', error);
			}
		}

		return () => {
			try {
				videoPlayer.pause();
			} catch (error) {
				// Ignore cleanup errors
			}
		};
	}, [media.id, media.mediaUrl, media.mediaType]);

	return (
		<View style={[styles.mediaViewerItem, { width, height: height * 0.8 }]}>
			{media.mediaType === 'image' ? (
				<Image
					source={{ uri: media.mediaUrl }}
					style={styles.fullscreenImage}
					resizeMode="contain"
				/>
			) : media.mediaType === 'video' ? (
				<VideoView
					player={videoPlayer}
					style={styles.fullscreenVideo}
					contentFit="contain"
					nativeControls={true}
					allowsFullscreen={true}
				/>
			) : (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
				</View>
			)}
		</View>
	);
}

type VendorProfile = {
	id: string;
	storeName?: string;
	profileImageUrl?: string;
	createdAt: string;
};

type VendorMedia = {
	id: string;
	vendorId: string;
	mediaUrl: string;
	mediaType: string; // 'image' | 'video' or other types
	title?: string;
	description?: string;
	createdAt: string;
};

export default function VendorProfileScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const vendorId = params.id;
	const { top, bottom } = useSafeAreaInsets();
	const { products, getProductById } = useProducts();
	
	const [vendor, setVendor] = useState<VendorProfile | null>(null);
	const [vendorMedia, setVendorMedia] = useState<VendorMedia[]>([]);
	const [loading, setLoading] = useState(true);
	const [mediaLoading, setMediaLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [imageError, setImageError] = useState(false);
	const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
	const [mediaViewerVisible, setMediaViewerVisible] = useState(false);

	// Get vendor's products
	const vendorProducts = useMemo(() => {
		if (!vendorId) return [];
		return products.filter(p => p.vendorId === vendorId && p.isActive);
	}, [products, vendorId]);

	useEffect(() => {
		const fetchVendor = async () => {
			if (!vendorId) {
				setError('Vendor ID is required');
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const { data, error: fetchError } = await supabase
					.from('profiles')
					.select('id, store_name, profile_image_url, created_at')
					.eq('id', vendorId)
					.eq('role', 'vendor')
					.single();

				if (fetchError) {
					console.error('[VendorProfile] Error fetching vendor:', fetchError);
					setError('Vendor not found');
					return;
				}

				if (data) {
					// Ensure profile image URL is a proper public URL
					// Expected URL format: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
					let profileImageUrl = data.profile_image_url || undefined;
					if (profileImageUrl) {
						// If the URL is already a full HTTP URL, use it as-is
						if (profileImageUrl.startsWith('http')) {
							// URL is already complete, use as-is
						} else {
							// Convert storage path to public URL
							// The database might store:
							// 1. Just the filename: "filename.png"
							// 2. Relative path: "avatars/{user_id}/filename.png"
							// 3. Path without avatars: "{user_id}/filename.png"
							// We need: "avatars/{user_id}/filename.png"
							let path = profileImageUrl.trim();
							
							// Remove leading/trailing slashes
							path = path.replace(/^\/+|\/+$/g, '');
							
							// Remove bucket name if present (shouldn't be in path)
							path = path.replace(/^profile_images\//, '');
							
							// Check if path already has avatars prefix
							if (path.startsWith('avatars/')) {
								// Path is already in correct format: avatars/{user_id}/filename
								// Use it as-is
							} else {
								// Extract filename (last part after any slashes)
								const pathParts = path.split('/');
								const filename = pathParts[pathParts.length - 1];
								
								// Construct path as: avatars/{user_id}/filename
								path = `avatars/${data.id}/${filename}`;
							}
							
							// Get public URL from Supabase storage
							// This will return: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
							const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(path);
							profileImageUrl = urlData.publicUrl;
						}
					}
					
					setVendor({
						id: data.id,
						storeName: data.store_name || undefined,
						profileImageUrl,
						createdAt: data.created_at,
					});
					setImageError(false); // Reset image error when vendor data changes
				}
			} catch (err) {
				console.error('[VendorProfile] Unexpected error:', err);
				setError('Failed to load vendor profile');
			} finally {
				setLoading(false);
			}
		};

		fetchVendor();
	}, [vendorId]);

	// Fetch vendor media
	useEffect(() => {
		const fetchVendorMedia = async () => {
			if (!vendorId) {
				setMediaLoading(false);
				return;
			}

			try {
				setMediaLoading(true);
				const { data, error: mediaError } = await supabase
					.from('vendor_media')
					.select('*')
					.eq('vendor_id', vendorId)
					.order('created_at', { ascending: false });

				if (mediaError) {
					console.error('[VendorProfile] Error fetching vendor media:', mediaError);
					setVendorMedia([]);
					return;
				}

				if (data) {
					const media: VendorMedia[] = data.map((row: any) => ({
						id: row.id,
						vendorId: row.vendor_id,
						mediaUrl: row.media_url,
						mediaType: row.media_type || 'image',
						title: row.title || undefined,
						description: row.description || undefined,
						createdAt: row.created_at,
					}));
					setVendorMedia(media);
				}
			} catch (err) {
				console.error('[VendorProfile] Error fetching vendor media:', err);
				setVendorMedia([]);
			} finally {
				setMediaLoading(false);
			}
		};

		fetchVendorMedia();
	}, [vendorId]);

	const headerPaddingTop = top + 6;

	if (loading) {
		return (
			<View style={[styles.container, { paddingTop: headerPaddingTop + 56 }]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<Text style={styles.loadingText}>Loading vendor profile...</Text>
				</View>
			</View>
		);
	}

	if (error || !vendor) {
		return (
			<View style={[styles.container, { paddingTop: headerPaddingTop + 56 }]}>
				<View style={styles.errorContainer}>
					<IconSymbol name="exclamationmark.triangle" size={48} color="#9ca3af" />
					<Text style={styles.errorTitle}>Vendor not found</Text>
					<Text style={styles.errorText}>{error || 'The vendor profile you\'re looking for doesn\'t exist.'}</Text>
					<Pressable
						onPress={() => router.back()}
						style={styles.backButton}
					>
						<Text style={styles.backButtonText}>Go Back</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={[styles.header, { paddingTop: headerPaddingTop }]}>
				<Pressable onPress={() => router.back()} style={styles.headerBtn}>
					<IconSymbol size={20} name="chevron.left" color="#111" />
				</Pressable>
				<Text style={styles.headerTitle}>Vendor Profile</Text>
				<View style={styles.headerBtn} />
			</View>

			<ScrollView 
				contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* Vendor Info Card - Redesigned */}
				<Animated.View entering={FadeInUp.duration(400)} style={styles.vendorCard}>
					<View style={styles.vendorHeader}>
						{vendor.profileImageUrl && !imageError ? (
							<View style={styles.vendorImageContainer}>
								<Image 
									key={`vendor-profile-image-${vendor.profileImageUrl}`}
									source={{ 
										uri: vendor.profileImageUrl,
									}} 
									style={styles.vendorImage}
									resizeMode="cover"
									onError={async (error) => {
										// Silently handle vendor image errors - we'll try to find the correct file
										// Only log if we can't find an alternative (quiet error handling)
										
										// Try alternative path if original fails
										if (vendor?.profileImageUrl && !imageError && vendor?.id) {
											const urlMatch = vendor.profileImageUrl.match(/\/storage\/v1\/object\/public\/profile_images\/(.+)$/);
											if (urlMatch) {
												const storagePath = urlMatch[1];
												let alternativePath = '';
												let alternativeUrl = '';
												
												// Try both path formats:
												// - If path has 'avatars/', try without it (old format: {user_id}/{fileName})
												// - If path doesn't have 'avatars/', try with it (new format: avatars/{user_id}/{fileName})
												if (storagePath.startsWith('avatars/')) {
													// Remove avatars/ prefix to try old format
													alternativePath = storagePath.replace(/^avatars\//, '');
													const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(alternativePath);
													alternativeUrl = urlData.publicUrl;
													console.log('[VendorProfile] Trying alternative path (without avatars/):', alternativeUrl);
												} else {
													// Add avatars/ prefix to try new format
													// Need to check if path is already in format {user_id}/{fileName}
													const pathParts = storagePath.split('/');
													if (pathParts.length >= 2) {
														// Path is already {user_id}/{fileName}, try with avatars/
														alternativePath = `avatars/${storagePath}`;
													} else {
														// Path might be just fileName, construct full path
														alternativePath = `avatars/${vendor.id}/${storagePath}`;
													}
													const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(alternativePath);
													alternativeUrl = urlData.publicUrl;
													// Silently try alternative path
												}
												
												// If alternative path format didn't work, try to find the actual file in storage
												// This handles cases where the database URL is stale/incorrect
												try {
													// Extract user folder from storage path or use vendor.id as fallback
													const userFolder = storagePath.startsWith('avatars/')
														? storagePath.replace(/^avatars\//, '').split('/')[0]
														: storagePath.split('/')[0] || vendor.id;
													
													if (userFolder) {
														// List files in the user's avatars folder to find the actual profile image
														// Profile images are usually the most recent uploads in the folder
														const { data: files, error: listError } = await supabase.storage
															.from('profile_images')
															.list(`avatars/${userFolder}`, {
																limit: 10,
																sortBy: { column: 'created_at', order: 'desc' }
															});
														
														if (!listError && files && files.length > 0) {
															// Use the most recent file (profile images are usually the latest uploads)
															// Filter for image files only
															const imageFiles = files.filter(file => 
																file.name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)
															);
															
															if (imageFiles.length > 0) {
																const actualFile = imageFiles[0];
																const { data: urlData } = supabase.storage
																	.from('profile_images')
																	.getPublicUrl(`avatars/${userFolder}/${actualFile.name}`);
																alternativeUrl = urlData.publicUrl;
																// Successfully found and corrected the image URL
															}
														} else if (!listError && files && files.length === 0) {
															// Try listing without avatars/ prefix (old format)
															const { data: oldFiles } = await supabase.storage
																.from('profile_images')
																.list(userFolder, {
																	limit: 10,
																	sortBy: { column: 'created_at', order: 'desc' }
																});
															
															if (oldFiles && oldFiles.length > 0) {
																const imageFiles = oldFiles.filter(file => 
																	file.name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)
																);
																
																if (imageFiles.length > 0) {
																	const actualFile = imageFiles[0];
																	const { data: urlData } = supabase.storage
																		.from('profile_images')
																		.getPublicUrl(`${userFolder}/${actualFile.name}`);
																	alternativeUrl = urlData.publicUrl;
																	// Successfully found and corrected the image URL (old format)
																}
															}
														} else if (listError) {
															// Silently handle storage listing errors
														}
													}
												} catch (err) {
													// Silently handle errors while finding file in storage
												}
												
												// Only update if we have an alternative URL
												if (alternativeUrl) {
													// Update the vendor URL to try the alternative (with a slight delay to ensure state updates)
													setTimeout(() => {
														setVendor(prev => prev ? { ...prev, profileImageUrl: alternativeUrl } : null);
														setImageError(false); // Reset error to allow retry
													}, 100);
													return; // Don't set error yet, let it try the alternative
												}
											}
										}
										
										// If no alternative worked, show placeholder silently
										// Don't log error - this is expected for vendors without profile images
										setImageError(true);
									}}
									onLoad={() => {
										// Image loaded successfully
									}}
								/>
							</View>
						) : (
							<View style={styles.vendorImagePlaceholder}>
								<IconSymbol name="storefront.fill" size={40} color={BRAND_COLOR} />
							</View>
						)}
						<View style={styles.vendorInfo}>
							<Text style={styles.vendorName}>{vendor.storeName || 'Vendor Store'}</Text>
						</View>
					</View>

					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{vendorProducts.length}</Text>
							<Text style={styles.statLabel}>Products</Text>
						</View>
						<View style={styles.statDivider} />
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>
								{new Date(vendor.createdAt).getFullYear()}
							</Text>
							<Text style={styles.statLabel}>Since</Text>
						</View>
					</View>
				</Animated.View>

				{/* Vendor Media Section */}
				{!mediaLoading && vendorMedia.length > 0 && (
					<Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.mediaSection}>
						<Text style={styles.sectionTitle}>Store Gallery</Text>
						<FlatList
							data={vendorMedia}
							horizontal
							showsHorizontalScrollIndicator={false}
							keyExtractor={(item) => item.id}
							contentContainerStyle={styles.mediaList}
							renderItem={({ item, index }) => (
								<Pressable
									onPress={() => {
										setSelectedMediaIndex(index);
										setMediaViewerVisible(true);
									}}
								>
									<Animated.View
										entering={FadeInDown.duration(300).delay(index * 50)}
										style={styles.mediaItem}
									>
										{item.mediaType === 'image' ? (
											<Image
												source={{ uri: item.mediaUrl }}
												style={styles.mediaImage}
												resizeMode="cover"
											/>
										) : (
											<>
												<VideoThumbnail videoUrl={item.mediaUrl} />
												<View style={styles.playButtonOverlay}>
													<IconSymbol name="play.circle.fill" size={48} color={GIFTYY_THEME.colors.white} />
												</View>
											</>
										)}
									</Animated.View>
								</Pressable>
							)}
						/>
					</Animated.View>
				)}

				{/* Fullscreen Media Viewer Modal */}
				<MediaViewerModal
					visible={mediaViewerVisible}
					mediaList={vendorMedia}
					initialIndex={selectedMediaIndex ?? 0}
					onClose={() => {
						setMediaViewerVisible(false);
						setSelectedMediaIndex(null);
					}}
				/>

				{/* Products Section */}
				{vendorProducts.length > 0 ? (
					<Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.productsSection}>
						<Text style={styles.sectionTitle}>Products from this vendor</Text>
						<View style={styles.productsGrid}>
							{vendorProducts.map((product) => {
								const discountedPrice = product.discountPercentage > 0
									? product.price * (1 - product.discountPercentage / 100)
									: product.price;
								const imageUrl = product.imageUrl ? (() => {
									try {
										const parsed = JSON.parse(product.imageUrl);
										return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
									} catch {
										return product.imageUrl;
									}
								})() : undefined;

								return (
									<Pressable
										key={product.id}
										onPress={() => router.push({ pathname: '/(buyer)/(tabs)/product/[id]', params: { id: product.id } })}
										style={styles.productCard}
									>
										{imageUrl ? (
											<Image
												source={{ uri: imageUrl }}
												style={styles.productImage}
												resizeMode="cover"
											/>
										) : (
											<View style={styles.productImagePlaceholder}>
												<IconSymbol name="photo" size={24} color="#d1d5db" />
											</View>
										)}
										{product.discountPercentage > 0 && (
											<View style={styles.discountBadge}>
												<Text style={styles.discountBadgeText}>{product.discountPercentage}% OFF</Text>
											</View>
										)}
										<View style={styles.productInfo}>
											<Text style={styles.productName} numberOfLines={2}>
												{product.name}
											</Text>
											<View style={styles.productPriceRow}>
												<Text style={styles.productPrice}>${discountedPrice.toFixed(2)}</Text>
												{product.discountPercentage > 0 && (
													<Text style={styles.productOriginalPrice}>${product.price.toFixed(2)}</Text>
												)}
											</View>
										</View>
									</Pressable>
								);
							})}
						</View>
					</Animated.View>
				) : (
					<View style={styles.emptyState}>
						<IconSymbol name="storefront.fill" size={48} color="#9ca3af" />
						<Text style={styles.emptyText}>No products available yet</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 20,
		height: 56,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	headerBtn: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		fontFamily: BRAND_FONT,
	},
	scrollContent: {
		paddingTop: 72,
		paddingHorizontal: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16,
	},
	loadingText: {
		fontSize: 14,
		color: '#6b7280',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		gap: 16,
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#111827',
		fontFamily: BRAND_FONT,
	},
	errorText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
	},
	backButton: {
		marginTop: 8,
		paddingVertical: 12,
		paddingHorizontal: 24,
		backgroundColor: BRAND_COLOR,
		borderRadius: 12,
	},
	backButtonText: {
		color: '#FFFFFF',
		fontWeight: '700',
		fontSize: 16,
	},
	vendorCard: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.lg,
	},
	vendorHeader: {
		flexDirection: 'row',
		gap: 16,
		marginBottom: 16,
	},
	vendorImageContainer: {
		width: 80,
		height: 80,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
		...GIFTYY_THEME.shadows.sm,
	},
	vendorImage: {
		width: '100%',
		height: '100%',
	},
	vendorImagePlaceholder: {
		width: 80,
		height: 80,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.cream,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '20',
	},
	vendorInfo: {
		flex: 1,
		justifyContent: 'center',
		gap: 4,
	},
	vendorName: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		fontFamily: BRAND_FONT,
	},
	statsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: GIFTYY_THEME.spacing.lg,
		paddingTop: GIFTYY_THEME.spacing.lg,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
	},
	statDivider: {
		width: 1,
		height: 40,
		backgroundColor: '#E5E7EB',
	},
	statNumber: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.primary,
		fontFamily: BRAND_FONT,
	},
	statLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray600,
		marginTop: GIFTYY_THEME.spacing.xs,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	productsSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		fontFamily: BRAND_FONT,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	productsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	productCard: {
		width: (width - 52) / 3, // 3 columns: (width - padding(32) - gaps(20)) / 3
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#F3F4F6',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	productImage: {
		width: '100%',
		height: (width - 52) / 3,
		backgroundColor: '#F9FAFB',
	},
	productImagePlaceholder: {
		width: '100%',
		height: (width - 52) / 3,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	discountBadge: {
		position: 'absolute',
		top: 6,
		left: 6,
		backgroundColor: '#BE123C',
		paddingVertical: 3,
		paddingHorizontal: 6,
		borderRadius: 4,
	},
	discountBadgeText: {
		color: '#FFFFFF',
		fontWeight: '800',
		fontSize: 9,
	},
	productInfo: {
		padding: 8,
		gap: 4,
	},
	productName: {
		fontSize: 11,
		fontWeight: '700',
		color: '#111827',
		minHeight: 28,
		lineHeight: 14,
	},
	productPriceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	productPrice: {
		fontSize: 13,
		fontWeight: '800',
		color: '#16a34a',
	},
	productOriginalPrice: {
		fontSize: 10,
		color: '#9ca3af',
		textDecorationLine: 'line-through',
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
		gap: 12,
	},
	emptyText: {
		fontSize: 16,
		color: '#6b7280',
		fontWeight: '600',
	},
	mediaSection: {
		marginBottom: 24,
	},
	mediaList: {
		paddingRight: 16,
		gap: 12,
	},
	mediaItem: {
		width: width * 0.7,
		height: 200,
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		position: 'relative',
		...GIFTYY_THEME.shadows.md,
	},
	mediaImage: {
		width: '100%',
		height: '100%',
	},
	videoThumbnailContainer: {
		width: '100%',
		height: '100%',
		backgroundColor: GIFTYY_THEME.colors.gray900,
		overflow: 'hidden',
	},
	videoThumbnail: {
		width: '100%',
		height: '100%',
	},
	playButtonOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
	},
	modalContainer: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.9)',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalCloseButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalTitleContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: GIFTYY_THEME.spacing.md,
	},
	modalTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.white,
		textAlign: 'center',
	},
	modalCounter: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray400,
		textAlign: 'center',
		marginTop: 4,
	},
	modalContent: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	mediaViewerItem: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	fullscreenImage: {
		width: width,
		height: height * 0.8,
	},
	fullscreenVideo: {
		width: width,
		height: height * 0.8,
	},
	modalDescription: {
		padding: GIFTYY_THEME.spacing.lg,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalDescriptionText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.white,
		textAlign: 'center',
	},
});



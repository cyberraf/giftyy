/**
 * Premium Product Detail Page (PDP) Redesign
 * Marketplace-quality shopping experience with Giftyy's emotional branding
 */

import AddedToCartDialog from '@/components/AddedToCartDialog';
import { ProductMediaCarousel } from '@/components/pdp/ProductMediaCarousel';
import { VendorInfoCard } from '@/components/pdp/VendorInfoCard';
import { AddPersonalMessageButton } from '@/components/pdp/AddPersonalMessageButton';
import { ProductVariantsSelector } from '@/components/pdp/ProductVariantsSelector';
import { AccordionSection } from '@/components/pdp/AccordionSection';
import { ReviewsList } from '@/components/pdp/ReviewsList';
import { RecommendationsCarousel } from '@/components/pdp/RecommendationsCarousel';
import { StickyBottomBar } from '@/components/pdp/StickyBottomBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useCart } from '@/contexts/CartContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { logProductAnalyticsEvent } from '@/lib/product-analytics';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getVendorsInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOTTOM_BAR_HEIGHT = 100; // Approximate height for bottom bar spacing

// Types (preserved from original)
type ProductVariation = {
	id: string;
	productId: string;
	name?: string;
	price?: number;
	sku?: string;
	stockQuantity: number;
	imageUrl?: string;
	attributes: Record<string, string> | { options?: any[] };
	parsedOptions?: {
		attributeName: string;
		options: any[];
	};
};

type VariationOption = {
	value: string;
	images?: string[];
	priceModifier?: number;
	stockQuantity?: number;
	sku?: string | null;
};

export default function ProductDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const productId = params.id;
	const { top, bottom } = useSafeAreaInsets();
	const { videoUri, setVideoUri } = useCheckout();

	const { getProductById, products, loading: productsLoading, refreshProducts } = useProducts();
	const { categories, refreshCategories } = useCategories();
	const product = productId ? getProductById(productId) : undefined;
	const { isWishlisted, toggleWishlist } = useWishlist();
	const { addItem } = useCart();
	const viewLoggedRef = useRef<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [showAdded, setShowAdded] = useState(false);

	// Vendor state
	const [vendor, setVendor] = useState<{ id: string; storeName?: string; profileImageUrl?: string } | null>(null);
	const [vendorLoading, setVendorLoading] = useState(false);

	// Variation state
	const [variations, setVariations] = useState<ProductVariation[]>([]);
	const [variationsLoading, setVariationsLoading] = useState(false);
	const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
	const [selected, setSelected] = useState<Record<string, string>>({});

	const isInWishlist = product ? isWishlisted(product.id) : false;

	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCategories()]);
		} catch (error) {
			console.error('Error refreshing product data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCategories]);

	// Log product view
	useEffect(() => {
		if (!product?.id) return;
		if (viewLoggedRef.current === product.id) return;
		viewLoggedRef.current = product.id;
		logProductAnalyticsEvent({
			productId: product.id,
			eventType: 'view',
		});
	}, [product?.id]);

	// Fetch vendor information
	useEffect(() => {
		const fetchVendor = async () => {
			if (!product?.vendorId) {
				setVendor(null);
				return;
			}

			try {
				setVendorLoading(true);
				const vendors = await getVendorsInfo([product.vendorId]);
				const vendorData = vendors.get(product.vendorId);
				if (vendorData) {
					setVendor({
						id: vendorData.id,
						storeName: vendorData.storeName,
						profileImageUrl: vendorData.profileImageUrl,
					});
				}
			} catch (err) {
				console.error('[ProductDetails] Error fetching vendor:', err);
				setVendor(null);
			} finally {
				setVendorLoading(false);
			}
		};

		fetchVendor();
	}, [product?.vendorId]);

	// Fetch product variations (preserve original logic)
	useEffect(() => {
		if (!productId) {
			setVariations([]);
			setVariationsLoading(false);
			return;
		}

		const fetchVariations = async () => {
			setVariationsLoading(true);
			try {
				const { data, error } = await supabase
					.from('product_variations')
					.select('*')
					.eq('product_id', productId)
					.eq('is_active', true)
					.order('display_order', { ascending: true })
					.order('created_at', { ascending: true });

				if (error) {
					if (error.code === 'PGRST205') {
						console.log('[Product] Product variations table not found.');
					}
					setVariations([]);
				} else {
					const mappedVariations: ProductVariation[] = (data || []).map((row: any) => ({
						id: row.id,
						productId: row.product_id,
						name: row.name || undefined,
						price: row.price ? parseFloat(String(row.price)) : undefined,
						sku: row.sku || undefined,
						stockQuantity: row.stock_quantity || 0,
						imageUrl: row.image_url,
						attributes: row.attributes || {},
					}));
					setVariations(mappedVariations);
					setSelectedVariation(null);
					setSelected({});
				}
			} catch (err) {
				console.error('[Product] Error fetching variations:', err);
				setVariations([]);
			} finally {
				setVariationsLoading(false);
			}
		};

		fetchVariations();
	}, [productId]);

	// Build variant attributes for ProductVariantsSelector
	const variantAttributes = useMemo(() => {
		if (variations.length === 0) return [];

		const attributeMap = new Map<string, Set<string>>();
		variations.forEach((variation) => {
			if (typeof variation.attributes === 'object' && !('options' in variation.attributes)) {
				Object.entries(variation.attributes).forEach(([key, value]) => {
					if (key && value) {
						if (!attributeMap.has(key)) {
							attributeMap.set(key, new Set());
						}
						attributeMap.get(key)!.add(String(value));
					}
				});
			}
		});

		const baseProductPrice = product?.price || 0;
		return Array.from(attributeMap.entries()).map(([name, values]) => ({
			name,
			options: Array.from(values).map((value) => {
				const matchingVariation = variations.find((v) => {
					if (typeof v.attributes === 'object' && !('options' in v.attributes)) {
						return v.attributes[name] === value;
					}
					return false;
				});
				const variationPrice = matchingVariation?.price;
				const priceModifier = variationPrice !== undefined ? variationPrice - baseProductPrice : undefined;
				
				return {
					value,
					price: priceModifier,
					isAvailable: (matchingVariation?.stockQuantity || 0) > 0,
				};
			}),
		}));
	}, [variations, product]);

	// Handle variant selection
	const handleVariantSelect = useCallback((attributeName: string, value: string) => {
		setSelected((prev) => ({ ...prev, [attributeName]: value }));

		// Find matching variation
		const matchingVariation = variations.find((v) => {
			if (typeof v.attributes === 'object' && !('options' in v.attributes)) {
				return Object.entries({ ...selected, [attributeName]: value }).every(
					([key, val]) => v.attributes[key] === val
				);
			}
			return false;
		});

		setSelectedVariation(matchingVariation || null);
	}, [variations, selected]);

	// Image handling
	const imageUris: string[] = useMemo(() => {
		if (!product) return [];

		let images: string[] = [];
		if (product.imageUrl) {
			try {
				const parsed = JSON.parse(product.imageUrl);
				images = Array.isArray(parsed) ? parsed.filter(Boolean) : [product.imageUrl];
			} catch {
				images = [product.imageUrl];
			}
		}

		if (selectedVariation?.imageUrl) {
			try {
				const parsed = JSON.parse(selectedVariation.imageUrl);
				const variationImages = Array.isArray(parsed) ? parsed.filter(Boolean) : [selectedVariation.imageUrl];
				images = [...variationImages, ...images.filter((img) => !variationImages.includes(img))];
			} catch {
				images = [selectedVariation.imageUrl, ...images.filter((img) => img !== selectedVariation.imageUrl)];
			}
		}

		return Array.from(new Set(images.filter(Boolean)));
	}, [product, selectedVariation]);

	// Pricing
	const basePrice = useMemo(() => {
		if (selectedVariation?.price !== undefined && selectedVariation.price !== null) {
			return selectedVariation.price;
		}
		return product?.price || 0;
	}, [selectedVariation, product]);

	const discountedPrice = useMemo(() => {
		if (!product || basePrice === 0) return 0;
		if (product.discountPercentage > 0) {
			return basePrice * (1 - product.discountPercentage / 100);
		}
		return basePrice;
	}, [product, basePrice]);

	const formattedPrice = `$${discountedPrice.toFixed(2)}`;
	const formattedOriginalPrice =
		product && product.discountPercentage > 0 ? `$${basePrice.toFixed(2)}` : undefined;

	// Stock status
	const currentStock = useMemo(() => {
		if (selectedVariation) return selectedVariation.stockQuantity;
		return product?.stockQuantity || 0;
	}, [selectedVariation, product]);

	const stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = useMemo(() => {
		if (currentStock === 0) return 'out_of_stock';
		if (currentStock <= 5) return 'low_stock';
		return 'in_stock';
	}, [currentStock]);

	// Related products
	const relatedProducts = useMemo(() => {
		if (!product) return [];

		const productCategoryIds = product.categoryIds || [];
		if (productCategoryIds.length === 0) return [];

		const related: typeof products = [];
		const seenProductIds = new Set<string>([product.id]);

		for (const p of products) {
			if (!p.isActive || p.id === product.id || seenProductIds.has(p.id)) continue;
			if (!p.categoryIds || p.categoryIds.length === 0) continue;

			const sharedCategories = productCategoryIds.filter((catId) => p.categoryIds?.includes(catId));
			if (sharedCategories.length > 0) {
				related.push(p);
				seenProductIds.add(p.id);
				if (related.length >= 10) break;
			}
		}

		return related.slice(0, 10);
	}, [product, products]);

	// Convert related products for RecommendationsCarousel
	const recommendationProducts = useMemo(() => {
		return relatedProducts.map((p) => {
			const imageUrl = p.imageUrl
				? (() => {
						try {
							const parsed = JSON.parse(p.imageUrl);
							return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
						} catch {
							return p.imageUrl;
						}
					})()
				: undefined;

			return {
				id: p.id,
				name: p.name || '',
				price: p.price || 0,
				originalPrice: p.discountPercentage > 0 ? p.price : undefined,
				discountPercentage: p.discountPercentage,
				image: imageUrl,
			};
		});
	}, [relatedProducts]);

	// Handlers
	const handleShare = async () => {
		if (!product) return;
		try {
			const shareUrl = `https://giftyy.com/products/${product.id}`;
			await Share.share({
				title: product.name,
				message: `Check out "${product.name}" on Giftyy: ${shareUrl}`,
			});
			logProductAnalyticsEvent({
				productId: product.id,
				eventType: 'share',
			});
		} catch (error) {
			console.warn('[Product] Share failed', error);
		}
	};

	const handleWishlistToggle = () => {
		if (!product) return;
		toggleWishlist(product.id);
	};

	const handleAddToCart = () => {
		if (!product || currentStock === 0) return;

		const itemName = selectedVariation
			? `${product.name}${Object.keys(selected).length > 0 ? ` (${Object.values(selected).join(', ')})` : ''}`
			: product.name;

		addItem({
			id: selectedVariation?.id || product.id,
			name: itemName,
			price: formattedPrice,
			image: imageUris[0],
			selectedOptions: selected,
			vendorId: product.vendorId,
		});
		setShowAdded(true);
	};

	const handleBuyNow = () => {
		handleAddToCart();
		router.push('/(buyer)/checkout/cart');
	};

	const handleAddVideoMessage = () => {
		router.push('/(buyer)/checkout/video');
	};

	// Loading state
	if (productsLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
				<Text style={styles.loadingText}>Loading product...</Text>
			</View>
		);
	}

	// Error state
	if (!product) {
		return (
			<View style={styles.errorContainer}>
				<IconSymbol name="exclamationmark.triangle" size={48} color={GIFTYY_THEME.colors.gray400} />
				<Text style={styles.errorTitle}>Product not found</Text>
				<Text style={styles.errorText}>The product you're looking for doesn't exist or has been removed.</Text>
				<Pressable onPress={() => router.back()} style={styles.errorButton}>
					<Text style={styles.errorButtonText}>Go Back</Text>
				</Pressable>
			</View>
		);
	}

	// Accordion items
	const accordionItems = [
		{
			id: 'details',
			title: 'Item Details',
			icon: 'info.circle.fill',
			content: product.description || 'No description available.',
		},
		{
			id: 'shipping',
			title: 'Shipping & Returns',
			icon: 'shippingbox.fill',
			content:
				'Free shipping on orders over $50. Standard delivery takes 5-7 business days. Returns accepted within 30 days of purchase.',
		},
		{
			id: 'policies',
			title: 'Policies',
			icon: 'doc.text.fill',
			content: 'This product is covered by our satisfaction guarantee. Contact support for any questions or concerns.',
		},
	];

	// Mock reviews (replace with real data when available)
	const reviews = [];

	return (
		<View style={styles.container}>
			{/* Header */}
			<Animated.View entering={FadeInDown.duration(300)} style={[styles.header, { paddingTop: top + 6 }]}>
				<Pressable onPress={() => router.back()} style={styles.headerButton}>
					<IconSymbol name="chevron.left" size={24} color={GIFTYY_THEME.colors.gray700} />
				</Pressable>
				<View style={styles.headerRight}>
					<Pressable style={styles.headerButton} onPress={handleShare}>
						<IconSymbol name="square.and.arrow.up" size={20} color={GIFTYY_THEME.colors.gray700} />
					</Pressable>
					<Pressable
						style={[styles.headerButton, isInWishlist && styles.headerButtonActive]}
						onPress={handleWishlistToggle}
					>
						<IconSymbol
							name={isInWishlist ? 'heart.fill' : 'heart'}
							size={20}
							color={isInWishlist ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray700}
						/>
					</Pressable>
				</View>
			</Animated.View>

			{/* Scrollable Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + bottom + 24 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={GIFTYY_THEME.colors.primary}
						colors={[GIFTYY_THEME.colors.primary]}
					/>
				}
			>
				{/* A - Product Media Carousel */}
				<ProductMediaCarousel images={imageUris} />

				{/* B - Product Title & Price Block */}
				<Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.titleSection}>
					<View style={styles.titleRow}>
						<Text style={styles.productTitle}>{product.name}</Text>
						{product.discountPercentage > 0 && (
							<View style={styles.discountBadge}>
								<Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
							</View>
						)}
					</View>
					<View style={styles.priceRow}>
						<Text style={styles.price}>{formattedPrice}</Text>
						{formattedOriginalPrice && <Text style={styles.originalPrice}>{formattedOriginalPrice}</Text>}
					</View>
					{product.description && (
						<Text style={styles.subtitle}>
							Perfect for birthdays, anniversaries, or heartfelt surprises
						</Text>
					)}
					{stockStatus === 'low_stock' && (
						<View style={styles.stockWarning}>
							<Text style={styles.stockWarningText}>Only {currentStock} left in stock!</Text>
						</View>
					)}
					{stockStatus === 'out_of_stock' && (
						<View style={styles.stockError}>
							<Text style={styles.stockErrorText}>Out of stock</Text>
						</View>
					)}
				</Animated.View>

				{/* C - Vendor Section */}
				{vendor && (
					<Animated.View entering={FadeInUp.duration(400).delay(150)}>
						<VendorInfoCard
							vendorId={vendor.id}
							vendorName={vendor.storeName}
							profileImageUrl={vendor.profileImageUrl}
							onPress={() => router.push({ pathname: '/(buyer)/vendor/[id]', params: { id: vendor.id } })}
							loading={vendorLoading}
						/>
					</Animated.View>
				)}

				{/* D - Personalization Block (Giftyy's Magic) */}
				<Animated.View entering={FadeInUp.duration(400).delay(200)}>
					<AddPersonalMessageButton
						onPress={handleAddVideoMessage}
						hasMessage={!!videoUri}
					/>
				</Animated.View>

				{/* E - Product Options / Variants */}
				{variantAttributes.length > 0 && (
					<Animated.View entering={FadeInUp.duration(400).delay(250)}>
						<ProductVariantsSelector
							attributes={variantAttributes}
							selected={selected}
							onSelect={handleVariantSelect}
							disabled={stockStatus === 'out_of_stock'}
						/>
					</Animated.View>
				)}

				{/* F - Product Specifications (Accordion) */}
				<Animated.View entering={FadeInUp.duration(400).delay(300)}>
					<AccordionSection items={accordionItems} defaultOpenId="details" />
				</Animated.View>

				{/* G - Reviews & Ratings */}
				<Animated.View entering={FadeInUp.duration(400).delay(350)}>
					<ReviewsList reviews={reviews} averageRating={4.5} totalReviews={0} />
				</Animated.View>

				{/* H - Recommended Products */}
				{recommendationProducts.length > 0 && (
					<Animated.View entering={FadeInUp.duration(400).delay(400)}>
						<RecommendationsCarousel
							title="You might also like"
							subtitle="Similar products you'll love"
							products={recommendationProducts}
						/>
					</Animated.View>
				)}
			</ScrollView>

			{/* I - Sticky Bottom Bar */}
			<StickyBottomBar
				price={formattedPrice}
				originalPrice={formattedOriginalPrice}
				onAddToCart={handleAddToCart}
				onBuyNow={handleBuyNow}
				disabled={variationsLoading}
				stockStatus={stockStatus}
			/>

			{/* Added to Cart Dialog */}
			<AddedToCartDialog
				visible={showAdded}
				onClose={() => setShowAdded(false)}
				onViewCart={() => {
					setShowAdded(false);
					router.push('/(buyer)/(tabs)/cart');
				}}
				title="Added to cart"
				imageUri={imageUris[0]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	loadingText: {
		marginTop: 12,
		color: GIFTYY_THEME.colors.gray500,
		fontSize: GIFTYY_THEME.typography.sizes.base,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
		padding: 20,
	},
	errorTitle: {
		marginTop: 16,
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	errorText: {
		marginTop: 8,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		fontSize: GIFTYY_THEME.typography.sizes.base,
	},
	errorButton: {
		marginTop: 24,
		paddingVertical: 12,
		paddingHorizontal: 24,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: GIFTYY_THEME.radius.full,
	},
	errorButtonText: {
		color: GIFTYY_THEME.colors.white,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		fontSize: GIFTYY_THEME.typography.sizes.base,
	},
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 100,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		backdropFilter: 'blur(10px)',
	},
	headerButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		justifyContent: 'center',
		alignItems: 'center',
		...GIFTYY_THEME.shadows.sm,
	},
	headerButtonActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
	},
	headerRight: {
		flexDirection: 'row',
		gap: 8,
	},
	scrollView: {
		flex: 1,
	},
	titleSection: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.xl,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	productTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['3xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		flex: 1,
		lineHeight: 36,
	},
	discountBadge: {
		backgroundColor: GIFTYY_THEME.colors.error,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.full,
		marginLeft: GIFTYY_THEME.spacing.md,
	},
	discountText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	price: {
		fontSize: GIFTYY_THEME.typography.sizes['3xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		lineHeight: 22,
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	stockWarning: {
		backgroundColor: GIFTYY_THEME.colors.warning + '20',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.md,
		marginTop: GIFTYY_THEME.spacing.md,
	},
	stockWarningText: {
		color: GIFTYY_THEME.colors.warning,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	stockError: {
		backgroundColor: GIFTYY_THEME.colors.error + '20',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.md,
		marginTop: GIFTYY_THEME.spacing.md,
	},
	stockErrorText: {
		color: GIFTYY_THEME.colors.error,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
});


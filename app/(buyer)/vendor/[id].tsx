import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { SimpleVideo } from "@/components/SimpleVideo";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BOTTOM_BAR_TOTAL_SPACE } from "@/constants/bottom-bar";
import { GIFTYY_THEME } from "@/constants/giftyy-theme";
import { BRAND_COLOR, BRAND_FONT } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { smartBuyerBack } from "@/lib/utils/navigation";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dbRowToProduct } from "@/contexts/ProductsContext";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// Video Thumbnail Component - Shows video preview in gallery
function VideoThumbnail({ videoUrl }: { videoUrl: string }) {
  return (
    <View style={styles.videoThumbnailContainer}>
      <SimpleVideo
        source={{ uri: videoUrl }}
        style={styles.videoThumbnail}
        contentFit="cover"
        shouldPlay
        isLooping
        isMuted
        useNativeControls={false}
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
  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        const index = viewableItems[0].index ?? 0;
        setCurrentIndex(index);
      }
    },
  ).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Scroll to initial index when modal opens
  useEffect(() => {
    if (
      visible &&
      flatListRef.current &&
      initialIndex >= 0 &&
      mediaList.length > 0
    ) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
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
      <View
        style={[
          styles.modalContainer,
          { paddingTop: top, paddingBottom: bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <IconSymbol
              name="xmark"
              size={24}
              color={GIFTYY_THEME.colors.white}
            />
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
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              });
            }}
          />
        </View>

        {/* Description */}
        {currentMedia?.description && (
          <View style={styles.modalDescription}>
            <Text style={styles.modalDescriptionText}>
              {currentMedia.description}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Individual media item component for the gallery
function MediaViewerItem({
  media,
  width,
  height,
}: {
  media: VendorMedia;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.mediaViewerItem, { width, height: height * 0.8 }]}>
      {media.mediaType === "image" ? (
        <Image
          source={{ uri: media.mediaUrl }}
          style={styles.fullscreenImage}
          resizeMode="contain"
        />
      ) : media.mediaType === "video" ? (
        <SimpleVideo
          source={{ uri: media.mediaUrl }}
          style={styles.fullscreenVideo}
          contentFit="contain"
          useNativeControls={true}
          shouldPlay
          isMuted={false}
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
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const vendorId = params.id;
  const { top, bottom } = useSafeAreaInsets();

  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [vendorMedia, setVendorMedia] = useState<VendorMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(
    null,
  );
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch vendor's products directly from Supabase
  useEffect(() => {
    const fetchVendorProducts = async () => {
      if (!vendorId) {
        setProductsLoading(false);
        return;
      }

      try {
        setProductsLoading(true);
        // Fetch all active products for this vendor
        // Note: The user said it's not counting all products, 
        // they might want to see out-of-stock products too, 
        // but typically marketplace only shows in-stock.
        // Let's fetch all active ones, and we can filter for stock in the UI if needed.
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("vendor_id", vendorId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[VendorProfile] Error fetching products:", error);
          setVendorProducts([]);
        } else if (data) {
          // Normalize snake_case database rows to camelCase Product objects
          const normalizedProducts = data.map(dbRowToProduct);
          setVendorProducts(normalizedProducts);
        }
      } catch (err) {
        console.error("[VendorProfile] Unexpected error fetching products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchVendorProducts();
  }, [vendorId]);

  // Combined filtering for search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return vendorProducts;
    
    const query = searchQuery.toLowerCase();
    return vendorProducts.filter((p) => 
      p.name?.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query)
    );
  }, [vendorProducts, searchQuery]);

  const visibleProducts = useMemo(() => {
    return filteredProducts;
  }, [filteredProducts]);

  useEffect(() => {
    const fetchVendor = async () => {
      if (!vendorId) {
        setError("Vendor ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("id, store_name, profile_image_url, created_at")
          .eq("id", vendorId)
          .eq("role", "vendor")
          .single();

        if (fetchError) {
          console.error("[VendorProfile] Error fetching vendor:", fetchError);
          setError("Vendor not found");
          return;
        }

        if (data) {
          // Ensure profile image URL is a proper public URL
          // Expected URL format: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
          let profileImageUrl = data.profile_image_url || undefined;
          if (profileImageUrl) {
            // If the URL is already a full HTTP URL, use it as-is
            if (profileImageUrl.startsWith("http")) {
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
              path = path.replace(/^\/+|\/+$/g, "");

              // Remove bucket name if present (shouldn't be in path)
              path = path.replace(/^profile_images\//, "");

              // Check if path already has avatars prefix
              if (path.startsWith("avatars/")) {
                // Path is already in correct format: avatars/{user_id}/filename
                // Use it as-is
              } else {
                // Extract filename (last part after any slashes)
                const pathParts = path.split("/");
                const filename = pathParts[pathParts.length - 1];

                // Construct path as: avatars/{user_id}/filename
                path = `avatars/${data.id}/${filename}`;
              }

              // Get public URL from Supabase storage
              // This will return: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
              const { data: urlData } = supabase.storage
                .from("profile_images")
                .getPublicUrl(path);
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
        console.error("[VendorProfile] Unexpected error:", err);
        setError("Failed to load vendor profile");
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
          .from("vendor_media")
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false });

        if (mediaError) {
          console.error(
            "[VendorProfile] Error fetching vendor media:",
            mediaError,
          );
          setVendorMedia([]);
          return;
        }

        if (data) {
          const media: VendorMedia[] = data.map((row: any) => ({
            id: row.id,
            vendorId: row.vendor_id,
            mediaUrl: row.media_url,
            mediaType: row.media_type || "image",
            title: row.title || undefined,
            description: row.description || undefined,
            createdAt: row.created_at,
          }));
          setVendorMedia(media);
        }
      } catch (err) {
        console.error("[VendorProfile] Error fetching vendor media:", err);
        setVendorMedia([]);
      } finally {
        setMediaLoading(false);
      }
    };

    fetchVendorMedia();
  }, [vendorId]);

  const heroMedia = vendorMedia.length > 0 ? vendorMedia[0] : null;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: top + 100 }]}>
        <ActivityIndicator size="large" color={BRAND_COLOR} />
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <View style={[styles.container, { paddingTop: top + 100 }]}>
        <View style={styles.errorContainer}>
          <IconSymbol
            name="exclamationmark.triangle"
            size={48}
            color={GIFTYY_THEME.colors.gray400}
          />
          <Text style={styles.errorTitle}>Vendor not found</Text>
          <Text style={styles.errorText}>
            {error || "The vendor profile you're looking for doesn't exist."}
          </Text>
          <Pressable
            onPress={() => smartBuyerBack(router, { returnTo: params.returnTo })}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* Hero Background */}
      <View style={styles.heroContainer}>
        {heroMedia ? (
          <View style={styles.heroBackground}>
            {heroMedia.mediaType === "image" ? (
              <Image
                source={{ uri: heroMedia.mediaUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <SimpleVideo
                source={{ uri: heroMedia.mediaUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                shouldPlay
                isLooping
                isMuted
              />
            )}
            <LinearGradient
              colors={[
                "rgba(255,245,240,0.1)",
                "rgba(255,245,240,0.8)",
                "#fff5f0",
              ]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View
            style={[styles.heroBackground, { backgroundColor: "#fff5f0" }]}
          />
        )}
      </View>

      {/* Vendor Info Section */}
      <View style={[styles.mainContent, { marginTop: -40 }]}>
        <View style={styles.premiumVendorCard}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <View style={styles.vendorHeader}>
            <View style={styles.premiumVendorImageContainer}>
              {vendor.profileImageUrl && !imageError ? (
                <Image
                  source={{ uri: vendor.profileImageUrl }}
                  style={styles.vendorImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.vendorImagePlaceholder}>
                  <IconSymbol
                    name="storefront.fill"
                    size={32}
                    color={BRAND_COLOR}
                  />
                </View>
              )}
            </View>
            <View style={styles.vendorTitleContainer}>
              <Text style={styles.premiumVendorName}>
                {vendor.storeName || "Vendor Store"}
              </Text>
              <View style={styles.statsBadgeRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeValue}>
                    {productsLoading ? "..." : vendorProducts.length}
                  </Text>
                  <Text style={styles.statBadgeLabel}>Products</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeValue}>
                    {new Date(vendor.createdAt).getFullYear()}
                  </Text>
                  <Text style={styles.statBadgeLabel}>Since</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol
            name="magnifyingglass"
            size={18}
            color={GIFTYY_THEME.colors.gray400}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in this store..."
            placeholderTextColor={GIFTYY_THEME.colors.gray400}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
            }}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery("");
              }}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={16}
                color={GIFTYY_THEME.colors.gray400}
              />
            </Pressable>
          )}
        </View>

        {/* Media Gallery */}
        {!mediaLoading && vendorMedia.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.premiumSectionTitle}>Store Gallery</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.premiumMediaList}
            >
              {vendorMedia.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedMediaIndex(index);
                    setMediaViewerVisible(true);
                  }}
                >
                  <View style={styles.premiumMediaItem}>
                    {item.mediaType === "image" ? (
                      <Image
                        source={{ uri: item.mediaUrl }}
                        style={styles.premiumMediaImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ flex: 1 }}>
                        <VideoThumbnail videoUrl={item.mediaUrl} />
                        <View style={styles.playButtonOverlay}>
                          <IconSymbol
                            name="play.circle.fill"
                            size={40}
                            color="#fff"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={[styles.premiumSectionTitle, { marginTop: 32 }]}>
          {productsLoading ? "Loading..." : `${vendorProducts.length} Products`}
        </Text>
      </View>
    </>
  );

  const renderProductItem = ({ item, index }: { item: any; index: number }) => {
    const gridGap = 10;
    const gridPadding = 16;
    const threeColumnWidth = (width - gridPadding * 2 - gridGap * 2) / 3;

    // The product is already normalized by dbRowToProduct
    const imageUrl = item.imageUrl;

    return (
      <View
        style={{
          width: threeColumnWidth,
          marginLeft: index % 3 === 0 ? 0 : gridGap,
        }}
      >
        <MarketplaceProductCard
          id={item.id}
          name={item.name}
          price={item.price}
          discountPercentage={item.discountPercentage}
          imageUrl={imageUrl}
          vendorName={vendor.storeName}
          vendorId={vendor.id}
          width={threeColumnWidth}
          onPress={() =>
            router.push({
              pathname: "/(buyer)/(tabs)/product/[id]",
              params: { id: item.id, returnTo: pathname },
            })
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={renderProductItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !productsLoading ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? "No products match your search" : "No products available in this store"}
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="small" color={BRAND_COLOR} style={{ marginTop: 20 }} />
          )
        }
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
      />

      <MediaViewerModal
        visible={mediaViewerVisible}
        mediaList={vendorMedia}
        initialIndex={selectedMediaIndex ?? 0}
        onClose={() => {
          setMediaViewerVisible(false);
          setSelectedMediaIndex(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff5f0",
  },
  heroContainer: {
    height: height * 0.18,
    width: "100%",
  },
  heroBackground: {
    width: "100%",
    height: "100%",
  },
  mainContent: {
    paddingHorizontal: 16,
  },
  premiumVendorCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    ...GIFTYY_THEME.shadows.lg,
  },
  vendorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  premiumVendorImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#fff",
    ...GIFTYY_THEME.shadows.sm,
  },
  vendorImage: {
    width: "100%",
    height: "100%",
  },
  vendorImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GIFTYY_THEME.colors.cream,
  },
  vendorTitleContainer: {
    flex: 1,
    gap: 6,
  },
  premiumVendorName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    fontFamily: BRAND_FONT,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GIFTYY_THEME.colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: GIFTYY_THEME.colors.gray200,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: GIFTYY_THEME.colors.gray900,
    padding: 0,
  },
  statsBadgeRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statBadgeValue: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND_COLOR,
    fontFamily: BRAND_FONT,
  },
  statBadgeLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  sectionContainer: {
    marginTop: 32,
  },
  premiumSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    fontFamily: BRAND_FONT,
    marginBottom: 16,
    marginLeft: 4,
  },
  premiumMediaList: {
    paddingLeft: 4,
    paddingRight: 20,
    gap: 12,
  },
  premiumMediaItem: {
    width: width * 0.65,
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#eee",
    ...GIFTYY_THEME.shadows.md,
  },
  premiumMediaImage: {
    width: "100%",
    height: "100%",
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    ...GIFTYY_THEME.shadows.sm,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GIFTYY_THEME.colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    fontFamily: BRAND_FONT,
  },
  premiumProductImageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
  },
  premiumProductImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  premiumDiscountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumDiscountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  premiumProductInfo: {
    padding: 8,
    gap: 2,
  },
  premiumProductName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  premiumProductPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: BRAND_COLOR,
    fontFamily: BRAND_FONT,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  videoThumbnailContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoThumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
    fontFamily: BRAND_FONT,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  backButton: {
    marginTop: 20,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#999",
    fontSize: 15,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  modalCounter: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  modalContent: {
    flex: 1,
  },
  mediaViewerItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: width,
    height: height * 0.7,
  },
  fullscreenVideo: {
    width: width,
    height: height * 0.7,
  },
  modalDescription: {
    padding: 20,
  },
  modalDescriptionText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 15,
  },
});

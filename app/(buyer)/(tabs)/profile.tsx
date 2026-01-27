import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { RecipientFormModal } from '@/components/recipients/RecipientFormModal';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useRecipients, type Recipient as RecipientType } from '@/contexts/RecipientsContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { supabase } from '@/lib/supabase';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabs = ['Overview', 'Orders', 'Recipients', 'Wishlist', 'Settings'] as const;
type TabKey = (typeof tabs)[number];

const TAB_CONFIG: { key: TabKey; icon: IconSymbolName }[] = [
    { key: 'Overview', icon: 'rectangle.grid.2x2' },
    { key: 'Orders', icon: 'doc.plaintext' },
    { key: 'Recipients', icon: 'person.2.fill' },
    { key: 'Wishlist', icon: 'heart.fill' },
    { key: 'Settings', icon: 'gearshape.fill' },
];

const palette = {
    background: '#fff',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    neutralSoft: '#ECE7E2',
    success: '#10B981',
};

// Use Recipient type from context
type Recipient = RecipientType;

type RecipientCardProps = Omit<Recipient, 'id'> & { onEdit: () => void; onDelete: () => void; isEditing: boolean };

export default function ProfileScreen() {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ tab?: string }>();
    const [activeTab, setActiveTab] = useState<TabKey>('Overview');

    // Set active tab from URL parameter
    useEffect(() => {
        if (params.tab && tabs.includes(params.tab as TabKey)) {
            setActiveTab(params.tab as TabKey);
        }
    }, [params.tab]);

    const { bottom } = useSafeAreaInsets();
    const { profile: authProfile, user } = useAuth();
    const { videoMessages } = useVideoMessages();
    const { refreshOrders } = useOrders();
    const { refreshRecipients } = useRecipients();
    const { refreshProducts } = useProducts();
    const { refresh: refreshNotifications } = useNotifications();
    const { refreshCategories } = useCategories();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                refreshOrders(),
                refreshRecipients(),
                refreshProducts(),
                refreshNotifications(),
                refreshCategories(),
            ]);
        } catch (error) {
            console.error('Error refreshing profile data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshOrders, refreshRecipients, refreshProducts, refreshNotifications, refreshCategories]);

    const displayName = useMemo(() => {
        if (authProfile?.first_name) {
            return authProfile.first_name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    }, [authProfile, user]);

    const displayInitials = useMemo(() => {
        if (authProfile?.first_name && authProfile?.last_name) {
            return `${authProfile.first_name.charAt(0)}${authProfile.last_name.charAt(0)}`.toUpperCase();
        }
        if (authProfile?.first_name) {
            return authProfile.first_name.charAt(0).toUpperCase();
        }
        if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return 'U';
    }, [authProfile, user]);

    const fullName = useMemo(() => {
        if (authProfile?.first_name && authProfile?.last_name) {
            return `${authProfile.first_name} ${authProfile.last_name}`;
        }
        if (authProfile?.first_name) {
            return authProfile.first_name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    }, [authProfile, user]);

    const joinedSince = useMemo(() => {
        if (authProfile?.created_at) {
            const date = new Date(authProfile.created_at);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        if (user?.created_at) {
            const date = new Date(user.created_at);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return null;
    }, [authProfile, user]);

    const [membershipStatus, setMembershipStatus] = useState<string>('Free');

    // Load active buyer plan name for header badge
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                if (!user) {
                    if (active) setMembershipStatus('Free');
                    return;
                }
                const { data, error } = await supabase
                    .from('buyer_plan_assignments')
                    .select('status,buyer_plans ( name )')
                    .eq('buyer_id', user.id)
                    .eq('status', 'active')
                    .maybeSingle();
                if (error) {
                    console.warn('Failed to fetch buyer plan:', error.message);
                    if (active) setMembershipStatus('Free');
                    return;
                }
                const planName = (data as any)?.buyer_plans?.name || 'Free';
                if (active) setMembershipStatus(planName);
            } catch {
                if (active) setMembershipStatus('Free');
            }
        })();
        return () => { active = false; };
    }, [user?.id]);

    const memoriesSent = useMemo(() => {
        return videoMessages.filter(vm => vm.direction === 'sent').length;
    }, [videoMessages]);

    const memoriesReceived = useMemo(() => {
        return videoMessages.filter(vm => vm.direction === 'received').length;
    }, [videoMessages]);

    const handleAvatarPress = useCallback(async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please allow photo library access to update your profile picture.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const asset = result.assets[0];
            if (!asset.base64) {
                Alert.alert('Upload failed', 'Could not read the selected image. Please try a different photo.');
                return;
            }

            const contentType = asset.type === 'video' ? 'video/mp4' : asset.mimeType || 'image/jpeg';
            const fileName = `profile-${user?.id}-${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('profile_images')
                .upload(`avatars/${user?.id}/${fileName}`, decode(asset.base64), {
                    contentType,
                    upsert: true,
                });

            if (uploadError) {
                console.error('Error uploading profile image:', uploadError);
                Alert.alert('Upload failed', 'We could not upload your profile picture. Please try again.');
                return;
            }

            const { data } = supabase.storage.from('profile_images').getPublicUrl(`avatars/${user?.id}/${fileName}`);

            const { error: updateError } = await supabase.from('profiles').update({
                profile_image_url: data.publicUrl,
                updated_at: new Date().toISOString(),
            })
                .eq('id', user?.id);

            if (updateError) {
                console.error('Error updating profile image:', updateError);
                Alert.alert('Update failed', 'Image uploaded but we could not update your profile. Please try again.');
                return;
            }

            Alert.alert('Profile updated', 'Your profile picture has been updated.');
        } catch (error) {
            console.error('Unexpected error updating profile image:', error);
            Alert.alert('Something went wrong', 'We could not update your profile picture. Please try again.');
        }
    }, [user]);

    return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={BRAND_COLOR}
                        colors={[BRAND_COLOR]}
                    />
                }
            >
                <View style={styles.heroCard}>
                    {/* Top Section: Badges */}
                    <View style={styles.heroTopSection}>
                        {joinedSince && (
                            <View style={styles.heroMetaBadge}>
                                <IconSymbol name="calendar" size={12} color={palette.textSecondary} />
                                <Text style={styles.heroMetaText}>Joined {joinedSince}</Text>
                            </View>
                        )}
                        <View style={[styles.heroMetaBadge, styles.heroMembershipBadge]}>
                            <IconSymbol name="star.fill" size={12} color="#FFFFFF" />
                            <Text style={styles.heroMembershipText}>{membershipStatus}</Text>
                        </View>
                    </View>

                    {/* Main Content Section */}
                    <View style={styles.heroMainContent}>
                        {/* Profile Picture with subtle shadow */}
                        <Pressable
                            style={styles.heroAvatarWrapper}
                            onPress={handleAvatarPress}
                            accessibilityRole="button"
                            accessibilityLabel="Upload profile picture"
                        >
                            {authProfile?.profile_image_url ? (
                                <Image
                                    source={{ uri: authProfile.profile_image_url }}
                                    style={styles.heroAvatarImage}
                                />
                            ) : (
                                <View style={styles.heroAvatarBubble}>
                                    <Text style={styles.heroAvatarInitials}>{displayInitials}</Text>
                                </View>
                            )}
                            <View style={styles.heroAvatarEditOverlay} pointerEvents="none">
                                <View style={styles.heroAvatarEditOverlayCircle}>
                                    <IconSymbol name="square.and.pencil" size={14} color="rgba(255,255,255,0.55)" />
                                </View>
                            </View>
                            <View style={styles.heroAvatarRing} />
                        </Pressable>

                        {/* User Info */}
                        <View style={styles.heroInfoContainer}>
                            <Text style={styles.heroFullName}>{fullName}</Text>
                            {authProfile?.email && (
                                <Text style={styles.heroEmail}>{authProfile.email}</Text>
                            )}

                            {/* Stats Row with improved design */}
                            <View style={styles.heroStatsContainer}>
                                <View style={styles.heroStatCard}>
                                    <Text style={styles.heroStatValue}>{memoriesSent}</Text>
                                    <Text style={styles.heroStatLabel}>Sent</Text>
                                </View>

                                <View style={styles.heroStatCard}>
                                    <Text style={styles.heroStatValue}>{memoriesReceived}</Text>
                                    <Text style={styles.heroStatLabel}>Received</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.tabBar}>
                    {TAB_CONFIG.map(({ key, icon }) => {
                        const active = key === activeTab;
                        return (
                            <Pressable
                                key={key}
                                style={[styles.tabPill, active && styles.tabPillActive]}
                                onPress={() => {
                                    setActiveTab(key);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={key}
                                accessibilityState={active ? { selected: true } : {}}
                            >
                                <IconSymbol
                                    name={icon}
                                    size={22}
                                    color={active ? '#ffffff' : palette.textSecondary}
                                />
                                <Text style={styles.tabLabelHidden}>{key}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {activeTab === 'Overview' && <OverviewPanel onTabChange={setActiveTab} />}
                {activeTab === 'Orders' && <OrdersPanel />}
                {activeTab === 'Recipients' && <RecipientsPanel />}
                {activeTab === 'Wishlist' && <WishlistPanel />}
                {activeTab === 'Settings' && <SettingsPanel />}
            </ScrollView>
        </View>
    );
}

function WishlistPanel() {
    const router = useRouter();
    const { wishlist } = useWishlist();
    const { getProductById } = useProducts();
    const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());

    const items = useMemo(() => {
        return wishlist
            .map((entry) => {
                const product = getProductById(entry.productId);
                return product;
            })
            .filter(Boolean) as ReturnType<typeof getProductById>[];
    }, [wishlist, getProductById]);

    // Fetch vendor info for products
    useEffect(() => {
        const fetchVendors = async () => {
            const vendorIds = Array.from(new Set(items.filter(p => p?.vendorId).map(p => p!.vendorId!)));
            if (vendorIds.length > 0) {
                const vendors = await getVendorsInfo(vendorIds);
                const map = new Map<string, VendorInfo>();
                vendors.forEach(v => map.set(v.id, v));
                setVendorsMap(map);
            }
        };
        if (items.length > 0) {
            fetchVendors();
        }
    }, [items]);

    if (wishlist.length === 0) {
        return (
            <View style={styles.sectionCard}>
                <View style={styles.emptyWishlistState}>
                    <IconSymbol name="heart.fill" size={40} color={BRAND_COLOR} />
                    <Text style={styles.emptyWishlistTitle}>No favorites yet</Text>
                    <Text style={styles.emptyWishlistSubtitle}>
                        Save products you love and we’ll keep them here for easy gifting later.
                    </Text>
                    <Pressable style={styles.secondaryButton} onPress={() => router.push('/(buyer)/(tabs)/home')}>
                        <Text style={styles.secondaryLabel}>Explore gifts</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.wishlistSection}>
            <View style={styles.wishlistHeaderRow}>
                <View>
                    <Text style={styles.sectionHeading}>Wishlist</Text>
                    <Text style={styles.sectionSubheading}>{items.length} saved {items.length === 1 ? 'item' : 'items'}</Text>
                </View>
                <Pressable style={styles.wishlistExploreButton} onPress={() => router.push('/(buyer)/(tabs)/home')}>
                    <IconSymbol name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.wishlistExploreLabel}>Browse gifts</Text>
                </Pressable>
            </View>

            <View style={styles.wishlistGridCards}>
                {items.map((product, index) => {
                    if (!product) return null;
                    const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
                    const imageUrl = product.imageUrl ? (() => {
                        try {
                            const parsed = JSON.parse(product.imageUrl);
                            return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
                        } catch {
                            return product.imageUrl;
                        }
                    })() : undefined;

                    // Ensure 3-column layout - remove marginRight from last item in each row
                    const isLastInRow = (index + 1) % 3 === 0;

                    return (
                        <View
                            key={product.id}
                            style={{
                                marginRight: isLastInRow ? 0 : 10,
                                marginBottom: 10
                            }}
                        >
                            <MarketplaceProductCard
                                id={product.id}
                                name={product.name || ''}
                                price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
                                originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
                                discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
                                image={imageUrl}
                                vendorName={vendor?.storeName || undefined}
                                onPress={() => router.push({
                                    pathname: '/(buyer)/(tabs)/product/[id]',
                                    params: { id: product.id },
                                })}
                            />
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
function OverviewPanel({ onTabChange }: { onTabChange?: (tab: TabKey) => void }) {
    const { orders } = useOrders();
    const { videoMessages } = useVideoMessages();

    const formatDateShort = (iso: string | undefined) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const recentActivities = React.useMemo(() => {
        const orderItems = (orders || []).slice().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 5).map((o) => {
            const isDelivered = o.status === 'delivered';
            const title = isDelivered ? 'Order delivered' : o.status === 'shipped' || o.status === 'out_for_delivery' ? 'Order shipped' : 'Order update';
            const when = formatDateShort(o.deliveredAt || o.createdAt);
            return {
                ts: o.deliveredAt || o.createdAt,
                icon: isDelivered ? 'checkmark.circle.fill' : 'doc.plaintext',
                title,
                subtitle: `${o.orderCode} • ${when}`,
                color: isDelivered ? palette.success : BRAND_COLOR,
            };
        });

        const memoryItems = (videoMessages || []).slice().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 5).map((m) => ({
            ts: m.createdAt,
            icon: 'camera.fill' as IconSymbolName,
            title: 'Memory saved',
            subtitle: `${m.title || 'New video message'} • ${formatDateShort(m.createdAt)}`,
            color: palette.textSecondary,
        }));

        return [...orderItems, ...memoryItems]
            .sort((a, b) => (a.ts < b.ts ? 1 : -1))
            .slice(0, 3);
    }, [orders, videoMessages]);
    const router = useRouter();

    // Mock data - in a real app, this would come from state/API
    const accountStats = {
        totalOrders: 12,
        activeDeliveries: 2,
        memoriesSaved: 18,
        recipientsCount: 5,
        subscriptionPlan: 'Premium',
        memberSince: '2023-01-15',
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'orders':
                onTabChange?.('Orders');
                break;
            case 'recipients':
                onTabChange?.('Recipients');
                break;
            case 'settings':
                onTabChange?.('Settings');
                break;
            case 'memories':
                router.push('/(buyer)/(tabs)/memory');
                break;
            case 'order-tracker':
                router.push('/(buyer)/order-tracker');
                break;
        }
    };

    return (
        <View style={styles.sectionGap}>
            {/* Quick Actions */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Quick actions</Text>
                <View style={styles.quickGrid}>
                    <QuickActionButton
                        onPress={() => handleQuickAction('orders')}
                        title="Orders"
                        subtitle="View all orders"
                        icon="doc.plaintext"
                    />
                    <QuickActionButton
                        onPress={() => handleQuickAction('recipients')}
                        title="Recipients"
                        subtitle="Manage contacts"
                        icon="person.2.fill"
                    />
                    <QuickActionButton
                        onPress={() => handleQuickAction('memories')}
                        title="Memories"
                        subtitle="Video messages"
                        icon="camera.fill"
                    />
                    <QuickActionButton
                        onPress={() => handleQuickAction('order-tracker')}
                        title="Track orders"
                        subtitle="Live status & ETA"
                        icon="magnifyingglass"
                    />
                    <QuickActionButton
                        onPress={() => handleQuickAction('settings')}
                        title="Settings"
                        subtitle="Preferences"
                        icon="gearshape.fill"
                    />
                </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Recent activity</Text>
                <View style={styles.activityList}>
                    {recentActivities.length === 0 ? (
                        <Text style={styles.activitySubtitle}>No recent activity yet</Text>
                    ) : (
                        recentActivities.map((a, idx) => (
                            <ActivityItem key={idx} icon={a.icon as IconSymbolName} title={a.title} subtitle={a.subtitle} color={a.color} />
                        ))
                    )}
                </View>
            </View>
        </View>
    );
}

function OrdersPanel() {
    const { orders, loading } = useOrders();

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'processing': return 'Processing';
            case 'confirmed': return 'Confirmed';
            case 'shipped': return 'Shipped';
            case 'out_for_delivery': return 'Out for delivery';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    const getEtaDisplay = (order: any) => {
        if (order.deliveredAt) {
            return `Delivered ${new Date(order.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (order.estimatedDeliveryDate) {
            return `Arrives ${new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (order.status === 'out_for_delivery') {
            return 'Arrives soon';
        }
        if (order.status === 'shipped') {
            return 'In transit';
        }
        if (order.status === 'processing' || order.status === 'confirmed') {
            return 'Label created';
        }
        return 'Processing';
    };

    if (loading) {
        return (
            <View style={styles.sectionGap}>
                <View style={styles.groupCard}>
                    <Text style={styles.groupTitle}>Recent orders</Text>
                    <Text style={{ color: palette.textSecondary, paddingVertical: 20 }}>Loading orders...</Text>
                </View>
            </View>
        );
    }

    if (orders.length === 0) {
        return (
            <View style={styles.sectionGap}>
                <View style={styles.groupCard}>
                    <Text style={styles.groupTitle}>Recent orders</Text>
                    <Text style={{ color: palette.textSecondary, paddingVertical: 20 }}>No orders yet. Start shopping to see your orders here!</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Recent orders</Text>
                {orders.map((order) => (
                    <OrderRow
                        key={order.id}
                        code={order.orderCode}
                        status={getStatusDisplay(order.status)}
                        eta={getEtaDisplay(order)}
                        href={`/(buyer)/orders/${order.id}`}
                    />
                ))}
            </View>
            <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryLabel}>Download order history</Text>
            </Pressable>
        </View>
    );
}

function SettingsPanel() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [signOutVisible, setSignOutVisible] = useState(false);

    const handleSignOut = () => setSignOutVisible(true);
    const handleConfirmSignOut = async () => {
        setSignOutVisible(false);
        await signOut();
    };

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Account settings</Text>
                <SettingsLinkRow
                    onPress={() => router.push('/(buyer)/settings/profile')}
                    label="Profile & preferences"
                    icon="person.circle.fill"
                    subtitle="Update your personal information"
                />
            </View>



            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Notification preferences</Text>
                <SettingsNotificationsPanel />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Privacy settings</Text>
                <SettingsLinkRow
                    onPress={() => router.push('/(buyer)/settings/privacy')}
                    label="Privacy policy"
                    icon="hand.raised.fill"
                    subtitle="Read our privacy policy"
                />
            </View>



            <Pressable style={styles.dangerButton} onPress={handleSignOut}>
                <IconSymbol name="arrow.right.square" size={18} color={palette.textPrimary} />
                <Text style={styles.dangerLabel}>Sign out</Text>
            </Pressable>

            <Modal
                transparent
                visible={signOutVisible}
                animationType="fade"
                onRequestClose={() => setSignOutVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSignOutVisible(false)}>
                    <Pressable style={styles.signOutCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.signOutIcon}>
                            <IconSymbol name="arrow.right.square.fill" size={22} color={BRAND_COLOR} />
                        </View>
                        <Text style={styles.signOutTitle}>Sign out?</Text>
                        <Text style={styles.signOutSubtitle}>
                            We’ll keep your preferences saved. You can sign back in anytime.
                        </Text>
                        <View style={styles.signOutActions}>
                            <Pressable style={styles.signOutGhostButton} onPress={() => setSignOutVisible(false)}>
                                <Text style={styles.signOutGhostLabel}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.signOutPrimaryButton} onPress={handleConfirmSignOut}>
                                <Text style={styles.signOutPrimaryLabel}>Sign out</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

function SettingsNotificationsPanel() {
    const [pushNotifications, setPushNotifications] = useState(true);
    const [orderUpdates, setOrderUpdates] = useState(true);

    return (
        <>
            <SettingsSwitchRow
                label="Push notifications"
                subtitle="Receive push notifications on your device"
                value={pushNotifications}
                onValueChange={setPushNotifications}
            />
            <SettingsSwitchRow
                label="Order updates"
                subtitle="Get notified about your order status"
                value={orderUpdates}
                onValueChange={setOrderUpdates}
            />
        </>
    );
}

function SettingsLinkRow({ onPress, label, icon, subtitle }: { onPress: () => void; label: string; icon: IconSymbolName; subtitle?: string }) {
    return (
        <Pressable style={styles.settingsLinkRow} onPress={onPress}>
            <View style={styles.settingsLinkIconContainer}>
                <IconSymbol name={icon} size={18} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.settingsLinkLabel}>{label}</Text>
                {subtitle && <Text style={styles.settingsLinkSubtitle}>{subtitle}</Text>}
            </View>
            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
        </Pressable>
    );
}

function SettingsSwitchRow({ label, subtitle, value, onValueChange }: { label: string; subtitle: string; value: boolean; onValueChange: (value: boolean) => void }) {
    return (
        <View style={styles.settingsSwitchRow}>
            <View style={styles.settingsSwitchLabelContainer}>
                <Text style={styles.settingsSwitchLabel}>{label}</Text>
                <Text style={styles.settingsSwitchDescription}>{subtitle}</Text>
            </View>
            <Pressable
                onPress={() => onValueChange(!value)}
                style={[styles.settingsSwitch, value && styles.settingsSwitchActive]}
            >
                <View style={[styles.settingsSwitchThumb, value && styles.settingsSwitchThumbActive]} />
            </Pressable>
        </View>
    );
}

function RecipientsPanel() {
    const { recipients, loading: recipientsLoading, deleteRecipient } = useRecipients();
    const [recipientModalVisible, setRecipientModalVisible] = useState(false);
    const [recipientModalMode, setRecipientModalMode] = useState<'add' | 'edit'>('add');
    const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
    const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);

    const closeModal = () => {
        setRecipientModalVisible(false);
        setRecipientModalMode('add');
        setEditingRecipient(null);
        setActiveRecipientId(null);
    };

    const handleAdd = () => {
        setActiveRecipientId(null);
        setEditingRecipient(null);
        setRecipientModalMode('add');
        setRecipientModalVisible(true);
    };

    const handleEdit = (recipient: Recipient) => {
        setActiveRecipientId(recipient.id);
        setEditingRecipient(recipient);
        setRecipientModalMode('edit');
        setRecipientModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Remove recipient', 'Are you sure you want to remove this recipient?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await deleteRecipient(id);
                    if (error) {
                        Alert.alert('Error', `Failed to delete recipient: ${error.message}`);
                    } else {
                        if (activeRecipientId === id) {
                            closeModal();
                        }
                    }
                },
            },
        ]);
    };

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Saved recipients</Text>
                <Text style={styles.groupSubtitle}>Add friends and family you frequently send gifts to.</Text>

                <Pressable style={styles.recipientAddButton} onPress={handleAdd} accessibilityRole="button">
                    <IconSymbol name="plus" size={20} color={BRAND_COLOR} />
                    <Text style={styles.recipientAddButtonLabel}>
                        {recipientModalVisible && recipientModalMode === 'add' ? 'Adding new recipient' : 'Add new recipient'}
                    </Text>
                </Pressable>

                {recipients.map((recipient) => (
                    <RecipientCard
                        key={recipient.id}
                        firstName={recipient.firstName}
                        lastName={recipient.lastName}
                        relationship={recipient.relationship}
                        email={recipient.email}
                        phone={recipient.phone}
                        address={recipient.address}
                        apartment={recipient.apartment}
                        city={recipient.city}
                        state={recipient.state}
                        country={recipient.country}
                        zip={recipient.zip}
                        sports={recipient.sports}
                        hobbies={recipient.hobbies}
                        favoriteColors={recipient.favoriteColors}
                        favoriteArtists={recipient.favoriteArtists}
                        stylePreferences={recipient.stylePreferences}
                        favoriteGenres={recipient.favoriteGenres}
                        personalityLifestyle={recipient.personalityLifestyle}
                        giftTypePreference={recipient.giftTypePreference}
                        dietaryPreferences={recipient.dietaryPreferences}
                        allergies={recipient.allergies}
                        recentLifeEvents={recipient.recentLifeEvents}
                        ageRange={recipient.ageRange}
                        notes={recipient.notes}
                        onEdit={() => handleEdit(recipient)}
                        onDelete={() => handleDelete(recipient.id)}
                        isEditing={recipientModalVisible && recipientModalMode === 'edit' && activeRecipientId === recipient.id}
                    />
                ))}
                {recipients.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No recipients yet</Text>
                        <Text style={styles.emptyStateSubtitle}>Add someone you gift regularly so checkout stays fast.</Text>
                    </View>
                )}
            </View>

            <RecipientFormModal
                visible={recipientModalVisible}
                mode={recipientModalMode}
                editingRecipient={editingRecipient}
                onClose={closeModal}
            />
        </View>
    );
}

function RecipientCard({ firstName, lastName, relationship, email, phone, address, apartment, city, state, country, zip, sports, hobbies, favoriteColors, favoriteArtists, stylePreferences, favoriteGenres, personalityLifestyle, giftTypePreference, dietaryPreferences, allergies, recentLifeEvents, ageRange, notes, onEdit, onDelete, isEditing }: RecipientCardProps) {
    return (
        <View style={[styles.recipientCard, isEditing && styles.recipientCardEditing]}>
            <View style={styles.recipientHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.recipientName}>{lastName ? `${firstName} ${lastName}` : firstName}</Text>
                    <Text style={styles.recipientRelationship}>{relationship}</Text>
                </View>
                <View style={styles.recipientActions}>
                    <Pressable style={styles.recipientActionButton} onPress={onEdit} accessibilityRole="button">
                        <IconSymbol name="square.and.pencil" size={20} color={palette.textPrimary} />
                    </Pressable>
                    <Pressable style={[styles.recipientActionButton, styles.recipientDeleteButton]} onPress={onDelete} accessibilityRole="button">
                        <IconSymbol name="trash" size={20} color="#C53030" />
                    </Pressable>
                </View>
            </View>
            {email ? (
                <View style={styles.recipientDetailRow}>
                    <Text style={styles.recipientLabel}>Email</Text>
                    <Text style={styles.recipientValue}>{email}</Text>
                </View>
            ) : null}
            {phone ? (
                <View style={styles.recipientDetailRow}>
                    <Text style={styles.recipientLabel}>Phone</Text>
                    <Text style={styles.recipientValue}>{phone}</Text>
                </View>
            ) : null}
            <View style={styles.recipientDetailRow}>
                <Text style={styles.recipientLabel}>Address</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.recipientValue}>{address}</Text>
                    {apartment ? <Text style={styles.recipientValue}>{apartment}</Text> : null}
                    <Text style={styles.recipientValue}>
                        {city}
                        {state ? `, ${state}` : ''} {zip}
                    </Text>
                    <Text style={styles.recipientValue}>{country}</Text>
                </View>
            </View>
            {(sports || hobbies || favoriteColors || favoriteArtists || stylePreferences || favoriteGenres || personalityLifestyle || giftTypePreference || dietaryPreferences || allergies || recentLifeEvents || ageRange || notes) ? (
                <View style={styles.recipientInsightsBlock}>
                    {sports ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Sports</Text>
                            <Text style={styles.recipientValue}>{sports}</Text>
                        </View>
                    ) : null}
                    {hobbies ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Hobbies</Text>
                            <Text style={styles.recipientValue}>{hobbies}</Text>
                        </View>
                    ) : null}
                    {favoriteColors ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Favorite colors</Text>
                            <Text style={styles.recipientValue}>{favoriteColors}</Text>
                        </View>
                    ) : null}
                    {favoriteArtists ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Favorite artists</Text>
                            <Text style={styles.recipientValue}>{favoriteArtists}</Text>
                        </View>
                    ) : null}
                    {stylePreferences ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Style</Text>
                            <Text style={styles.recipientValue}>{stylePreferences}</Text>
                        </View>
                    ) : null}
                    {favoriteGenres ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Favorite genres</Text>
                            <Text style={styles.recipientValue}>{favoriteGenres}</Text>
                        </View>
                    ) : null}
                    {personalityLifestyle ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Personality & lifestyle</Text>
                            <Text style={styles.recipientValue}>{personalityLifestyle}</Text>
                        </View>
                    ) : null}
                    {giftTypePreference ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Gift preference</Text>
                            <Text style={styles.recipientValue}>{giftTypePreference}</Text>
                        </View>
                    ) : null}
                    {dietaryPreferences ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Dietary preferences</Text>
                            <Text style={styles.recipientValue}>{dietaryPreferences}</Text>
                        </View>
                    ) : null}
                    {allergies ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Allergies</Text>
                            <Text style={styles.recipientValue}>{allergies}</Text>
                        </View>
                    ) : null}
                    {recentLifeEvents ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Recent events</Text>
                            <Text style={styles.recipientValue}>{recentLifeEvents}</Text>
                        </View>
                    ) : null}
                    {ageRange ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Age range</Text>
                            <Text style={styles.recipientValue}>{ageRange}</Text>
                        </View>
                    ) : null}
                    {notes ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Notes</Text>
                            <Text style={styles.recipientValue}>{notes}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

function QuickAction({ href, title, subtitle, icon }: { href: string; title: string; subtitle: string; icon: string }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.quickAction}>
                <Text style={styles.quickIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.quickTitle}>{title}</Text>
                    <Text style={styles.quickSubtitle}>{subtitle}</Text>
                </View>
                <Text style={styles.linkChevron}>›</Text>
            </Pressable>
        </Link>
    );
}

function QuickActionButton({ onPress, title, subtitle, icon }: { onPress: () => void; title: string; subtitle: string; icon: IconSymbolName }) {
    return (
        <Pressable style={styles.quickAction} onPress={onPress}>
            <View style={styles.quickIconContainer}>
                <IconSymbol name={icon} size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>{title}</Text>
                <Text style={styles.quickSubtitle}>{subtitle}</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
        </Pressable>
    );
}

function ActivityItem({ icon, title, subtitle, color }: { icon: IconSymbolName; title: string; subtitle: string; color: string }) {
    return (
        <View style={styles.activityItem}>
            <View style={[styles.activityIconContainer, { backgroundColor: `${color}15` }]}>
                <IconSymbol name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>{title}</Text>
                <Text style={styles.activitySubtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}

function StatCard({ title, value, trend, accent }: { title: string; value: string; trend: string; accent?: 'alt' }) {
    const isAlt = accent === 'alt';
    return (
        <View style={[styles.statCard, isAlt ? styles.statCardAlt : styles.statCardPrimary]}>
            <Text style={[styles.statValue, isAlt ? styles.statValueAlt : null]}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statTrend}>{trend}</Text>
        </View>
    );
}

function LinkRow({ href, label }: { href: string; label: string }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.linkRow}>
                <Text style={styles.linkLabel}>{label}</Text>
                <Text style={styles.linkChevron}>›</Text>
            </Pressable>
        </Link>
    );
}

function OrderRow({ code, status, eta, href }: { code: string; status: string; eta: string; href: string }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.orderRow}>
                <View>
                    <Text style={styles.orderCode}>#{code}</Text>
                    <Text style={styles.orderEta}>{eta}</Text>
                </View>
                <Text style={styles.orderStatus}>{status}</Text>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    content: {
        padding: 20,
        gap: 18,
    },
    heroCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 24,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        overflow: 'visible',
    },
    heroTopSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    heroMetaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: palette.cardAlt,
        gap: 6,
    },
    heroMetaText: {
        fontSize: 12,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    heroMembershipBadge: {
        backgroundColor: BRAND_COLOR,
        borderWidth: 0,
    },
    heroMembershipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    heroMainContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 20,
    },
    heroAvatarWrapper: {
        position: 'relative',
        width: 88,
        height: 88,
    },
    heroAvatarBubble: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: palette.card,
        zIndex: 2,
    },
    heroAvatarImage: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        borderColor: palette.card,
        zIndex: 2,
    },
    heroAvatarRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: BRAND_COLOR,
        opacity: 0.2,
        zIndex: 1,
    },
    heroAvatarEditOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    heroAvatarEditOverlayCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        // Transparent overlay badge (lets the photo show through)
        backgroundColor: 'rgba(0,0,0,0.28)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.55)',
    },
    heroAvatarInitials: {
        fontSize: 32,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    heroInfoContainer: {
        flex: 1,
        gap: 12,
        paddingTop: 4,
    },
    heroFullName: {
        fontSize: 26,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.5,
    },
    heroEmail: {
        fontSize: 14,
        fontWeight: '500',
        color: palette.textSecondary,
        marginTop: -4,
    },
    heroStatsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    heroStatCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.accentSoft,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        flex: 1,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 4,
    },
    heroStatValue: {
        fontSize: 18,
        fontWeight: '800',
        color: BRAND_COLOR,
        fontFamily: BRAND_FONT,
        lineHeight: 22,
    },
    heroStatLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: palette.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    avatarBubble: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    avatarImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: palette.border,
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    heroHeading: {
        fontSize: 26,
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        textAlign: 'center',
    },
    heroSubheading: {
        color: palette.textSecondary,
        fontSize: 14,
    },
    heroActions: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 999,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 2,
    },
    primaryButtonLabel: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    heroSecondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.cardAlt,
    },
    heroSecondaryLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    tabBar: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    tabPill: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabPillActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 3,
    },
    tabLabelHidden: {
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        borderWidth: 0,
        overflow: 'hidden',
    },
    sectionGap: {
        gap: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        gap: 4,
    },
    statCardPrimary: {
        borderColor: BRAND_COLOR,
        backgroundColor: palette.accentSoft,
    },
    statCardAlt: {
        borderColor: '#C8BED4',
        backgroundColor: '#F4F0F8',
    },
    statValue: {
        fontSize: 28,
        fontFamily: BRAND_FONT,
        color: BRAND_COLOR,
    },
    statValueAlt: {
        color: '#6054B5',
    },
    statTitle: {
        color: palette.textSecondary,
        fontWeight: '700',
    },
    statTrend: {
        color: palette.textPrimary,
        fontSize: 12,
    },
    groupCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    groupTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
    },
    groupSubtitle: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    quickGrid: {
        gap: 10,
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    quickIcon: {
        fontSize: 20,
    },
    quickIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickTitle: {
        fontWeight: '800',
        color: palette.textPrimary,
        fontSize: 15,
    },
    quickSubtitle: {
        color: palette.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    statCardPressable: {
        flex: 1,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    summaryItem: {
        flex: 1,
        gap: 6,
    },
    summaryLabel: {
        fontSize: 13,
        color: palette.textSecondary,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    summaryValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    premiumBadge: {
        backgroundColor: palette.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    premiumBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    activityList: {
        gap: 12,
        marginTop: 4,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    activityIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    activitySubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
        marginTop: 2,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    linkLabel: {
        color: BRAND_COLOR,
        fontWeight: '700',
    },
    linkChevron: {
        color: palette.textSecondary,
        fontWeight: '800',
        fontSize: 18,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    orderCode: {
        fontWeight: '800',
        color: palette.textPrimary,
    },
    orderEta: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    orderStatus: {
        color: '#2F855A',
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: palette.accentSoft,
    },
    secondaryLabel: {
        color: BRAND_COLOR,
        fontWeight: '800',
    },
    dangerButton: {
        marginTop: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    dangerLabel: {
        color: '#C53030',
        fontWeight: '800',
        fontSize: 15,
        letterSpacing: 0.2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    signOutCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: palette.card,
        borderRadius: 18,
        padding: 20,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
        borderWidth: 1,
        borderColor: palette.border,
    },
    signOutIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    signOutTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.2,
    },
    signOutSubtitle: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    signOutActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 4,
    },
    signOutGhostButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
    },
    signOutGhostLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
        fontSize: 14,
    },
    signOutPrimaryButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: BRAND_COLOR,
        minWidth: 110,
        alignItems: 'center',
    },
    signOutPrimaryLabel: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 0.2,
    },
    emptyWishlistState: {
        alignItems: 'center',
        gap: 10,
        paddingVertical: 24,
        paddingHorizontal: 12,
    },
    emptyWishlistTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    emptyWishlistSubtitle: {
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 12,
    },
    wishlistSection: {
        gap: 20,
        marginTop: 8,
    },
    wishlistHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    wishlistExploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: BRAND_COLOR,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    wishlistExploreLabel: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    wishlistGridCards: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        justifyContent: 'flex-start',
    },
    wishlistCardModern: {
        width: '100%',
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E5ED',
        shadowColor: '#1F2937',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
        overflow: 'hidden',
    },
    wishlistCardImageWrap: {
        position: 'relative',
    },
    wishlistCardImage: {
        width: '100%',
        height: 220,
    },
    wishlistRemoveFloating: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(17,24,39,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wishlistCardBody: {
        padding: 16,
        gap: 12,
    },
    wishlistMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    wishlistPriceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    wishlistPrice: {
        fontSize: 18,
        fontWeight: '800',
        color: BRAND_COLOR,
    },
    wishlistOriginalPrice: {
        fontSize: 14,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    wishlistChip: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
    },
    wishlistChipLabel: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    wishlistPrimaryButton: {
        backgroundColor: BRAND_COLOR,
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    wishlistPrimaryButtonLabel: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    wishlistCardFooter: {
        flexDirection: 'row',
        gap: 10,
    },
    wishlistGhostButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    wishlistGhostButtonLabel: {
        color: BRAND_COLOR,
        fontWeight: '700',
    },
    wishlistRemoveButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
    },
    wishlistRemoveLabel: {
        color: '#991B1B',
        fontWeight: '700',
    },
    settingsButton: {
        marginTop: 8,
        borderRadius: 16,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
        overflow: 'hidden',
    },
    settingsButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
    },
    settingsButtonTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: palette.textPrimary,
    },
    settingsButtonSubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
        marginTop: 2,
    },
    recipientCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        padding: 16,
        gap: 12,
    },
    recipientCardEditing: {
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 4,
    },
    recipientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    recipientName: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        color: palette.textPrimary,
    },
    recipientRelationship: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    recipientActions: {
        flexDirection: 'row',
        gap: 8,
    },
    recipientActionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: 'rgba(230,222,214,0.7)',
    },
    recipientDeleteButton: {
        backgroundColor: 'rgba(197,48,48,0.08)',
        borderColor: 'rgba(197,48,48,0.25)',
    },
    recipientDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    recipientLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        minWidth: 64,
    },
    recipientValue: {
        color: palette.textPrimary,
        fontSize: 13,
        flexShrink: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 6,
    },
    emptyStateTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 16,
        color: palette.textPrimary,
    },
    emptyStateSubtitle: {
        color: palette.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 12,
    },
    recipientInsightsBlock: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(230,222,214,0.65)',
        gap: 8,
    },
    recipientFormCard: {
        marginTop: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        padding: 18,
        gap: 14,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    recipientFormTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        color: palette.textPrimary,
    },
    recipientAddButton: {
        marginTop: 12,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
    },
    recipientAddButtonLabel: {
        color: BRAND_COLOR,
        fontWeight: '700',
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    textInput: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 14,
        backgroundColor: palette.cardAlt,
        paddingVertical: 12,
        paddingHorizontal: 16,
        color: palette.textPrimary,
        fontSize: 14,
    },
    textInputMultiline: {
        minHeight: 96,
    },
    formButtonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    formSecondaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        backgroundColor: palette.cardAlt,
    },
    formSecondaryLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    formPrimaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: BRAND_COLOR,
    },
    formPrimaryLabel: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    modalTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 22,
        color: palette.textPrimary,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    modalPagerContainer: {
        width: '100%',
        flex: 1,
    },
    modalFormContainer: {
        flex: 1,
    },
    modalFormContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 14,
    },
    modalStepperRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    modalStepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(47,35,24,0.25)',
    },
    modalStepDotActive: {
        backgroundColor: BRAND_COLOR,
    },
    modalButtonRow: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(230,222,214,0.65)',
    },
    modalSecondaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        backgroundColor: palette.cardAlt,
    },
    modalSecondaryLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    modalPrimaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: BRAND_COLOR,
    },
    modalPrimaryLabel: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    modalPagerActions: {
        flexDirection: 'row',
        gap: 12,
        flex: 1,
    },
    formFields: {
        gap: 14,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    formColumn: {
        flex: 1,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 14,
        backgroundColor: palette.cardAlt,
        overflow: 'hidden',
    },
    picker: {
        height: 48,
        color: palette.textPrimary,
    },
    pickerPressable: {
        height: 48,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerPlaceholderText: {
        color: 'rgba(47,35,24,0.45)',
        fontWeight: '600',
    },
    pickerValueText: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    selectModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
        padding: 16,
    },
    selectModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    selectModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        maxHeight: '78%',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
    },
    selectModalTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 16,
        fontWeight: '900',
        color: palette.textPrimary,
        paddingHorizontal: 4,
        paddingBottom: 10,
    },
    selectModalSearch: {
        height: 44,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: palette.cardAlt,
        color: palette.textPrimary,
        marginBottom: 10,
    },
    selectModalList: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(230,222,214,0.65)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    selectModalOptionRow: {
        paddingVertical: 12,
        paddingHorizontal: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.4)',
    },
    selectModalOptionRowSelected: {
        backgroundColor: palette.accentSoft,
    },
    selectModalOptionText: {
        color: palette.textPrimary,
        fontWeight: '700',
        flex: 1,
        paddingRight: 10,
    },
    selectModalOptionTextSelected: {
        color: palette.textPrimary,
    },
    selectModalCloseButton: {
        marginTop: 10,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    selectModalCloseText: {
        color: BRAND_COLOR,
        fontWeight: '900',
    },
    settingsTabBar: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    settingsTabPill: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsTabPillActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 3,
    },
    settingsLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    settingsLinkIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLinkLabel: {
        flex: 1,
        color: palette.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    settingsLinkSubtitle: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
    },
    settingsSwitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingsSwitchLabelContainer: {
        flex: 1,
        gap: 4,
    },
    settingsSwitchLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    settingsSwitchDescription: {
        fontSize: 12,
        color: palette.textSecondary,
    },
    settingsSwitch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: palette.neutralSoft,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    settingsSwitchActive: {
        backgroundColor: BRAND_COLOR,
    },
    settingsSwitchThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    settingsSwitchThumbActive: {
        transform: [{ translateX: 20 }],
    },
    dangerLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    dangerLinkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dangerLinkLabel: {
        flex: 1,
        color: palette.danger,
        fontWeight: '600',
        fontSize: 15,
    },
    dangerLinkSubtitle: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
    },
});



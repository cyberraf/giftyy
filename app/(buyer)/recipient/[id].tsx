import { RelationshipPickerModal } from '@/components/recipients/RelationshipPickerModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useProducts, type Product } from '@/contexts/ProductsContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { useHome } from '@/lib/hooks/useHome';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Helpers from occasion detail ──────────────────────────────────────────────

const OCCASION_EMOJI: Record<string, string> = {
    birthday: '🎂',
    anniversary: '💍',
    graduation: '🎓',
    christmas: '🎄',
    holiday: '🎁',
    wedding: '💒',
    valentine: '💝',
    mother: '🌸',
    father: '👔',
    new: '🥂',
    default: '🗓️',
};

const getOccasionEmoji = (label: string) => {
    const key = label.toLowerCase();
    for (const [k, v] of Object.entries(OCCASION_EMOJI)) {
        if (key.includes(k)) return v;
    }
    return OCCASION_EMOJI.default;
};

const getGiftyyThought = (recipientName: string, relationship?: string, occasionLabel?: string) => {
    const rel = (relationship || '').toLowerCase();
    const name = recipientName;

    if (rel.includes('mother') || rel.includes('mom'))
        return `"Moms deserve the world, don't they? I've found some things that speak to her heart and celebrate everything she does for you."`;
    if (rel.includes('father') || rel.includes('dad'))
        return `"Dads can be tricky to shop for, but I think we've found some real winners here. Ready to make his day special?"`;
    if (['partner', 'spouse', 'wife', 'husband', 'girlfriend', 'boyfriend'].some(w => rel.includes(w)))
        return `"Celebrating your better half is so special. I've picked out a few things that celebrate your unique bond and the love you share."`;
    if (rel.includes('friend') || rel.includes('bestie'))
        return `"Friendship is the greatest gift! I've curated some fun and thoughtful ideas to show ${name} exactly how much their friendship means to you."`;
    if (['sibling', 'brother', 'sister'].some(w => rel.includes(w)))
        return `"Sibling bonds are forever! Whether you're teasing or cheering them on, these gifts are perfect for celebrating ${name}."`;
    if (['child', 'son', 'daughter'].some(w => rel.includes(w)))
        return `"Watching them grow is the best part! I've found some treasures that ${name} will absolutely love for this special occasion."`;
    if (['colleague', 'boss', 'work', 'professional'].some(w => rel.includes(w)))
        return `"Professional yet personal—it's a fine line! I've selected some tasteful gifts that show appreciation for ${name}'s hard work."`;

    return `"It's almost time to celebrate ${name}! I've curated some thoughtful gifts that match their unique personality. Ready to make them smile?"`;
};

const GiftyyThinking = ({ recipientName }: { recipientName: string }) => {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    return (
        <View style={styles.thinkingContainer}>
            <View style={styles.thinkingPulseWrapper}>
                <Animated.View
                    style={[
                        styles.thinkingGlow,
                        {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.1],
                                outputRange: [0.3, 0.6]
                            })
                        }
                    ]}
                />
                <Animated.View style={[styles.thinkingAvatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
                    <Image
                        source={require('@/assets/images/giftyy.png')}
                        style={styles.thinkingAvatar}
                    />
                </Animated.View>
            </View>
            <View style={styles.thinkingTextGroup}>
                <Text style={styles.thinkingTitle}>Giftyy is thinking...</Text>
                <Text style={styles.thinkingSubtitle}>Finding the perfect gifts for {recipientName}</Text>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

export default function RecipientDetailScreen() {
    const { id, occasionId } = useLocalSearchParams<{ id: string; occasionId?: string }>();
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const navigation = useNavigation();
    const { session } = useAuth();
    const { alert } = useAlert();
    const { recipients, loading: recipientsLoading, deleteRecipient, updateRecipient } = useRecipients();
    const { upcomingOccasions } = useHome();
    const { products, loading: productsLoading } = useProducts();
    const { orders } = useOrders();
    const recipient = useMemo(() =>
        recipients.find((r: any) => r.id === id),
        [recipients, id]
    );

    const isIncoming = recipient ? !recipient.isOutgoing : false;
    const displayName = recipient?.displayName || 'Recipient';

    const recipientOccasions = useMemo(() =>
        upcomingOccasions.filter((o: any) => o.recipientId === id),
        [upcomingOccasions, id]
    );

    // Nearest upcoming occasion (for stats strip + insight)
    const nextOccasion = useMemo(() => {
        if (recipientOccasions.length === 0) return null;
        return [...recipientOccasions].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0];
    }, [recipientOccasions]);

    // Past gifts from orders
    const [pastGifts, setPastGifts] = useState<{ id: string; name: string; price: number; image: string }[]>([]);

    // ── Edit Profile Modal State ──
    const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
    const [editNickname, setEditNickname] = useState('');
    const [editRelationship, setEditRelationship] = useState('');
    const [isRelationshipPickerVisible, setIsRelationshipPickerVisible] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const handleOpenEditProfile = () => {
        setEditNickname(recipient?.displayName || '');
        setEditRelationship(recipient?.relationship || '');
        setIsEditProfileVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!recipient?.id) return;
        setIsSavingProfile(true);
        const updates = isIncoming
            ? { sender_nickname: editNickname.trim() || null, sender_relationship: editRelationship }
            : { receiver_nickname: editNickname.trim() || null, receiver_relationship: editRelationship };

        const { error } = await updateRecipient(recipient.id, updates);
        setIsSavingProfile(false);

        if (error) {
            alert('Error', 'Failed to update profile.');
        } else {
            setIsEditProfileVisible(false);
        }
    };

    useEffect(() => {
        if (!recipient) {
            setPastGifts([]);
            return;
        }

        const recipientName = recipient.firstName.toLowerCase();
        const gifts: { id: string; name: string; price: number; image: string }[] = [];
        const seen = new Set<string>();
        orders.forEach((order: any) => {
            const isForThisRecipient = order.metadata?.recipient_profile_id === recipient.profileId ||
                order.metadata?.recipient_name?.toLowerCase() === recipientName ||
                order.metadata?.shipping_address?.name?.toLowerCase().includes(recipientName);

            if (isForThisRecipient) {
                order.items.forEach((item: any) => {
                    if (!seen.has(item.productId)) {
                        gifts.push({
                            id: item.productId,
                            name: item.productName,
                            image: item.productImageUrl || '',
                            price: item.unitPrice,
                        });
                        seen.add(item.productId);
                    }
                });
            }
        });
        setPastGifts(gifts);
    }, [orders, recipient]);

    // Set headers
    const setNavigationHeaders = useCallback(() => {
        if (!recipient) return;
        navigation.setOptions({
            headerTitle: '',
            headerTintColor: '#1A202C',
            headerBackTitleVisible: false,
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable
                        onPress={() => router.push('/(buyer)/(tabs)/cart')}
                        style={({ pressed }) => [{
                            opacity: pressed ? 0.7 : 1,
                            padding: 8,
                            backgroundColor: '#F7FAFC',
                            borderRadius: 20
                        }]}
                    >
                        <IconSymbol name="cart.fill" size={20} color="#1A202C" />
                    </Pressable>
                    <Image
                        source={{ uri: session?.user?.user_metadata?.avatar_url || 'https://via.placeholder.com/40' }}
                        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#EDF2F7' }}
                    />
                </View>
            ),
        });
    }, [navigation, recipient, session?.user?.user_metadata?.avatar_url, router]);

    useEffect(() => {
        setNavigationHeaders();
    }, [setNavigationHeaders]);

    type AIRecommendation = {
        product_id: string;
        title: string;
        reason: string;
        fit_tags?: string[];
        confidence_0_1?: number;
    };

    const [categorizedRecommendations, setCategorizedRecommendations] = useState<{ occasion: any; products: Product[]; reasons: Record<string, AIRecommendation> }[]>([]);
    const [aiInsights, setAiInsights] = useState<Record<string, string>>({});
    const [aiLoading, setAiLoading] = useState(false);
    const scrollRef = React.useRef<ScrollView>(null);
    const [sectionLayouts, setSectionLayouts] = useState<Record<string, number>>({});
    const [hasScrolled, setHasScrolled] = useState(false);

    // Fetch AI Recommendations
    useEffect(() => {
        const fetchAIRecommendations = async () => {
            if (recipientOccasions.length === 0 || !recipient?.profileId) return;

            // Limit to 3 occasions for performance/UI
            const sortedOccasions = [...recipientOccasions].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            ).slice(0, 3);

            try {
                setAiLoading(true);
                const { data: { session } } = await supabase.auth.getSession();

                const newCategories: { occasion: any; products: Product[]; reasons: Record<string, AIRecommendation> }[] = [];
                const newInsights: Record<string, string> = {};

                // Fetch recommendations for each occasion
                for (const occ of sortedOccasions) {
                    try {
                        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-profile-recommend`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({
                                recipientProfileId: recipient.profileId,
                                recipientName: recipient.firstName,
                                recipientRelationship: recipient.relationship,
                                occasion: occ.label,
                            })
                        });

                        const result = await response.json();
                        console.log(`[AI Profile Recs] Occasion: ${occ.label}, Recs:`, result.recommendations);

                        if (result.insight) {
                            newInsights[occ.id] = result.insight;
                        }

                        if (result.recommendations && result.recommendations.length > 0) {
                            // Link recommendations against the fully populated products context
                            const reasonsMap: Record<string, AIRecommendation> = {};
                            const matchedProducts: Product[] = [];

                            result.recommendations.forEach((r: AIRecommendation) => {
                                reasonsMap[r.product_id] = r;
                                const p = products.find(prod => prod.id === r.product_id);
                                if (p) matchedProducts.push(p);
                            });

                            if (matchedProducts.length > 0) {
                                newCategories.push({
                                    occasion: occ,
                                    products: matchedProducts,
                                    reasons: reasonsMap
                                });
                            }
                        }
                    } catch (err) {
                        console.error(`Error fetching AI recs for ${occ.label}:`, err);
                    }
                }

                setCategorizedRecommendations(newCategories);
                setAiInsights(newInsights);
            } catch (err) {
                console.error('Failed to fetch AI recommendations', err);
            } finally {
                setAiLoading(false);
            }
        };

        fetchAIRecommendations();
    }, [recipientOccasions, recipient?.profileId]);

    // Automatic scroll to specific occasion
    useEffect(() => {
        if (occasionId && !hasScrolled && categorizedRecommendations.length > 0 && sectionLayouts[occasionId]) {
            const y = sectionLayouts[occasionId];
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y, animated: true });
                setHasScrolled(true);
            }, 500); // Small delay to ensure rendering completion
        }
    }, [occasionId, hasScrolled, categorizedRecommendations, sectionLayouts]);

    // Giftyy's personalised thought
    const giftyyThought = useMemo(() => {
        if (!recipient || !displayName) return '';
        const firstNameForInsight = displayName.split(' ')[0] || '';
        return getGiftyyThought(firstNameForInsight, recipient.relationship, nextOccasion?.label);
    }, [recipient, displayName, nextOccasion]);

    const handleAISearch = (text: string) => {
        router.replace({ pathname: '/(buyer)/(tabs)/shop', params: { ai: text } });
    };

    const formatOccasionDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDaysUntil = (dateStr: string): string | null => {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(d.getTime())) return null;

        // Use local midnight for both to get exact day difference
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);

        const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return null;
        if (diff === 0) return 'Today!';
        if (diff === 1) return 'Tomorrow';

        const months = Math.floor(diff / 30);
        const remDays = diff % 30;
        const weeks = Math.floor(remDays / 7);
        const days = remDays % 7;

        const durationParts = [];
        if (months > 0) durationParts.push(`${months}mo`);
        if (weeks > 0) durationParts.push(`${weeks}w`);
        if (days > 0 && months === 0) durationParts.push(`${days}d`); // Only show days if < 1m to keep it clean

        return durationParts.length > 0 ? durationParts.join(' ') : `${diff}d`;
    };

    const handleDelete = () => {
        alert('Remove recipient', 'Are you sure you want to remove this recipient?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await deleteRecipient(id);
                    if (error) {
                        alert('Error', `Failed to delete recipient: ${error.message}`);
                    } else {
                        router.back();
                    }
                },
            },
        ]);
    };

    // ── Render helpers ──────────────────────────────────────────────────────

    const renderProductCard = (product: Product | any) => {
        let primaryImage = '';

        // Handle images array directly from DB
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            primaryImage = product.images[0];
        } else {
            const imgRaw = product.image_url || product.imageUrl || product.image;
            if (imgRaw) {
                try {
                    const parsed = JSON.parse(imgRaw);
                    primaryImage = Array.isArray(parsed) ? parsed[0] : imgRaw;
                } catch {
                    primaryImage = imgRaw;
                }
            }
        }
        return (
            <Pressable
                key={product.id}
                style={styles.productCard}
                onPress={() => router.push({ pathname: '/(buyer)/(tabs)/product/[id]', params: { id: product.id } })}
            >
                <View style={styles.productImageBox}>
                    {primaryImage ? (
                        <Image source={{ uri: primaryImage }} style={styles.productImage} />
                    ) : (
                        <IconSymbol name="gift" size={32} color={GIFTYY_THEME.colors.gray300} />
                    )}
                </View>
                <View style={styles.productMeta}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productPrice}>${product.price ? product.price.toFixed(2) : '0.00'}</Text>
                </View>
            </Pressable>
        );
    };

    // ── Loading / error states ───────────────────────────────────────────────

    if (recipientsLoading && !recipient) {
        return (
            <View style={[styles.centered, { paddingTop: top }]}>
                <ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
            </View>
        );
    }

    if (!recipient) {
        return (
            <View style={[styles.centered, { paddingTop: top }]}>
                <IconSymbol name="person.fill" size={64} color={GIFTYY_THEME.colors.gray300} />
                <Text style={styles.errorText}>Recipient not found</Text>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const displayAvatarUrl = recipient && isIncoming ? recipient.senderAvatarUrl : recipient?.avatarUrl;

    const nameParts = displayName.split(' ').filter(Boolean);
    const firstCh = nameParts[0]?.[0] || '?';
    const lastCh = nameParts[1]?.[0] || '';
    const initials = `${firstCh}${lastCh}`.toUpperCase();
    const contactCount = [recipient.phone, recipient.email].filter(Boolean).length;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.screen}>
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ paddingBottom: bottom + 240 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero ── */}
                <LinearGradient
                    colors={['#FFF0E6', '#FFF7F2', '#FAFAFA']}
                    style={[styles.hero, { paddingTop: top + 100 }]}
                >


                    {/* Avatar with layered glow rings */}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarRing1}>
                            <View style={styles.avatarRing2}>
                                {displayAvatarUrl ? (
                                    <Image
                                        source={{ uri: displayAvatarUrl }}
                                        style={[
                                            styles.avatarInner,
                                            { overflow: 'hidden' },
                                        ]}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[
                                        styles.avatarInner,
                                        !recipient.isClaimed && { backgroundColor: '#94A3B8' },
                                    ]}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, paddingHorizontal: 20 }}>
                        <Text style={[styles.recipientName, { marginBottom: 0, paddingHorizontal: 0 }]}>
                            {displayName}
                        </Text>
                        {recipient && (
                            <Pressable onPress={handleOpenEditProfile} style={{ marginLeft: 8, padding: 4 }}>
                                <IconSymbol name="pencil" size={18} color={GIFTYY_THEME.colors.gray400} />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.badgeRow}>
                        <View style={styles.relBadge}>
                            <Text style={styles.relBadgeText}>{recipient.relationship}</Text>
                        </View>
                        {recipient.status === 'approved' && (
                            <View style={styles.approvedBadge}>
                                <Text style={styles.approvedBadgeText}>🎁 Gift Ready</Text>
                            </View>
                        )}
                        {recipient.status === 'pending' && (
                            <View style={styles.unclaimedBadge}>
                                <View style={styles.unclaimedDot} />
                                <Text style={styles.unclaimedText}>Invite Pending</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                {/* ── Stats strip ── */}
                <View style={styles.statsStrip}>
                    <Pressable
                        style={styles.statCard}
                        onPress={() => router.push({ pathname: '/(buyer)/occasions', params: { recipientId: recipient.id } })}
                    >
                        <Text style={styles.statEmoji}>🗓️</Text>
                        <Text style={styles.statNumber}>{recipientOccasions.length}</Text>
                        <Text style={styles.statLabel}>Occasions</Text>
                    </Pressable>

                    <View style={styles.statDivider} />

                    <Pressable
                        style={styles.statCard}
                        onPress={() => handleAISearch(`@${recipient.firstName} `)}
                    >
                        <Text style={styles.statEmoji}>🎁</Text>
                        <Text style={styles.statNumber}>{pastGifts.length}</Text>
                        <Text style={styles.statLabel}>Gifts Sent</Text>
                    </Pressable>

                    <View style={styles.statDivider} />

                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>⏰</Text>
                        <Text style={[styles.statNumber, { fontSize: nextOccasion ? 15 : 22 }]}>
                            {nextOccasion ? formatOccasionDate(nextOccasion.date) : '—'}
                        </Text>
                        <Text style={styles.statLabel}>Next Up</Text>
                    </View>
                </View>

                {/* ── Giftyy's Insight ── */}
                <View style={styles.section}>
                    <View style={styles.insightCard}>
                        <View style={styles.insightHeader}>
                            <IconSymbol name="sparkles" size={15} color={GIFTYY_THEME.colors.accent ?? '#FF6B00'} />
                            <Text style={styles.insightTitle}>Giftyy's Insight</Text>
                        </View>
                        <Text style={styles.insightText}>{giftyyThought}</Text>
                    </View>
                </View>

                {/* ── Upcoming Occasions ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Occasions</Text>
                        <Pressable onPress={() => router.push({ pathname: '/(buyer)/occasions', params: { recipientId: recipient.id } })}>
                            <Text style={styles.seeAllLink}>See All</Text>
                        </Pressable>
                    </View>

                    {recipientOccasions.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.hScroll}
                            contentContainerStyle={styles.occasionScrollContent}
                        >
                            {recipientOccasions.slice(0, 6).map((occ) => {
                                const daysUntil = getDaysUntil(occ.date);
                                const isUrgent = daysUntil !== null && (daysUntil.includes('Today') || daysUntil.includes('Tomorrow') || daysUntil.endsWith('d away'));
                                return (
                                    <View
                                        key={occ.id}
                                        style={[styles.occasionCard, isUrgent && styles.occasionCardUrgent]}
                                    >
                                        <Text style={styles.occasionEmoji}>{getOccasionEmoji(occ.label)}</Text>
                                        <Text style={styles.occasionCardLabel} numberOfLines={1}>{occ.label}</Text>
                                        <Text style={styles.occasionCardDate}>{formatOccasionDate(occ.date)}</Text>
                                        {daysUntil && (
                                            <View style={[styles.daysChip, isUrgent && styles.daysChipUrgent]}>
                                                <Text style={[styles.daysChipText, isUrgent && { color: '#FF6B00' }]}>
                                                    {daysUntil}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyOccasionCard}>
                            <Text style={styles.emptyOccasionEmoji}>🗓️</Text>
                            <Text style={styles.emptyOccasionTitle}>No upcoming occasions</Text>
                            <Text style={styles.emptyOccasionSub}>
                                Occasions will appear here once they are identified.
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── What you already bought for them ── */}
                {pastGifts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What you already bought for them</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.hScroll}
                            contentContainerStyle={styles.productScrollContent}
                        >
                            {pastGifts.map(renderProductCard)}
                        </ScrollView>
                    </View>
                )}

                {/* ── Personalised AI Recommendations per Occasion ── */}
                {categorizedRecommendations.length > 0 ? (
                    categorizedRecommendations.map(({ occasion, products: groupProducts, reasons }) => (
                        <View
                            key={occasion.id}
                            style={styles.section}
                            onLayout={(event) => {
                                const { y } = event.nativeEvent.layout;
                                setSectionLayouts(prev => ({ ...prev, [occasion.id]: y }));
                            }}
                        >
                            <View style={styles.recHeaderContainer}>
                                <View style={styles.recTitleWrapper}>
                                    <Text style={styles.recOccasionLabel} numberOfLines={1}>{occasion.label}</Text>
                                    <Text style={styles.recSubtitle}>Handpicked for {recipient?.firstName || ''}</Text>
                                </View>
                                <Pressable
                                    style={styles.shopMyselfBtn}
                                    onPress={() => router.push({ pathname: '/(buyer)/(tabs)/shop', params: { ai: `@${recipient?.firstName || ''} for ${occasion.label}` } })}
                                >
                                    <Text style={styles.shopMyselfText}>Shop Myself</Text>
                                    <IconSymbol name="chevron.right" size={12} color="#FF6B00" />
                                </Pressable>
                            </View>
                            {aiInsights[occasion.id] && (
                                <View style={styles.aiInsightContainer}>
                                    <View style={styles.aiInsightIconWrapper}>
                                        <IconSymbol name="sparkles" size={14} color="#FF6B00" />
                                    </View>
                                    <Text style={styles.aiInsightText}>{aiInsights[occasion.id]}</Text>
                                </View>
                            )}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.hScroll}
                                contentContainerStyle={styles.productScrollContent}
                            >
                                {groupProducts.map(renderProductCard)}
                            </ScrollView>
                        </View>
                    ))
                ) : aiLoading ? (
                    <GiftyyThinking recipientName={recipient.firstName} />
                ) : null}

                {/* ── Contact Info ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact</Text>
                    <View style={styles.contactCard}>
                        {recipient.phone && (
                            <View style={styles.contactRow}>
                                <View style={[styles.contactIconBg, { backgroundColor: '#FFF0E6' }]}>
                                    <IconSymbol name="phone.fill" size={16} color="#FF6B00" />
                                </View>
                                <View style={styles.contactTextGroup}>
                                    <Text style={styles.contactLabel}>Phone</Text>
                                    <Text style={styles.contactValue}>{recipient.phone}</Text>
                                </View>
                            </View>
                        )}
                        {recipient.email && (
                            <View style={[styles.contactRow, styles.contactRowBorder]}>
                                <View style={[styles.contactIconBg, { backgroundColor: '#EBF4FF' }]}>
                                    <IconSymbol name="envelope.fill" size={16} color="#3B82F6" />
                                </View>
                                <View style={styles.contactTextGroup}>
                                    <Text style={styles.contactLabel}>Email</Text>
                                    <Text style={styles.contactValue}>{recipient.email}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Danger zone ── */}
                <View style={styles.dangerSection}>
                    <Pressable style={styles.removeBtn} onPress={handleDelete}>
                        <IconSymbol name="trash" size={14} color="#EF4444" />
                        <Text style={styles.removeBtnText}>
                            Remove {recipient.firstName} from Gifting Circle
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={isEditProfileVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsEditProfileVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.editProfileModalHeader}>
                        <Pressable onPress={() => setIsEditProfileVisible(false)} style={styles.closeButton}>
                            <IconSymbol name="xmark" size={16} color={GIFTYY_THEME.colors.gray600} />
                        </Pressable>
                        <Text style={styles.editProfileModalTitle}>Edit Profile</Text>
                        <View style={{ width: 36 }} />
                    </View>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.editProfileModalContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.editProfileFieldLabel}>Nickname</Text>
                        <TextInput
                            style={styles.editProfileFieldInput}
                            value={editNickname}
                            onChangeText={setEditNickname}
                            placeholder="How do you call them?"
                            placeholderTextColor={GIFTYY_THEME.colors.gray400}
                        />

                        <Text style={styles.editProfileFieldLabel}>Relationship</Text>
                        <Pressable
                            style={styles.editProfileFieldInput}
                            onPress={() => setIsRelationshipPickerVisible(true)}
                        >
                            <Text style={{ fontSize: 15, color: editRelationship ? '#2F2318' : GIFTYY_THEME.colors.gray400 }}>
                                {editRelationship || 'Select Relationship'}
                            </Text>
                            <IconSymbol name="chevron.right" size={16} color={GIFTYY_THEME.colors.gray400} />
                        </Pressable>
                    </ScrollView>
                    <View style={styles.editProfileModalFooter}>
                        <Pressable
                            onPress={handleSaveProfile}
                            disabled={isSavingProfile}
                            style={({ pressed }) => [styles.editProfileSaveBtn, (pressed || isSavingProfile) && { opacity: 0.8 }]}
                        >
                            {isSavingProfile ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.editProfileSaveBtnText}>Save Changes</Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Relationship Picker used inside Edit Profile */}
            <RelationshipPickerModal
                visible={isRelationshipPickerVisible}
                onClose={() => setIsRelationshipPickerVisible(false)}
                targetName={displayName}
                title="How do you know them?"
                subtitle="Select your relationship"
                onSelect={(rel) => {
                    setEditRelationship(rel);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FAFAFA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

    /* ── Hero ── */
    hero: {
        paddingBottom: 40,
        alignItems: 'center',
    },



    /* Avatar */
    avatarWrapper: { position: 'relative', marginBottom: 24 },
    avatarRing1: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,107,0,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarRing2: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,107,0,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInner: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B00',
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 14,
    },
    avatarInitials: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -1,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 4,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
    },

    /* Name & badges */
    recipientName: {
        fontSize: 30,
        fontWeight: '900',
        color: '#1A202C',
        letterSpacing: -0.5,
        marginBottom: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    relBadge: {
        backgroundColor: 'rgba(255,107,0,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,107,0,0.2)',
    },
    relBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FF6B00',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    approvedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#86EFAC',
    },
    approvedBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16A34A',
    },
    unclaimedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    unclaimedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#94A3B8',
    },
    unclaimedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },

    /* ── Stats strip ── */
    statsStrip: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: -26,
        borderRadius: 24,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        gap: 2,
    },
    statEmoji: { fontSize: 20, marginBottom: 4 },
    statNumber: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1A202C',
        lineHeight: 24,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#A0AEC0',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#F0F4F8',
        alignSelf: 'stretch',
        marginVertical: 12,
    },

    /* ── Section layout ── */
    section: {
        marginTop: 28,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A202C',
        letterSpacing: -0.3,
        marginBottom: 14,
    },
    seeAllLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF6B00',
    },

    /* ── Recommendations Layout ── */
    recHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    recTitleWrapper: {
        flex: 1,
        marginRight: 12,
    },
    recOccasionLabel: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1A202C',
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    recSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 2,
    },
    shopMyselfBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1E7',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    shopMyselfText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FF6B00',
    },

    /* ── Occasion cards ── */
    hScroll: { marginHorizontal: -20 },
    occasionScrollContent: { paddingHorizontal: 20, paddingVertical: 10 },
    occasionCard: {
        width: 128,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginRight: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    occasionCardUrgent: {
        backgroundColor: '#FFFAF7',
        borderWidth: 1.5,
        borderColor: 'rgba(255,107,0,0.22)',
    },
    occasionEmoji: { fontSize: 30, marginBottom: 10 },

    /* ── Recommendations ── */
    occasionCardLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A202C',
        marginBottom: 2,
    },
    occasionCardDate: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
        marginBottom: 10,
    },
    daysChip: {
        alignSelf: 'flex-start',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 99,
    },
    daysChipUrgent: { backgroundColor: 'rgba(255,107,0,0.09)' },
    daysChipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },



    /* Empty occasions */
    emptyOccasionCard: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 28,
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyOccasionEmoji: { fontSize: 38, marginBottom: 4 },
    emptyOccasionTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
    emptyOccasionSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },


    /* ── Giftyy's Insight ── */
    insightCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
    },

    // Edit Profile Modal Styles
    editProfileModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(47,35,24,0.08)',
    },
    editProfileModalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2F2318',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(47,35,24,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editProfileModalContent: {
        padding: 20,
        gap: 4,
        paddingBottom: 40,
    },
    editProfileFieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray500,
        marginTop: 14,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editProfileFieldInput: {
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#2F2318',
        backgroundColor: '#FAFAFA',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    editProfileModalFooter: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(47,35,24,0.06)',
    },
    editProfileSaveBtn: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editProfileSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    insightTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FF6B00',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    insightText: {
        fontSize: 15,
        color: '#4A5568',
        lineHeight: 23,
        fontStyle: 'italic',
    },
    aiInsightContainer: {
        backgroundColor: '#FFF8F4',
        marginHorizontal: 20,
        borderRadius: 18,
        padding: 14,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 0, 0.08)',
    },
    aiInsightIconWrapper: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B00',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    aiInsightText: {
        flex: 1,
        fontSize: 13.5,
        color: '#4A5568',
        lineHeight: 19,
        fontWeight: '600',
    },

    /* ── Product cards ── */
    productScrollContent: { paddingHorizontal: 20, paddingVertical: 10 },
    productCard: {
        width: 148,
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginRight: 14,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        overflow: 'hidden',
    },
    productImageBox: {
        width: '100%',
        height: 148,
        backgroundColor: '#F7F8FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    productMeta: { padding: 12 },
    productName: { fontSize: 13, fontWeight: '700', color: '#2D3748', marginBottom: 4 },
    productPrice: { fontSize: 14, color: '#16A34A', fontWeight: '900' },

    /* ── AI Thinking Loading ── */
    thinkingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 24,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    thinkingPulseWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    thinkingGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 107, 0, 0.15)',
    },
    thinkingAvatarWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF',
        padding: 5,
        shadowColor: '#FF6B00',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    thinkingAvatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    thinkingTextGroup: {
        alignItems: 'center',
    },
    thinkingTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A202C',
        marginBottom: 6,
    },
    thinkingSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },

    /* ── Contact card ── */
    contactCard: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
        marginTop: 14,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    contactRowBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    contactIconBg: {
        width: 42,
        height: 42,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactTextGroup: { flex: 1 },
    contactLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    contactValue: { fontSize: 15, fontWeight: '600', color: '#1A202C' },

    /* ── Danger zone ── */
    dangerSection: { marginTop: 32, paddingHorizontal: 20, alignItems: 'center' },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    removeBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

    /* Loading / error */
    errorText: { fontSize: 18, color: '#A0AEC0', fontWeight: '600' },
    backButton: {
        marginTop: 20,
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    backButtonText: { color: '#FFF', fontWeight: '800' },
});

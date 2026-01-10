import StepBar from '@/components/StepBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useCheckout, type CardType } from '@/lib/CheckoutContext';
import { calculateVendorShippingSync } from '@/lib/shipping-utils';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CardLabel = 'Giftyy Card';

type CardConfig = {
    label: CardLabel | string;
    price: string;
    image?: string;
    bg: string;
    fg: string;
    accent: string;
    tag?: string;
    features: string[];
};

// Giftyy Card design based on admin card template
const GIFTYY_CARD: CardConfig = {
    label: 'Giftyy Card',
    bg: '#f75507', // Orange brand color
    fg: 'white',
    accent: '#f75507',
    features: ['QR video message', 'Personal video greeting', 'Physical card included'],
    price: '$2.99',
};

export default function DesignScreen() {
    const router = useRouter();
    const { cardType, setCardType, recipient, setCardPrice } = useCheckout();
    const { items } = useCart();
    const { refreshProducts, refreshCollections } = useProducts();
    const [pressedCard, setPressedCard] = useState<CardLabel | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const flipAnimation = useRef(new Animated.Value(0)).current;
    const params = useLocalSearchParams<{ cards?: string }>();
    const { width } = useWindowDimensions();
    const gap = 10;
    const cardWidth = Math.min(360, Math.round(width * 0.85));
    const sidePadding = Math.max(12, Math.round((width - cardWidth) / 2));
    const listRef = useRef<FlatList<CardConfig>>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);
    const { bottom } = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshProducts(), refreshCollections()]);
        } catch (error) {
            console.error('Error refreshing design data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshProducts, refreshCollections]);

    const handleCardFlip = (cardLabel: CardLabel, cardPrice: number) => {
        // Select the card
        setCardType(cardLabel);
        setCardPrice(cardPrice);
        
        // Flip the card
        const toValue = isFlipped ? 0 : 1;
        Animated.spring(flipAnimation, {
            toValue,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
        setIsFlipped(!isFlipped);
    };

    const frontInterpolate = flipAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const backInterpolate = flipAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg'],
    });

    const frontOpacity = flipAnimation.interpolate({
        inputRange: [0, 0.5, 0.5, 1],
        outputRange: [1, 1, 0, 0],
    });

    const backOpacity = flipAnimation.interpolate({
        inputRange: [0, 0.5, 0.5, 1],
        outputRange: [0, 0, 1, 1],
    });

    const frontAnimatedStyle = {
        transform: [{ rotateY: frontInterpolate }],
        opacity: frontOpacity,
    };

    const backAnimatedStyle = {
        transform: [{ rotateY: backInterpolate }],
        opacity: backOpacity,
    };

    // Use the Giftyy card design
    const cards: CardConfig[] = [GIFTYY_CARD];

    const disabled = !cardType;

    // Reorder so the "Most popular" (or tagged) card is in the middle if possible
    const orderedCards: CardConfig[] = useMemo(() => {
        const next = [...cards];
        const n = next.length;
        if (n === 0) return next;
        const mid = Math.floor(n / 2);
        const popularIdx = next.findIndex((c) => typeof c.tag === 'string' && /popular/i.test(c.tag));
        if (popularIdx !== -1 && popularIdx !== mid) {
            const [pop] = next.splice(popularIdx, 1);
            next.splice(mid, 0, pop);
        }
        return next;
    }, [cards]);

    const middleIndex = useMemo(() => Math.max(0, Math.floor(orderedCards.length / 2)), [orderedCards.length]);

    // Ensure Giftyy Card is active by default if not set
    useEffect(() => {
        if (!cardType) {
            const chosen = (orderedCards[0]?.label as CardLabel) ?? 'Giftyy Card';
            setCardType(chosen as CardType);
            const chosenPrice = priceToNumber(orderedCards.find((c) => String(c.label) === String(chosen))?.price);
            setCardPrice(chosenPrice);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderedCards]);

    // After layout, make sure the list is centered on the middle index
    useEffect(() => {
        const id = setTimeout(() => {
            try {
                if (listRef.current) {
                    listRef.current.scrollToIndex({ index: middleIndex, animated: false });
                }
            } catch {}
        }, 0);
        return () => clearTimeout(id);
    }, [middleIndex]);

    function priceToNumber(p?: string) {
        if (!p) return 0;
        const n = parseFloat(String(p).replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    }

    const itemsSubtotal = useMemo(
        () => items.reduce((s, it) => s + priceToNumber(it.price) * it.quantity, 0),
        [items]
    );
    const selectedCardPrice = useMemo(() => {
        const found = orderedCards.find((c) => String(c.label) === String(cardType));
        return priceToNumber(found?.price);
    }, [orderedCards, cardType]);
    function getTaxRateFromState(code?: string): number {
        const state = (code || '').toUpperCase();
        switch (state) {
            case 'CA': return 0.085;
            case 'NY': return 0.088;
            case 'TX': return 0.0825;
            case 'FL': return 0.07;
            case 'WA': return 0.092;
            default: return 0.08;
        }
    }

    const taxable = useMemo(() => itemsSubtotal + selectedCardPrice, [itemsSubtotal, selectedCardPrice]);
    // Calculate shipping based on vendors (cumulate shipping costs from all vendors)
    const shipping = useMemo(() => {
        return calculateVendorShippingSync(items, 4.99, 50);
    }, [items]);
    const taxRate = useMemo(() => getTaxRateFromState(recipient?.state), [recipient?.state]);
    const estimatedTax = useMemo(() => taxable * taxRate, [taxable, taxRate]);
    const orderTotal = useMemo(() => taxable + shipping + estimatedTax, [taxable, shipping, estimatedTax]);

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <StepBar current={2} total={7} label="Choose a card style" />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={BRAND_COLOR}
                        colors={[BRAND_COLOR]}
                    />
                }
            >
                {/* Subheader with selection summary */}
                <View style={{ paddingHorizontal: sidePadding, paddingTop: 6, paddingBottom: 2, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontWeight: '900', fontSize: 18 }}>{String(cardType || 'Giftyy Card')}</Text>
                    </View>
                    {!!orderedCards[currentIndex] && (
                        <Text style={{ color: '#6b7280', fontWeight: '800' }}>{orderedCards[currentIndex].price}</Text>
                    )}
                </View>
                
                {/* Info Button Section */}
                <View style={{ paddingHorizontal: sidePadding, paddingTop: 8, paddingBottom: 8 }}>
                    <Pressable 
                        onPress={() => setShowInfoModal(true)}
                        style={styles.infoButton}
                    >
                        <View style={styles.infoButtonContent}>
                            <IconSymbol name="info.circle.fill" size={20} color="#374151" />
                            <Text style={styles.infoButtonText}>Learn more about Giftyy Cards</Text>
                        </View>
                    </Pressable>
                </View>

                <Animated.FlatList
                ref={listRef}
                data={orderedCards}
                keyExtractor={(item) => String(item.label)}
                horizontal
                contentContainerStyle={{ paddingHorizontal: sidePadding, paddingVertical: 16 }}
                ItemSeparatorComponent={() => <View style={{ width: gap }} />}
                showsHorizontalScrollIndicator={false}
                snapToInterval={cardWidth + gap}
                snapToAlignment="center"
                decelerationRate="fast"
                disableIntervalMomentum
                initialScrollIndex={middleIndex}
                getItemLayout={(_, index) => ({
                    length: cardWidth + gap,
                    offset: (cardWidth + gap) * index + sidePadding,
                    index,
                })}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                onMomentumScrollEnd={(e) => {
                    const interval = cardWidth + gap;
                    const x = e.nativeEvent.contentOffset.x;
                    let index = Math.round(x / interval);
                    index = Math.max(0, Math.min(index, orderedCards.length - 1));
                    const label = orderedCards[index]?.label as CardLabel;
                    if (label && label !== cardType) {
                        setCardType(label as CardType);
                        setCardPrice(priceToNumber(orderedCards[index]?.price));
                    }
                    setCurrentIndex(index);
                }}
                renderItem={({ item: c, index }) => {
                    const isActive = cardType === c.label;
                    const isPressed = pressedCard === c.label;
                    const centerOffset = index * (cardWidth + gap) + sidePadding;
                    const inputRange = [centerOffset - (cardWidth + gap), centerOffset, centerOffset + (cardWidth + gap)];
                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.9, 1, 0.9],
                        extrapolate: 'clamp',
                    });
                    const translateY = scrollX.interpolate({
                        inputRange,
                        outputRange: [8, 0, 8],
                        extrapolate: 'clamp',
                    });
                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.85, 1, 0.85],
                        extrapolate: 'clamp',
                    });
                    return (
                        <Animated.View style={{ transform: [{ scale }, { translateY }], opacity }}>
                        <Pressable
                            onPress={() => handleCardFlip(c.label as CardLabel, priceToNumber(c.price))}
                            onPressIn={() => setPressedCard(c.label as CardLabel)}
                            onPressOut={() => setPressedCard(null)}
                            style={[
                                styles.cardOuter,
                                { borderWidth: 0, backgroundColor: '#fff', width: cardWidth },
                                isPressed && { transform: [{ scale: 0.98 }] },
                            ]}
                        >
                            <View style={[styles.cardContainer, { height: isActive ? 200 : 180 }]}>
                                {/* Giftyy Card Design - Front */}
                                <Animated.View
                                    style={[
                                        styles.giftyyCardFront,
                                        styles.cardSide,
                                        frontAnimatedStyle,
                                        {
                                            backgroundColor: c.bg,
                                            shadowOpacity: isActive ? 0.18 : 0.08,
                                        },
                                    ]}
                                >
                                    {/* Card Header with Logo */}
                                    <View style={styles.cardHeader}>
                                        <View style={styles.logoContainer}>
                                            <LinearGradient
                                                colors={['#f75507', '#ff8c42']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.logoOuter}
                                            >
                                                <View style={styles.logoBox}>
                                                    <Image 
                                                        source={require('@/assets/images/logo.png')} 
                                                        style={styles.logoImg}
                                                        resizeMode="contain"
                                                    />
                                                </View>
                                            </LinearGradient>
                                            <Text style={styles.logoText}>Giftyy</Text>
                                        </View>
                                    </View>
                                    
                                    {/* Card Body with Giftyy Image */}
                                    <View style={styles.cardBody}>
                                        <Image 
                                            source={require('@/assets/images/giftyy.png')} 
                                            style={styles.giftyyImage}
                                            resizeMode="contain"
                                        />
                                        <Text style={styles.cardFooter}>Something special is waiting for you.</Text>
                                    </View>
                                </Animated.View>

                                {/* Giftyy Card Design - Back */}
                                <Animated.View
                                    style={[
                                        styles.giftyyCardBack,
                                        styles.cardSide,
                                        backAnimatedStyle,
                                        {
                                            backgroundColor: c.bg,
                                            shadowOpacity: isActive ? 0.18 : 0.08,
                                        },
                                    ]}
                                >
                                    {/* Back Header with Card Number */}
                                    <View style={styles.backHeader}>
                                        <Text style={styles.cardNumber}>GFT-XXXXXXXX</Text>
                                    </View>
                                    
                                    {/* QR Code Section */}
                                    <View style={styles.backQRSection}>
                                        <View style={styles.qrCodeContainer}>
                                            <Image 
                                                source={{ 
                                                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://giftyy.store')}&bgcolor=ffffff&color=000000&margin=1`
                                                }} 
                                                style={styles.qrCodeImage}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <Text style={styles.qrInstruction}>Scan to unlock your message</Text>
                                        <Text style={styles.qrInstructionSupport}>A personal video and surprise were made just for you.</Text>
                                    </View>
                                </Animated.View>
                            </View>
                        </Pressable>
                        </Animated.View>
                    );
                }}
            />

                {/* Pagination dots */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                    {orderedCards.map((_, i) => {
                        const inputRange = [(i - 1) * (cardWidth + gap), i * (cardWidth + gap), (i + 1) * (cardWidth + gap)];
                        const dotScale = scrollX.interpolate({
                            inputRange,
                            outputRange: [1, 1.5, 1],
                            extrapolate: 'clamp',
                        });
                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.4, 1, 0.4],
                            extrapolate: 'clamp',
                        });
                        return <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f75507', opacity: dotOpacity, transform: [{ scale: dotScale }] }} />;
                    })}
                </View>
                <View style={{ paddingHorizontal: sidePadding, marginTop: 12, marginBottom: 14 + bottom + BOTTOM_BAR_TOTAL_SPACE, gap: 12 }}>
                    <Pressable
                        onPress={() => {
                            if (disabled) {
                                Alert.alert('Choose a card', 'Please select a card style to continue');
                                return;
                            }
                            router.push('/(buyer)/checkout/recipient');
                        }}
                        style={[styles.ctaBtn, { opacity: disabled ? 0.6 : 1 }]}
                    >
                        <Text style={{ color: 'white', fontWeight: '800' }}>{`Continue with ${String(cardType || '').trim() || 'selection'}`}</Text>
                    </Pressable>
                    <Pressable 
                        style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 }}
                        onPress={() => router.back()}
                    >
                        <Text style={{ color: '#6b7280', fontWeight: '700', fontSize: 15 }}>Back to cart</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Info Modal */}
            <Modal
                visible={showInfoModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowInfoModal(false)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setShowInfoModal(false)}
                >
                    <Pressable 
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconContainer}>
                                <IconSymbol name="info.circle.fill" size={32} color={BRAND_COLOR} />
                            </View>
                            <Text style={styles.modalTitle}>What is a Giftyy Card?</Text>
                            <Pressable 
                                onPress={() => setShowInfoModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <IconSymbol name="xmark.circle.fill" size={24} color="#9ca3af" />
                            </Pressable>
                        </View>
                        
                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalText}>
                                A Giftyy Card is a physical QR code card that comes with your gift order. When your recipient receives the gift, they can scan the QR code on the card to unlock your recorded video message and view their special surprise.
                            </Text>
                            
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>What's included:</Text>
                                <View style={styles.modalList}>
                                    <View style={styles.modalListItem}>
                                        <IconSymbol name="checkmark.circle.fill" size={18} color={BRAND_COLOR} />
                                        <Text style={styles.modalListItemText}>Physical QR code card</Text>
                                    </View>
                                    <View style={styles.modalListItem}>
                                        <IconSymbol name="checkmark.circle.fill" size={18} color={BRAND_COLOR} />
                                        <Text style={styles.modalListItemText}>Personal video message</Text>
                                    </View>
                                    <View style={styles.modalListItem}>
                                        <IconSymbol name="checkmark.circle.fill" size={18} color={BRAND_COLOR} />
                                        <Text style={styles.modalListItemText}>Shared memories and surprises</Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.modalText}>
                                You will be able view the recipient's reaction to your gift and special message if they choose to share it.
                            </Text>
                        </ScrollView>

                        <Pressable 
                            style={styles.modalButton}
                            onPress={() => setShowInfoModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Got it</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    cardOuter: {
        borderWidth: 2,
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
    },
    cardContainer: {
        width: '100%',
    },
    cardSide: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
    },
    giftyyCardFront: {
        borderRadius: 14,
        padding: 12,
        shadowColor: '#000',
        shadowRadius: 18,
        elevation: 8,
        overflow: 'hidden',
    },
    giftyyCardBack: {
        borderRadius: 14,
        padding: 12,
        shadowColor: '#000',
        shadowRadius: 18,
        elevation: 8,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoOuter: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#f75507',
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    logoBox: {
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImg: {
        width: '100%',
        height: '100%',
    },
    logoText: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: -0.5,
        color: 'white',
    },
    cardBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 4,
        paddingTop: 5,
    },
    giftyyImage: {
        maxWidth: 160,
        maxHeight: 100,
        width: '100%',
        height: 'auto',
        aspectRatio: 1.6,
        marginTop: -5,
    },
    cardFooter: {
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 0.5,
        fontWeight: '500',
        marginTop: 0,
    },
    backHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1,
    },
    cardNumber: {
        fontFamily: 'Courier New',
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'right',
    },
    backQRSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
    },
    qrCodeContainer: {
        width: 100,
        height: 100,
        backgroundColor: 'white',
        padding: 6,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrCodeImage: {
        width: '100%',
        height: '100%',
    },
    qrInstruction: {
        fontSize: 9,
        color: 'white',
        fontWeight: '700',
        textAlign: 'center',
    },
    qrInstructionSupport: {
        fontSize: 7,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '400',
        textAlign: 'center',
    },
    ctaBtn: { marginTop: 6, backgroundColor: BRAND_COLOR, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
    summaryCard: { marginBottom: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 14, padding: 12, gap: 6 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muted: { color: '#6b7280', fontWeight: '700' },
    bold: { fontWeight: '800' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        alignItems: 'center',
        position: 'relative',
    },
    modalIconContainer: {
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    modalBody: {
        padding: 20,
        maxHeight: 400,
    },
    modalText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
        marginBottom: 16,
    },
    modalSection: {
        marginTop: 8,
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 12,
    },
    modalList: {
        gap: 10,
    },
    modalListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    modalListItemText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    modalButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        alignItems: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    infoButton: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    infoButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'center',
    },
    infoButtonText: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '400',
        textDecorationLine: 'underline',
    },
});



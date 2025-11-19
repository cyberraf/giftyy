import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, FlatList, useWindowDimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import StepBar from '@/components/StepBar';
import { useCheckout } from '@/lib/CheckoutContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BRAND_COLOR } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { useCart } from '@/contexts/CartContext';
import { calculateVendorShippingSync } from '@/lib/shipping-utils';

type CardLabel = 'Standard' | 'Premium' | 'Luxury';

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

// Defaults, used when admin-provided config is not passed via route params
const DEFAULT_CARDS: CardConfig[] = [
    {
        label: 'Standard',
        bg: '#FFF3EC',
        fg: '#111827',
        accent: '#FDA566',
        features: ['QR video message', '30-day storage', 'Premium print stock'],
        price: '$4.99',
        image: 'https://images.unsplash.com/photo-1518441982129-5bcf8f6dbfa0?q=80&w=1200&auto=format&fit=crop',
    },
    {
        label: 'Premium',
        bg: '#EEF2FF',
        fg: '#111827',
        accent: '#6366F1',
        tag: 'Most popular',
        features: ['Foil finish', 'Custom note inside', '90-day storage', 'Priority support'],
        price: '$9.99',
        image: 'https://images.unsplash.com/photo-1514369118554-e20d93546b30?q=80&w=1200&auto=format&fit=crop',
    },
    {
        label: 'Luxury',
        bg: '#111827',
        fg: 'white',
        accent: '#F59E0B',
        features: ['Gold foil + emboss', 'Hardcover design', 'Velvet envelope', 'Lifetime storage'],
        price: '$19.99',
        image: 'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=1200&auto=format&fit=crop',
    },
];

export default function DesignScreen() {
    const router = useRouter();
    const { cardType, setCardType, recipient, setCardPrice } = useCheckout();
    const { items } = useCart();
    const [pressedCard, setPressedCard] = useState<CardLabel | null>(null);
    const params = useLocalSearchParams<{ cards?: string }>();
    const { width } = useWindowDimensions();
    const gap = 10;
    const cardWidth = Math.min(320, Math.round(width * 0.72));
    const sidePadding = Math.max(12, Math.round((width - cardWidth) / 2));
    const listRef = useRef<FlatList<CardConfig>>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);

    // Allow admin-provided cards via route param ?cards=[{...}]
    let cards: CardConfig[] = DEFAULT_CARDS;
    if (typeof params.cards === 'string') {
        try {
            const parsed = JSON.parse(params.cards);
            if (Array.isArray(parsed) && parsed.length) {
                // Normalize minimal fields, fallback to defaults for colors
                cards = parsed.map((c, idx) => ({
                    label: c.label ?? `Card ${idx + 1}`,
                    price: c.price ?? '$0.00',
                    image: c.image,
                    features: Array.isArray(c.features) ? c.features : [],
                    bg: c.bg ?? DEFAULT_CARDS[idx % DEFAULT_CARDS.length].bg,
                    fg: c.fg ?? DEFAULT_CARDS[idx % DEFAULT_CARDS.length].fg,
                    accent: c.accent ?? DEFAULT_CARDS[idx % DEFAULT_CARDS.length].accent,
                    tag: c.tag,
                }));
            }
        } catch {}
    }

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

    // Ensure Premium is active by default if not set
    useEffect(() => {
        if (!cardType) {
            const premium = orderedCards.find((c) => String(c.label).toLowerCase() === 'premium');
            const chosen = (premium?.label as CardLabel) ?? (orderedCards[0]?.label as CardLabel);
            setCardType(chosen);
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
            <StepBar current={2} total={6} label="Choose a card style" />
            {/* Subheader with selection summary */}
            <View style={{ paddingHorizontal: sidePadding, paddingTop: 6, paddingBottom: 2, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '900', fontSize: 18 }}>{String(cardType || 'Select a card')}</Text>
                {!!orderedCards[currentIndex] && (
                    <Text style={{ color: '#6b7280', fontWeight: '800' }}>{orderedCards[currentIndex].price}</Text>
                )}
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
                        setCardType(label);
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
                            onPress={() => { setCardType(c.label as CardLabel); setCardPrice(priceToNumber(c.price)); }}
                            onPressIn={() => setPressedCard(c.label as CardLabel)}
                            onPressOut={() => setPressedCard(null)}
                            style={[
                                styles.cardOuter,
                                { borderColor: isActive ? BRAND_COLOR : '#eee', backgroundColor: '#fff', width: cardWidth },
                                isPressed && { transform: [{ scale: 0.98 }] },
                            ]}
                        >
                            {!!c.tag && (
                                <View style={[styles.tag, { backgroundColor: c.accent + '22' }]}>
                                    <Text style={[styles.tagText, { color: c.accent }]}>{c.tag}</Text>
                                </View>
                            )}
                            <View
                                style={[
                                    styles.cardVisual,
                                    {
                                        backgroundColor: c.bg,
                                        shadowOpacity: isActive ? 0.18 : 0.08,
                                        height: isActive ? 140 : 120,
                                    },
                                ]}
                            >
                                {/* Emphasis halo for active card (subtle 3D glow) */}
                                {isActive && (
                                    <View style={[styles.activeHalo, { backgroundColor: c.accent + '33' }]} />
                                )}
                                {c.image ? (
                                    <>
                                        <Image source={{ uri: c.image }} style={styles.cardImage} />
                                        <View style={[styles.imageOverlay, { backgroundColor: c.fg === 'white' ? 'rgba(17,24,39,0.35)' : 'rgba(0,0,0,0.18)' }]} />
                                        {/* Bottom content area for title and price */}
                                        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ color: c.fg, fontWeight: '900', fontSize: 18 }}>{c.label} Card</Text>
                                            <View style={[styles.pricePill, { backgroundColor: c.accent }]}>
                                                <Text style={{ color: c.fg === 'white' ? '#111827' : 'white', fontWeight: '900' }}>{c.price}</Text>
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={{ position: 'absolute', top: -12, right: -12, width: 120, height: 120, borderRadius: 60, backgroundColor: c.accent + '33' }} />
                                        <Text style={{ color: c.fg, fontWeight: '900', fontSize: 18 }}>{c.label} Card</Text>
                                        <Text style={{ color: c.fg, marginTop: 4, opacity: 0.8 }}>Elegant, memorable keepsake</Text>
                                    </>
                                )}
                                {/* Side knob accent inspired by reference */}
                                <View style={[styles.sideKnob, { borderColor: c.accent, backgroundColor: 'white' }, isActive && { transform: [{ scale: 1.15 }] }]} />
                            </View>
                            {/* Show features only for the centered active card to reduce clutter */}
                            {isActive && (
                                <View style={{ paddingTop: 10, gap: 6 }}>
                                    {c.features.slice(0, 4).map((f) => (
                                        <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <IconSymbol name="checkmark.circle.fill" size={14} color={c.accent} />
                                            <Text style={{ color: '#374151', fontWeight: '700', fontSize: 12 }}>{f}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
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
            <View style={{ paddingHorizontal: sidePadding, marginTop: 12, marginBottom: 14 + BOTTOM_BAR_TOTAL_SPACE }}>
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
            </View>
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
    cardVisual: {
        height: 120,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowRadius: 18,
        elevation: 8,
        overflow: 'hidden',
    },
    cardImage: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    tag: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
    tagText: { fontWeight: '900', fontSize: 12 },
    ctaBtn: { marginTop: 6, backgroundColor: BRAND_COLOR, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
    pricePill: { position: 'absolute', bottom: 10, right: 10, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
    sideKnob: { position: 'absolute', left: -10, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 14, borderWidth: 3 },
    activeHalo: { position: 'absolute', left: -20, right: -20, top: -20, bottom: -20, borderRadius: 20, opacity: 0.5 },
    summaryCard: { marginBottom: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 14, padding: 12, gap: 6 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muted: { color: '#6b7280', fontWeight: '700' },
    bold: { fontWeight: '800' },
});



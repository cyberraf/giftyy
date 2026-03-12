import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { RecommendedProduct } from '@/lib/api/ai-sessions';
import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

interface Product {
    id: string;
    imageUrl: string;
    // Add other fields if strictly typed, but for now these are what we use
    [key: string]: any;
}

interface RecommendationCardProps {
    suggestion: RecommendedProduct;
    product?: Product;
    onPress: (suggestion: RecommendedProduct) => void;
    onFeedback?: (suggestion: RecommendedProduct, type: 'like' | 'dislike', reason?: string) => void;
    style?: any;
}

const DISLIKE_REASONS = [
    "Too expensive",
    "Too cheap / Too simple",
    "Not their style",
    "They already have this",
    "Doesn't fit the occasion",
    "Wrong color or size",
    "Don't like the brand",
    "Poor rating/quality",
    "Something else"
];

export function RecommendationCard({ suggestion, product, onPress, onFeedback, style }: RecommendationCardProps) {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const CARD_WIDTH = SCREEN_WIDTH * 0.65;

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
    const [showDislikeReasons, setShowDislikeReasons] = useState(false);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [customReason, setCustomReason] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const imageScrollRef = React.useRef<ScrollView>(null);
    const [cardWidth, setCardWidth] = useState(CARD_WIDTH);

    // Reset state when feedback type changes
    const resetFeedbackState = () => {
        setSelectedReasons([]);
        setCustomReason('');
        setShowCustomInput(false);
    };

    const handleFeedback = (type: 'like' | 'dislike') => {
        if (type === 'dislike') {
            // potential toggle off if already disliked?
            if (feedback === 'dislike') {
                setFeedback(null);
                setShowDislikeReasons(false);
                resetFeedbackState();
                if (onFeedback) onFeedback(suggestion, null as any); // Clear feedback
            } else {
                setFeedback('dislike');
                setShowDislikeReasons(true);
            }
        } else {
            // Like
            const newFeedback = feedback === 'like' ? null : 'like';
            setFeedback(newFeedback);
            setShowDislikeReasons(false);
            resetFeedbackState();
            if (onFeedback && newFeedback) {
                onFeedback(suggestion, newFeedback);
            }
        }
    };

    const handleReasonSelect = (reason: string) => {
        if (selectedReasons.includes(reason)) {
            setSelectedReasons(prev => prev.filter(r => r !== reason));
            if (reason === 'Something else') {
                setShowCustomInput(false);
            }
        } else {
            setSelectedReasons(prev => [...prev, reason]);
            if (reason === 'Something else') {
                setShowCustomInput(true);
            }
        }
    };

    const submitFeedback = () => {
        setShowDislikeReasons(false);
        if (onFeedback) {
            // Combine reasons
            let finalReasons = [...selectedReasons];
            // Remove 'Something else' from the list of reasons sent if custom text exists,
            // or keep it if no text? Usually custom text replaces "Something else" placeholder.
            if (customReason.trim()) {
                finalReasons = finalReasons.filter(r => r !== 'Something else');
                finalReasons.push(customReason.trim());
            }
            // Join with comma for simple string passing, or update interface later.
            // For now, let's just pass comma separated string
            onFeedback(suggestion, 'dislike', finalReasons.join(', '));
        }
        // Don't clear custom reason immediately if we want to remember it? 
        // Better to clear for next time.
        resetFeedbackState();
    };

    // Parse images — try product prop first, then fall back to suggestion fields
    const images: string[] = [];
    const sourceImages = product?.images || product?.imageUrl || suggestion.images || suggestion.image_url;
    if (sourceImages) {
        try {
            const parsed = typeof sourceImages === 'string' ? JSON.parse(sourceImages) : sourceImages;
            if (Array.isArray(parsed)) {
                images.push(...parsed.filter(Boolean));
            } else if (typeof parsed === 'string') {
                images.push(parsed);
            }
        } catch {
            if (typeof sourceImages === 'string') {
                images.push(sourceImages);
            }
        }
    }

    const handleScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        if (roundIndex !== activeImageIndex) {
            setActiveImageIndex(roundIndex);
        }
    };

    const scrollToIndex = (index: number) => {
        if (index >= 0 && index < images.length) {
            imageScrollRef.current?.scrollTo({ x: index * cardWidth, animated: true });
            setActiveImageIndex(index);
        }
    };

    const renderFormattedText = (rawText: string) => {
        if (!rawText) return null;
        const words = rawText.split(/(\s+)/);
        return words.map((word, i) => {
            if (word.startsWith('@')) {
                return (
                    <Text key={i} style={{ color: '#000000', fontWeight: '700', fontStyle: 'italic' }}>
                        {word}
                    </Text>
                );
            }
            return <Text key={i}>{word}</Text>;
        });
    };

    return (
        <Pressable
            onPress={() => onPress(suggestion)}
            onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            style={({ pressed }) => [
                styles.recommendationCard,
                { width: CARD_WIDTH },
                pressed && styles.recommendationCardPressed,
                style
            ]}
        >
            <View style={styles.cardImageContainer}>
                {images.length > 0 ? (
                    images.length > 1 ? (
                        <>
                            <ScrollView
                                ref={imageScrollRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                nestedScrollEnabled={true}
                                style={styles.imageScroll}
                            >
                                {images.map((img, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: img }}
                                        style={[styles.cardImage, { width: cardWidth }]}
                                        resizeMode="cover"
                                    />
                                ))}
                            </ScrollView>

                            {/* Price Label (Glassmorphism) */}
                            <View style={styles.priceGlassBadge}>
                                <Text style={styles.cardPrice}>${suggestion.price.toFixed(2)}</Text>
                            </View>

                            {/* Navigation Arrows */}
                            {activeImageIndex > 0 && (
                                <Pressable
                                    style={[styles.arrowButton, styles.arrowLeft]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        scrollToIndex(activeImageIndex - 1);
                                    }}
                                >
                                    <IconSymbol name="chevron.left" size={16} color="white" />
                                </Pressable>
                            )}

                            {activeImageIndex < images.length - 1 && (
                                <Pressable
                                    style={[styles.arrowButton, styles.arrowRight]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        scrollToIndex(activeImageIndex + 1);
                                    }}
                                >
                                    <IconSymbol name="chevron.right" size={16} color="white" />
                                </Pressable>
                            )}

                            <View style={styles.paginationContainer}>
                                {images.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.paginationDot,
                                            i === activeImageIndex && styles.paginationDotActive
                                        ]}
                                    />
                                ))}
                            </View>
                        </>
                    ) : (
                        <Image source={{ uri: images[0] }} style={[styles.cardImage, { width: cardWidth }]} />
                    )
                ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder, { width: cardWidth }]}>
                        <IconSymbol name="gift" size={32} color={GIFTYY_THEME.colors.gray300} />
                    </View>
                )}

                {/* Match Badge moved to Image */}
                {suggestion.confidence_0_1 > 0 && (
                    <View style={styles.matchBadge}>
                        <IconSymbol name="sparkles" size={10} color={GIFTYY_THEME.colors.orange} />
                        <Text style={styles.matchBadgeText}>
                            {Math.round(suggestion.confidence_0_1 * 100)}% Match
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {renderFormattedText(suggestion.title)}
                </Text>

                <View style={[styles.thoughtSection, styles.thoughtSectionPrimary]}>
                    <Text style={styles.cardReason} numberOfLines={2}>
                        {renderFormattedText(suggestion.reason_1)}
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    <Pressable
                        style={[styles.feedbackButton, feedback === 'dislike' && styles.feedbackButtonActive]}
                        onPress={() => handleFeedback('dislike')}
                    >
                        <IconSymbol
                            name="hand.thumbsdown"
                            size={14}
                            color={feedback === 'dislike' ? GIFTYY_THEME.colors.white : GIFTYY_THEME.colors.gray400}
                        />
                    </Pressable>
                    <Pressable
                        style={[styles.feedbackButton, feedback === 'like' && styles.feedbackButtonActive]}
                        onPress={() => handleFeedback('like')}
                    >
                        <IconSymbol
                            name="hand.thumbsup"
                            size={14}
                            color={feedback === 'like' ? GIFTYY_THEME.colors.white : GIFTYY_THEME.colors.gray400}
                        />
                    </Pressable>
                </View>

            </View>

            <Modal
                transparent={true}
                visible={showDislikeReasons}
                animationType="fade"
                onRequestClose={() => setShowDislikeReasons(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowDislikeReasons(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.dislikeTitle}>Why isn't this right?</Text>
                            <Pressable onPress={() => setShowDislikeReasons(false)} hitSlop={10}>
                                <IconSymbol name="xmark" size={20} color={GIFTYY_THEME.colors.gray500} />
                            </Pressable>
                        </View>

                        <View style={styles.reasonsGrid}>
                            {DISLIKE_REASONS.map((reason) => {
                                const isSelected = selectedReasons.includes(reason);
                                return (
                                    <Pressable
                                        key={reason}
                                        style={({ pressed }) => [
                                            styles.reasonChip,
                                            isSelected && styles.reasonChipSelected,
                                            pressed && styles.reasonChipPressed
                                        ]}
                                        onPress={() => handleReasonSelect(reason)}
                                    >
                                        <Text style={[
                                            styles.reasonText,
                                            isSelected && styles.reasonTextSelected
                                        ]}>{reason}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Custom Input Section - Visible if "Something else" is selected */}
                        {showCustomInput && (
                            <View style={styles.customInputContainer}>
                                <TextInput
                                    style={styles.customInput}
                                    placeholder="Type your reason..."
                                    placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                    value={customReason}
                                    onChangeText={setCustomReason}
                                    multiline
                                />
                            </View>
                        )}

                        {/* Always show action buttons */}
                        <View style={styles.modalActions}>
                            <Pressable
                                onPress={() => {
                                    setShowDislikeReasons(false);
                                    resetFeedbackState();
                                }}
                                style={styles.modalCancelButton}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={submitFeedback}
                                style={[
                                    styles.modalSubmitButton,
                                    selectedReasons.length === 0 && styles.modalSubmitButtonDisabled
                                ]}
                                disabled={selectedReasons.length === 0}
                            >
                                <Text style={styles.modalSubmitText}>Submit Feedback</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </Pressable >
    );
}
const styles = StyleSheet.create({
    recommendationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
        overflow: 'hidden',
        alignSelf: 'flex-start',
    },
    recommendationCardPressed: {
        transform: [{ scale: 0.98 }],
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    cardImageContainer: {
        width: '100%',
        height: 160,
    },
    imageScroll: {
        width: '100%',
        height: '100%',
    },
    cardImage: {
        height: 160,
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    cardImagePlaceholder: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceGlassBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
    },
    matchBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    matchBadgeText: {
        fontSize: 10,
        fontFamily: 'Outfit-ExtraBold',
        color: GIFTYY_THEME.colors.orange,
        textTransform: 'uppercase',
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 8,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 4,
    },
    paginationDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    paginationDotActive: {
        backgroundColor: '#ffffff',
        width: 10,
    },
    cardContent: {
        padding: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    productBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.cream,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    productBadgeText: {
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.primary,
        textTransform: 'uppercase',
    },

    cardPrice: {
        fontSize: 15,
        fontFamily: 'Outfit-ExtraBold',
        color: GIFTYY_THEME.colors.gray900,
    },
    cardTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 6,
    },
    thoughtSection: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        padding: 6,
        borderRadius: 12,
        marginBottom: 6,
    },
    thoughtSectionPrimary: {
        backgroundColor: 'rgba(255, 114, 0, 0.03)',
        borderColor: 'rgba(255, 114, 0, 0.08)',
    },
    thoughtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4,
    },
    thoughtTitle: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.orange,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    cardReason: {
        fontSize: 12,
        color: GIFTYY_THEME.colors.gray700,
        lineHeight: 18,
        fontFamily: 'Outfit-Regular',
    },
    tagsScroll: {
        marginTop: 4,
        marginHorizontal: -14, // Bleed over padding
        paddingHorizontal: 14,
    },
    tagsScrollContent: {
        gap: 6,
        paddingRight: 28, // Extra space at end
    },
    fitTag: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    fitTagText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.primary,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 4,
    },
    feedbackButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: GIFTYY_THEME.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackButtonActive: {
        backgroundColor: GIFTYY_THEME.colors.orange,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    dislikeTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray900,
    },
    reasonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    reasonChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
    },
    reasonChipPressed: {
        backgroundColor: GIFTYY_THEME.colors.gray100,
        borderColor: GIFTYY_THEME.colors.gray300,
    },
    reasonChipSelected: {
        backgroundColor: GIFTYY_THEME.colors.orange,
        borderColor: GIFTYY_THEME.colors.orange,
    },
    reasonTextSelected: {
        color: 'white',
        fontFamily: 'Outfit-Bold',
    },
    reasonText: {
        fontSize: 13,
        color: GIFTYY_THEME.colors.gray700,
        fontFamily: 'Outfit-Medium',
    },
    customInputContainer: {
        width: '100%',
        marginTop: 12,
        marginBottom: 8,
    },
    customInput: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray900,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    modalCancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalCancelText: {
        fontSize: 14,
        color: GIFTYY_THEME.colors.gray500,
        fontFamily: 'Outfit-Bold',
    },
    modalSubmitButton: {
        backgroundColor: GIFTYY_THEME.colors.orange,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
    },
    modalSubmitButtonDisabled: {
        backgroundColor: GIFTYY_THEME.colors.gray300,
    },
    modalSubmitText: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: 'white',
    },
    arrowButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -16,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    arrowLeft: {
        left: 6,
    },
    arrowRight: {
        right: 6,
    },
});



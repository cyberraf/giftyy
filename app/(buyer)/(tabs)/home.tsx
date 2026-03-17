/**
 * Giftyy Home Screen - AI Chat + Recipients Focus
 * The main landing page featuring AI chat interface and quick recipient access
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import React, { useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

// Components
import { formatTimeUntil } from '@/components/home/OccasionList';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Contexts & Utils
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useRecipients } from '@/contexts/RecipientsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    const { setVisible } = useBottomBarVisibility();

    // Contexts
    const { profile } = useAuth();
    const { recipients, loading: recipientsLoading, refreshRecipients } = useRecipients();
    const { unreadCount } = useNotifications();

    // State
    const [refreshing, setRefreshing] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const { t } = useTranslation();
    
    const scrollRef = useRef<ScrollView>(null);
    useScrollToTop(scrollRef);

    // Ensure bottom bar is visible
    React.useEffect(() => {
        setVisible(true);
    }, [setVisible]);

    // Refresh handler
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshRecipients();
        } finally {
            setRefreshing(false);
        }
    }, [refreshRecipients]);

    // Quick AI prompts
    const quickPrompts = [
        { icon: 'gift.fill', label: t('home.quick_prompts.birthday'), prompt: 'Find unique birthday gift ideas' },
        { icon: 'heart.fill', label: t('home.quick_prompts.romantic'), prompt: 'Romantic gift under $50' },
        { icon: 'wand.and.stars', label: t('home.quick_prompts.surprise'), prompt: 'Surprise me with something special' },
        { icon: 'star.fill', label: t('home.quick_prompts.popular'), prompt: 'Show me the most popular gifts' },
    ];

    // Calculate upcoming birthdays
    const upcomingBirthdays = useMemo(() => {
        if (!recipients || recipients.length === 0) return [];

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        return recipients
            .filter(r => r.birthDate) // Only recipients with birthdays
            .map(r => {
                const [year, month, day] = r.birthDate!.split('-').map(Number);
                const birthdayThisYear = new Date(currentYear, month - 1, day);
                const birthdayNextYear = new Date(currentYear + 1, month - 1, day);

                // Calculate days until birthday
                let daysUntil: number;
                if (birthdayThisYear >= now) {
                    daysUntil = Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                } else {
                    daysUntil = Math.ceil((birthdayNextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                }

                return {
                    ...r,
                    daysUntil,
                    monthDay: `${month}/${day}`,
                };
            })
            .filter(r => r.daysUntil <= 60) // Only show birthdays within next 60 days
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 3); // Max 3 upcoming birthdays
    }, [recipients]);

    // Handle AI prompt submission
    const handleAiPromptSubmit = () => {
        if (aiPrompt.trim()) {
            router.push({ pathname: '/(buyer)/(tabs)/shop', params: { ai: aiPrompt.trim() } });
        }
    };

    // Handle quick prompt
    const handleQuickPrompt = (prompt: string) => {
        router.push({ pathname: '/(buyer)/(tabs)/shop', params: { ai: prompt } });
    };

    // Handle recipient tap
    const handleRecipientTap = (recipientId: string) => {
        router.push({ pathname: '/(buyer)/(tabs)/shop', params: { recipient: recipientId } });
    };

    const firstName = profile?.first_name || 'there';

    return (
        <View style={styles.container}>
            {/* Pinned header to visually match other premium screens */}
            <Animated.View
                entering={FadeInDown.duration(300)}
                style={[
                    styles.headerContainer,
                    { paddingTop: top + 6 }
                ]}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>{t('home.greeting', { name: firstName !== 'there' ? firstName : t('home.fallback_name') })}</Text>
                        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
                    </View>
                    {unreadCount > 0 && (
                        <Pressable
                            onPress={() => router.push('/(buyer)/notifications')}
                            style={styles.notificationBadge}
                        >
                            <IconSymbol name="bell.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                            <View style={styles.badgeDot} />
                        </Pressable>
                    )}
                </View>
            </Animated.View>

            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: (top + 6) + 56,
                        paddingBottom: BOTTOM_BAR_TOTAL_SPACE + 24,
                    }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={GIFTYY_THEME.colors.primary}
                    />
                }
            >

                {/* AI Chat Input */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.aiChatSection}>
                    <View style={styles.aiChatCard}>
                        <View style={styles.aiChatHeader}>
                            <IconSymbol name="sparkles" size={28} color={GIFTYY_THEME.colors.primary} />
                            <Text style={styles.aiChatTitle}>{t('home.ai_title')}</Text>
                        </View>

                        <View style={styles.aiInputContainer}>
                            <TextInput
                                style={styles.aiInput}
                                placeholder={t('home.ai_placeholder')}
                                placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                value={aiPrompt}
                                onChangeText={setAiPrompt}
                                onSubmitEditing={handleAiPromptSubmit}
                                returnKeyType="search"
                            />
                            <Pressable
                                onPress={handleAiPromptSubmit}
                                style={styles.aiSubmitButton}
                                disabled={!aiPrompt.trim()}
                            >
                                <LinearGradient
                                    colors={aiPrompt.trim()
                                        ? [GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]
                                        : [GIFTYY_THEME.colors.gray300, GIFTYY_THEME.colors.gray300]
                                    }
                                    style={styles.aiSubmitGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <IconSymbol name="arrow.up.circle.fill" size={28} color="white" />
                                </LinearGradient>
                            </Pressable>
                        </View>

                        {/* Quick Prompts */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.quickPromptsScroll}
                            contentContainerStyle={styles.quickPromptsContent}
                        >
                            {quickPrompts.map((item, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => handleQuickPrompt(item.prompt)}
                                    style={styles.quickPromptChip}
                                >
                                    <IconSymbol name={item.icon} size={16} color={GIFTYY_THEME.colors.primary} />
                                    <Text style={styles.quickPromptText}>{item.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Animated.View>

                {/* Quick Stats */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.quickStatsSection}>
                    <View style={styles.statsGrid}>
                        {/* Upcoming Birthdays */}
                        {upcomingBirthdays.length > 0 && (
                            <Pressable
                                onPress={() => router.push('/(buyer)/recipients')}
                                style={[styles.statCard, { backgroundColor: GIFTYY_THEME.colors.primaryLight + '15' }]}
                            >
                                <IconSymbol name="gift.fill" size={24} color={GIFTYY_THEME.colors.primary} />
                                <Text style={styles.statValue}>{upcomingBirthdays.length}</Text>
                                <Text style={styles.statLabel}>
                                    {upcomingBirthdays.length === 1 ? t('home.stats.upcoming_birthday') : t('home.stats.upcoming_birthdays')}
                                </Text>
                                {upcomingBirthdays[0] && (
                                    <Text style={styles.statSubtext}>
                                        {upcomingBirthdays[0].firstName} {formatTimeUntil(upcomingBirthdays[0].daysUntil, t)}
                                    </Text>
                                )}
                            </Pressable>
                        )}
                    </View>
                </Animated.View>

                {/* Recipients Section */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.recipientsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('home.recipients.title')}</Text>
                        <Pressable
                            onPress={() => router.push('/(buyer)/recipients')}
                            style={styles.seeAllButton}
                        >
                            <Text style={styles.seeAllText}>{t('home.recipients.see_all')}</Text>
                            <IconSymbol name="chevron.right" size={16} color={GIFTYY_THEME.colors.primary} />
                        </Pressable>
                    </View>

                    {recipientsLoading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>{t('home.recipients.loading')}</Text>
                        </View>
                    ) : recipients.length === 0 ? (
                        <Pressable
                            onPress={() => router.push('/(buyer)/recipients')}
                            style={styles.emptyRecipientsCard}
                        >
                            <IconSymbol name="person.badge.plus" size={48} color={GIFTYY_THEME.colors.gray400} />
                            <Text style={styles.emptyRecipientsTitle}>{t('home.recipients.empty_title')}</Text>
                            <Text style={styles.emptyRecipientsText}>
                                {t('home.recipients.empty_subtitle')}
                            </Text>
                        </Pressable>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.recipientsScroll}
                            contentContainerStyle={styles.recipientsScrollContent}
                        >
                            {recipients.slice(0, 6).map((recipient, index) => (
                                <Pressable
                                    key={recipient.id}
                                    onPress={() => handleRecipientTap(recipient.id)}
                                    style={styles.recipientCard}
                                >
                                    <View style={styles.recipientAvatar}>
                                        <Text style={styles.recipientInitial}>
                                            {recipient.firstName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.recipientName} numberOfLines={1}>
                                        {recipient.firstName}
                                    </Text>
                                    {recipient.relationship && (
                                        <Text style={styles.recipientRelationship} numberOfLines={1}>
                                            {recipient.relationship}
                                        </Text>
                                    )}
                                </Pressable>
                            ))}

                            {/* Add Recipient Button */}
                            <Pressable
                                onPress={() => router.push('/(buyer)/recipients')}
                                style={[styles.recipientCard, styles.addRecipientCard]}
                            >
                                <View style={styles.addRecipientAvatar}>
                                    <IconSymbol name="plus" size={24} color={GIFTYY_THEME.colors.primary} />
                                </View>
                                <Text style={styles.addRecipientText}>{t('home.recipients.add')}</Text>
                            </Pressable>
                        </ScrollView>
                    )}
                </Animated.View>

                {/* Explore Shop CTA */}
                <Animated.View entering={FadeInUp.delay(500)} style={styles.shopCTASection}>
                    <Pressable
                        onPress={() => router.push('/(buyer)/(tabs)/shop')}
                        style={styles.shopCTA}
                    >
                        <LinearGradient
                            colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
                            style={styles.shopCTAGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.shopCTAContent}>
                                <View>
                                    <Text style={styles.shopCTATitle}>{t('home.shop_cta.title')}</Text>
                                    <Text style={styles.shopCTASubtitle}>{t('home.shop_cta.subtitle')}</Text>
                                </View>
                                <IconSymbol name="arrow.right.circle.fill" size={32} color="white" />
                            </View>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GIFTYY_THEME.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        backgroundColor: GIFTYY_THEME.colors.white,
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
        paddingBottom: GIFTYY_THEME.spacing.md,
        ...GIFTYY_THEME.shadows.sm,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: GIFTYY_THEME.typography.sizes['2xl'],
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        color: GIFTYY_THEME.colors.gray600,
        fontWeight: GIFTYY_THEME.typography.weights.medium,
    },
    notificationBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: GIFTYY_THEME.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...GIFTYY_THEME.shadows.md,
        position: 'relative',
    },
    badgeDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: GIFTYY_THEME.colors.error,
        borderWidth: 2,
        borderColor: GIFTYY_THEME.colors.white,
    },
    aiChatSection: {
        marginBottom: GIFTYY_THEME.spacing.xl,
    },
    aiChatCard: {
        borderRadius: GIFTYY_THEME.radius.xl,
        padding: GIFTYY_THEME.spacing.lg,
        backgroundColor: GIFTYY_THEME.colors.white,
        ...GIFTYY_THEME.shadows.sm,
    },
    aiChatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: GIFTYY_THEME.spacing.md,
    },
    aiChatTitle: {
        fontSize: GIFTYY_THEME.typography.sizes.lg,
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.gray900,
        marginLeft: GIFTYY_THEME.spacing.sm,
    },
    aiInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray100,
        borderRadius: GIFTYY_THEME.radius.full,
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingVertical: 4,
        marginBottom: GIFTYY_THEME.spacing.md,
    },
    aiInput: {
        flex: 1,
        fontSize: GIFTYY_THEME.typography.sizes.base,
        color: GIFTYY_THEME.colors.gray900,
        paddingVertical: GIFTYY_THEME.spacing.sm,
        fontWeight: GIFTYY_THEME.typography.weights.medium,
    },
    aiSubmitButton: {
        marginLeft: GIFTYY_THEME.spacing.sm,
    },
    aiSubmitGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPromptsScroll: {
        marginHorizontal: -GIFTYY_THEME.spacing.lg,
    },
    quickPromptsContent: {
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
        gap: GIFTYY_THEME.spacing.sm,
    },
    quickPromptChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray100,
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingVertical: GIFTYY_THEME.spacing.sm,
        borderRadius: GIFTYY_THEME.radius.full,
        gap: GIFTYY_THEME.spacing.xs,
        ...GIFTYY_THEME.shadows.sm,
    },
    quickPromptText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        color: GIFTYY_THEME.colors.gray900,
    },
    quickStatsSection: {
        marginBottom: GIFTYY_THEME.spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GIFTYY_THEME.spacing.md,
    },
    statCard: {
        flex: 1,
        minWidth: (SCREEN_WIDTH - (GIFTYY_THEME.spacing.lg * 2) - GIFTYY_THEME.spacing.md) / 2,
        padding: GIFTYY_THEME.spacing.lg,
        borderRadius: GIFTYY_THEME.radius.xl,
        ...GIFTYY_THEME.shadows.md,
    },
    statValue: {
        fontSize: GIFTYY_THEME.typography.sizes['3xl'],
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.gray900,
        marginTop: GIFTYY_THEME.spacing.xs,
    },
    statLabel: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        color: GIFTYY_THEME.colors.gray700,
        marginTop: 2,
    },
    statSubtext: {
        fontSize: GIFTYY_THEME.typography.sizes.xs,
        color: GIFTYY_THEME.colors.gray500,
        marginTop: 4,
    },
    recipientsSection: {
        marginBottom: GIFTYY_THEME.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: GIFTYY_THEME.spacing.md,
    },
    sectionTitle: {
        fontSize: GIFTYY_THEME.typography.sizes.xl,
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.gray900,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        color: GIFTYY_THEME.colors.primary,
    },
    loadingContainer: {
        padding: GIFTYY_THEME.spacing.xl,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        color: GIFTYY_THEME.colors.gray500,
    },
    emptyRecipientsCard: {
        backgroundColor: GIFTYY_THEME.colors.white,
        borderRadius: GIFTYY_THEME.radius.lg,
        padding: GIFTYY_THEME.spacing.lg,
        alignItems: 'center',
        gap: GIFTYY_THEME.spacing.xs,
        ...GIFTYY_THEME.shadows.md,
    },
    emptyRecipientsTitle: {
        fontSize: GIFTYY_THEME.typography.sizes.lg,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        color: GIFTYY_THEME.colors.gray900,
        marginTop: GIFTYY_THEME.spacing.md,
    },
    emptyRecipientsText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        color: GIFTYY_THEME.colors.gray600,
        textAlign: 'center',
        marginTop: GIFTYY_THEME.spacing.xs,
    },
    recipientsScroll: {
        marginHorizontal: -GIFTYY_THEME.spacing.lg,
    },
    recipientsScrollContent: {
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
        gap: GIFTYY_THEME.spacing.md,
    },
    recipientCard: {
        width: 100,
        alignItems: 'center',
    },
    recipientAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: GIFTYY_THEME.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GIFTYY_THEME.spacing.sm,
        ...GIFTYY_THEME.shadows.md,
    },
    recipientInitial: {
        fontSize: GIFTYY_THEME.typography.sizes['2xl'],
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.white,
    },
    recipientName: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
    },
    recipientRelationship: {
        fontSize: GIFTYY_THEME.typography.sizes.xs,
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        marginTop: 2,
    },
    addRecipientCard: {
        opacity: 0.7,
    },
    addRecipientAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: GIFTYY_THEME.colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GIFTYY_THEME.spacing.sm,
        borderWidth: 2,
        borderColor: GIFTYY_THEME.colors.gray300,
        borderStyle: 'dashed',
    },
    addRecipientText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        color: GIFTYY_THEME.colors.gray600,
        textAlign: 'center',
    },
    shopCTASection: {
        marginBottom: GIFTYY_THEME.spacing.md,
    },
    shopCTA: {
        borderRadius: GIFTYY_THEME.radius.xl,
        overflow: 'hidden',
        ...GIFTYY_THEME.shadows.xl,
    },
    shopCTAGradient: {
        padding: GIFTYY_THEME.spacing.xl,
    },
    shopCTAContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shopCTATitle: {
        fontSize: GIFTYY_THEME.typography.sizes.xl,
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.white,
        marginBottom: 4,
    },
    shopCTASubtitle: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        color: GIFTYY_THEME.colors.white,
        opacity: 0.9,
    },
});

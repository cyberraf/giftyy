import { formatDateLabel, formatTimeUntil } from '@/components/home/OccasionList';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useHome, type UpcomingOccasion } from '@/lib/hooks/useHome';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterOption = 'All' | 'Birthdays' | 'Anniversaries' | 'This month';

export default function OccasionsScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const { t } = useTranslation();
    const router = useRouter();
    const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
    const { upcomingOccasions, recipientsLoading: loading, refreshOccasions, myProfileId } = useHome();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshOccasions();
        } finally {
            setRefreshing(false);
        }
    }, [refreshOccasions]);

    // Get filter recipient name if ID is provided
    const filteredRecipientName = useMemo(() => {
        if (!recipientId) return null;
        const occasion = upcomingOccasions.find(o => o.recipientId === recipientId);
        return occasion?.recipientName || 'Recipient';
    }, [recipientId, upcomingOccasions]);

    const filteredOccasions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return upcomingOccasions.filter((occ) => {
            // Filter out our own occasions
            if (occ.recipientId === myProfileId) return false;

            // Recipient filter (from params)
            if (recipientId && occ.recipientId !== recipientId) return false;

            // Text search
            const matchesSearch =
                occ.recipientName.toLowerCase().includes(query) ||
                occ.label.toLowerCase().includes(query);

            if (!matchesSearch) return false;

            // Category filter
            if (activeFilter === 'All') return true;
            if (activeFilter === 'Birthdays') return occ.label === 'Birthday';
            if (activeFilter === 'Anniversaries') return occ.label === 'Anniversary';
            if (activeFilter === 'This month') {
                const parts = occ.date.split('-');
                if (parts.length === 3) {
                    const y = parseInt(parts[0]);
                    const m = parseInt(parts[1]);
                    return y === currentYear && (m - 1) === currentMonth;
                }
            }
            return true;
        });
    }, [upcomingOccasions, searchQuery, activeFilter, recipientId]);

    const getOccasionIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('birthday')) return '🎂';
        if (l.includes('anniversary')) return '💍';
        if (l.includes('wedding')) return '🎊';
        if (l.includes('graduation')) return '🎓';
        if (l.includes('holiday') || l.includes('christmas')) return '🎄';
        return '📅';
    };

    const renderOccasionCard = ({ item: occ }: { item: UpcomingOccasion }) => (
        <View
            style={styles.gridCard}
        >
            <View style={styles.gridCardHeader}>
                <Text style={styles.occasionIcon}>{getOccasionIcon(occ.label)}</Text>
                <Text style={styles.gridCardLabel}>{occ.label}</Text>
            </View>

            <View style={styles.gridCardBody}>
                <View style={styles.avatarLarge}>
                    <Text style={styles.avatarLargeText}>
                        {occ.recipientName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.gridCardName} numberOfLines={1}>{occ.recipientName}</Text>
            </View>

            <View style={styles.gridCardFooter}>
                <View style={styles.footerInfo}>
                    <Text style={styles.gridCardDate}>{formatDateLabel(occ.date)}</Text>
                    <View style={[
                        styles.gridTimeBadge,
                        occ.inDays <= 7 && styles.gridTimeBadgeUrgent
                    ]}>
                        <Text style={[
                            styles.gridTimeBadgeText,
                            occ.inDays <= 7 && styles.gridTimeBadgeTextUrgent
                        ]}>
                            {formatTimeUntil(occ.inDays, t)}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderFilterChip = (filter: FilterOption) => (
        <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
            ]}
        >
            <Text
                style={[
                    styles.filterChipText,
                    activeFilter === filter && styles.filterChipTextActive,
                ]}
            >
                {filter}
            </Text>
        </Pressable>
    );

    return (
        <View style={[styles.screen, { paddingTop: top + 72 }]}>
            <View style={styles.bodyControls}>
                {recipientId ? (
                    <View style={styles.activeFilterBanner}>
                        <View style={styles.filterChipActive}>
                            <Text style={styles.filterChipTextActive}>Showing for {filteredRecipientName}</Text>
                        </View>
                        <Pressable
                            onPress={() => router.setParams({ recipientId: undefined })}
                            style={styles.clearFilterButton}
                        >
                            <IconSymbol name="xmark.circle.fill" size={20} color={GIFTYY_THEME.colors.gray400} />
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.searchBar}>
                        <IconSymbol name="magnifyingglass" size={scale(20)} color={GIFTYY_THEME.colors.gray500} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search occasions..."
                            placeholderTextColor={GIFTYY_THEME.colors.gray400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <IconSymbol name="xmark.circle.fill" size={scale(16)} color={GIFTYY_THEME.colors.gray400} />
                            </Pressable>
                        )}
                    </View>
                )}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                >
                    {(['All', 'Birthdays', 'Anniversaries', 'This month'] as FilterOption[]).map(renderFilterChip)}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
                    <Text style={styles.loadingText}>Loading occasions…</Text>
                </View>
            ) : filteredOccasions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No matching occasions</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Try adjusting your search or filters to find what you're looking for.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + verticalScale(20) },
                    ]}
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
                    <View style={styles.gridContainer}>
                        {filteredOccasions.map((occ) => (
                            <React.Fragment key={occ.id}>
                                {renderOccasionCard({ item: occ })}
                            </React.Fragment>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    bodyControls: {
        backgroundColor: 'transparent',
        paddingBottom: verticalScale(16),
        gap: verticalScale(12),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray100,
        marginHorizontal: scale(20),
        paddingHorizontal: scale(16),
        height: verticalScale(44),
        borderRadius: scale(14),
        gap: scale(8),
    },
    searchInput: {
        flex: 1,
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray900,
        height: '100%',
    },
    filterContainer: {
        paddingHorizontal: scale(20),
        gap: scale(8),
    },
    activeFilterBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: GIFTYY_THEME.colors.gray100,
        marginHorizontal: scale(20),
        paddingHorizontal: scale(16),
        height: verticalScale(44),
        borderRadius: scale(14),
    },
    clearFilterButton: {
        width: scale(32),
        height: scale(32),
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChip: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(10),
        borderRadius: scale(999),
        backgroundColor: GIFTYY_THEME.colors.gray100,
    },
    filterChipActive: {
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    filterChipText: {
        fontSize: responsiveFontSize(14),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray600,
    },
    filterChipTextActive: {
        color: '#fff',
    },
    content: {
        paddingTop: verticalScale(16),
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(40),
    },
    loadingText: {
        marginLeft: scale(10),
        fontSize: responsiveFontSize(14),
        color: GIFTYY_THEME.colors.gray500,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: verticalScale(60),
        gap: verticalScale(12),
        paddingHorizontal: scale(40),
    },
    emptyStateTitle: {
        fontSize: responsiveFontSize(18),
        fontWeight: 'bold',
        color: GIFTYY_THEME.colors.gray900,
    },
    emptyStateSubtitle: {
        fontSize: responsiveFontSize(14),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(20),
    },
    gridContainer: {
        paddingHorizontal: scale(20),
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(12),
    },
    gridCard: {
        width: (GIFTYY_THEME.layout.screenWidth - scale(40) - scale(12)) / 2,
        backgroundColor: '#fff',
        borderRadius: scale(24),
        padding: scale(14),
        paddingBottom: scale(18),
        gap: scale(12),
        ...GIFTYY_THEME.shadows.md,
    },
    cardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    gridCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    occasionIcon: {
        fontSize: responsiveFontSize(14),
    },
    gridCardLabel: {
        flex: 1,
        fontSize: responsiveFontSize(12),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
    },
    gridCardBody: {
        alignItems: 'center',
        gap: scale(8),
    },
    avatarLarge: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        backgroundColor: GIFTYY_THEME.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLargeText: {
        fontSize: responsiveFontSize(24),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.primary,
    },
    gridCardName: {
        fontSize: responsiveFontSize(16),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
    },
    gridCardFooter: {
        marginTop: 'auto',
        gap: scale(12),
    },
    footerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gridCardDate: {
        fontSize: responsiveFontSize(11),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.primary,
    },
    gridTimeBadge: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: scale(8),
        backgroundColor: GIFTYY_THEME.colors.gray100,
    },
    gridTimeBadgeUrgent: {
        backgroundColor: '#FFF5F5',
    },
    gridTimeBadgeText: {
        fontSize: responsiveFontSize(10),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray600,
    },
    gridTimeBadgeTextUrgent: {
        color: GIFTYY_THEME.colors.error,
    },
});

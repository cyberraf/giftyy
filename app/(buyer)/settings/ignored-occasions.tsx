import { formatDateLabel } from '@/components/home/OccasionList';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_FONT } from '@/constants/theme';
import { useHome } from '@/lib/hooks/useHome';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';

export default function IgnoredOccasionsScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const { alert } = useAlert();
    const { upcomingOccasions, recipientsLoading, refreshOccasions } = useHome();
    const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

    // Filter to only show ignored occasions
    const ignoredOccasions = useMemo(() => {
        return upcomingOccasions.filter(occ => occ.isIgnored);
    }, [upcomingOccasions]);

    const handleRestore = async (occId: string) => {
        if (!user) return;
        setRestoringIds(prev => new Set(prev).add(occId));
        try {
            const { error } = await supabase
                .from('ignored_occasions')
                .delete()
                .eq('user_id', user.id)
                .eq('occasion_id', occId);
            
            if (error) throw error;
            
            await refreshOccasions();
            alert('Success', 'Occasion restored successfully.');
        } catch (error) {
            console.error('[IgnoredOccasions] Failed to restore:', error);
            alert('Error', 'Failed to restore occasion. Please try again.');
        } finally {
            setRestoringIds(prev => {
                const next = new Set(prev);
                next.delete(occId);
                return next;
            });
        }
    };

    const getOccasionIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('birthday')) return '🎂';
        if (l.includes('anniversary')) return '💍';
        if (l.includes('wedding')) return '🎊';
        if (l.includes('graduation')) return '🎓';
        if (l.includes('holiday') || l.includes('christmas')) return '🎄';
        if (l.includes('mother')) return '🌸';
        if (l.includes('father')) return '👔';
        if (l.includes('valentine')) return '💝';
        return '📅';
    };

    return (
        <View style={[styles.screen, { paddingTop: top + GIFTYY_THEME.layout.headerHeight, paddingBottom: bottom }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ignored Occasions</Text>
            </View>

            {recipientsLoading && ignoredOccasions.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
                </View>
            ) : ignoredOccasions.length === 0 ? (
                <View style={styles.center}>
                    <IconSymbol name="eye.fill" size={64} color={GIFTYY_THEME.colors.gray300} />
                    <Text style={styles.emptyTitle}>All Clear</Text>
                    <Text style={styles.emptySubtitle}>You aren't ignoring any occasions right now.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {ignoredOccasions.map(occ => {
                        const isRestoring = restoringIds.has(occ.id);
                        return (
                            <View key={occ.id} style={styles.card}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.avatarBox}>
                                        <Text style={styles.emoji}>{getOccasionIcon(occ.label)}</Text>
                                    </View>
                                    <View style={styles.cardTexts}>
                                        <Text style={styles.occTitle}>{occ.label} for {occ.recipientName}</Text>
                                        <Text style={styles.occDate}>
                                            {formatDateLabel(occ.date)}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable 
                                    style={[styles.restoreBtn, isRestoring && styles.restoreBtnDisabled]}
                                    onPress={() => handleRestore(occ.id)}
                                    disabled={isRestoring}
                                >
                                    {isRestoring ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.restoreBtnText}>Restore</Text>
                                    )}
                                </Pressable>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#fff5f0',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 8,
        color: GIFTYY_THEME.colors.gray900,
    },
    emptySubtitle: {
        fontSize: 15,
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
    },
    list: {
        paddingTop: 16,
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...GIFTYY_THEME.shadows.sm,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatarBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF0E6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 24,
    },
    cardTexts: {
        flex: 1,
        gap: 4,
    },
    occTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
    },
    occDate: {
        fontSize: 13,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray500,
    },
    restoreBtn: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 12,
    },
    restoreBtnDisabled: {
        opacity: 0.7,
    },
    restoreBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    }
});

import { formatDateLabel } from '@/components/home/OccasionList';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useHome, UpcomingOccasion } from '@/lib/hooks/useHome';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';

export default function OccasionsOnboardingScreen() {
    const { recipientProfileId } = useLocalSearchParams<{ recipientProfileId: string }>();
    const { top, bottom } = useSafeAreaInsets();
    const { t } = useTranslation();
    const router = useRouter();
    const { alert } = useAlert();
    const { user } = useAuth();
    
    const { upcomingOccasions, recipientsLoading, refreshOccasions } = useHome();
    
    const [selectedOccasionIds, setSelectedOccasionIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    
    // Filter occasions for this specific recipient profile
    const profileOccasions = useMemo(() => {
        if (!recipientProfileId) return [];
        return upcomingOccasions.filter(o => o.recipientProfileId === recipientProfileId);
    }, [upcomingOccasions, recipientProfileId]);

    const recipientName = useMemo(() => {
        if (profileOccasions.length > 0) return profileOccasions[0].recipientName;
        return 'your connection';
    }, [profileOccasions]);

    // Pre-select occasions that are NOT ignored
    useEffect(() => {
        if (profileOccasions.length > 0 && selectedOccasionIds.size === 0 && !recipientsLoading) {
            const initialSet = new Set<string>();
            profileOccasions.forEach(occ => {
                if (!occ.isIgnored) {
                    initialSet.add(occ.id);
                }
            });
            setSelectedOccasionIds(initialSet);
        }
    }, [profileOccasions, recipientsLoading]);

    const handleToggle = (occId: string) => {
        setSelectedOccasionIds(prev => {
            const next = new Set(prev);
            if (next.has(occId)) {
                next.delete(occId);
            } else {
                next.add(occId);
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            // All occasions that are NOT in the selected set should be ignored
            const toIgnore = profileOccasions.filter(o => !selectedOccasionIds.has(o.id)).map(o => o.id);
            const toCelebrate = profileOccasions.filter(o => selectedOccasionIds.has(o.id)).map(o => o.id);

            // 1. Insert newly ignored occasions
            if (toIgnore.length > 0) {
                const inserts = toIgnore.map(occId => ({
                    user_id: user.id,
                    occasion_id: occId
                }));
                await supabase.from('ignored_occasions').upsert(inserts, { onConflict: 'user_id,occasion_id' });
            }

            // 2. Remove celebrations that were previously ignored but are now checked
            if (toCelebrate.length > 0) {
                await supabase
                    .from('ignored_occasions')
                    .delete()
                    .eq('user_id', user.id)
                    .in('occasion_id', toCelebrate);
            }
            
            // Refresh home data cache
            await refreshOccasions();
            
            alert('Success', `Preferences saved for ${recipientName}`, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('[Occasions Onboarding] Save error:', error);
            alert('Error', 'Failed to save occasion preferences.');
        } finally {
            setIsSaving(false);
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

    if (recipientsLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
            </View>
        );
    }

    if (profileOccasions.length === 0) {
        return (
            <View style={[styles.container, styles.center, { paddingTop: top }]}>
                <IconSymbol name="calendar.badge.exclamationmark" size={64} color={GIFTYY_THEME.colors.gray300} />
                <Text style={styles.emptyTitle}>No Occasions Found</Text>
                <Text style={styles.emptySubtitle}>{recipientName} hasn't added any occasions yet.</Text>
                <Pressable onPress={() => router.back()} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: top + 16 }]}>
                <View style={styles.headerIconBox}>
                    <IconSymbol name="gift.fill" size={24} color={GIFTYY_THEME.colors.primary} />
                </View>
                <Text style={styles.title}>Celebrate {recipientName}</Text>
                <Text style={styles.subtitle}>Select the occasions you want us to remind you about. You can change this later in Settings.</Text>
            </View>

            <ScrollView 
                contentContainerStyle={[styles.listContent, { paddingBottom: bottom + 120 }]}
                showsVerticalScrollIndicator={false}
            >
                {profileOccasions.map(occ => {
                    const isSelected = selectedOccasionIds.has(occ.id);
                    return (
                        <Pressable 
                            key={occ.id} 
                            style={[
                                styles.occasionCard, 
                                isSelected && styles.occasionCardSelected
                            ]}
                            onPress={() => handleToggle(occ.id)}
                        >
                            <View style={styles.cardLeft}>
                                <Text style={styles.emoji}>{getOccasionIcon(occ.label)}</Text>
                                <View style={styles.cardTexts}>
                                    <Text style={styles.occTitle}>{occ.label}</Text>
                                    <Text style={styles.occDate}>
                                        {formatDateLabel(occ.date)}
                                    </Text>
                                </View>
                            </View>
                            <View style={[
                                styles.checkbox,
                                isSelected && styles.checkboxActive
                            ]}>
                                {isSelected && (
                                    <IconSymbol name="checkmark" size={14} color="#FFF" weight="bold" />
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: bottom || 24 }]}>
                <Pressable
                    style={[styles.saveBtn, isSaving && styles.saveBtnLoading]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Preferences</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff5f0',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
    },
    headerIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF0E6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: GIFTYY_THEME.colors.gray600,
        textAlign: 'center',
        lineHeight: 22,
    },
    listContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    occasionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#F3F4F6',
        ...GIFTYY_THEME.shadows.sm,
    },
    occasionCardSelected: {
        borderColor: GIFTYY_THEME.colors.primary,
        backgroundColor: '#FFFaf8',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    emoji: {
        fontSize: 28,
    },
    cardTexts: {
        gap: 4,
    },
    occTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
    },
    occDate: {
        fontSize: 13,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray500,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: GIFTYY_THEME.colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        borderColor: GIFTYY_THEME.colors.primary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 16,
        paddingHorizontal: 24,
        backgroundColor: '#fff5f0',
        borderTopWidth: 1,
        borderTopColor: '#FFE4D6',
    },
    saveBtn: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        ...GIFTYY_THEME.shadows.md,
    },
    saveBtnLoading: {
        opacity: 0.8,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        marginBottom: 24,
    },
    doneBtn: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
    },
    doneBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    }
});

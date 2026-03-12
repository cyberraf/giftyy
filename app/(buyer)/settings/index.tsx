import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TourAnchor } from '../../../components/tour/TourAnchor';
import { IconSymbol, IconSymbolName } from '../../../components/ui/icon-symbol';
import { GIFTYY_THEME } from '../../../constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useSettings } from '../../../hooks/useSettings';

export default function SettingsScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { signOut } = useAuth();
    const { loading: settingsLoading } = useSettings();
    const [signOutVisible, setSignOutVisible] = useState(false);

    const handleSignOut = () => setSignOutVisible(true);
    const handleConfirmSignOut = async () => {
        setSignOutVisible(false);
        await signOut();
    };

    return (
        <View style={[styles.screen, { paddingTop: top + 64 }]}>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <Text style={[styles.pageTitle, { marginBottom: 0 }]}>Settings</Text>
                    {settingsLoading && <ActivityIndicator size="small" color={BRAND_COLOR} />}
                </View>

                <View style={styles.sectionGap}>
                    <View style={styles.groupCard}>
                        <Text style={styles.groupTitle}>Notification preferences</Text>
                        <SettingsNotificationsPanel />
                    </View>

                    <TourAnchor step="settings_reminders">
                        <View style={styles.groupCard}>
                            <Text style={styles.groupTitle}>Reminder schedule</Text>
                            <Text style={styles.groupSubtitle}>When should we remind you about upcoming occasions?</Text>
                            <ReminderFrequencyPanel />
                        </View>
                    </TourAnchor>

                    <View style={styles.groupCard}>
                        <Text style={styles.groupTitle}>Preferred language</Text>
                        <Text style={styles.groupSubtitle}>Which language would you like to use?</Text>
                        <LanguageSelector />
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
                        <IconSymbol name="arrow.right.square" size={18} color="#0f172a" />
                        <Text style={styles.dangerLabel}>Sign out</Text>
                    </Pressable>


                </View>
            </ScrollView>

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
    const { settings, updateSettings, loading } = useSettings();

    if (loading && !settings) {
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={BRAND_COLOR} />
            </View>
        );
    }

    return (
        <>
            <SettingsSwitchRow
                label="Push notifications"
                subtitle="Receive push notifications on your device"
                value={settings?.push_notifications_enabled ?? true}
                onValueChange={(val) => { updateSettings({ push_notifications_enabled: val }); }}
            />
            <SettingsSwitchRow
                label="Occasion reminders"
                subtitle="Reminders about upcoming events and deadlines"
                value={settings?.occasion_reminders_enabled ?? true}
                onValueChange={(val) => { updateSettings({ occasion_reminders_enabled: val }); }}
            />
            <SettingsSwitchRow
                label="Order updates"
                subtitle="Get notified about your order status"
                value={settings?.order_updates_enabled ?? true}
                onValueChange={(val) => { updateSettings({ order_updates_enabled: val }); }}
            />
            <SettingsSwitchRow
                label="Email notifications"
                subtitle="Receive important updates via email"
                value={settings?.email_notifications_enabled ?? true}
                onValueChange={(val) => { updateSettings({ email_notifications_enabled: val }); }}
            />
        </>
    );
}

function ReminderFrequencyPanel() {
    const { settings, updateSettings, loading } = useSettings();

    const options = [
        { label: 'Day of', value: 0, icon: 'bell' },
        { label: '1 day before', value: 1, icon: 'bell' },
        { label: '2 days before', value: 2, icon: 'bell' },
        { label: '3 days before', value: 3, icon: 'bell' },
        { label: '5 days before', value: 5, icon: 'bell' },
        { label: '1 week before', value: 7, icon: 'bell' },
        { label: '2 weeks before', value: 14, icon: 'bell' },
        { label: '1 month before', value: 30, icon: 'bell' },
    ] as const;

    const currentFrequencies = settings?.reminder_days_before || [1, 7, 30];

    const toggleFrequency = (value: number) => {
        let newFrequencies;
        if (currentFrequencies.includes(value)) {
            // Prevent removing all reminders if you want to enforce at least one, 
            // or just allow empty. Let's allow empty but maybe show a warning later.
            newFrequencies = currentFrequencies.filter(f => f !== value);
        } else {
            newFrequencies = [...currentFrequencies, value].sort((a, b) => b - a);
        }
        updateSettings({ reminder_days_before: newFrequencies });
    };

    if (loading && !settings) return null;

    return (
        <View style={styles.frequencyList}>
            {options.map((opt, index) => {
                const isActive = currentFrequencies.includes(opt.value);
                const isLast = index === options.length - 1;
                return (
                    <Pressable
                        key={opt.value}
                        onPress={() => toggleFrequency(opt.value)}
                        style={[
                            styles.frequencyRow,
                            isActive && styles.frequencyRowActive,
                            !isLast && styles.frequencyRowBorder
                        ]}
                    >
                        <View style={[styles.frequencyIconContainer, isActive && styles.frequencyIconContainerActive]}>
                            <IconSymbol
                                name={opt.icon as any}
                                size={16}
                                color={isActive ? '#fff' : BRAND_COLOR}
                            />
                        </View>
                        <Text style={[styles.frequencyRowLabel, isActive && styles.frequencyRowLabelActive]}>
                            {opt.label}
                        </Text>
                        <View style={[styles.frequencyCheckbox, isActive && styles.frequencyCheckboxActive]}>
                            {isActive && <IconSymbol name="checkmark" size={12} color="#fff" />}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

function LanguageSelector() {
    const { settings, updateSettings, loading } = useSettings();

    const languages = [
        { label: 'English', id: 'en', flag: '🇺🇸', enabled: true },
        { label: 'Spanish', id: 'es', flag: '🇪🇸', enabled: false },
        { label: 'French', id: 'fr', flag: '🇫🇷', enabled: false },
        { label: 'German', id: 'de', flag: '🇩🇪', enabled: false },
    ];

    const currentLanguage = settings?.language || 'en';

    if (loading && !settings) return null;

    return (
        <View style={styles.languageGrid}>
            {languages.map((lang) => {
                const isSelected = currentLanguage === lang.id;
                return (
                    <Pressable
                        key={lang.id}
                        onPress={() => lang.enabled && updateSettings({ language: lang.id })}
                        style={[
                            styles.languageChip,
                            isSelected && styles.languageChipActive,
                            !lang.enabled && styles.languageChipDisabled
                        ]}
                        disabled={!lang.enabled}
                    >
                        <Text style={styles.languageFlag}>{lang.flag}</Text>
                        <Text style={[
                            styles.languageLabel,
                            isSelected && styles.languageLabelActive,
                            !lang.enabled && styles.languageLabelDisabled
                        ]}>
                            {lang.label}
                        </Text>
                        {!lang.enabled && (
                            <View style={styles.comingSoonBadge}>
                                <Text style={styles.comingSoonText}>Soon</Text>
                            </View>
                        )}
                        {isSelected && lang.enabled && (
                            <IconSymbol name="checkmark.circle.fill" size={16} color={BRAND_COLOR} />
                        )}
                    </Pressable>
                );
            })}
        </View>
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
            <IconSymbol name="chevron.right" size={20} color="#64748b" />
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

const palette = {
    background: GIFTYY_THEME.colors.background,
    card: '#FFFFFF',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(0,0,0,0.02)',
    cardAlt: '#F9F5F2',
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        paddingHorizontal: 20,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
        marginBottom: 24,
    },
    sectionGap: {
        gap: 16,
    },
    groupCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 10,
        ...GIFTYY_THEME.shadows.md,
    },
    groupTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
        marginBottom: 2,
    },
    groupSubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
        marginBottom: 12,
        lineHeight: 18,
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
        backgroundColor: '#FCEEE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLinkLabel: {
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
        backgroundColor: '#ECE7E2',
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
        elevation: 2,
    },
    settingsSwitchThumbActive: {
        transform: [{ translateX: 20 }],
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: '#FAE1E1',
        borderWidth: 1,
        borderColor: '#F5B5B5',
        marginTop: 8,
    },
    dangerLabel: {
        color: '#EF4444',
        fontWeight: '800',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    signOutCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        gap: 12,
    },
    signOutIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FCEEE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    signOutTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    signOutSubtitle: {
        fontSize: 15,
        color: palette.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    signOutActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
        width: '100%',
    },
    signOutGhostButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signOutGhostLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textSecondary,
    },
    signOutPrimaryButton: {
        flex: 1,
        backgroundColor: BRAND_COLOR,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signOutPrimaryLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    frequencyList: {
        marginTop: 8,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    frequencyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        gap: 12,
    },
    frequencyRowActive: {
        backgroundColor: 'rgba(247, 85, 7, 0.03)',
    },
    frequencyRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    frequencyIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    frequencyIconContainerActive: {
        backgroundColor: BRAND_COLOR,
    },
    frequencyRowLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    frequencyRowLabelActive: {
        color: BRAND_COLOR,
    },
    frequencyCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    frequencyCheckboxActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
    },
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    languageChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    languageChipActive: {
        borderColor: BRAND_COLOR,
        backgroundColor: 'rgba(247, 85, 7, 0.03)',
    },
    languageChipDisabled: {
        backgroundColor: '#f8fafc',
        borderColor: '#f1f5f9',
        opacity: 0.8,
    },
    languageFlag: {
        fontSize: 18,
    },
    languageLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    languageLabelActive: {
        color: BRAND_COLOR,
    },
    languageLabelDisabled: {
        color: '#94a3b8',
    },
    comingSoonBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    comingSoonText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
});



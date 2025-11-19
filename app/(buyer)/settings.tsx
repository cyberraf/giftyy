import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

const tabs = ['Account', 'Preferences', 'Privacy', 'Notifications'] as const;
type TabKey = (typeof tabs)[number];

const TAB_CONFIG: { key: TabKey; icon: IconSymbolName }[] = [
    { key: 'Account', icon: 'person.fill' },
    { key: 'Preferences', icon: 'slider.horizontal.3' },
    { key: 'Privacy', icon: 'lock.fill' },
    { key: 'Notifications', icon: 'bell.fill' },
];

const palette = {
    background: '#F5F4F2',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    neutralSoft: '#ECE7E2',
    success: '#10B981',
    danger: '#EF4444',
};

export default function SettingsScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ tab?: string }>();
    const [activeTab, setActiveTab] = useState<TabKey>('Account');
    const { profile: authProfile, user } = useAuth();

    // Set active tab from URL parameter
    React.useEffect(() => {
        if (params.tab && tabs.includes(params.tab as TabKey)) {
            setActiveTab(params.tab as TabKey);
        }
    }, [params.tab]);

    const displayName = React.useMemo(() => {
        if (authProfile?.first_name) {
            return authProfile.first_name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    }, [authProfile, user]);

    const displayInitials = React.useMemo(() => {
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

    return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}>
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                <View style={styles.heroCard}>
                    <View style={styles.avatarBubble}>
                        <Text style={styles.avatarInitials}>{displayInitials}</Text>
                    </View>
                    <Text style={styles.heroHeading}>Settings</Text>
                    <Text style={styles.heroSubheading}>Manage your account and preferences</Text>
                </View>

                <View style={styles.tabBar}>
                    {TAB_CONFIG.map(({ key, icon }) => {
                        const active = key === activeTab;
                        return (
                            <Pressable
                                key={key}
                                style={[styles.tabPill, active && styles.tabPillActive]}
                                onPress={() => setActiveTab(key)}
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

                {activeTab === 'Account' && <AccountPanel />}
                {activeTab === 'Preferences' && <PreferencesPanel />}
                {activeTab === 'Privacy' && <PrivacyPanel />}
                {activeTab === 'Notifications' && <NotificationsPanel />}
            </ScrollView>
        </View>
    );
}

function AccountPanel() {
    const router = useRouter();
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        Alert.alert(
            'Sign out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Account settings</Text>
                <LinkRow 
                    onPress={() => router.push('/(buyer)/settings/profile')}
                    label="Profile & preferences"
                    icon="person.circle.fill"
                    subtitle="Update your personal information"
                />
                <LinkRow 
                    onPress={() => router.push('/(buyer)/settings/addresses')}
                    label="Saved addresses"
                    icon="location.fill"
                    subtitle="Manage your delivery addresses"
                />
                <LinkRow 
                    onPress={() => router.push('/(buyer)/subscription')}
                    label="Subscription"
                    icon="creditcard.fill"
                    subtitle="Manage your subscription plan"
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Security</Text>
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Password change feature coming soon')}
                    label="Change password"
                    icon="lock.fill"
                    subtitle="Update your account password"
                />
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Two-factor authentication coming soon')}
                    label="Two-factor authentication"
                    icon="shield.fill"
                    subtitle="Add an extra layer of security"
                />
            </View>

            <Pressable style={styles.dangerButton} onPress={handleSignOut}>
                <IconSymbol name="arrow.right.square.fill" size={20} color={palette.danger} />
                <Text style={styles.dangerLabel}>Sign out</Text>
            </Pressable>
        </View>
    );
}

function PreferencesPanel() {
    const router = useRouter();

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>App preferences</Text>
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Language settings coming soon')}
                    label="Language"
                    icon="globe"
                    subtitle="English (US)"
                />
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Theme settings coming soon')}
                    label="Theme"
                    icon="paintbrush.fill"
                    subtitle="System default"
                />
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Currency settings coming soon')}
                    label="Currency"
                    icon="dollarsign.circle.fill"
                    subtitle="USD ($)"
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Display</Text>
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Display settings coming soon')}
                    label="Text size"
                    icon="textformat.size"
                    subtitle="Default"
                />
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Display settings coming soon')}
                    label="Animations"
                    icon="sparkles"
                    subtitle="Enabled"
                />
            </View>
        </View>
    );
}

function PrivacyPanel() {
    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Privacy settings</Text>
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Privacy policy coming soon')}
                    label="Privacy policy"
                    icon="doc.text.fill"
                    subtitle="Read our privacy policy"
                />
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Terms of service coming soon')}
                    label="Terms of service"
                    icon="doc.text.fill"
                    subtitle="Read our terms of service"
                />
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Data management coming soon')}
                    label="Data management"
                    icon="externaldrive.fill"
                    subtitle="Manage your data"
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Account data</Text>
                <LinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Export data feature coming soon')}
                    label="Export data"
                    icon="square.and.arrow.up.fill"
                    subtitle="Download your account data"
                />
                <Pressable 
                    style={styles.dangerLinkRow}
                    onPress={() => Alert.alert(
                        'Delete account',
                        'Are you sure you want to delete your account? This action cannot be undone.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Coming soon', 'Account deletion coming soon') },
                        ]
                    )}
                >
                    <View style={styles.dangerLinkContent}>
                        <IconSymbol name="trash.fill" size={20} color={palette.danger} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dangerLinkLabel}>Delete account</Text>
                            <Text style={styles.dangerLinkSubtitle}>Permanently delete your account</Text>
                        </View>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={palette.danger} />
                </Pressable>
            </View>
        </View>
    );
}

function NotificationsPanel() {
    const [emailNotifications, setEmailNotifications] = React.useState(true);
    const [pushNotifications, setPushNotifications] = React.useState(true);
    const [smsNotifications, setSmsNotifications] = React.useState(false);
    const [orderUpdates, setOrderUpdates] = React.useState(true);
    const [promotional, setPromotional] = React.useState(false);

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Notification preferences</Text>
                <SwitchRow
                    label="Email notifications"
                    subtitle="Receive updates via email"
                    value={emailNotifications}
                    onValueChange={setEmailNotifications}
                />
                <SwitchRow
                    label="Push notifications"
                    subtitle="Receive push notifications on your device"
                    value={pushNotifications}
                    onValueChange={setPushNotifications}
                />
                <SwitchRow
                    label="SMS notifications"
                    subtitle="Receive updates via text message"
                    value={smsNotifications}
                    onValueChange={setSmsNotifications}
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Notification types</Text>
                <SwitchRow
                    label="Order updates"
                    subtitle="Get notified about your order status"
                    value={orderUpdates}
                    onValueChange={setOrderUpdates}
                />
                <SwitchRow
                    label="Promotional emails"
                    subtitle="Receive special offers and promotions"
                    value={promotional}
                    onValueChange={setPromotional}
                />
            </View>
        </View>
    );
}

function LinkRow({ onPress, label, icon, subtitle }: { onPress: () => void; label: string; icon: IconSymbolName; subtitle?: string }) {
    return (
        <Pressable style={styles.linkRow} onPress={onPress}>
            <View style={styles.linkIconContainer}>
                <IconSymbol name={icon} size={18} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.linkLabel}>{label}</Text>
                {subtitle && <Text style={styles.linkSubtitle}>{subtitle}</Text>}
            </View>
            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
        </Pressable>
    );
}

function SwitchRow({ label, subtitle, value, onValueChange }: { label: string; subtitle: string; value: boolean; onValueChange: (value: boolean) => void }) {
    return (
        <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>{label}</Text>
                <Text style={styles.switchDescription}>{subtitle}</Text>
            </View>
            <Pressable
                onPress={() => onValueChange(!value)}
                style={[styles.switch, value && styles.switchActive]}
            >
                <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
            </Pressable>
        </View>
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
        borderRadius: 24,
        padding: 22,
        gap: 12,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 3,
        alignItems: 'center',
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
        textAlign: 'center',
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
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    linkIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        flex: 1,
        color: palette.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    linkSubtitle: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
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
    },
    dangerLabel: {
        color: palette.danger,
        fontWeight: '800',
        fontSize: 16,
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
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    switchLabelContainer: {
        flex: 1,
        gap: 4,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    switchDescription: {
        fontSize: 12,
        color: palette.textSecondary,
    },
    switch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: palette.neutralSoft,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    switchActive: {
        backgroundColor: BRAND_COLOR,
    },
    switchThumb: {
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
    switchThumbActive: {
        transform: [{ translateX: 20 }],
    },
});


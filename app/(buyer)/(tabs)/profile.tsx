import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import React, { useMemo, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { profile: authProfile, user } = useAuth();
    const { t } = useTranslation();
    
    const scrollRef = useRef<ScrollView>(null);
    useScrollToTop(scrollRef);

    const displayName = useMemo(() => {
        if (authProfile?.first_name) {
            return authProfile.first_name + (authProfile.last_name ? ` ${authProfile.last_name}` : '');
        }
        return user?.email?.split('@')[0] || t('profile.fallback_name');
    }, [authProfile, user, t]);

    const menuItems: { label: string; icon: IconSymbolName; route: any }[] = [
        { label: t('profile.menu.orders'), icon: 'doc.plaintext', route: '/(buyer)/orders/index' },
        { label: t('profile.menu.recipients'), icon: 'person.2.fill', route: '/(buyer)/(tabs)/recipients' },
        { label: t('profile.menu.wishlist'), icon: 'heart.fill', route: '/(buyer)/wishlist/index' },
        { label: t('profile.menu.settings'), icon: 'gearshape.fill', route: '/(buyer)/settings/index' },
    ];

    return (
        <View style={[styles.screen, { paddingTop: top + 72 }]}>
            <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {authProfile?.profile_image_url ? (
                            <Image source={{ uri: authProfile.profile_image_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.initials}>{displayName[0].toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                {/* Quick Links Menu */}
                <View style={styles.menu}>
                    {menuItems.map((item, index) => (
                        <Pressable
                            key={index}
                            style={styles.menuItem}
                            onPress={() => router.push(item.route)}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={styles.iconCircle}>
                                    <IconSymbol name={item.icon} size={20} color={BRAND_COLOR} />
                                </View>
                                <Text style={styles.menuItemLabel}>{item.label}</Text>
                            </View>
                            <IconSymbol name="chevron.right" size={16} color="#94a3b8" />
                        </Pressable>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    avatarContainer: { marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    placeholderAvatar: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 32, fontWeight: '800', color: BRAND_COLOR },
    name: { fontSize: 24, fontWeight: '800', color: '#0f172a', fontFamily: BRAND_FONT, marginBottom: 4 },
    email: { fontSize: 14, color: '#64748b' },
    menu: { marginBottom: 32 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff9f5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    menuItemLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    giftingProfileCard: { padding: 20, borderRadius: 20, backgroundColor: '#f8fafc', borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' },
    giftingProfileTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: BRAND_FONT, marginBottom: 8 },
    giftingProfileDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
    giftingProfileFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editBtn: { fontSize: 14, fontWeight: '700', color: BRAND_COLOR },
});

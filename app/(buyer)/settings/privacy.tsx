import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const palette = {
    background: '#fff',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    neutralSoft: '#ECE7E2',
};

export default function PrivacyScreen() {
    const { top, bottom } = useSafeAreaInsets();

    const handleOpenLink = (url: string) => {
        Linking.openURL(url).catch((err) => {
            console.warn('Could not open link:', err);
        });
    };

    return (
        <View style={[styles.screen, { paddingTop: top + 56 }]}>
            <View style={styles.header}>
                <View style={styles.backButton} />
                <Text style={styles.headerTitle}>Privacy & Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sectionGap}>
                    <View style={styles.groupCard}>
                        <Text style={styles.groupTitle}>Privacy Policy</Text>
                        <Text style={styles.descriptionText}>
                            Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
                        </Text>
                        <Pressable
                            style={styles.linkButton}
                            onPress={() => handleOpenLink('https://www.giftyy.store/privacy')}
                        >
                            <Text style={styles.linkButtonText}>Read full privacy policy</Text>
                            <IconSymbol name="arrow.up.right.square" size={20} color={BRAND_COLOR} />
                        </Pressable>
                    </View>

                    <View style={styles.groupCard}>
                        <Text style={styles.groupTitle}>Terms of Service</Text>
                        <Text style={styles.descriptionText}>
                            Please read our terms of service carefully before using our platform.
                        </Text>
                        <Pressable
                            style={styles.linkButton}
                            onPress={() => handleOpenLink('https://www.giftyy.store/terms')}
                        >
                            <Text style={styles.linkButtonText}>Read terms of service</Text>
                            <IconSymbol name="arrow.up.right.square" size={20} color={BRAND_COLOR} />
                        </Pressable>
                    </View>

                    <View style={styles.groupCard}>
                        <Text style={styles.groupTitle}>Contact Us</Text>
                        <Text style={styles.descriptionText}>
                            Have questions about privacy? Reach out to our privacy team.
                        </Text>
                        <Pressable
                            style={styles.contactButton}
                            onPress={() => Linking.openURL('mailto:privacy@giftyy.com')}
                        >
                            <IconSymbol name="envelope.fill" size={20} color={BRAND_COLOR} />
                            <Text style={styles.contactButtonText}>privacy@giftyy.com</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        padding: 20,
        gap: 16,
    },
    sectionGap: {
        gap: 16,
    },
    groupCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        gap: 12,
    },
    groupTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    descriptionText: {
        fontSize: 14,
        color: palette.textSecondary,
        lineHeight: 20,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
        alignSelf: 'flex-start',
    },
    linkButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: BRAND_COLOR,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
    },
    contactButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: BRAND_COLOR,
    },
});


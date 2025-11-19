import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

export default function AddressesScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();

    // Mock addresses - in a real app, this would come from a context/API
    const [addresses] = useState([
        {
            id: '1',
            label: 'Home',
            name: 'Taylor Johnson',
            street: '238 Market Street',
            apartment: 'Apt 5B',
            city: 'San Francisco',
            state: 'CA',
            zip: '94107',
            country: 'United States',
            isDefault: true,
        },
        {
            id: '2',
            label: 'Work',
            name: 'Taylor Johnson',
            street: '1090 Palm Drive',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90015',
            country: 'United States',
            isDefault: false,
        },
    ]);

    const handleAddAddress = () => {
        Alert.alert('Coming soon', 'Add address feature coming soon');
    };

    const handleEditAddress = (id: string) => {
        Alert.alert('Coming soon', 'Edit address feature coming soon');
    };

    const handleDeleteAddress = (id: string) => {
        Alert.alert(
            'Delete address',
            'Are you sure you want to delete this address?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Coming soon', 'Delete address feature coming soon') },
            ]
        );
    };

    const handleSetDefault = (id: string) => {
        Alert.alert('Coming soon', 'Set default address feature coming soon');
    };

    return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color={palette.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Saved Addresses</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sectionGap}>
                    <Pressable style={styles.addButton} onPress={handleAddAddress}>
                        <IconSymbol name="plus.circle.fill" size={24} color={BRAND_COLOR} />
                        <Text style={styles.addButtonText}>Add new address</Text>
                    </Pressable>

                    {addresses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <IconSymbol name="location.slash.fill" size={48} color={palette.textSecondary} />
                            <Text style={styles.emptyStateTitle}>No addresses saved</Text>
                            <Text style={styles.emptyStateSubtitle}>Add an address to make checkout faster</Text>
                        </View>
                    ) : (
                        addresses.map((address) => (
                            <View key={address.id} style={styles.addressCard}>
                                <View style={styles.addressHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.addressLabelRow}>
                                            <Text style={styles.addressLabel}>{address.label}</Text>
                                            {address.isDefault && (
                                                <View style={styles.defaultBadge}>
                                                    <Text style={styles.defaultBadgeText}>Default</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.addressName}>{address.name}</Text>
                                    </View>
                                    <View style={styles.addressActions}>
                                        <Pressable
                                            style={styles.addressActionButton}
                                            onPress={() => handleEditAddress(address.id)}
                                        >
                                            <IconSymbol name="square.and.pencil" size={20} color={palette.textPrimary} />
                                        </Pressable>
                                        <Pressable
                                            style={[styles.addressActionButton, styles.deleteButton]}
                                            onPress={() => handleDeleteAddress(address.id)}
                                        >
                                            <IconSymbol name="trash" size={20} color={palette.danger} />
                                        </Pressable>
                                    </View>
                                </View>
                                <View style={styles.addressDetails}>
                                    <Text style={styles.addressText}>{address.street}</Text>
                                    {address.apartment && <Text style={styles.addressText}>{address.apartment}</Text>}
                                    <Text style={styles.addressText}>
                                        {address.city}, {address.state} {address.zip}
                                    </Text>
                                    <Text style={styles.addressText}>{address.country}</Text>
                                </View>
                                {!address.isDefault && (
                                    <Pressable
                                        style={styles.setDefaultButton}
                                        onPress={() => handleSetDefault(address.id)}
                                    >
                                        <Text style={styles.setDefaultText}>Set as default</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))
                    )}
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
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 999,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: BRAND_COLOR,
    },
    addressCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        gap: 12,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    addressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    addressLabel: {
        fontSize: 16,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    defaultBadge: {
        backgroundColor: BRAND_COLOR,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    defaultBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    addressName: {
        fontSize: 14,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    addressActions: {
        flexDirection: 'row',
        gap: 8,
    },
    addressActionButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: palette.cardAlt,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    deleteButton: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderColor: 'rgba(239,68,68,0.3)',
    },
    addressDetails: {
        gap: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(230,222,214,0.65)',
    },
    addressText: {
        fontSize: 14,
        color: palette.textSecondary,
        lineHeight: 20,
    },
    setDefaultButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    setDefaultText: {
        fontSize: 13,
        fontWeight: '600',
        color: BRAND_COLOR,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 12,
    },
    emptyStateTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        color: palette.textPrimary,
        fontWeight: '700',
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: palette.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
});


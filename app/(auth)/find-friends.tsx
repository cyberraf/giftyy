import { RelationshipPickerModal } from '@/components/recipients/RelationshipPickerModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useRecipients, type MatchedContact } from '@/contexts/RecipientsContext';
import { GiftyyAlert } from '@/lib/AlertManager';
import { openContactSettings } from '@/lib/utils/contacts';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView as RNScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FindFriendsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { addRecipient, approveConnection, syncedContacts, isSyncingContacts, syncContacts } = useRecipients();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedRelationships, setSelectedRelationships] = useState<Record<string, string>>({});
    const [selectedNicknames, setSelectedNicknames] = useState<Record<string, string>>({});
    const [isFinishing, setIsFinishing] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
    const [contactForRelationship, setContactForRelationship] = useState<MatchedContact | null>(null);

    const matchedGiftyyContacts = useMemo(() => {
        return syncedContacts.filter(c => c.isGiftyyUser);
    }, [syncedContacts]);

    useEffect(() => {
        syncContacts();
    }, [syncContacts]);

    const handleRetry = async () => {
        setPermissionDenied(false);
        try {
            await syncContacts(true);
        } catch (error) {
            console.error('[FindFriends] Error retrying sync:', error);
            setPermissionDenied(true);
        }
    };

    const toggleSelect = (contact: MatchedContact) => {
        const contactId = contact.id;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(contactId)) {
                next.delete(contactId);
                // Also remove relationship
                const nextRels = { ...selectedRelationships };
                delete nextRels[contactId];
                setSelectedRelationships(nextRels);
                return next;
            } else {
                // Show relationship picker before selecting
                setContactForRelationship(contact);
                setRelationshipModalVisible(true);
                return prev; // Don't add yet
            }
        });
    };

    const handleRelationshipSelect = (relationship: string, nickname?: string) => {
        if (!contactForRelationship) return;
        const contactId = contactForRelationship.id;

        setSelectedIds(prev => {
            const next = new Set(prev);
            next.add(contactId);
            return next;
        });

        setSelectedRelationships(prev => ({
            ...prev,
            [contactId]: relationship
        }));

        if (nickname) {
            setSelectedNicknames(prev => ({
                ...prev,
                [contactId]: nickname
            }));
        }

        setRelationshipModalVisible(false);
        setContactForRelationship(null);
    };

    const handleFinish = async () => {
        if (selectedIds.size === 0) {
            router.replace('/(buyer)/(tabs)');
            return;
        }

        setIsFinishing(true);
        try {
            // Send connection requests for all selected contacts
            const selectedContacts = matchedGiftyyContacts.filter(c => selectedIds.has(c.id));

            // We'll send them in parallel for speed, though a dedicated batch API would be better
            const results = await Promise.all(selectedContacts.map(contact => {
                const relationship = selectedRelationships[contact.id] || 'Friend';
                const nickname = selectedNicknames[contact.id];

                if (contact.isIncomingInvitation && contact.connectionId) {
                    return approveConnection(contact.connectionId, {
                        relationship,
                        nickname
                    });
                }
                return addRecipient({
                    fullName: contact.name,
                    phone: contact.phone,
                    relationship,
                    nickname,
                    profileId: contact.userId,
                });
            }));

            const errors = results.filter((r: any) => r.error);
            if (errors.length > 0) {
                GiftyyAlert('Some requests failed', `${errors.length} requests could not be sent. Continuing to home...`);
            }

            router.replace('/(buyer)/(tabs)');
        } catch (error) {
            console.error('[handleFinish] Error:', error);
            router.replace('/(buyer)/(tabs)');
        } finally {
            setIsFinishing(false);
        }
    };

    if (isSyncingContacts && matchedGiftyyContacts.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={BRAND_COLOR} />
                <Text style={styles.loadingText}>Finding your friends on Giftyy...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Find Friends</Text>
                <Text style={styles.subtitle}>
                    These contacts from your phone are already using <Text style={{ color: BRAND_COLOR, fontWeight: '700' }}>Giftyy</Text>! Connect with them to start gifting.
                </Text>
            </View>

            <RNScrollView contentContainerStyle={styles.scrollContent}>
                {permissionDenied ? (
                    <View style={styles.emptyState}>
                        <IconSymbol name="lock.fill" size={48} color={GIFTYY_THEME.colors.gray300} />
                        <Text style={styles.emptyTitle}>Contacts Access Required</Text>
                        <Text style={styles.emptySubtitle}>
                            Please enable contacts permission in your device settings to find friends.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Pressable style={styles.retryButton} onPress={handleRetry}>
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </Pressable>
                            <Pressable style={[styles.retryButton, { backgroundColor: '#F3F4F6' }]} onPress={openContactSettings}>
                                <Text style={[styles.retryButtonText, { color: BRAND_COLOR }]}>Open Settings</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : matchedGiftyyContacts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <IconSymbol name="person.2.fill" size={48} color={GIFTYY_THEME.colors.gray300} />
                        <Text style={styles.emptyTitle}>No Friends Found Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            None of your contacts are on Giftyy yet. You can still invite them later!
                        </Text>
                    </View>
                ) : (
                    matchedGiftyyContacts.map(contact => (
                        <View key={contact.id} style={styles.contactRow}>
                            <View style={[styles.avatar, { backgroundColor: BRAND_COLOR }]}>
                                {contact.avatarUrl ? (
                                    <Image source={{ uri: contact.avatarUrl }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarText}>{contact.name[0]}</Text>
                                )}
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{contact.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                                    {selectedRelationships[contact.id] && (
                                        <View style={styles.relBadge}>
                                            <Text style={styles.relBadgeText}>{selectedRelationships[contact.id]}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <Pressable
                                style={[
                                    styles.connectBtn,
                                    selectedIds.has(contact.id) && styles.connectBtnSelected
                                ]}
                                onPress={() => toggleSelect(contact)}
                            >
                                <Text style={[
                                    styles.connectBtnText,
                                    selectedIds.has(contact.id) && styles.connectBtnTextSelected
                                ]}>
                                    {selectedIds.has(contact.id) ? 'Selected' :
                                        contact.isIncomingInvitation ? 'Accept' : 'Connect'}
                                </Text>
                            </Pressable>
                        </View>
                    ))
                )}
            </RNScrollView>

            {/* Relationship Selection Modal */}
            <RelationshipPickerModal
                visible={relationshipModalVisible}
                onClose={() => setRelationshipModalVisible(false)}
                onSelect={handleRelationshipSelect}
                title={`How do you know ${contactForRelationship?.name?.split(' ')[0]}?`}
                selectedRelationship={selectedRelationships[contactForRelationship?.id || '']}
            />

            <View style={styles.footer}>
                <Pressable
                    style={[styles.finishButton, isFinishing && styles.buttonDisabled]}
                    onPress={handleFinish}
                    disabled={isFinishing}
                >
                    {isFinishing ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.finishButtonText}>
                            {selectedIds.size > 0 ? `Connect with ${selectedIds.size} friends` : 'Skip for now'}
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GIFTYY_THEME.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: GIFTYY_THEME.colors.gray600,
        fontWeight: '600',
    },
    header: {
        padding: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1F2937',
        fontFamily: BRAND_FONT,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 22,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    contactPhone: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    connectBtn: {
        backgroundColor: BRAND_COLOR,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    connectBtnSelected: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: BRAND_COLOR,
    },
    connectBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    connectBtnTextSelected: {
        color: BRAND_COLOR,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    finishButton: {
        backgroundColor: '#111827',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    finishButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        textAlign: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    retryButton: {
        marginTop: 24,
        backgroundColor: BRAND_COLOR,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#FFF',
        fontWeight: '700',
    },
    relBadge: {
        backgroundColor: 'rgba(247, 85, 7, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    relBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: BRAND_COLOR,
        textTransform: 'uppercase',
    },
    // Relationship Modal Styles (Now handled by RelationshipPickerModal)
});

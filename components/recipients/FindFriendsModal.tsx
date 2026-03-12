import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_FONT } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients, type MatchedContact } from '@/contexts/RecipientsContext';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RelationshipPickerModal } from './RelationshipPickerModal';

export type { MatchedContact };

interface FindFriendsModalProps {
    visible: boolean;
    onClose: () => void;
    onConnect: (contact: MatchedContact, relationship: string, nickname?: string) => void;
    onInvite: (contact: MatchedContact, relationship: string) => void;
}

export function FindFriendsModal({ visible, onClose, onConnect, onInvite }: FindFriendsModalProps) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { recipients, syncedContacts, isSyncingContacts, syncContacts } = useRecipients();
    const [selectedContact, setSelectedContact] = useState<MatchedContact | null>(null);
    const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');


    useEffect(() => {
        if (visible) {
            syncContacts();
        }
    }, [visible, syncContacts]);

    const filteredContacts = useMemo(() => {
        let contacts = syncedContacts;

        // Exclude the user's own contact card completely from the list
        if (user) {
            contacts = contacts.filter(c => c.userId !== user.id);
        }

        if (!searchQuery) return contacts;

        const query = searchQuery.toLowerCase();
        return contacts.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.phone?.toLowerCase().includes(query)
        );
    }, [syncedContacts, searchQuery, user]);

    const handleActionPress = (item: MatchedContact) => {
        if (item.connectionStatus === 'approved') return;
        if (item.connectionStatus === 'pending' && !item.isIncomingInvitation) return;

        if (item.isGiftyyUser) {
            setSelectedContact(item);
            setRelationshipModalVisible(true);
        } else {
            onInvite(item, ''); // Skip relationship for invites
        }
    };

    const handleRelationshipSelect = (relationship: string, nickname?: string) => {
        if (!selectedContact) return;
        if (selectedContact.isGiftyyUser) {
            onConnect(selectedContact, relationship, nickname);
        } else {
            onInvite(selectedContact, relationship);
        }
        setRelationshipModalVisible(false);
        setSelectedContact(null);
    };

    const renderContactItem = ({ item }: { item: MatchedContact }) => {
        const initials = item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return (
            <View style={styles.contactRow}>
                <View style={[
                    styles.avatarContainer,
                    { backgroundColor: item.isGiftyyUser ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray100 }
                ]}>
                    {item.avatarUrl || item.imageUri ? (
                        <Image source={{ uri: item.avatarUrl || item.imageUri }} style={styles.avatarImage} />
                    ) : (
                        <Text style={[
                            styles.avatarInitials,
                            { color: item.isGiftyyUser ? '#FFF' : GIFTYY_THEME.colors.gray500 }
                        ]}>
                            {initials}
                        </Text>
                    )}
                    {item.isGiftyyUser && (
                        <View style={styles.giftyyBadge}>
                            <IconSymbol name="checkmark.seal.fill" size={10} color="#FFF" />
                        </View>
                    )}
                </View>

                <View style={styles.contactInfo}>
                    <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                    {item.phone && <Text style={styles.contactPhone}>{item.phone}</Text>}
                </View>

                <Pressable
                    style={[
                        styles.actionButton,
                        item.isGiftyyUser ? styles.connectButton : styles.inviteButton,
                        (item.connectionStatus === 'approved' || item.connectionStatus === 'pending') && styles.disabledButton
                    ]}
                    onPress={() => handleActionPress(item)}
                >
                    <Text style={[
                        styles.actionButtonText,
                        { color: item.isGiftyyUser ? '#FFF' : GIFTYY_THEME.colors.primary },
                        (item.connectionStatus === 'approved' || (item.connectionStatus === 'pending' && !item.isIncomingInvitation)) && styles.disabledButtonText
                    ]}>
                        {item.connectionStatus === 'approved' ? 'Connected' :
                            item.isIncomingInvitation ? 'Accept' :
                                item.connectionStatus === 'pending' ? 'Pending' :
                                    item.isGiftyyUser ? 'Connect' : 'Invite'}
                    </Text>
                </Pressable>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Find Friends</Text>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <IconSymbol name="xmark.circle.fill" size={28} color={GIFTYY_THEME.colors.gray300} />
                    </Pressable>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <IconSymbol name="magnifyingglass" size={18} color={GIFTYY_THEME.colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or number"
                            placeholderTextColor={GIFTYY_THEME.colors.gray400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <IconSymbol name="xmark.circle.fill" size={16} color={GIFTYY_THEME.colors.gray300} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Contact List */}
                {isSyncingContacts && syncedContacts.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
                        <Text style={styles.loadingText}>Syncing your contacts...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredContacts}
                        keyExtractor={item => item.id}
                        renderItem={renderContactItem}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <IconSymbol name="person.crop.circle.badge.exclamationmark" size={48} color={GIFTYY_THEME.colors.gray200} />
                                <Text style={styles.emptyText}>
                                    {searchQuery ? 'No contacts match your search' : 'No contacts found'}
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Relationship Selection Modal */}
                <RelationshipPickerModal
                    visible={relationshipModalVisible}
                    onClose={() => setRelationshipModalVisible(false)}
                    onSelect={handleRelationshipSelect}
                    title={`How do you know ${selectedContact?.name?.split(' ')[0]}?`}
                    targetName={selectedContact?.name}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(16),
    },
    title: {
        fontSize: responsiveFontSize(24),
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        paddingHorizontal: scale(20),
        marginBottom: verticalScale(12),
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: scale(12),
        paddingHorizontal: scale(12),
        height: verticalScale(48),
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
    },
    searchInput: {
        flex: 1,
        marginLeft: scale(8),
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray900,
        height: '100%',
    },
    listContent: {
        paddingHorizontal: scale(20),
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(12),
    },
    avatarContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: scale(24),
    },
    avatarInitials: {
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
    },
    giftyyBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: GIFTYY_THEME.colors.primary,
        width: scale(18),
        height: scale(18),
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    contactInfo: {
        flex: 1,
        marginLeft: scale(14),
    },
    contactName: {
        fontSize: responsiveFontSize(16),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
    },
    contactPhone: {
        fontSize: responsiveFontSize(13),
        color: GIFTYY_THEME.colors.gray500,
        marginTop: 2,
    },
    actionButton: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: scale(20),
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: scale(80),
    },
    connectButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    inviteButton: {
        backgroundColor: 'rgba(247, 85, 7, 0.08)',
    },
    disabledButton: {
        backgroundColor: GIFTYY_THEME.colors.gray100,
        opacity: 0.8,
    },
    disabledButtonText: {
        color: GIFTYY_THEME.colors.gray500,
    },
    actionButtonText: {
        fontSize: responsiveFontSize(13),
        fontWeight: '800',
    },
    separator: {
        height: 1,
        backgroundColor: GIFTYY_THEME.colors.gray50,
        marginLeft: scale(62),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: verticalScale(100),
    },
    loadingText: {
        marginTop: verticalScale(16),
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray600,
        fontWeight: '600',
    },
    emptyState: {
        marginTop: verticalScale(60),
        alignItems: 'center',
    },
    emptyText: {
        marginTop: verticalScale(16),
        fontSize: responsiveFontSize(15),
        color: GIFTYY_THEME.colors.gray400,
        textAlign: 'center',
    },
    // Relationship Selection Modal Styles (Now handled by RelationshipPickerModal)
});

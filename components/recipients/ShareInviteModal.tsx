import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import * as LinkingExpo from 'expo-linking';
import React from 'react';
import { Alert, Linking, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

type ShareInviteModalProps = {
    visible: boolean;
    onClose: () => void;
    recipientName: string;
    recipientPhone?: string;
    profileId: string;
};

export function ShareInviteModal({
    visible,
    onClose,
    recipientName,
    recipientPhone,
    profileId,
}: ShareInviteModalProps) {
    const { user } = useAuth();
    const deepLink = LinkingExpo.createURL('invite', {
        queryParams: { referrerId: user?.id },
    });

    // For non-app users, we'd ideally point to a landing page that then deep links
    // For now, we'll use a direct store link or the deep link if they have the app
    const inviteLink = deepLink;

    const inviteMessage = `Hey there! 👋\n\nI want to make sure every gift and celebration between us is truly special 🎁\n\nJoin my private gifting network on Giftyy — tell me what you love and what you're into so I can nail it every time! ✨\n\nDownload the app here:\n${inviteLink}`;

    const handleWhatsApp = async () => {
        onClose();
        const url = `whatsapp://send?text=${encodeURIComponent(inviteMessage)}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert('WhatsApp Not Available', 'WhatsApp is not installed on this device.');
            }
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            Alert.alert('Error', 'Could not open WhatsApp.');
        }
    };

    const handleSMS = async () => {
        onClose();
        const smsUrl = recipientPhone
            ? `sms:${recipientPhone}?body=${encodeURIComponent(inviteMessage)}`
            : `sms:?body=${encodeURIComponent(inviteMessage)}`;
        try {
            const canOpen = await Linking.canOpenURL(smsUrl);
            if (canOpen) {
                await Linking.openURL(smsUrl);
            } else {
                Alert.alert('SMS Not Available', 'Could not open messaging app.');
            }
        } catch (error) {
            console.error('Error opening SMS:', error);
            Alert.alert('Error', 'Could not open messaging app.');
        }
    };

    const handleOther = async () => {
        onClose();
        try {
            await Share.share({ message: inviteMessage });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.shareModal} onStartShouldSetResponder={() => true}>
                    <Text style={styles.shareModalTitle}>Share Invitation</Text>
                    <Text style={styles.shareModalSubtitle}>How would you like to invite {recipientName}?</Text>

                    <View style={styles.shareOptions}>
                        <Pressable style={styles.shareOption} onPress={handleWhatsApp}>
                            <View style={[styles.shareIconContainer, { backgroundColor: '#E8F5E9' }]}>
                                <Image
                                    source={{ uri: 'https://img.icons8.com/?size=100&id=16713&format=png&color=000000' }}
                                    style={{ width: 40, height: 40 }}
                                />
                            </View>
                            <Text style={styles.shareOptionText}>WhatsApp</Text>
                        </Pressable>

                        <Pressable style={styles.shareOption} onPress={handleSMS}>
                            <View style={[styles.shareIconContainer, { backgroundColor: '#E3F2FD' }]}>
                                <Image
                                    source={{ uri: 'https://img.icons8.com/?size=100&id=82LIR8hxp9pI&format=png&color=000000' }}
                                    style={{ width: 40, height: 40 }}
                                />
                            </View>
                            <Text style={styles.shareOptionText}>SMS</Text>
                        </Pressable>

                        <Pressable style={styles.shareOption} onPress={handleOther}>
                            <View style={[styles.shareIconContainer, { backgroundColor: '#FFF3E0' }]}>
                                <Image
                                    source={{ uri: 'https://img.icons8.com/?size=100&id=98959&format=png&color=000000' }}
                                    style={{ width: 40, height: 40 }}
                                />
                            </View>
                            <Text style={styles.shareOptionText}>Other</Text>
                        </Pressable>
                    </View>

                    <Pressable style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    shareModal: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    shareModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2F2318',
        textAlign: 'center',
        marginBottom: 8,
    },
    shareModalSubtitle: {
        fontSize: 15,
        color: 'rgba(47,35,24,0.7)',
        textAlign: 'center',
        marginBottom: 32,
    },
    shareOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    shareOption: {
        alignItems: 'center',
        gap: 12,
    },
    shareIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F5F3F0',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    shareOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2F2318',
    },
    cancelButton: {
        backgroundColor: '#F5F3F0',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2F2318',
    },
});

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { GiftyyAlert } from '@/lib/AlertManager';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { RelationshipPickerModal } from './RelationshipPickerModal';

export function InvitationPrompt() {
    const { referrerProfile, user } = useAuth();
    const { addRecipient } = useRecipients();
    const [isVisible, setIsVisible] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);

    if (!referrerProfile || !user || !isVisible) return null;

    const handleAccept = () => {
        setRelationshipModalVisible(true);
    };

    const handleDecline = async () => {
        setIsVisible(false);
        try {
            await AsyncStorage.removeItem('giftyy_referrer_id');
        } catch (err) {
            console.error('[InvitationPrompt] Error clearing referrer:', err);
        }
    };

    const handleRelationshipSelect = async (relationship: string, nickname?: string) => {
        setRelationshipModalVisible(false);
        setIsConnecting(true);

        try {
            const { error } = await addRecipient({
                fullName: [referrerProfile.first_name, referrerProfile.last_name].filter(Boolean).join(' '),
                phone: referrerProfile.phone ?? undefined,
                relationship,
                nickname,
                profileId: referrerProfile.id,
            });

            if (error) {
                GiftyyAlert('Connection Error', error.message);
            } else {
                GiftyyAlert('Connected!', `You are now connected with ${referrerProfile.first_name}.`);
                await AsyncStorage.removeItem('giftyy_referrer_id');
                setIsVisible(false);
            }
        } catch (err) {
            console.error('[InvitationPrompt] Connection failed:', err);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <>
            <Modal
                visible={isVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.overlay}>
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <IconSymbol name="person.2.fill" size={32} color={GIFTYY_THEME.colors.primary} />
                        </View>

                        <Text style={styles.title}>Friend Request</Text>
                        <Text style={styles.message}>
                            <Text style={styles.bold}>{referrerProfile.first_name}</Text> invited you to Giftyy!
                            Would you like to connect and see their gift wishlist?
                        </Text>

                        <View style={styles.footer}>
                            <Pressable
                                style={[styles.button, styles.declineButton]}
                                onPress={handleDecline}
                                disabled={isConnecting}
                            >
                                <Text style={styles.declineText}>Not Now</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.button, styles.acceptButton]}
                                onPress={handleAccept}
                                disabled={isConnecting}
                            >
                                {isConnecting ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.acceptText}>Connect</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <RelationshipPickerModal
                visible={relationshipModalVisible}
                onClose={() => setRelationshipModalVisible(false)}
                onSelect={handleRelationshipSelect}
                title={`How do you know ${referrerProfile.first_name}?`}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: scale(30),
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: scale(32),
        padding: scale(24),
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        backgroundColor: 'rgba(247, 85, 7, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    title: {
        fontSize: responsiveFontSize(22),
        fontWeight: '900',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: verticalScale(12),
    },
    message: {
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray600,
        textAlign: 'center',
        lineHeight: responsiveFontSize(22),
        marginBottom: verticalScale(24),
    },
    bold: {
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
    },
    footer: {
        flexDirection: 'row',
        gap: scale(12),
        width: '100%',
    },
    button: {
        flex: 1,
        height: verticalScale(50),
        borderRadius: scale(16),
        justifyContent: 'center',
        alignItems: 'center',
    },
    declineButton: {
        backgroundColor: GIFTYY_THEME.colors.gray100,
    },
    acceptButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    declineText: {
        fontSize: responsiveFontSize(15),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray500,
    },
    acceptText: {
        fontSize: responsiveFontSize(15),
        fontWeight: '700',
        color: '#FFF',
    },
});

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_FONT } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface GlassDialogProps {
    visible: boolean;
    title: string;
    description: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    singleButton?: boolean;
}

export function GlassDialog({
    visible,
    title,
    description,
    onClose,
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel',
    singleButton = false,
}: GlassDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop with blur effect simulation using semi-transparent dark overlay */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View style={styles.dialogContainer}>
                    {/* Glass Gradient Background */}
                    <LinearGradient
                        colors={[
                            'rgba(255, 255, 255, 0.95)',
                            'rgba(255, 255, 255, 0.90)',
                            'rgba(255, 248, 240, 0.85)', // Slight cream tint match theme
                        ]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.description}>{description}</Text>

                        <View style={styles.buttonRow}>
                            {!singleButton && (
                                <Pressable
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                                </Pressable>
                            )}

                            <Pressable
                                style={[styles.button, styles.confirmButton]}
                                onPress={onConfirm || onClose}
                            >
                                <LinearGradient
                                    colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dimmed backdrop
        padding: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        ...GIFTYY_THEME.shadows.lg,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 12,
        fontFamily: BRAND_FONT,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: GIFTYY_THEME.colors.gray600,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cancelButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    confirmButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        ...GIFTYY_THEME.shadows.sm,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray700,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

import { BRAND_COLOR } from '@/constants/theme';
import React, { ReactNode } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConversationalStepProps = {
    question: string;
    emoji?: string;
    avatarSource?: ImageSourcePropType;
    description?: string;
    required?: boolean;
    children: ReactNode;

    // Injected by wizard
    formData?: any;
    updateFormData?: (data: any) => void;
    onNext?: (data?: any) => void;
    onBack?: () => void;
    onSkip?: () => void;
    onSaveAndExit?: (data?: any) => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
    nextLabel?: string;
    hideFooter?: boolean;
    loading?: boolean;
};

/**
 * Conversational Step Component
 * Displays a single question in chat-like format
 */
export function ConversationalStep({
    question,
    emoji,
    avatarSource,
    description,
    required = false,
    children,
    onNext,
    onBack,
    onSkip,
    isFirstStep,
    isLastStep,
    nextLabel,
    hideFooter = false,
    loading = false,
    onSaveAndExit,
}: ConversationalStepProps) {
    const handleContinue = () => {
        if (onNext) {
            onNext();
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    hideFooter && { paddingBottom: 150 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Question Bubble */}
                <View style={styles.questionBubble}>
                    {avatarSource ? (
                        <Image source={avatarSource} style={styles.avatar} resizeMode="contain" />
                    ) : emoji ? (
                        <Text style={styles.emoji}>{emoji}</Text>
                    ) : null}
                    <Text style={styles.question}>{question}</Text>
                    {description && (
                        <Text style={styles.description}>{description}</Text>
                    )}
                </View>

                {/* Answer Area */}
                <View style={styles.answerArea}>
                    {children}
                </View>
            </ScrollView>

            {/* Navigation */}
            {!hideFooter && (
                <View style={styles.navigation}>
                    <View style={styles.navRow}>
                        <View style={styles.leftNavGroup}>
                            {!isFirstStep && onBack && (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onBack}
                                >
                                    <Text style={styles.backButtonText}>Back</Text>
                                </TouchableOpacity>
                            )}
                            {onSaveAndExit && (
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={onSaveAndExit}
                                >
                                    <Text style={styles.saveButtonText}>Save & Exit</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.spacer} />

                        <View style={styles.rightNavGroup}>
                            {!required && onSkip && (
                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={onSkip}
                                >
                                    <Text style={styles.skipButtonText}>Skip</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.continueButton, loading && styles.disabledButton]}
                                onPress={handleContinue}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.continueButtonText}>
                                        {nextLabel || (isLastStep ? 'Finish' : 'Continue')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 32,
        paddingBottom: 200,
    },
    questionBubble: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    emoji: {
        fontSize: 36,
        marginBottom: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        marginBottom: 12,
        borderRadius: 18,
    },
    question: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1F2937',
        lineHeight: 34,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    optional: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 12,
        fontWeight: '600',
    },
    description: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginTop: 4,
    },
    answerArea: {
        flex: 1,
    },
    navigation: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 80 : 64, // Increased to sit above tab bar
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    leftNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rightNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    spacer: {
        flexGrow: 1,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#374151',
    },
    backButtonText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    saveButton: {
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    saveButtonText: {
        fontSize: 14,
        color: BRAND_COLOR,
        fontWeight: '700',
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    skipButtonText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    continueButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 30,
        minWidth: 120,
        alignItems: 'center',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    disabledButton: {
        opacity: 0.7,
    },
});

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { ReactNode, useRef } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const { bottom } = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);

    const handleContinue = () => {
        if (onNext) onNext();
    };

    const navBottomPadding = Math.max(bottom, Platform.OS === 'ios' ? 24 : 16) + 8;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 30}
        >
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    hideFooter && { paddingBottom: 40 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            >
                {/* Compact question header */}
                <View style={styles.questionHeader}>
                    <View style={styles.questionRow}>
                        {avatarSource ? (
                            <Image source={avatarSource} style={styles.avatar} resizeMode="contain" />
                        ) : emoji ? (
                            <Text style={styles.emoji}>{emoji}</Text>
                        ) : null}
                        <View style={styles.questionTextWrap}>
                            <Text style={styles.question}>{question}</Text>
                            {description && (
                                <Text style={styles.description}>{description}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Form fields */}
                <View style={styles.answerArea}>
                    {children}
                </View>
            </ScrollView>

            {/* Navigation */}
            {!hideFooter && (
                <View style={[styles.navigation, { paddingBottom: navBottomPadding }]}>
                    <View style={styles.navRow}>
                        {!isFirstStep && onBack ? (
                            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        ) : <View style={{ width: 4 }} />}

                        <View style={styles.centerGroup}>
                            {onSaveAndExit && (
                                <TouchableOpacity style={styles.saveButton} onPress={onSaveAndExit}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            )}
                            {!required && onSkip && (
                                <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                                    <Text style={styles.skipButtonText}>Skip</Text>
                                </TouchableOpacity>
                            )}
                        </View>

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
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 20,
        paddingBottom: 120,
    },
    questionHeader: {
        marginBottom: 20,
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginTop: 2,
    },
    emoji: {
        fontSize: 28,
        marginTop: 2,
    },
    questionTextWrap: {
        flex: 1,
    },
    question: {
        fontSize: 20,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
        lineHeight: 26,
        letterSpacing: -0.3,
    },
    description: {
        fontSize: 14,
        color: GIFTYY_THEME.colors.gray500,
        lineHeight: 20,
        marginTop: 4,
    },
    answerArea: {
        flex: 1,
    },
    navigation: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
    },
    centerGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        flexShrink: 1,
        gap: 2,
    },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: GIFTYY_THEME.colors.gray800,
        flexShrink: 0,
    },
    backButtonText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    saveButton: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        flexShrink: 1,
    },
    saveButtonText: {
        fontSize: 13,
        color: GIFTYY_THEME.colors.primary,
        fontWeight: '700',
    },
    skipButton: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        flexShrink: 1,
    },
    skipButtonText: {
        fontSize: 13,
        color: GIFTYY_THEME.colors.gray400,
        fontWeight: '500',
    },
    continueButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        alignItems: 'center',
        flexShrink: 0,
        shadowColor: GIFTYY_THEME.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    continueButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    disabledButton: {
        opacity: 0.7,
    },
});

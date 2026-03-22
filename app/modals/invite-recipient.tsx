import { safeGoBack } from '@/lib/utils/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { normalizePhoneInput } from '@/lib/utils/phone';
import { shortToken } from '@/lib/utils/random';

const BRAND_COLOR = '#f75507';

const inviteSchema = z.object({
    recipientId: z.string().min(1, 'Please select a recipient'),
    phone: z
        .string()
        .min(1, 'Phone number is required')
        .refine((val) => val.startsWith('+'), 'Phone number must start with +')
        .refine(
            (val) => {
                const digits = val.replace(/\D/g, '');
                return digits.length >= 8 && digits.length <= 20;
            },
            'Phone number must be between 8 and 20 digits'
        ),
    note: z.string().max(120, 'Note must be 120 characters or less').optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export default function InviteRecipientModal() {
    const router = useRouter();
    const { recipientId: initialRecipientId } = useLocalSearchParams<{ recipientId?: string }>();
    const { bottom } = useSafeAreaInsets();
    const { profile } = useAuth();
    const { recipients, loading: recipientsLoading } = useRecipients();

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [generatedToken, setGeneratedToken] = useState('');

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            recipientId: initialRecipientId || '',
            phone: '',
            note: '',
        },
        mode: 'onChange',
    });

    const selectedRecipientId = watch('recipientId');

    useEffect(() => {
        if (initialRecipientId) {
            const recipient = recipients.find((r) => r.id === initialRecipientId);
            if (recipient?.phone) {
                setValue('phone', normalizePhoneInput(recipient.phone));
            }
        }
    }, [initialRecipientId, recipients, setValue]);

    const onSendInvite = (data: InviteFormData) => {
        setGeneratedToken(shortToken());
        setIsSubmitted(true);
    };

    const selectedRecipient = useMemo(
        () => recipients.find((r) => r.id === selectedRecipientId),
        [recipients, selectedRecipientId]
    );

    if (recipientsLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={BRAND_COLOR} />
            </View>
        );
    }

    if (isSubmitted) {
        const inviteLink = `https://giftyy.store/i/${generatedToken}`;
        const senderName = profile?.first_name || 'Someone';

        return (
            <View style={styles.container}>
                <View style={styles.successContent}>
                    <View style={styles.successIcon}>
                        <IconSymbol name="checkmark.circle.fill" size={64} color={GIFTYY_THEME.colors.success} />
                    </View>
                    <Text style={styles.successTitle}>Invite prepared</Text>
                    <Text style={styles.successBody}>
                        SMS sending will be enabled once messaging is connected.
                    </Text>

                    <View style={styles.previewBox}>
                        <Text style={styles.previewLabel}>Message preview</Text>
                        <View style={styles.bubble}>
                            <Text style={styles.bubbleText}>
                                {senderName} invited you to share gift preferences on Giftyy. Complete here: {inviteLink}. Reply STOP to opt out. Msg&data rates may apply.
                            </Text>
                        </View>
                    </View>

                    <Pressable style={styles.doneButton} onPress={() => router.back()}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Invite by SMS</Text>
                <Text style={styles.subtitle}>
                    Ask them to share gift preferences and upcoming occasions.
                </Text>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 20 }]}>
                {/* Recipient Selection */}
                {!initialRecipientId && (
                    <View style={styles.fieldSection}>
                        <Text style={styles.label}>Recipient</Text>
                        <View style={styles.recipientPicker}>
                            {recipients.map((r) => (
                                <Pressable
                                    key={r.id}
                                    style={[
                                        styles.recipientCard,
                                        selectedRecipientId === r.id && styles.recipientCardSelected,
                                    ]}
                                    onPress={() => {
                                        setValue('recipientId', r.id);
                                        if (r.phone) setValue('phone', normalizePhoneInput(r.phone));
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.recipientName,
                                            selectedRecipientId === r.id && styles.recipientNameSelected,
                                        ]}
                                    >
                                        {r.firstName} {r.lastName}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.recipientId && <Text style={styles.errorText}>{errors.recipientId.message}</Text>}
                    </View>
                )}

                {initialRecipientId && selectedRecipient && (
                    <View style={styles.fieldSection}>
                        <Text style={styles.label}>Recipient</Text>
                        <View style={[styles.recipientCard, styles.recipientCardDisabled]}>
                            <Text style={styles.recipientName}>
                                {selectedRecipient.firstName} {selectedRecipient.lastName}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Phone Number */}
                <View style={styles.fieldSection}>
                    <Text style={styles.label}>Phone number</Text>
                    <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, value, onBlur } }) => (
                            <TextInput
                                style={[styles.input, errors.phone && styles.inputError]}
                                placeholder="+1 555 123 4567"
                                placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                keyboardType="phone-pad"
                                value={value}
                                onBlur={onBlur}
                                onChangeText={(text) => onChange(normalizePhoneInput(text))}
                            />
                        )}
                    />
                    <Text style={styles.helperText}>Enter their number manually.</Text>
                    {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
                </View>

                {/* Optional Note */}
                <View style={styles.fieldSection}>
                    <Text style={styles.label}>Optional note</Text>
                    <Controller
                        control={control}
                        name="note"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Quick message (optional)"
                                placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                multiline
                                maxLength={120}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    <Text style={styles.charCount}>{watch('note')?.length || 0}/120</Text>
                    {errors.note && <Text style={styles.errorText}>{errors.note.message}</Text>}
                </View>

                {/* Consent Block */}
                <View style={styles.consentCard}>
                    <Text style={styles.consentTitle}>Consent & reminders</Text>
                    <View style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>You confirm you have permission to text this person.</Text>
                    </View>
                    <View style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>They’ll receive 1 invite text from Giftyy.</Text>
                    </View>
                    <View style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>
                            If they don’t respond, we may send up to 2 automatic reminders (every 48 hours).
                        </Text>
                    </View>
                    <View style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>They can opt out anytime by replying STOP.</Text>
                    </View>
                    <Text style={styles.ratesText}>Message and data rates may apply.</Text>
                </View>

                {/* Footer Links */}
                <View style={styles.legalLinks}>
                    <Link href="/(buyer)/settings/privacy" asChild>
                        <Pressable>
                            <Text style={styles.legalLink}>Terms of Service</Text>
                        </Pressable>
                    </Link>
                    <View style={styles.legalDot} />
                    <Link href="/(buyer)/settings/privacy" asChild>
                        <Pressable>
                            <Text style={styles.legalLink}>Privacy Policy</Text>
                        </Pressable>
                    </Link>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Pressable
                        style={[styles.primaryButton, !isValid && styles.primaryButtonDisabled]}
                        onPress={handleSubmit(onSendInvite)}
                        disabled={!isValid}
                        accessibilityRole="button"
                        accessibilityLabel="Send invite"
                    >
                        <Text style={styles.primaryButtonText}>Send invite to Giftyy</Text>
                    </Pressable>
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                    >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GIFTYY_THEME.colors.white,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: GIFTYY_THEME.colors.gray100,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: GIFTYY_THEME.colors.gray500,
        lineHeight: 22,
    },
    scrollContent: {
        padding: 24,
    },
    fieldSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray700,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: GIFTYY_THEME.colors.gray900,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
    },
    inputError: {
        borderColor: GIFTYY_THEME.colors.error,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 12,
        color: GIFTYY_THEME.colors.gray500,
        marginTop: 4,
    },
    errorText: {
        fontSize: 12,
        color: GIFTYY_THEME.colors.error,
        marginTop: 4,
    },
    charCount: {
        fontSize: 12,
        color: GIFTYY_THEME.colors.gray400,
        textAlign: 'right',
        marginTop: 4,
    },
    recipientPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    recipientCard: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
    },
    recipientCardSelected: {
        backgroundColor: BRAND_COLOR + '10',
        borderColor: BRAND_COLOR,
    },
    recipientCardDisabled: {
        backgroundColor: GIFTYY_THEME.colors.gray100,
        opacity: 0.8,
    },
    recipientName: {
        fontSize: 14,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray700,
    },
    recipientNameSelected: {
        color: BRAND_COLOR,
    },
    consentCard: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    consentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 12,
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: BRAND_COLOR,
        marginTop: 8,
        marginRight: 10,
    },
    bulletText: {
        fontSize: 14,
        color: GIFTYY_THEME.colors.gray700,
        lineHeight: 20,
        flex: 1,
    },
    ratesText: {
        fontSize: 12,
        color: GIFTYY_THEME.colors.gray500,
        marginTop: 4,
        fontStyle: 'italic',
    },
    legalLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    legalLink: {
        fontSize: 12,
        color: BRAND_COLOR,
        fontWeight: '600',
    },
    legalDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: GIFTYY_THEME.colors.gray300,
        marginHorizontal: 12,
    },
    actions: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: GIFTYY_THEME.colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: GIFTYY_THEME.colors.gray500,
        fontSize: 16,
        fontWeight: '600',
    },
    successContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 12,
        textAlign: 'center',
    },
    successBody: {
        fontSize: 16,
        color: GIFTYY_THEME.colors.gray600,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    previewBox: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: 20,
        padding: 20,
        width: '100%',
        marginBottom: 40,
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        textAlign: 'center',
    },
    bubble: {
        backgroundColor: GIFTYY_THEME.colors.white,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
    },
    bubbleText: {
        fontSize: 15,
        color: GIFTYY_THEME.colors.gray900,
        lineHeight: 22,
    },
    doneButton: {
        backgroundColor: BRAND_COLOR,
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        color: GIFTYY_THEME.colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});

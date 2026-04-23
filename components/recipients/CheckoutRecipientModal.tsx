import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { COUNTRY_LIST, getStateOptionsForCountry } from '@/constants/location-options';
import { useRecipients } from '@/contexts/RecipientsContext';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SelectListModal } from './RecipientFormModal';

/**
 * Slim single-page recipient form used only during checkout. Unlike the full
 * RecipientFormModal (which captures preferences, birthday, and relationship
 * categorisation for the Circle tab), this one asks for the minimum needed to
 * ship a gift: name, contact info, and shipping address.
 *
 * The created phantom still goes into the user's Circle and can be enriched
 * later via the full form. On success, onSaved is called with the new
 * recipient_profiles.id so the checkout screen can auto-select the card.
 */

type FormState = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    state: string;
    country: string;
    zip: string;
};

const EMPTY_FORM: FormState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    country: 'United States',
    zip: '',
};

export function CheckoutRecipientModal({
    visible,
    onClose,
    onSaved,
}: {
    visible: boolean;
    onClose: () => void;
    onSaved?: (newProfileId?: string) => void | Promise<void>;
}) {
    const { t } = useTranslation();
    const { addRecipient } = useRecipients();
    const insets = useSafeAreaInsets();
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);
    const [statePickerOpen, setStatePickerOpen] = useState(false);

    const stateOptions = useMemo(() => getStateOptionsForCountry(form.country), [form.country]);

    useEffect(() => {
        if (!visible) {
            // Reset whenever the modal fully closes so the next open is fresh.
            setForm(EMPTY_FORM);
            setIsSaving(false);
            setErrorMessage(null);
            setCountryPickerOpen(false);
            setStatePickerOpen(false);
        }
    }, [visible]);

    const update = useCallback((patch: Partial<FormState>) => {
        setForm(prev => ({ ...prev, ...patch }));
    }, []);

    const canSave = useMemo(() => {
        const hasName = form.firstName.trim().length > 0;
        const hasAddress = form.address.trim().length > 0 && form.city.trim().length > 0 && form.zip.trim().length > 0;
        const hasStateIfRequired = stateOptions.length === 0 || form.state.trim().length > 0;
        const hasContact = form.email.trim().length > 0 || form.phone.trim().length > 0;
        return hasName && hasAddress && hasStateIfRequired && hasContact;
    }, [form, stateOptions]);

    const handleSave = useCallback(async () => {
        if (isSaving || !canSave) return;
        setErrorMessage(null);

        const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
        const trimmed = {
            fullName,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            // invite-recipient edge function expects these exact names
            address: form.address.trim(),
            apartment: form.apartment.trim() || undefined,
            city: form.city.trim(),
            state: form.state.trim() || undefined,
            country: form.country.trim(),
            zip: form.zip.trim(),
        };

        setIsSaving(true);
        try {
            const { id, error } = await addRecipient(trimmed);
            if (error) {
                setErrorMessage(error.message || t('checkout.new_recipient.save_error'));
                return;
            }
            onClose();
            try {
                void onSaved?.(id);
            } catch {
                // ignore
            }
        } catch (err: any) {
            setErrorMessage(err?.message || t('checkout.new_recipient.save_error'));
        } finally {
            setIsSaving(false);
        }
    }, [addRecipient, canSave, form, isSaving, onClose, onSaved, t]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            presentationStyle="overFullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>{t('checkout.new_recipient.title')}</Text>
                                <Text style={styles.subtitle}>{t('checkout.new_recipient.subtitle')}</Text>
                            </View>
                            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                                <IconSymbol name="xmark" size={18} color="#64748b" />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Name */}
                        <Text style={styles.sectionLabel}>{t('checkout.new_recipient.section_name')}</Text>
                        <View style={styles.row}>
                            <Field
                                label={t('checkout.new_recipient.first_name')}
                                required
                                value={form.firstName}
                                onChangeText={v => update({ firstName: v })}
                                placeholder={t('checkout.new_recipient.first_name_placeholder')}
                                style={{ flex: 1 }}
                                autoCapitalize="words"
                            />
                            <Field
                                label={t('checkout.new_recipient.last_name')}
                                value={form.lastName}
                                onChangeText={v => update({ lastName: v })}
                                placeholder={t('checkout.new_recipient.last_name_placeholder')}
                                style={{ flex: 1 }}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Contact */}
                        <Text style={styles.sectionLabel}>{t('checkout.new_recipient.section_contact')}</Text>
                        <Text style={styles.sectionHint}>{t('checkout.new_recipient.contact_hint')}</Text>
                        <Field
                            label={t('checkout.new_recipient.email')}
                            value={form.email}
                            onChangeText={v => update({ email: v })}
                            placeholder="name@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Field
                            label={t('checkout.new_recipient.phone')}
                            value={form.phone}
                            onChangeText={v => update({ phone: v })}
                            placeholder="(555) 123-4567"
                            keyboardType="phone-pad"
                        />

                        {/* Address */}
                        <Text style={styles.sectionLabel}>{t('checkout.new_recipient.section_address')}</Text>
                        <Field
                            label={t('checkout.new_recipient.street')}
                            required
                            value={form.address}
                            onChangeText={v => update({ address: v })}
                            placeholder="238 Market Street"
                            autoCapitalize="words"
                        />
                        <Field
                            label={t('checkout.new_recipient.apartment')}
                            value={form.apartment}
                            onChangeText={v => update({ apartment: v })}
                            placeholder={t('checkout.new_recipient.apartment_placeholder')}
                        />
                        <View style={styles.row}>
                            <Field
                                label={t('checkout.new_recipient.city')}
                                required
                                value={form.city}
                                onChangeText={v => update({ city: v })}
                                placeholder="San Francisco"
                                style={{ flex: 1 }}
                                autoCapitalize="words"
                            />
                            <Field
                                label={t('checkout.new_recipient.zip')}
                                required
                                value={form.zip}
                                onChangeText={v => update({ zip: v })}
                                placeholder="94103"
                                style={{ flex: 1 }}
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                        <View style={styles.row}>
                            <PickerField
                                label={t('checkout.new_recipient.country')}
                                required
                                value={form.country}
                                placeholder={t('checkout.new_recipient.country_placeholder')}
                                onPress={() => setCountryPickerOpen(true)}
                                style={{ flex: 1 }}
                            />
                            {stateOptions.length > 0 && (
                                <PickerField
                                    label={t('checkout.new_recipient.state')}
                                    required
                                    value={form.state}
                                    placeholder={t('checkout.new_recipient.state_placeholder')}
                                    onPress={() => setStatePickerOpen(true)}
                                    style={{ flex: 1 }}
                                />
                            )}
                        </View>

                        {errorMessage ? (
                            <View style={styles.errorBox}>
                                <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#b91c1c" />
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Pressable onPress={onClose} style={styles.cancelBtn} disabled={isSaving}>
                            <Text style={styles.cancelText}>{t('checkout.common.cancel')}</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            disabled={!canSave || isSaving}
                            style={[
                                styles.saveBtn,
                                (!canSave || isSaving) && styles.saveBtnDisabled,
                            ]}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.saveText}>{t('checkout.new_recipient.save_cta')}</Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </View>

            <SelectListModal
                visible={countryPickerOpen}
                title={t('checkout.new_recipient.country_picker_title')}
                options={COUNTRY_LIST}
                selectedValue={form.country}
                searchable
                searchPlaceholder={t('checkout.new_recipient.country_search_placeholder')}
                onClose={() => setCountryPickerOpen(false)}
                onSelect={(value) => {
                    // Reset state when country changes so stale selections don't leak across countries.
                    update({ country: value, state: '' });
                    setCountryPickerOpen(false);
                }}
            />
            <SelectListModal
                visible={statePickerOpen}
                title={t('checkout.new_recipient.state_picker_title')}
                options={stateOptions}
                selectedValue={form.state}
                onClose={() => setStatePickerOpen(false)}
                onSelect={(value) => {
                    update({ state: value });
                    setStatePickerOpen(false);
                }}
            />
        </Modal>
    );
}

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    required,
    style,
    ...rest
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    style?: any;
} & React.ComponentProps<typeof TextInput>) {
    return (
        <View style={[{ marginTop: 12 }, style]}>
            <Text style={styles.fieldLabel}>
                {label}
                {required ? <Text style={styles.requiredStar}> *</Text> : null}
            </Text>
            <TextInput
                {...rest}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                style={styles.input}
            />
        </View>
    );
}

function PickerField({
    label,
    value,
    placeholder,
    onPress,
    required,
    style,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onPress: () => void;
    required?: boolean;
    style?: any;
}) {
    return (
        <View style={[{ marginTop: 12 }, style]}>
            <Text style={styles.fieldLabel}>
                {label}
                {required ? <Text style={styles.requiredStar}> *</Text> : null}
            </Text>
            <Pressable onPress={onPress} style={styles.pickerInput}>
                <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
                    {value || placeholder || ''}
                </Text>
                <IconSymbol name="chevron.down" size={14} color="#94a3b8" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
        minHeight: '72%',
        overflow: 'hidden',
    },
    header: {
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: GIFTYY_THEME.colors.cream,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE8DC',
    },
    handle: {
        alignSelf: 'center',
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(15,23,42,0.15)',
        marginBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: -0.3,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFE8DC',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    sectionLabel: {
        marginTop: 18,
        marginBottom: 2,
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    sectionHint: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    requiredStar: {
        color: GIFTYY_THEME.colors.primary,
        fontWeight: '800',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0f172a',
    },
    pickerInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerValue: {
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '600',
    },
    pickerPlaceholder: {
        fontSize: 15,
        color: '#94a3b8',
    },
    errorBox: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        flex: 1,
        color: '#991b1b',
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    cancelText: {
        color: '#0f172a',
        fontSize: 15,
        fontWeight: '800',
    },
    saveBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    saveBtnDisabled: {
        backgroundColor: '#cbd5e1',
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
